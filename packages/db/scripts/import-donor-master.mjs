#!/usr/bin/env node
/**
 * Backfills PAN (and address, where we have none) from Zoho's Donor Master
 * Report onto existing person rows.
 *
 *   DATABASE_URL="postgres://..." npm run import-donor-master            # dry run
 *   DATABASE_URL="postgres://..." npm run import-donor-master -- --commit
 *
 *   --file "../Donor Master Report.xlsx"   (default: that path)
 *
 * DRY RUN BY DEFAULT. It prints exactly what it would change and writes
 * nothing until --commit is passed. This touches 12,000 devotee records; the
 * cost of looking first is thirty seconds.
 *
 * Three rules, none of them negotiable:
 *
 *  1. NEVER overwrite a value we already hold. Every write is
 *     `WHERE column IS NULL`. The donation page and the temple's own staff
 *     are better sources than a report export, and a backfill that clobbers
 *     a hand-corrected PAN is worse than no backfill.
 *
 *  2. NEVER create a person. This file is a backfill, not an import. A row
 *     that matches nobody is reported and skipped — creating donors from it
 *     would duplicate half the database, since the same people already came
 *     in through the donations import.
 *
 *  3. Match on mobile AND name. 1,110 of these rows share a phone number
 *     with another row, because families share numbers — which is exactly
 *     why person.mobile is not unique. Matching on phone alone would put a
 *     father's PAN on his daughter's record.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stat } from 'node:fs/promises';
import pg from 'pg';
import ExcelJS from 'exceljs';
import { pgConfig } from './pg-ssl.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoParent = path.resolve(here, '..', '..', '..', '..');

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const COMMIT = process.argv.includes('--commit');
const FILE = arg('file', path.join(repoParent, 'Donor Master Report.xlsx'));

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}
try { await stat(FILE); } catch {
  console.error(`Not found: ${FILE}\nPass --file "path/to/Donor Master Report.xlsx"`);
  process.exit(1);
}

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const PIN_RE = /(?:^|[^0-9])([1-9][0-9]{5})(?:[^0-9]|$)/;

/** Same rule as ops-donate.normName — "  Ramesh   Kumar " === "ramesh kumar". */
const normName = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const txt = (v) => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return String(v.text ?? v.result ?? v.richText?.map((r) => r.text).join('') ?? '').trim();
  return String(v).trim();
};

console.log(`Reading  ${FILE}`);
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(FILE);
const ws = wb.worksheets[0];

// Read the header row rather than assuming positions — the export's column
// order is Zoho's to change, not ours.
const head = {};
ws.getRow(1).eachCell((cell, col) => { head[txt(cell.value).toLowerCase()] = col; });
const col = (...names) => {
  for (const n of names) {
    const hit = Object.keys(head).find((h) => h === n || h.startsWith(n));
    if (hit) return head[hit];
  }
  return null;
};
const C = {
  name: col('name'), phone: col('phone'), email: col('email'),
  address: col('address'), pan: col('pan'),
};
if (!C.name || !C.phone) {
  console.error(`Expected "Name" and "Phone" columns. Found: ${Object.keys(head).join(', ')}`);
  process.exit(1);
}

const rows = [];
const stats = { read: 0, noPan: 0, badPan: 0 };
ws.eachRow((row, n) => {
  if (n === 1) return;
  const name = txt(row.getCell(C.name).value);
  const phone = txt(row.getCell(C.phone).value);
  if (!name || !phone) return;
  stats.read += 1;

  const pan = C.pan ? txt(row.getCell(C.pan).value).toUpperCase().replace(/\s+/g, '') : '';
  if (!pan) stats.noPan += 1;
  else if (!PAN_RE.test(pan)) { stats.badPan += 1; }

  rows.push({
    name,
    key: normName(name),
    // Last ten digits: the file is E.164 but a stray space or a 0-prefix
    // should not cost a match.
    digits: phone.replace(/\D/g, '').slice(-10),
    email: C.email ? txt(row.getCell(C.email).value).toLowerCase() : '',
    address: C.address ? txt(row.getCell(C.address).value) : '',
    pan: PAN_RE.test(pan) ? pan : null,
  });
});

console.log(`  ${stats.read.toLocaleString()} donor rows`);
console.log(`  PAN: ${rows.filter((r) => r.pan).length} usable, `
  + `${stats.badPan} rejected on format, ${stats.noPan} blank`);

const client = new pg.Client(pgConfig());
await client.connect();

