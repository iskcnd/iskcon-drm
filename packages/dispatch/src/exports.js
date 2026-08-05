import ExcelJS from 'exceljs';

/**
 * The handover file for Sri Maruti, and the internal packing list.
 *
 * Column order matches what the courier's own booking export returns, so the
 * file that goes out and the file that comes back read the same way — a clerk
 * comparing them should not have to hunt.
 */

const COLUMNS = [
  { header: 'Tracking ID', key: 'tracking_id', width: 20 },
  { header: 'Parcel No', key: 'parcel_no', width: 11 },
  { header: 'Name', key: 'name_on_label', width: 32 },
  { header: 'Address', key: 'address', width: 48 },
  { header: 'City', key: 'city', width: 18 },
  { header: 'State', key: 'state', width: 18 },
  { header: 'PIN', key: 'pincode', width: 9 },
  { header: 'Phone', key: 'phone', width: 16 },
  { header: 'Receipt Numbers', key: 'receipts', width: 26 },
  { header: 'Category', key: 'band', width: 9 },
  { header: 'Donation Amount', key: 'amount_total', width: 16 },
  { header: 'Donors', key: 'donor_count', width: 8 },
  { header: 'Gifts', key: 'gifts', width: 30 },
];

/**
 * @param {Array} parcels rows from dispatch.v_parcel_export
 * @param {object} meta   {batchName, courier}
 * @returns {Promise<Buffer>}
 */
export async function courierWorkbook(parcels, meta = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ISKCON Chennai';
  wb.created = new Date();

  const ws = wb.addWorksheet(meta.batchName ? meta.batchName.slice(0, 28) : 'Dispatch');
  ws.columns = COLUMNS;

  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2E5C9' } };
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  for (const p of parcels) {
    ws.addRow({
      // Text, not a number. 25017200234607 is fourteen digits; Excel turns a
      // number that long into 2.50172E+13 and the courier cannot read it back.
      tracking_id: String(p.tracking_id ?? ''),
      parcel_no: p.parcel_no,
      name_on_label: p.name_on_label ?? '',
      address: [p.address_line, p.area].filter(Boolean).join(', '),
      city: p.city ?? '',
      state: p.state ?? '',
      pincode: String(p.pincode ?? ''),
      phone: String(p.phone ?? ''),
      receipts: Array.isArray(p.receipt_nos) ? p.receipt_nos.join(', ') : (p.receipt_nos ?? ''),
      band: p.band ?? '',
      amount_total: Number(p.amount_total ?? 0),
      donor_count: Number(p.donor_count ?? 1),
      gifts: p.gifts ?? '',
    });
  }

  ws.getColumn('tracking_id').numFmt = '@';
  ws.getColumn('pincode').numFmt = '@';
  ws.getColumn('phone').numFmt = '@';
  ws.getColumn('amount_total').numFmt = '#,##0.00';
  ws.autoFilter = { from: 'A1', to: { row: 1, column: COLUMNS.length } };

  // A total the temple office can check against its own figure before the
  // parcels leave the building.
  const last = ws.rowCount + 1;
  ws.getCell(`C${last}`).value = `${parcels.length} parcels`;
  ws.getCell(`C${last}`).font = { bold: true };
  ws.getCell(`K${last}`).value = { formula: `SUM(K2:K${ws.rowCount - 1})` };
  ws.getCell(`K${last}`).font = { bold: true };
  ws.getCell(`K${last}`).numFmt = '#,##0.00';

  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** Rows for the address-pending queues, so staff can chase them offline. */
export async function pendingWorkbook(rows) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Address pending');
  ws.columns = [
    { header: 'Reason', key: 'verdict', width: 18 },
    { header: 'Donor No', key: 'person_no', width: 10 },
    { header: 'Name', key: 'full_name', width: 32 },
    { header: 'Amount', key: 'amount_total', width: 14 },
    { header: 'Band', key: 'band', width: 7 },
    { header: 'Address on file', key: 'address_line', width: 50 },
    { header: 'PIN', key: 'pincode', width: 9 },
    { header: 'Phone', key: 'phone', width: 16 },
    { header: 'Receipts', key: 'receipts', width: 24 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  for (const r of rows) {
    ws.addRow({
      ...r,
      pincode: String(r.pincode ?? ''),
      phone: String(r.phone ?? ''),
      receipts: Array.isArray(r.receipt_nos) ? r.receipt_nos.join(', ') : '',
      amount_total: Number(r.amount_total ?? 0),
    });
  }
  ws.getColumn('pincode').numFmt = '@';
  ws.getColumn('phone').numFmt = '@';
  ws.getColumn('amount_total').numFmt = '#,##0.00';
  ws.autoFilter = { from: 'A1', to: { row: 1, column: 9 } };
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export { COLUMNS };
