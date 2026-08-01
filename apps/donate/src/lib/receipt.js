import PDFDocument from 'pdfkit';
import path from 'node:path';
import { q } from './db.js';
import { hmac256 } from './util.js';

/**
 * Donation receipt PDF, following the official ISKCON Chennai receipt format
 * (ISKCON_Receipt_template.pdf). Compliance points baked in:
 *  - The receipt is an ACKNOWLEDGEMENT only, not for claiming 80G deduction.
 *  - Form 10BE is the tax certificate, issued per Income-tax Act timelines.
 *  - 80G Unique Regn. No. AAATI0017PF20219.
 * Rendered on demand from the database — no files stored.
 */

const MAROON = '#3B2A8C'; // template's headline blue-violet
const RED = '#C81E5B';
const INK = '#222222';

export function receiptToken(receiptNo) {
  return hmac256(String(receiptNo), process.env.CRON_KEY || 'dev').slice(0, 16);
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

export function renderReceiptPDF(d) {
  const doc = new PDFDocument({ size: 'A4', margins: { top: 36, left: 40, right: 40, bottom: 36 } });
  const W = doc.page.width - 80;

  try {
    doc.image(path.join(process.cwd(), 'public', 'logo.png'), 40, 40, { width: 64 });
  } catch { /* logo optional */ }

  doc.fillColor(MAROON).font('Helvetica-Bold').fontSize(15)
    .text('International Society for Krishna Consciousness (ISKCON)', 115, 44, { width: W - 75, align: 'center' });
  doc.fontSize(9.5).font('Helvetica')
    .text('Founder-Acharya: His Divine Grace A. C. Bhaktivedanta Swami Prabhupada', { width: W - 75, align: 'center' });

  doc.moveDown(0.4).fontSize(9).fillColor(INK)
    .text('Branch: Hare Krishna Land, Off ECR, Bhaktivedanta Swami Rd., Akkarai, Sholinghanallur, Chennai - 600119',
      115, doc.y, { width: W - 75, align: 'center' })
    .text('Mobile: 6385042108  ·  E-mail: info@iskconchennai.org', { width: W - 75, align: 'center' });

  let y = 135;
  doc.roundedRect(40, y, W, 26, 4).stroke(RED);
  doc.fillColor(RED).font('Helvetica-Bold').fontSize(11)
    .text(`Donation Receipt No.  ${d.receipt_no}`, 52, y + 7, { continued: false });
  const dt = d.donated_on instanceof Date ? d.donated_on : new Date(d.donated_on);
  doc.text(`Date: ${dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
    40, y + 7, { width: W - 12, align: 'right' });
  doc.fillColor('#B850A0').fontSize(8).text("DONOR'S COPY", 40, y + 30, { width: W, align: 'right' });

  y += 44;
  doc.roundedRect(40, y, W, 34, 4).stroke(RED);
  doc.fillColor(RED).font('Helvetica-Bold').fontSize(9).text('Donation Amount in Rupees', 52, y - 5, { width: 200 });
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(13)
    .text(`Rs. ${Number(d.amount).toLocaleString('en-IN')}/-   (Rupees ${amountInWords(d.amount)} only)`, 52, y + 10);

  y += 50;
  const colW = W / 2 - 8;
  doc.roundedRect(40, y, colW, 150, 4).stroke(RED);
  doc.fillColor(RED).font('Helvetica-Bold').fontSize(9).text('Donor Details (T&C below for 80G/10BE)', 52, y - 5);
  const addr = [d.address_line, d.area, d.city, d.state].filter(Boolean).join(', ');
  doc.fillColor(INK).font('Helvetica').fontSize(9.5);
  const L = (label, val, yy) => {
    doc.font('Helvetica-Bold').text(label, 52, yy, { width: 60 });
    doc.font('Helvetica').text(val || '—', 112, yy, { width: colW - 84 });
    return doc.y + 4;
  };
  let ly = y + 12;
  ly = L('Name', d.full_name, ly);
  ly = L('Address', addr, ly);
  ly = L('PIN', d.pincode, ly);
  ly = L('PAN', d.pan, ly);
  ly = L('Mobile', d.mobile_e164, ly);
  L('E-mail', d.email, ly);

  const rx = 40 + colW + 16;
  const R = (label, val, yy, h = 40) => {
    doc.roundedRect(rx, yy, colW, h, 4).stroke(RED);
    doc.fillColor(RED).font('Helvetica-Bold').fontSize(9).text(label, rx + 10, yy - 5);
    doc.fillColor(INK).font('Helvetica').fontSize(9.5).text(val || '—', rx + 10, yy + 10, { width: colW - 20 });
    return yy + h + 14;
  };
  let ry = y;
  ry = R('Mode of Payment', d.payment_mode === 'upi' ? 'Online / UPI' : 'Online', ry, 34);
  ry = R('Payment Details (Transaction)', `${(d.gateway || '').toUpperCase()} · ${d.txn_ref || ''}`, ry, 40);
  R('Purpose of Donation', d.purpose, ry, 40);

  y += 168;
  doc.roundedRect(40, y, W, 30, 4).fillAndStroke('#FDF6D8', '#C9A227');
  doc.fillColor(INK).fontSize(7.5).font('Helvetica')
    .text('Registered Office: Hare Krishna Land, Juhu, Mumbai - 400 049. Registered under Maharashtra Public Trust Act 1950, Regn. No.: F-2179 (Bom).', 50, y + 6, { width: W - 20, align: 'center' })
    .text('Unique Regn. No. (80G): AAATI0017PF20219', { width: W - 20, align: 'center' });

  y += 44;
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(9).text('Terms and Conditions (T&C):', 40, y);
  doc.font('Helvetica').fontSize(8).moveDown(0.3);
  [
    'This donation receipt is an acknowledgement only and not for the purpose of claiming 80G deduction.',
    'Form No. 10BE (certificate of donation under section 80G) will be issued as per the Income-tax Act, 1961 — generally by 31st May of the following financial year.',
    'Full legal name and address with PIN are required for all donations. PAN is compulsory to obtain Form No. 10BE.',
    'PAN is compulsory for all donations of Rs. 50,000/- or more. Form 10BE is not available for cash donations.',
    '10BE is available in PDF only — please ensure your WhatsApp number and e-mail are correct.',
    'In case of any error in this receipt, contact the receipt issuing centre for correction.',
  ].forEach((t) => doc.text(`•  ${t}`, { width: W, lineGap: 1.5 }));

  doc.moveDown(1);
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(MAROON)
    .text('HARE KRISHNA HARE KRISHNA KRISHNA KRISHNA HARE HARE', { width: W, align: 'center' })
    .text('HARE RAMA HARE RAMA RAMA RAMA HARE HARE', { width: W, align: 'center' });
  doc.font('Helvetica').fontSize(8.5).fillColor(INK).text('and be happy.', { width: W, align: 'center' });

  doc.end();
  return doc;
}
