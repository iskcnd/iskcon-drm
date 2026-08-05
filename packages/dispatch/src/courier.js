import ExcelJS from 'exceljs';

/**
 * Sri Maruti's booking export, read and mapped.
 *
 * Columns, from the real file (booking_export_01_04_2025_15_05_2026.xlsx,
 * 2,327 rows): DOCUMENT NO, BOOKING DATE, TO CENTER, RECEIVER, AREA NAME,
 * WEIGHT, TYPE, STATUS, DELIVERY DATE.
 *
 * Two things about that file drive the whole design:
 *
 *   DELIVERY DATE is sometimes filled when nothing was delivered. 81 rows are
 *   still in flight; 61 of those carry "-" and 20 carry a real date, which is
 *   the courier's estimate. Writing that as an actual delivery would record
 *   deliveries that never happened. Only terminal statuses set delivery_date;
 *   the rest goes to expected_delivery.
 *
 *   (An earlier reading of this file put that figure at 81, because a quick
 *   check counted "-" as a value. It is 20. The behaviour is the same either
 *   way, but the number was wrong and is worth correcting where it was said.)
 *
 *   73 rows came back (RTO DELIVERED 67, RETURN DELIVERED 4, RETURN 1,
 *   RETURN INITIATED 1). Each one is the temple learning that a donor address
 *   is wrong. That is worth more than the parcel, so returns are flagged.
 */

/** Their words on the left, ours on the right. */
export const STATUS_MAP = {
  'DELIVERED': { status: 'delivered', terminal: true },
  'RTO DELIVERED': { status: 'returned', terminal: true, returned: true },
  'RETURN DELIVERED': { status: 'returned', terminal: true, returned: true },
  'RETURN': { status: 'returning', terminal: false, returned: true },
  'RETURN INITIATED': { status: 'returning', terminal: false, returned: true },
  'IN TRANSIT': { status: 'in_transit', terminal: false },
  'C/F TO NEXT DAY': { status: 'in_transit', terminal: false },
  'OUT FOR DELIVERY': { status: 'out_for_delivery', terminal: false },
  'NOT PICKED UP': { status: 'not_picked_up', terminal: true },
  'DAMAGED': { status: 'damaged', terminal: true },
  'LOST': { status: 'lost', terminal: true },
};

const txt = (v) => {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') {
    return String(v.text ?? v.result ?? v.richText?.map((r) => r.text).join('') ?? '').trim();
  }
  return String(v).trim();
};

const asDate = (v) => {
  if (!v) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10);
  const s = txt(v);
  // Sri Maruti writes "-" for a date they do not have — 61 rows in the sample
  // file. Named explicitly rather than left to Date() returning Invalid Date,
  // so the intent survives the next person reading this.
  if (!s || s === '-' || s === '--') return null;
  // Their export writes ISO; a hand-edited file may carry dd/mm/yyyy.
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

/**
 * Read the workbook into rows we can apply.
 * @returns {{rows: Array, errors: Array}}
 */
export async function readCourierFile(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const ws = wb.worksheets[0];
  if (!ws) return { rows: [], errors: [{ row: 0, error: 'the workbook has no sheets' }] };

  const head = {};
  ws.getRow(1).eachCell((cell, col) => { head[txt(cell.value).toLowerCase()] = col; });
  const find = (...names) => {
    for (const n of names) {
      const hit = Object.keys(head).find((h) => h === n || h.replace(/\s+/g, '') === n.replace(/\s+/g, ''));
      if (hit) return head[hit];
    }
    return null;
  };
  const C = {
    doc: find('document no', 'documentno', 'awb', 'tracking id'),
    booked: find('booking date'),
    receiver: find('receiver'),
    status: find('status'),
    delivered: find('delivery date'),
    weight: find('weight'),
  };
  if (!C.doc || !C.status) {
    return {
      rows: [],
      errors: [{ row: 1, error: `expected DOCUMENT NO and STATUS columns; found: ${Object.keys(head).join(', ')}` }],
    };
  }

  const rows = []; const errors = [];
  const seen = new Map();
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const tracking = txt(row.getCell(C.doc).value).replace(/\D/g, '');
    const rawStatus = txt(row.getCell(C.status).value).toUpperCase().replace(/\s+/g, ' ').trim();
    if (!tracking) return;
    if (!rawStatus) { errors.push({ row: n, tracking, error: 'no status' }); return; }

    const mapped = STATUS_MAP[rawStatus];
    if (!mapped) { errors.push({ row: n, tracking, error: `unknown status "${rawStatus}"` }); return; }

    const delivered = C.delivered ? asDate(row.getCell(C.delivered).value) : null;
    const rec = {
      tracking,
      rawStatus,
      status: mapped.status,
      returned: !!mapped.returned,
      dispatch_date: C.booked ? asDate(row.getCell(C.booked).value) : null,
      // The trap. A date on a non-terminal row is an estimate, not a fact.
      delivery_date: mapped.terminal ? delivered : null,
      expected_delivery: mapped.terminal ? null : delivered,
      receiver: C.receiver ? txt(row.getCell(C.receiver).value) : '',
      weight: C.weight ? txt(row.getCell(C.weight).value) : '',
      row: n,
    };

    // "Courier tracking imported twice — update latest status only." The file
    // is ordered oldest first, so a later row wins.
    if (seen.has(tracking)) rows[seen.get(tracking)] = rec;
    else { seen.set(tracking, rows.length); rows.push(rec); }
  });

  return { rows, errors };
}

/**
 * Apply parsed rows to the parcel table.
 *
 * One transaction, but an unmatched tracking id is reported and skipped, not
 * thrown — the spec is explicit that unknown ids must not stop the rest, and
 * a courier file will always contain parcels from before this system.
 *
 * @param {object} client  a pg client already inside a transaction
 */
export async function applyCourierRows(client, rows) {
  let updated = 0; let flagged = 0;
  const errors = [];

  for (const r of rows) {
    const res = await client.query(
      `UPDATE dispatch.parcel
          SET status             = $2,
              courier_status_raw = $3,
              last_status_at     = now(),
              dispatch_date      = COALESCE(dispatch_date, $4::date),
              delivery_date      = COALESCE($5::date, delivery_date),
              expected_delivery  = COALESCE($6::date, expected_delivery)
        WHERE regexp_replace(tracking_id, '\\D', '', 'g') = $1
        RETURNING id`,
      [r.tracking, r.status, r.rawStatus, r.dispatch_date, r.delivery_date, r.expected_delivery]);

    if (!res.rowCount) {
      errors.push({ row: r.row, tracking: r.tracking, error: 'no parcel with this tracking id' });
      continue;
    }
    updated += res.rowCount;

    if (r.returned) {
      const f = await client.query('SELECT dispatch.flag_bad_address($1, $2) AS n',
        [res.rows[0].id, `parcel returned by courier (${r.rawStatus})`]);
      flagged += Number(f.rows[0].n || 0);
    }
  }
  return { updated, flagged, errors };
}
