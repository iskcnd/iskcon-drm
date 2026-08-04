#!/usr/bin/env node
/**
 * Loads the India Post PIN directory and Sri Maruti Courier's serviceable
 * areas into post_offices.
 *
 *   DATABASE_URL="postgres://..." npm run load-pincodes -w @iskcon/db
 *
 * Optional paths (defaults are the two files in the CRM folder):
 *   --pincodes ../IndianPincodes.csv  --courier ../Courrier_delivary_areas.csv
 *
 * Reference data, not devotee data: no PII, so it is safe to reload at will.
 * The whole load runs in one transaction and replaces the table's contents —
 * a half-applied PIN directory is worse than yesterday's, because an address
 * would silently resolve to nothing and be sent to Zoho blank.
 *
 * COPY, not INSERT: 165,000 rows one statement at a time takes minutes over a
 * pooled connection and hammers the row limit on a serverless plan.
 */

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import readline from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { pgConfig } from './pg-ssl.mjs';
import { from as copyFrom } from 'pg-copy-streams';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoParent = path.resolve(here, '..', '..', '..', '..');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const PINCODES = arg('pincodes', path.join(repoParent, 'IndianPincodes.csv'));
const COURIER = arg('courier', path.join(repoParent, 'Courrier_delivary_areas.csv'));

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

/**
 * Minimal CSV line splitter: handles quoted fields containing commas, which
 * office names do ("Fort St. George, H.O"). Not a general CSV parser — these
 * two files have no embedded newlines.
 */
function splitCsv(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i += 1; } else { quoted = false; }
      } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

