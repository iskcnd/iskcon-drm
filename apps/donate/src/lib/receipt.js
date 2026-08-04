import PDFDocument from 'pdfkit';
import path from 'node:path';
import { q } from './db.js';
import { hmac256 } from './util.js';

/**
 * Donation receipt PDF.
 *
 * The official printed form (ISKCON_Receipt_template.pdf, CorelDRAW, 2023) IS
 * the document. We do not redraw it — the artwork, wording, T&C and 80G
 * registration text are laid down as a full-page background and only the
 * donor's values are typed on top, exactly as a clerk fills the paper book.
 * When the temple revises the form, replace public/receipt-template.jpg and
 * adjust FIELDS below; nothing else changes.
 *
 * Coordinates are in PDF points on the template's own Letter page (612x792),
 * measured off the artwork rather than eyeballed. Rendered on demand from the
 * database — no files stored.
 */

const TEMPLATE = 'receipt-template.jpg';
const PAGE = { w: 612, h: 792 };

const INK = '#1A1A1A';

/**
 * Field geometry, in points, taken from the template artwork.
 * `rule` values are the printed underlines in the Donor Details panel; text
 * sits just above its rule, the way handwriting does.
 */
const F = {
  // The form's own serial ("0058 31") is printed at x 458.6-513.0, with digit
  // tops at y 60.9 and bottoms at 72.2 — 11.3pt of cap height. Ours is
  // appended after it, matched to those measurements so the two read as one
  // number: "0058 31 200002".
  receiptNo: { x: 519, top: 60.9, size: 15.7 },
  date: { x: 466.6, y: 92.2, w: 128.2, h: 30.2 },
  amountWords: { x: 58, y: 133.9, w: 400, h: 31.7 },
  amountFigure: { x: 494, y: 133.9, w: 96, h: 31.7 },   // right of the pink Rs. badge
  donorValueX: 95,                                       // clears the longest printed label
  donorValueW: 241,
  rules: {
    name: 200.5, addr1: 219.2, addr2: 238.0, addr3: 256.5,
    pin: 275.2, pan: 293.8, mobile: 312.5, email: 331.2,
  },
  mode: { x: 355, y: 174.2, w: 232, h: 34.6 },
  payment: { x: 355, y: 217.4, w: 232, h: 33.1 },
  purpose: { x: 355, y: 260.6, w: 232, h: 33.1 },
  issuedBy: { x: 473.8, y: 305.3, w: 121, h: 31.7 },
};

/**
 * Signs a receipt link. Receipt numbers are sequential and the PDF carries the
 * donor's name, address, PAN and amount — so this token is the only thing
 * standing between a guessed URL and someone else's donation record.
 *
 * It must never fall back to a default. A hardcoded fallback is a published
 * secret: anyone could compute the token for every receipt number in the series.
 * Failing to boot is the correct behaviour when the secret is missing.
 *
 * RECEIPT_SECRET is preferred so that rotating CRON_KEY does not invalidate
 * every receipt link already sent to devotees.
 */
