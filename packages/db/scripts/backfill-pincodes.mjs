#!/usr/bin/env node
/**
 * Pulls the PIN out of person.address_line and fills pincode, city, district
 * and state from the India Post directory.
 *
 *   npm run backfill-pincodes                        # dry run
 *   npm run backfill-pincodes -- --commit
 *   npm run backfill-pincodes -- --csv review.csv    # the awkward ones
 *   npm run backfill-pincodes -- --apply review.csv --commit
 *
 * The donations import put the whole address in one column, PIN included.
 * 98.1% of address lines yield a PIN, so this is a parse, not a re-import.
 *
 * THREE CATEGORIES, and only the first is automatic:
 *
 *   clean      exactly one six-digit number, and India Post knows it.
 *   ambiguous  more than one candidate — a door number, a phone, a year.
 *              Written to the CSV with the address so a human can pick.
 *   unknown    a PIN was found but no such post office exists. Usually a
 *              typo. Also goes to the CSV.
 *
 * Nothing is overwritten: every write is WHERE the column IS NULL. Someone
 * who has already corrected an address by hand keeps their correction.
 */

import { writeFile, readFile, stat } from 'node:fs/promises';
import pg from 'pg';
import { pgConfig } from './pg-ssl.mjs';

const has = (f) => process.argv.includes(`--${f}`);
const val = (f, d) => {
  const i = process.argv.indexOf(`--${f}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const COMMIT = has('commit');
const CSV = val('csv', null);
const APPLY = val('apply', null);

if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is not set.'); process.exit(1); }

// A PIN never starts with 0, and must not be part of a longer run of digits —
// otherwise a phone number donates its middle six.
const PIN_ALL = /(?<![0-9])([1-9][0-9]{5})(?![0-9])/g;

const csvCell = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const client = new pg.Client(pgConfig());
await client.connect();

// ------------------------------------------------------------------ apply
if (APPLY) {
  try { await stat(APPLY); } catch { console.error(`Not found: ${APPLY}`); process.exit(1); }
  const lines = (await readFile(APPLY, 'utf8')).split(/\r?\n/).filter((l) => l.trim());
  const head = lines.shift().replace(/^﻿/, '').split(',').map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''));
  const iId = head.indexOf('person_id');
  const iPin = head.indexOf('use_pincode');
  if (iId < 0 || iPin < 0) {
    console.error('The CSV needs person_id and use_pincode columns.');
    process.exit(1);
  }
  const picks = [];
  for (const line of lines) {
    const c = line.split(',').map((x) => x.trim().replace(/^"|"$/g, ''));
    const pin = (c[iPin] || '').replace(/\D/g, '');
    if (/^[1-9][0-9]{5}$/.test(pin)) picks.push([c[iId], pin]);
  }
  console.log(`${lines.length} rows, ${picks.length} with a usable PIN.`);
  if (!COMMIT) { console.log('Dry run. Add --commit to apply.'); await client.end(); process.exit(0); }

  let done = 0;
  await client.query('BEGIN');
  try {
    for (const [id, pin] of picks) {
      const r = await client.query(
        `UPDATE person p SET
            pincode  = COALESCE(p.pincode, $2),
            city     = COALESCE(p.city, po.district),
            state    = COALESCE(p.state, po.state)
           FROM resolve_pincode($2) po
          WHERE p.id = $1`, [id, pin]);
      done += r.rowCount;
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`Failed after ${done}, nothing changed:`, err.message);
    await client.end(); process.exit(1);
  }
  console.log(`Updated ${done}.`);
  await client.end(); process.exit(0);
}

// ------------------------------------------------------------------- scan
const { rows } = await client.query(
  `SELECT id, person_no, full_name, address_line, pincode, city, state
     FROM person
    WHERE is_active
      AND address_line IS NOT NULL AND btrim(address_line) <> ''
      AND pincode IS NULL`);

// Every PIN India Post knows, in one hit — 165k integers is a few MB and
// beats 5,000 round trips.
const { rows: poRows } = await client.query(
  `SELECT pincode, min(district) AS district, min(state) AS state
     FROM post_offices GROUP BY pincode`);
const known = new Map(poRows.map((r) => [String(r.pincode), r]));

const clean = [];
const review = [];
for (const p of rows) {
  const found = [...new Set((p.address_line.match(PIN_ALL) || []))];
  const valid = found.filter((f) => known.has(f));

  if (found.length === 1 && valid.length === 1) {
    clean.push({ ...p, pin: valid[0], ...known.get(valid[0]) });
  } else if (valid.length === 1) {
    // Several candidates but only one is a real PIN — still safe.
    clean.push({ ...p, pin: valid[0], ...known.get(valid[0]) });
  } else {
    review.push({
      ...p,
      why: found.length === 0 ? 'no six-digit number found'
        : valid.length === 0 ? 'number found but no such post office'
          : `${valid.length} valid PINs in one address`,
      candidates: found.join(' '),
    });
  }
}

console.log(`Addresses without a PIN column   ${rows.length.toLocaleString()}`);
console.log(`  resolved automatically         ${clean.length.toLocaleString()}`);
console.log(`  need a human                   ${review.length.toLocaleString()}`);
if (review.length) {
  const by = {};
  for (const r of review) by[r.why] = (by[r.why] || 0) + 1;
  for (const [w, n] of Object.entries(by)) console.log(`    ${w}: ${n}`);
}

if (CSV) {
  const head = ['use_pincode', 'why', 'candidates', 'person_no', 'name', 'address_line', 'person_id'];
  const body = review.map((r) => [
    '', r.why, r.candidates, r.person_no, r.full_name, r.address_line, r.id,
  ].map(csvCell).join(','));
  await writeFile(CSV, `﻿${[head.join(','), ...body].join('\n')}\n`, 'utf8');
  console.log(`\nWrote ${CSV}`);
  console.log('Put the correct six digits in use_pincode (leave blank to skip), then:');
  console.log(`  npm run backfill-pincodes -- --apply ${CSV} --commit`);
}

if (!COMMIT) {
  console.log('\nDry run. Nothing was written. Add --commit to apply the resolved ones.');
  await client.end();
  process.exit(0);
}

let done = 0;
await client.query('BEGIN');
try {
  for (const c of clean) {
    const r = await client.query(
      `UPDATE person SET
          pincode = COALESCE(pincode, $2),
          city    = COALESCE(city, $3),
          state   = COALESCE(state, $4)
        WHERE id = $1`, [c.id, c.pin, c.district, c.state]);
    done += r.rowCount;
    if (done % 1000 === 0) process.stdout.write(`  ${done}…\n`);
  }
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  console.error(`\nFailed after ${done}, nothing changed:`, err.message);
  await client.end(); process.exit(1);
}

const s = await client.query(
  `SELECT count(*) FILTER (WHERE pincode ~ '^[0-9]{6}$') AS with_pin,
          count(*) FILTER (WHERE state IS NOT NULL) AS with_state,
          count(*) FILTER (WHERE pincode ~ '^[0-9]{6}$'
                 AND EXISTS (SELECT 1 FROM post_offices po
                              WHERE po.pincode = person.pincode::int AND po.smc_serviceable)) AS smc_deliverable
     FROM person`);
console.log(`\nUpdated ${done}.`);
console.log(`  with a PIN        ${Number(s.rows[0].with_pin).toLocaleString()}`);
console.log(`  with a state      ${Number(s.rows[0].with_state).toLocaleString()}`);
console.log(`  SMC deliverable   ${Number(s.rows[0].smc_deliverable).toLocaleString()}`);

await client.end();