const clean = (v) => {
  const s = (v ?? '').trim();
  return s === '' || s.toUpperCase() === 'NA' || s.toUpperCase() === 'NULL' ? null : s;
};
const num = (v) => {
  const s = clean(v);
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
/** COPY text format: \N is NULL, and tab/newline/backslash must be escaped. */
const tsv = (v) => (v === null || v === undefined
  ? '\\N'
  : String(v).replace(/\\/g, '\\\\').replace(/\t/g, ' ').replace(/[\r\n]+/g, ' '));

async function readCourier(file) {
  const byPin = new Map();
  const rl = readline.createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  let header = null;
  for await (const raw of rl) {
    // The file opens with a "Pincode Details" banner row before the real
    // header, and carries a UTF-8 BOM.
    const line = raw.replace(/^﻿/, '');
    if (!line.trim() || /^,*$/.test(line)) continue;
    const cols = splitCsv(line);
    if (!header) {
      if (cols.some((c) => /^pincode$/i.test(c))) {
        header = cols.map((c) => c.toLowerCase());
      }
      continue;
    }
    const pinIdx = header.findIndex((c) => c === 'pincode');
    const typeIdx = header.findIndex((c) => c.includes('area type'));
    const dayIdx = header.findIndex((c) => c.includes('transit') || c.includes('days'));

    const pin = num(cols[pinIdx]);
    if (!pin) continue;
    const areaType = clean(cols[typeIdx]);
    const days = num(cols[dayIdx]);

    // A PIN can appear more than once. Keep the best offer: serviceable beats
    // not, and fewer days beats more — a clerk quoting the slower of two true
    // answers is merely cautious; quoting "we don't deliver" when we do loses
    // the parcel entirely.
    const serviceable = areaType ? !/NON[\s-]*DELIVERY/i.test(areaType) : null;
    const prev = byPin.get(pin);
    if (!prev
      || (serviceable && !prev.serviceable)
      || (serviceable === prev.serviceable && days !== null
          && (prev.days === null || days < prev.days))) {
      byPin.set(pin, { serviceable, days, areaType });
    }
  }
  return byPin;
}

async function* pincodeRows(file, courier) {
  const rl = readline.createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  let idx = null;
  let kept = 0; let skipped = 0;
  for await (const raw of rl) {
    const line = raw.replace(/^﻿/, '');
    if (!line.trim()) continue;
    const cols = splitCsv(line);
    if (!idx) {
      const h = cols.map((c) => c.toLowerCase());
      idx = {
        circle: h.indexOf('circlename'), region: h.indexOf('regionname'),
        division: h.indexOf('divisionname'), office: h.indexOf('officename'),
        pincode: h.indexOf('pincode'), officetype: h.indexOf('officetype'),
        delivery: h.indexOf('delivery'), district: h.indexOf('district'),
        state: h.indexOf('statename'), lat: h.indexOf('latitude'), lng: h.indexOf('longitude'),
      };
      if (idx.pincode < 0 || idx.office < 0) {
        throw new Error(`${file}: expected columns officename and pincode, got: ${cols.join(', ')}`);
      }
      continue;
    }
    const pin = num(cols[idx.pincode]);
    const office = clean(cols[idx.office]);
    if (!pin || !office) { skipped += 1; continue; }
    const c = courier.get(pin) || {};

    // Coordinates in this file are occasionally junk (0,0 or out of range).
    // A wrong coordinate sent to Zoho is worse than none.
    let lat = num(cols[idx.lat]);
    let lng = num(cols[idx.lng]);
    if (lat === null || lng === null || (lat === 0 && lng === 0)
      || lat < 6 || lat > 38 || lng < 68 || lng > 98) { lat = null; lng = null; }

    kept += 1;
    yield `${[
      pin, tsv(office), tsv(clean(cols[idx.officetype])), tsv(clean(cols[idx.delivery])),
      tsv(clean(cols[idx.division])), tsv(clean(cols[idx.region])), tsv(clean(cols[idx.circle])),
      tsv(clean(cols[idx.district])), tsv(clean(cols[idx.state])), tsv(lat), tsv(lng),
      c.serviceable === undefined || c.serviceable === null ? '\\N' : String(c.serviceable),
      tsv(c.days ?? null), tsv(c.areaType ?? null),
    ].join('\t')}\n`;
    if (kept % 25000 === 0) process.stdout.write(`  ${kept.toLocaleString()} rows…\n`);
  }
  process.stdout.write(`  ${kept.toLocaleString()} rows read, ${skipped} skipped\n`);
}

for (const f of [PINCODES, COURIER]) {
  try { await stat(f); } catch {
    console.error(`Not found: ${f}\nPass --pincodes and --courier if the files live elsewhere.`);
    process.exit(1);
  }
}

const client = new pg.Client(pgConfig());
await client.connect();

console.log(`Courier areas  ${COURIER}`);
const courier = await readCourier(COURIER);
console.log(`  ${courier.size.toLocaleString()} PIN codes listed by SMC`);

console.log(`PIN directory  ${PINCODES}`);
try {
  await client.query('BEGIN');
  await client.query('TRUNCATE post_offices RESTART IDENTITY');
  const stream = client.query(copyFrom(
    `COPY post_offices (pincode, office_name, office_type, delivery_type,
       division_name, region_name, circle_name, district, state, latitude, longitude,
       smc_serviceable, smc_transit_days, smc_area_type)
     FROM STDIN WITH (FORMAT text, NULL '\\N')`));
  await pipeline(Readable.from(pincodeRows(PINCODES, courier)), stream);
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('\nLoad failed, nothing changed:', err.message);
  await client.end();
  process.exit(1);
}

const { rows } = await client.query(
  `SELECT count(*) AS offices, count(DISTINCT pincode) AS pincodes,
          count(*) FILTER (WHERE smc_serviceable) AS smc_yes,
          count(*) FILTER (WHERE smc_serviceable IS FALSE) AS smc_no,
          count(*) FILTER (WHERE latitude IS NOT NULL) AS with_coords
     FROM post_offices`);
const r = rows[0];
console.log(`\nLoaded ${Number(r.offices).toLocaleString()} offices across `
  + `${Number(r.pincodes).toLocaleString()} PIN codes`);
console.log(`  ${Number(r.with_coords).toLocaleString()} with coordinates`);
console.log(`  SMC delivers: ${Number(r.smc_yes).toLocaleString()} offices, `
  + `listed as non-delivery: ${Number(r.smc_no).toLocaleString()}`);

await client.end();