export function receiptToken(receiptNo) {
  const secret = process.env.RECEIPT_SECRET || process.env.CRON_KEY;
  if (!secret || secret.length < 16) {
    throw new Error(
      'RECEIPT_SECRET (or CRON_KEY) is missing or shorter than 16 characters. '
      + 'Receipt links are signed with it; without a strong secret anyone could '
      + 'enumerate donation receipts. Generate one with: openssl rand -base64 32');
  }
  return hmac256(String(receiptNo), secret).slice(0, 16);
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
function two(n) { return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ' ' + ONES[n % 10] : ''}`; }
function three(n) { return `${n >= 100 ? ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' : '') : ''}${n % 100 ? two(n % 100) : ''}`; }
/** Indian system: crores, lakhs, thousands. */
export function amountInWords(num) {
  num = Math.round(num);
  if (!num) return 'Zero';
  const crore = Math.floor(num / 10000000); num %= 10000000;
  const lakh = Math.floor(num / 100000); num %= 100000;
  const thousand = Math.floor(num / 1000); num %= 1000;
  const parts = [];
  if (crore) parts.push(three(crore) + ' Crore');
  if (lakh) parts.push(two(lakh) + ' Lakh');
  if (thousand) parts.push(two(thousand) + ' Thousand');
  if (num) parts.push(three(num));
  return parts.join(' ');
}

export async function fetchReceiptData(receiptNo) {
  const r = await q(
    `SELECT d.receipt_no, d.amount, d.donated_on, d.payment_mode, d.txn_ref, d.gateway, d.is_80g,
            COALESCE(cp.title_i18n->>'en', sc.name, 'General Donation') AS purpose,
            p.full_name, p.address_line, p.area, p.city, p.state, p.pincode, p.pan,
            p.mobile_e164, p.email
       FROM donation d
       JOIN person p ON p.id = d.person_id
       LEFT JOIN seva_category sc ON sc.id = d.seva_category_id
       LEFT JOIN campaign cp ON cp.id = d.campaign_id
      WHERE d.receipt_no = $1 AND d.status = 'paid'`,
    [receiptNo]
  );
  return r.rows[0] || null;
}


/**
 * Type the donation onto the official form.
 *
 * Returns a PDFKit document that has already been ended; the caller collects
 * its chunks. Nothing here draws form furniture — every line, box and word of
 * boilerplate comes from the template image.
 */
export function renderReceiptPDF(d) {
  const doc = new PDFDocument({ size: [PAGE.w, PAGE.h], margin: 0 });

  // The form itself. Without it there is no receipt, so this is not optional
  // and not wrapped in a try — a missing template must fail loudly rather than
  // produce a page of floating text with no letterhead or T&C.
  doc.image(path.join(process.cwd(), 'public', TEMPLATE), 0, 0,
    { width: PAGE.w, height: PAGE.h });

  /**
   * Largest size at or below `size` that fits `text` in `w`, down to `min`.
   *
   * A receipt is a legal acknowledgement: a truncated name or a clipped amount
   * makes it wrong, not just ugly. Long Tamil names and lakh-scale amounts in
   * words both overrun the printed boxes, so shrink rather than clip.
   */
  const fit = (text, w, size, font, min = 6) => {
    let s = size;
    doc.font(font);
    while (s > min) {
      doc.fontSize(s);
      if (doc.widthOfString(String(text)) <= w) break;
      s -= 0.25;
    }
    return s;
  };

  /** Text sitting on one of the printed underlines in the Donor Details panel. */
  const onRule = (text, rule, size = 10, x = F.donorValueX, w = F.donorValueW) => {
    const t = text == null ? '' : String(text);
    if (!t) return;
    const s = fit(t, w, size, 'Helvetica');
    doc.font('Helvetica').fontSize(s).fillColor(INK)
      .text(t, x, rule - s - 1.5, { width: w, lineBreak: false });
  };

  /** Text inside one of the pale lavender boxes, vertically centred. */
  const inBox = (text, box, size = 10, font = 'Helvetica', align = 'left') => {
    const t = text == null ? '' : String(text);
    if (!t) return;
    const s = fit(t, box.w, size, font);
    doc.font(font).fontSize(s).fillColor(INK)
      .text(t, box.x, box.y + (box.h - s) / 2 - 1, { width: box.w, align, lineBreak: false });
  };

  // ------------------------------------------------------------ receipt no.
  // The form's pre-printed serial stays. Ours is written after it, matched in
  // size and weight, so the pair reads as one number the way it does when a
  // clerk writes the book number beside the printed one.
  const rn = F.receiptNo;
  doc.font('Helvetica').fontSize(rn.size).fillColor(INK)
    .text(String(d.receipt_no ?? ''), rn.x, rn.top, { lineBreak: false });

  // ------------------------------------------------------------------ date
  const dt = d.donated_on instanceof Date ? d.donated_on : new Date(d.donated_on);
  inBox(dt.toLocaleDateString('en-GB',
    { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-'),
  F.date, 11, 'Helvetica-Bold', 'center');

  // ---------------------------------------------------------------- amount
  // Words on the left of the band, figures after the printed Rs. badge —
  // the same two places a clerk writes them.
  const amount = Number(d.amount || 0);
  inBox(`Rupees ${amountInWords(amount)} only`, F.amountWords, 11, 'Helvetica-Bold');
  inBox(`${amount.toLocaleString('en-IN')}/-`, F.amountFigure, 13, 'Helvetica-Bold');

  // --------------------------------------------------------- donor details
  onRule(d.full_name, F.rules.name, 10);

  // The form gives the address three ruled lines. Break on what is there
  // rather than wrapping blindly, so "Chennai, Tamil Nadu" stays together.
  const addrParts = [d.address_line, d.area, [d.city, d.state].filter(Boolean).join(', ')]
    .map((v) => (v || '').trim()).filter(Boolean);
  const addrLines = [];
  doc.font('Helvetica').fontSize(9.5);
  for (const part of addrParts) {
    const last = addrLines[addrLines.length - 1];
    if (last && doc.widthOfString(`${last}, ${part}`) <= F.donorValueW) {
      addrLines[addrLines.length - 1] = `${last}, ${part}`;
    } else {
      addrLines.push(part);
    }
  }
  onRule(addrLines[0], F.rules.addr1, 9.5);
  onRule(addrLines[1], F.rules.addr2, 9.5);
  onRule(addrLines.slice(2).join(', '), F.rules.addr3, 9.5);

  onRule(d.pincode, F.rules.pin, 10);
  onRule(d.pan, F.rules.pan, 10);
  onRule(d.mobile_e164, F.rules.mobile, 10);
  onRule(d.email, F.rules.email, 9.5);

  // -------------------------------------------------------- right-hand column
  inBox(d.payment_mode === 'upi' ? 'Online / UPI' : 'Online', F.mode, 10);
  inBox([(d.gateway || '').toUpperCase(), d.txn_ref].filter(Boolean).join(' · '), F.payment, 8.5);
  inBox(d.purpose, F.purpose, 9.5);

  // The paper form has a line for the representative's signature. Nobody signs
  // a receipt that was issued by a payment gateway at 2am, so say so plainly
  // instead of leaving a blank that looks like an unfinished document.
  doc.font('Helvetica-Oblique').fontSize(7).fillColor('#555555')
    .text('Digitally issued — no signature required', F.issuedBy.x, F.issuedBy.y + 11,
      { width: F.issuedBy.w, align: 'center', lineBreak: false });

  doc.end();
  return doc;
}
