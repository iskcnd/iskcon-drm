import JSZip from 'jszip';

/**
 * Personalised letters from a Word template.
 *
 * A .docx is a zip of XML. Merging is: open the zip, replace {{placeholders}}
 * in the document body, write it back. No Word, no LibreOffice, no rendering
 * — the temple's own letterhead, fonts and layout survive untouched because
 * we never re-lay-out the document, we only substitute text.
 *
 * THE HARD PART is that Word splits a run of text wherever formatting changes
 * or the spellchecker paused, so "{{donor_name}}" is very often stored as
 * several <w:t> elements: "{{donor", "_", "name}}". A naive replace finds
 * nothing and the letter goes out with the placeholder still printed on it.
 * So placeholders are stitched back together across runs before substitution.
 */

const FIELD = /\{\{\s*([a-zA-Z0-9_ .-]+?)\s*\}\}/g;

/** XML-escape a value going into a document. */
const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Rejoin placeholders that Word has split across <w:t> runs.
 *
 * Works on the raw XML: find a "{{" that has no matching "}}" before the next
 * "{{", and pull the intervening tags out so the braces become adjacent. The
 * text keeps its formatting from the first run, which is what a person
 * editing the template would expect.
 */
export function healSplitFields(xml) {
  let out = xml;
  let guard = 0;
  for (;;) {
    // A "{{" followed by tags before its "}}".
    const m = out.match(/\{\{((?:(?!\}\})[\s\S]){0,400}?)\}\}/);
    if (!m) break;
    if (!m[1].includes('<')) {
      // Already clean — skip past it and look for the next one.
      const idx = out.indexOf(m[0]);
      const head = out.slice(0, idx + m[0].length);
      const tail = out.slice(idx + m[0].length);
      const healedTail = healSplitFields(tail);
      return head + healedTail;
    }
    // Strip the tags inside the braces, leaving just the field name.
    const cleaned = `{{${m[1].replace(/<[^>]*>/g, '')}}}`;
    out = out.replace(m[0], cleaned);
    guard += 1;
    if (guard > 5000) break;
  }
  return out;
}

/** Every placeholder a template uses — for showing the operator what it needs. */
export function fieldsUsed(xml) {
  const healed = healSplitFields(xml);
  const found = new Set();
  let m;
  FIELD.lastIndex = 0;
  while ((m = FIELD.exec(healed)) !== null) found.add(m[1].trim());
  return [...found];
}

/**
 * Merge one letter.
 *
 * @param {Buffer} templateBuf  the .docx
 * @param {object} values       {donor_name: 'Ramesh', ...}
 * @param {object} opts         {strict:true} throws on an unknown placeholder
 * @returns {Promise<Buffer>}
 */
export async function mergeLetter(templateBuf, values, opts = {}) {
  const zip = await JSZip.loadAsync(templateBuf);
  // Headers and footers carry the letterhead and sometimes the date, so they
  // get merged too — a letter dated with a raw {{dispatch_date}} in the header
  // is exactly as wrong as one in the body.
  const parts = Object.keys(zip.files).filter(
    (n) => /^word\/(document|header\d*|footer\d*)\.xml$/.test(n));
  if (!parts.length) throw new Error('That does not look like a .docx — no word/document.xml inside');

  const missing = new Set();
  for (const name of parts) {
    const xml = healSplitFields(await zip.file(name).async('string'));
    const merged = xml.replace(FIELD, (whole, key) => {
      const k = key.trim();
      if (k in values) return esc(values[k]);
      const ci = Object.keys(values).find((x) => x.toLowerCase() === k.toLowerCase());
      if (ci) return esc(values[ci]);
      missing.add(k);
      // Leave it visible rather than blanking it: a letter with
      // "{{gift_name}}" printed on it gets noticed and reprinted; a letter
      // with a silent gap does not.
      return whole;
    });
    zip.file(name, merged);
  }

  if (missing.size && opts.strict) {
    throw new Error(`Template uses placeholders with no value: ${[...missing].join(', ')}`);
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

/**
 * Merge a letter per parcel and return a zip of them.
 * @param {Function} onProgress optional (done, total)
 */
export async function mergeBatch(templateBuf, rows, opts = {}) {
  const out = new JSZip();
  let n = 0;
  for (const row of rows) {
    const buf = await mergeLetter(templateBuf, row.values, opts);
    // Parcel number first so the letters sort into the same order as the
    // labels — they are stuffed into envelopes together.
    const safe = String(row.filename || `${row.values.parcel_no}-${row.values.donor_name}`)
      .replace(/[^\w .-]+/g, '_').slice(0, 80);
    out.file(`${safe}.docx`, buf);
    n += 1;
    if (opts.onProgress) opts.onProgress(n, rows.length);
  }
  return out.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

/** The values a letter template may use. Kept beside the merge, not in a doc. */
export const LETTER_FIELDS = [
  ['donor_name', 'Name on the parcel'],
  ['amount', 'Consolidated amount, e.g. ₹5,001'],
  ['amount_words', 'Amount in words'],
  ['band', 'Donation band A–F'],
  ['receipt_nos', 'Every receipt number, comma separated'],
  ['tracking_id', 'Courier tracking number'],
  ['parcel_no', 'Parcel number'],
  ['dispatch_date', 'Date sent, 05-Aug-2026'],
  ['gifts', 'What is in the parcel'],
  ['address', 'Full postal address'],
  ['temple_name', 'ISKCON Chennai'],
  ['temple_address', 'The temple’s own address block'],
];
