import ExcelJS from 'exceljs';
import { currentUser, can, CAPABILITY } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_BYTES = 15 * 1024 * 1024;
const MAX_ROWS = 20000;

/** Excel dates arrive as Date objects; we want plain YYYY-MM-DD. */
function cellValue(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) {
    const p = (n) => String(n).padStart(2, '0');
    return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`;
  }
  if (typeof v === 'object') {
    // exceljs wraps formulas, rich text and hyperlinks
    if (v.result !== undefined) return cellValue(v.result);
    if (v.text !== undefined) return String(v.text);
    if (Array.isArray(v.richText)) return v.richText.map((t) => t.text).join('');
    if (v.hyperlink) return String(v.text || v.hyperlink);
    return '';
  }
  return String(v).trim();
}

/**
 * Reads an uploaded .xlsx and returns raw headers plus rows keyed by header.
 * Parsing here rather than in the browser keeps the client bundle small and
 * means every import type gets Excel support, not just Zoho.
 */
export async function POST(req) {
  const user = await currentUser();
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 });
  if (!can(user, CAPABILITY.bulk)) {
    return Response.json({ error: `Your role (${user.role}) cannot import data` }, { status: 403 });
  }

  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') {
      return Response.json({ error: 'No file received' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return Response.json(
        { error: `File is ${(file.size / 1048576).toFixed(1)} MB. Split it into files under 15 MB.` },
        { status: 400 });
    }

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await file.arrayBuffer());

    const sheetName = form.get('sheet');
    const ws = sheetName ? wb.getWorksheet(String(sheetName)) : wb.worksheets[0];
    if (!ws) return Response.json({ error: 'No worksheet found in that file' }, { status: 400 });

    const headers = [];
    ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
      headers[col - 1] = cellValue(cell.value);
    });
    if (!headers.some(Boolean)) {
      return Response.json({ error: 'The first row is empty — it must contain column headers.' }, { status: 400 });
    }

    const rows = [];
    for (let r = 2; r <= ws.rowCount && rows.length < MAX_ROWS; r++) {
      const row = ws.getRow(r);
      const obj = {};
      let any = false;
      headers.forEach((h, i) => {
        if (!h) return;
        const v = cellValue(row.getCell(i + 1).value);
        obj[h] = v;
        if (v !== '') any = true;
      });
      if (any) rows.push(obj);
    }

    return Response.json({
      data: {
        sheet: ws.name,
        sheets: wb.worksheets.map((s) => s.name),
        headers: headers.filter(Boolean),
        rows,
        truncated: ws.rowCount - 1 > MAX_ROWS,
      },
    });
  } catch (err) {
    console.error('[import/parse]', err.message);
    return Response.json(
      { error: `Could not read that file: ${err.message}` }, { status: 400 });
  }
}
