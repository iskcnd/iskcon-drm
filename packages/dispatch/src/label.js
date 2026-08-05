import PDFDocument from 'pdfkit';
import { code128c } from './barcode.js';

/**
 * Courier address labels, laid out on the sheet the temple already buys.
 *
 * Geometry comes from the template row in the database, never from constants
 * here — a different sheet is a settings change, not a deploy. The default is
 * 100 x 72 mm, 2 across and 4 down on A4.
 *
 * Everything is computed in millimetres and converted once, because that is
 * how label stock is specified and how the misalignment gets described when
 * someone holds a printed sheet against the backing paper.
 */

const MM = 2.834645669;         // points per millimetre
const mm = (v) => v * MM;

const A4 = { width: mm(210), height: mm(297) };

const DEFAULT_SPEC = {
  width_mm: 100, height_mm: 72,
  margin_top: 4.5, margin_left: 3.5,
  pitch_x: 103, pitch_y: 72,
  across: 2, down: 4,
  paper: 'A4',
};

/**
 * Check a sheet definition before it wastes a sheet of labels.
 * Returns a list of problems; empty means it fits.
 */
export function checkSpec(spec = {}) {
  const s = { ...DEFAULT_SPEC, ...spec };
  const problems = [];
  const right = s.margin_left + (s.across - 1) * s.pitch_x + s.width_mm;
  const bottom = s.margin_top + (s.down - 1) * s.pitch_y + s.height_mm;
  if (right > 210.5) problems.push(`labels run ${(right - 210).toFixed(1)}mm off the right edge`);
  if (bottom > 297.5) problems.push(`labels run ${(bottom - 297).toFixed(1)}mm off the bottom`);
  if (s.pitch_x < s.width_mm) problems.push('horizontal pitch is smaller than the label — columns overlap');
  if (s.pitch_y < s.height_mm) problems.push('vertical pitch is smaller than the label — rows overlap');
  if (s.across < 1 || s.down < 1) problems.push('across and down must both be at least 1');
  return problems;
}

/** Where label `i` sits on its sheet, in points. */
export function slot(i, spec = {}) {
  const s = { ...DEFAULT_SPEC, ...spec };
  const perPage = s.across * s.down;
  const n = i % perPage;
  const row = Math.floor(n / s.across);
  const col = n % s.across;
  return {
    page: Math.floor(i / perPage),
    x: mm(s.margin_left + col * s.pitch_x),
    y: mm(s.margin_top + row * s.pitch_y),
    w: mm(s.width_mm),
    h: mm(s.height_mm),
  };
}

/** Draw a Code 128 symbol, scaled to fit `maxW`. */
function barcode(doc, digits, x, y, maxW, h) {
  const widths = code128c(digits);
  const modules = widths.reduce((a, b) => a + b, 0);
  const unit = Math.min(maxW / modules, mm(0.5));
  let cx = x + (maxW - modules * unit) / 2;   // centred in the space allowed
  doc.fillColor('#000');
  for (let i = 0; i < widths.length; i += 1) {
    const w = widths[i] * unit;
    if (i % 2 === 0) doc.rect(cx, y, w, h).fill();   // even index = bar
    cx += w;
  }
  return unit * modules;
}

/**
 * @param {Array} parcels  {name_on_label, address_line, area, city, state,
 *                          pincode, phone, tracking_id, parcel_no}
 * @param {object} spec    label geometry from dispatch.template.spec
 * @param {object} opts    {guides:boolean} draws the label outline for a
 *                         test print against the real stock
 * @returns {PDFDocument}  already ended; collect its chunks
 */
export function renderLabels(parcels, spec = {}, opts = {}) {
  const s = { ...DEFAULT_SPEC, ...spec };
  const problems = checkSpec(s);
  if (problems.length) throw new Error(`Label sheet will not fit: ${problems.join('; ')}`);

  const doc = new PDFDocument({ size: [A4.width, A4.height], margin: 0, autoFirstPage: false });
  const perPage = s.across * s.down;
  let page = -1;

  parcels.forEach((p, i) => {
    const g = slot(i, s);
    if (g.page !== page) { doc.addPage(); page = g.page; }

    if (opts.guides) {
      doc.save().lineWidth(0.3).strokeColor('#cccccc').rect(g.x, g.y, g.w, g.h).stroke().restore();
    }

    // Padding is generous on purpose: label stock is die-cut with a tolerance
    // of a millimetre or so, and text that starts 2mm from the edge lands on
    // the backing paper when the sheet feeds slightly askew.
    const pad = mm(5);
    const left = g.x + pad;
    const width = g.w - pad * 2;
    let y = g.y + pad;

    // The name must occupy exactly one line. pdfkit wrapped it anyway despite
    // lineBreak:false, and the second line landed on top of the address —
    // caught by rendering a sheet and looking at it. Shrink to fit, then cut,
    // so a long name is smaller but the address stays readable.
    // The parcel number sits in the top-right corner, so the name gets the
    // line minus that corner. Without this the two overlap — which the first
    // render showed plainly.
    const nameWidth = width - (p.parcel_no ? mm(22) : 0);
    const name = String(p.name_on_label || '');
    doc.fillColor('#000').font('Helvetica-Bold');
    let size = 13;
    while (size > 8.5 && doc.fontSize(size).widthOfString(name) > nameWidth) size -= 0.5;
    let shown = name;
    if (doc.fontSize(size).widthOfString(shown) > nameWidth) {
      while (shown.length > 4 && doc.widthOfString(`${shown}…`) > nameWidth) shown = shown.slice(0, -1);
      shown += '…';
    }
    doc.fontSize(size).text(shown, left, y, { width: nameWidth, lineBreak: false });
    y += 17;

    doc.font('Helvetica').fontSize(10.5);
    const lines = [
      p.address_line,
      p.area,
      [p.city, p.state].filter(Boolean).join(', '),
      p.pincode ? `PIN ${p.pincode}` : null,
    ].filter((l) => l && String(l).trim());

    for (const line of lines) {
      // Height is fixed by the die-cut, so the address is clipped rather than
      // allowed to push the barcode off the label.
      if (y > g.y + g.h - mm(24)) break;
      doc.text(String(line), left, y, { width, ellipsis: true });
      y = doc.y + 1;
    }

    if (p.phone) {
      doc.fontSize(10).fillColor('#333')
        .text(String(p.phone), left, Math.min(y + 2, g.y + g.h - mm(24)), { width, lineBreak: false });
    }

    // Barcode sits on the bottom edge, where a scanner is pointed.
    const digits = String(p.tracking_id || '').replace(/\D/g, '');
    if (digits) {
      const bh = mm(11);
      const by = g.y + g.h - pad - bh - 9;
      barcode(doc, digits, left, by, width, bh);
      doc.font('Helvetica').fontSize(8.5).fillColor('#000')
        .text(String(p.tracking_id), left, by + bh + 1.5, { width, align: 'center', lineBreak: false });
    }

    if (p.parcel_no) {
      doc.font('Helvetica').fontSize(7).fillColor('#777')
        .text(`#${p.parcel_no}`, g.x + g.w - pad - mm(20), g.y + pad - 1,
          { width: mm(20), align: 'right', lineBreak: false });
    }
  });

  doc.end();
  return doc;
}

export { DEFAULT_SPEC, MM };
