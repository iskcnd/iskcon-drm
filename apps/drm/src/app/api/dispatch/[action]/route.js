import { NextResponse } from 'next/server';
import { currentUser, can, CAPABILITY } from '@/lib/session';
import { q, tx } from '@/lib/db';
import { renderLabels } from '@iskcon/dispatch/label';
import { courierWorkbook, pendingWorkbook } from '@iskcon/dispatch/exports';
import { mergeBatch, fieldsUsed, LETTER_FIELDS } from '@iskcon/dispatch/mailmerge';
import { readCourierFile, applyCourierRows } from '@iskcon/dispatch/courier';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * File in, file out. Everything that cannot travel over the JSON op channel:
 * label PDFs, courier spreadsheets, a zip of letters, and the status import.
 *
 *   POST /api/dispatch/labels          { batchId }        -> PDF
 *   POST /api/dispatch/courier-export  { batchId }        -> XLSX
 *   POST /api/dispatch/pending-export  { window }         -> XLSX
 *   POST /api/dispatch/letters         { batchId }        -> ZIP of DOCX
 *   POST /api/dispatch/courier-import  multipart file     -> JSON summary
 */

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const dmy = (d) => (d
  ? new Date(d).toLocaleDateString('en-GB',
    { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')
  : '');

async function parcelRows(batchId) {
  const r = await q(
    `SELECT p.*,
            (SELECT count(*) FROM dispatch.parcel_item i WHERE i.parcel_id = p.id) AS donor_count,
            (SELECT array_agg(rn) FROM dispatch.parcel_item i, unnest(i.receipt_nos) rn
              WHERE i.parcel_id = p.id) AS receipt_nos,
            (SELECT string_agg(g.name || CASE WHEN pg.qty>1 THEN ' x'||pg.qty ELSE '' END, ', ')
               FROM dispatch.parcel_gift pg JOIN dispatch.gift_item g ON g.id=pg.gift_id
              WHERE pg.parcel_id = p.id) AS gifts
       FROM dispatch.parcel p
      WHERE p.batch_id = $1
      ORDER BY p.parcel_no`, [batchId]);
  return r.rows;
}

function pdfBuffer(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

const file = (buf, type, name) => new NextResponse(buf, {
  headers: {
    'content-type': type,
    'content-length': String(buf.length),
    'content-disposition': `attachment; filename="${name}"`,
    'cache-control': 'no-store',
  },
});

export async function POST(request, { params }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  if (!can(user, CAPABILITY.bulk)) {
    return NextResponse.json({ error: `Your role (${user.role}) cannot do this` }, { status: 403 });
  }
  const { action } = await params;

  try {
    // ------------------------------------------------------------- labels
    if (action === 'labels') {
      const { batchId, guides } = await request.json();
      const b = (await q(
        `SELECT b.*, t.spec FROM dispatch.batch b
           LEFT JOIN dispatch.template t ON t.id = b.label_template_id
          WHERE b.id = $1`, [batchId])).rows[0];
      if (!b) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });

      const rows = await parcelRows(batchId);
      if (!rows.length) return NextResponse.json({ error: 'This batch has no parcels yet' }, { status: 400 });

      const buf = await pdfBuffer(renderLabels(rows, b.spec || {}, { guides: !!guides }));
      await q(`INSERT INTO dispatch.job (batch_id, kind, rows_total, rows_ok, status, finished_at, run_by)
               VALUES ($1,'labels',$2,$2,'done',now(),$3)`, [batchId, rows.length, user.id]);
      await q(`UPDATE dispatch.parcel SET status='printed'
                WHERE batch_id=$1 AND status='pending'`, [batchId]);
      return file(buf, 'application/pdf', `labels-${b.name.replace(/\W+/g, '-')}.pdf`);
    }

    // ----------------------------------------------------- courier export
    if (action === 'courier-export') {
      const { batchId } = await request.json();
      const b = (await q('SELECT * FROM dispatch.batch WHERE id=$1', [batchId])).rows[0];
      if (!b) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
      const rows = await parcelRows(batchId);
      const buf = await courierWorkbook(rows, { batchName: b.name, courier: b.courier });
      await q(`INSERT INTO dispatch.job (batch_id, kind, rows_total, rows_ok, status, finished_at, run_by)
               VALUES ($1,'courier_export',$2,$2,'done',now(),$3)`, [batchId, rows.length, user.id]);
      return file(buf,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        `courier-${b.name.replace(/\W+/g, '-')}.xlsx`);
    }

    // ----------------------------------------------------- pending export
    if (action === 'pending-export') {
      const { fromDate, toDate, receiptStart, receiptEnd } = await request.json();
      const rows = (await q(
        `SELECT person_no, full_name, amount_total, band, address_line, pincode,
                phone, receipt_nos, verdict
           FROM dispatch.plan_batch($1::date,$2::date,$3,$4)
          WHERE verdict <> 'ok' ORDER BY amount_total DESC`,
        [fromDate || null, toDate || null, receiptStart || null, receiptEnd || null])).rows;
      return file(await pendingWorkbook(rows),
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'address-pending.xlsx');
    }

    // ------------------------------------------------------------ letters
    if (action === 'letters') {
      const { batchId } = await request.json();
      const b = (await q(
        `SELECT b.*, t.name AS template_name, t.file_data, t.file_name
           FROM dispatch.batch b
           JOIN dispatch.template t ON t.id = b.letter_template_id
          WHERE b.id = $1`, [batchId])).rows[0];
      if (!b) return NextResponse.json({ error: 'Batch or letter template not found' }, { status: 404 });

      if (!b.file_data) {
        return NextResponse.json({
          error: `No Word document has been uploaded against "${b.template_name}". `
               + 'Go to the Templates tab, open that template and upload a .docx '
               + 'containing {{donor_name}} style fields.',
        }, { status: 400 });
      }
      const tpl = Buffer.from(b.file_data);
      const rows = await parcelRows(batchId);

      const letters = rows.map((p) => ({
        filename: `${String(p.parcel_no).padStart(5, '0')}-${p.name_on_label}`,
        values: {
          donor_name: p.name_on_label,
          amount: inr(p.amount_total),
          band: p.band || '',
          receipt_nos: (p.receipt_nos || []).join(', '),
          tracking_id: p.tracking_id || '',
          parcel_no: p.parcel_no,
          dispatch_date: dmy(p.dispatch_date || new Date()),
          gifts: p.gifts || '',
          address: [p.address_line, p.area, p.city, p.state, p.pincode].filter(Boolean).join(', '),
          temple_name: 'ISKCON Chennai',
          temple_address: 'Hare Krishna Land, Off ECR, Akkarai, Sholinganallur, Chennai 600119',
        },
      }));

      const zip = await mergeBatch(tpl, letters);
      await q(`INSERT INTO dispatch.job (batch_id, kind, filename, rows_total, rows_ok, status, finished_at, run_by)
               VALUES ($1,'mail_merge',$2,$3,$3,'done',now(),$4)`,
      [batchId, b.template_name, letters.length, user.id]);
      return file(zip, 'application/zip', `letters-${b.name.replace(/\W+/g, '-')}.zip`);
    }

    // ----------------------------------------------------- courier import
    if (action === 'courier-import') {
      const form = await request.formData();
      const upload = form.get('file');
      const batchId = form.get('batchId') || null;
      if (!upload || typeof upload === 'string') {
        return NextResponse.json({ error: 'Attach the courier Excel file' }, { status: 400 });
      }
      const tmp = `/tmp/courier-${Date.now()}.xlsx`;
      const { writeFile, unlink } = await import('node:fs/promises');
      await writeFile(tmp, Buffer.from(await upload.arrayBuffer()));

      let parsed;
      try { parsed = await readCourierFile(tmp); } finally { await unlink(tmp).catch(() => {}); }

      const result = await tx(user.id, async (c) => applyCourierRows(c, parsed.rows));
      const errors = [...parsed.errors, ...result.errors];

      await q(
        `INSERT INTO dispatch.job (batch_id, kind, filename, rows_total, rows_ok, rows_failed, errors, status, finished_at, run_by)
         VALUES ($1,'courier_import',$2,$3,$4,$5,$6,'done',now(),$7)`,
        [batchId, upload.name || 'courier.xlsx', parsed.rows.length, result.updated,
          errors.length, JSON.stringify(errors.slice(0, 500)), user.id]);

      return NextResponse.json({
        data: {
          read: parsed.rows.length,
          updated: result.updated,
          addressesFlagged: result.flagged,
          notMatched: errors.length,
          // Only the first few: an operator needs a sense of the problem, not
          // a thousand lines of it.
          examples: errors.slice(0, 10),
        },
      });
    }

    // ---------------------------------------------------- template upload
    if (action === 'template-upload') {
      const form = await request.formData();
      const upload = form.get('file');
      const templateId = form.get('templateId');
      if (!upload || typeof upload === 'string') {
        return NextResponse.json({ error: 'Choose a .docx file' }, { status: 400 });
      }
      if (!templateId) return NextResponse.json({ error: 'Which template?' }, { status: 400 });

      const buf = Buffer.from(await upload.arrayBuffer());
      // A .docx is a zip; every zip starts PK. Catching this here means the
      // operator is told they picked a .doc or a PDF now, rather than after
      // pressing Generate letters on a batch of 250.
      if (buf.length < 4 || buf[0] !== 0x50 || buf[1] !== 0x4b) {
        return NextResponse.json({
          error: 'That is not a .docx. Word 97 .doc files and PDFs cannot be merged — '
               + 'open it in Word and Save As "Word Document (.docx)".',
        }, { status: 400 });
      }

      let fields = [];
      try {
        const JSZip = (await import('jszip')).default;
        const zip = await JSZip.loadAsync(buf);
        const docXml = zip.file('word/document.xml');
        if (!docXml) throw new Error('no word/document.xml inside');
        fields = fieldsUsed(await docXml.async('string'));
      } catch (e) {
        return NextResponse.json({ error: `Could not read that Word file: ${e.message}` }, { status: 400 });
      }

      await q(
        `UPDATE dispatch.template
            SET file_data=$2, file_name=$3, file_size=$4, uploaded_at=now()
          WHERE id=$1`,
        [templateId, buf, upload.name || 'letter.docx', buf.length]);

      // Tell the operator which placeholders the document actually uses, and
      // which of those we cannot fill — before it matters.
      const known = new Set(LETTER_FIELDS.map(([k]) => k));
      return NextResponse.json({
        data: {
          fileName: upload.name,
          size: buf.length,
          fields,
          unknown: fields.filter((f) => !known.has(f)),
        },
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 404 });
  } catch (err) {
    console.error(`[dispatch:${action}]`, err);
    return NextResponse.json({ error: err.message || 'Something went wrong' }, { status: 400 });
  }
}