// Everything we might match against, in one query. 16k rows is nothing to
// hold in memory and it saves 12,000 round trips.
const people = await client.query(
  `SELECT id, full_name, mobile_e164, alt_mobile_e164, email, pan, address_line, pincode
     FROM person WHERE is_active`);

const byDigits = new Map();
for (const p of people.rows) {
  for (const m of [p.mobile_e164, p.alt_mobile_e164]) {
    if (!m) continue;
    const d = String(m).replace(/\D/g, '').slice(-10);
    if (!d) continue;
    if (!byDigits.has(d)) byDigits.set(d, []);
    byDigits.get(d).push(p);
  }
}

const plan = { pan: [], address: [] };
const skip = { noMatch: 0, nameMismatch: 0, panAlready: 0, addrAlready: 0, nothingToGive: 0 };
const conflicts = [];
const nearMiss = [];

for (const r of rows) {
  const candidates = byDigits.get(r.digits) || [];
  if (!candidates.length) { skip.noMatch += 1; continue; }

  // Rule 3: phone AND name, with nothing else accepted.
  //
  // There was an email fallback here and a test caught it doing the wrong
  // thing: a row whose name did not match still had its PAN written, because
  // the email agreed. Families share an email as readily as they share a
  // phone, so that fallback could put a father's PAN on his daughter's
  // record. A PAN is what Form 10BE is issued against — attributing one to
  // the wrong devotee is a tax error in their name, not a tidiness problem.
  //
  // Near-misses are reported below rather than guessed at.
  const person = candidates.find((p) => normName(p.full_name) === r.key);
  if (!person) {
    skip.nameMismatch += 1;
    if (r.pan) nearMiss.push(r.name);
    continue;
  }

  let gave = false;
  if (r.pan) {
    if (!person.pan) { plan.pan.push([person.id, r.pan]); gave = true; }
    else if (person.pan.toUpperCase() !== r.pan) {
      conflicts.push({ person_no: person.id, held: person.pan, file: r.pan });
    } else skip.panAlready += 1;
  }
  if (r.address && !person.address_line) { plan.address.push([person.id, r.address]); gave = true; }
  else if (r.address) skip.addrAlready += 1;
  if (!gave && !r.pan && !r.address) skip.nothingToGive += 1;
}

console.log('\nWould write:');
console.log(`  PAN onto      ${plan.pan.length.toLocaleString()} people (currently NULL)`);
console.log(`  Address onto  ${plan.address.length.toLocaleString()} people (currently NULL)`);
console.log('\nSkipped:');
console.log(`  no person with that mobile      ${skip.noMatch.toLocaleString()}`);
console.log(`  mobile matched, name did not    ${skip.nameMismatch.toLocaleString()}`);
console.log(`  PAN already held, identical     ${skip.panAlready.toLocaleString()}`);
console.log(`  address already held            ${skip.addrAlready.toLocaleString()}`);
if (nearMiss.length) {
  console.log(`\n  ${nearMiss.length} rows carry a PAN but no person matched on mobile AND name.`);
  console.log('  Not written. These are the ones worth a human eye — most will be');
  console.log('  a spelling difference between Zoho and our record.');
}
if (conflicts.length) {
  console.log(`\n  ${conflicts.length} PAN CONFLICTS — we hold a different PAN. Left untouched.`);
  console.log('  Review these by hand; one of the two is wrong.');
}

if (!COMMIT) {
  console.log('\nDry run. Nothing was written. Re-run with --commit to apply.');
  await client.end();
  process.exit(0);
}

try {
  await client.query('BEGIN');
  // PII: set the actor so audit.change_log records who ran this.
  await client.query("SELECT set_config('app.actor_id', '', true)");

  for (const [id, pan] of plan.pan) {
    await client.query('UPDATE person SET pan = $2 WHERE id = $1 AND pan IS NULL', [id, pan]);
  }
  for (const [id, addr] of plan.address) {
    await client.query(
      'UPDATE person SET address_line = $2 WHERE id = $1 AND address_line IS NULL', [id, addr]);
  }
  await client.query('COMMIT');
  console.log('\nCommitted.');
} catch (err) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('\nFailed, nothing changed:', err.message);
  await client.end();
  process.exit(1);
}

const after = await client.query(
  `SELECT count(*) FILTER (WHERE pan IS NOT NULL) AS with_pan,
          count(*) FILTER (WHERE address_line IS NOT NULL AND btrim(address_line) <> '') AS with_address
     FROM person`);
console.log(`  person.pan now on     ${Number(after.rows[0].with_pan).toLocaleString()} records`);
console.log(`  person.address now on ${Number(after.rows[0].with_address).toLocaleString()} records`);

await client.end();
