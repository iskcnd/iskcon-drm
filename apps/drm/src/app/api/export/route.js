import ExcelJS from 'exceljs';
import { currentUser, can, CAPABILITY } from '@/lib/session';
import { q } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SHEETS = {
  devotees: {
    title: 'Devotees',
    sql: `SELECT p.person_no, p.full_name, p.initiated_name, p.gender, p.dob,
                 p.mobile_e164, p.email, p.address_line, p.area, p.city, p.state,
                 p.pincode, p.country, p.preferred_language, p.pan, p.profession,
                 p.organization, p.whatsapp_optin, p.is_active, p.created_at,
                 (SELECT string_agg(t.name, ', ' ORDER BY t.name)
                    FROM person_tag pt JOIN tag t ON t.id = pt.tag_id
                   WHERE pt.person_id = p.id) AS categories
            FROM person p ORDER BY p.person_no`,
  },
  donations: {
    title: 'Donations',
    sql: `SELECT d.id, d.donated_on, p.person_no, p.display_name AS donor,
                 p.mobile_e164, p.pan, d.amount, d.currency,
                 s.name AS seva_category, d.payment_mode, d.gateway,
                 d.receipt_no, d.is_80g, d.collected_by, d.notes
            FROM donation d
            JOIN person p ON p.id = d.person_id
            LEFT JOIN seva_category s ON s.id = d.seva_category_id
           ORDER BY d.donated_on DESC, d.id DESC`,
  },
  categories: {
    title: 'Categories',
    sql: `SELECT t.category AS "group", t.name AS category, t.slug,
                 count(pt.person_id) FILTER (WHERE p.is_active) AS active_people
            FROM tag t
            LEFT JOIN person_tag pt ON pt.tag_id = t.id
            LEFT JOIN person p ON p.id = pt.person_id
           WHERE t.is_active
           GROUP BY 1,2,3 ORDER BY 1,2`,
  },
};

function header(v) {
  return String(v).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function GET(req) {
  const user = await currentUser();
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 });
  if (!can(user, CAPABILITY.bulk)) {
    return Response.json(
      { error: `Your role (${user.role}) cannot export data` }, { status: 403 });
  }

  const type = new URL(req.url).searchParams.get('type') || 'devotees';
  const wanted = type === 'full' ? Object.keys(SHEETS) : [type];
  if (wanted.some((w) => !SHEETS[w])) {
    return Response.json({ error: `Unknown export type: ${type}` }, { status: 400 });
  }

  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'ISKCON Chennai DRM';
    wb.created = new Date();

    for (const key of wanted) {
      const spec = SHEETS[key];
      const res = await q(spec.sql);
      const ws = wb.addWorksheet(spec.title);
      if (!res.rows.length) { ws.addRow(['No records']); continue; }

      const cols = Object.keys(res.rows[0]);
      ws.columns = cols.map((c) => ({
        header: header(c),
        key: c,
        width: Math.min(Math.max(header(c).length + 4, 12), 42),
      }));
      res.rows.forEach((r) => ws.addRow(r));

      ws.getRow(1).font = { bold: true };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F4EF' } };
      ws.views = [{ state: 'frozen', ySplit: 1 }];
      ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };

      const amt = cols.indexOf('amount');
      if (amt >= 0) ws.getColumn(amt + 1).numFmt = '#,##0.00';
    }

    const buf = await wb.xlsx.writeBuffer();
    const name = `iskcon-drm-${type}-${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new Response(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${name}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[export]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
