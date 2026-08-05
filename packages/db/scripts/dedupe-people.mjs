#!/usr/bin/env node
/**
 * Merges duplicate devotee records.
 *
 *   npm run dedupe-people                    # dry run, exact name+mobile
 *   npm run dedupe-people -- --commit
 *   npm run dedupe-people -- --fuzzy --csv review.csv     # export for review
 *   npm run dedupe-people -- --apply review.csv --commit  # apply your edits
 *
 * Run it again after every import. The donations import created a person per
 * row instead of matching existing devotees, and more datasets are coming —
 * this is meant to be routine, not a one-off rescue.
 *
 * TWO PASSES, deliberately separated:
 *
 *   exact  — same name, same mobile. Safe to run unattended. Verified on a
 *            Neon branch over the real database: 2,935 merges, donation count
 *            and total rupees unchanged to the paisa, zero orphans.
 *
 *   fuzzy  — same mobile, names that look like the same person. NEVER merged
 *            automatically. It writes a CSV with one row per candidate pair
 *            and a MERGE column for you to fill in. Nothing happens until you
 *            hand the file back with --apply.
 *
 * Every merge is logged with a full snapshot of the record removed and the id
 * of every donation moved, so unmerge_person(log_id) puts it all back.
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
const FUZZY = has('fuzzy');
const CSV = val('csv', null);
const APPLY = val('apply', null);

if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is not set.'); process.exit(1); }

/** Same rule the donation page uses to decide two names are the same person. */
const norm = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const digits = (v) => String(v || '').replace(/\D/g, '').slice(-10);

/**
 * Do two names on the same phone plausibly belong to one devotee?
 *
 * Deliberately generous, because a human reads every result. It is looking for
 * the ways the same name gets typed twice, not for similar-sounding people:
 *   - one is contained in the other      "Ramesh" / "Ramesh Kumar"
 *   - same words, different order        "Kumar Ramesh"
 *   - initials expanded                  "R Kumar" / "Ramesh Kumar"
 *   - one character out                  "Rmaesh Kumar"
 */
function looksSame(a, b) {
  if (!a || !b || a === b) return false;
  if (a.startsWith(b) || b.startsWith(a)) return 'prefix';
  const wa = a.split(' ').filter(Boolean);
  const wb = b.split(' ').filter(Boolean);
  if (wa.length && wa.length === wb.length && [...wa].sort().join(' ') === [...wb].sort().join(' ')) return 'reordered';
  const initials = (w, o) => w.length === o.length
    && w.every((x, i) => x === o[i] || (x.length === 1 && o[i].startsWith(x)) || (o[i].length === 1 && x.startsWith(o[i])));
  if (wa.length && initials(wa, wb)) return 'initials';
  // One character apart is only meaningful on a reasonably long name. On short
  // ones it is noise, and worse than noise: "Sita Devi" and "Gita Devi" are one
  // character apart and are two different people. Six characters is the point
  // where a single difference is more likely a slip than a different name —
  // and every one of these is still read by a human before it merges.
  if (a.length >= 6 && b.length >= 6) {
    if (Math.abs(a.length - b.length) <= 1 && lev(a, b) === 1) return 'typo';
    if (swapped(a, b)) return 'transposed';
  }
  return false;
}

/**
 * Two adjacent characters swapped — "Rmaesh" for "Ramesh".
 *
 * Plain Levenshtein scores a transposition as two edits, so the typo check
 * above misses it. It is the single commonest way a name gets mistyped, so it
 * gets its own test rather than a looser edit-distance threshold that would
 * also drag in genuinely different names.
 */
function swapped(a, b) {
  if (a.length !== b.length) return false;
  const diff = [];
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) diff.push(i);
  return diff.length === 2
    && diff[1] === diff[0] + 1
    && a[diff[0]] === b[diff[1]]
    && a[diff[1]] === b[diff[0]];
}

/** Levenshtein, bailing out as soon as it exceeds 1 — we only care about 1. */
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 1) return 9;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  let j = 0;
  while (j < a.length - i && j < b.length - i && a[a.length - 1 - j] === b[b.length - 1 - j]) j += 1;
  const ra = a.length - i - j;
  const rb = b.length - i - j;
  return (ra <= 1 && rb <= 1) ? Math.max(ra, rb) : 9;
}

const csvCell = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const client = new pg.Client(pgConfig());
await client.connect();

const { rows: people } = await client.query(
  `SELECT p.id, p.person_no, p.full_name, p.mobile_e164, p.email, p.pan,
          p.address_line, p.created_at,
          (SELECT count(*) FROM donation d WHERE d.person_id = p.id) AS gifts,
          (SELECT coalesce(sum(d.amount),0) FROM donation d WHERE d.person_id = p.id) AS total
     FROM person p
    WHERE p.is_active AND p.mobile_e164 IS NOT NULL
    ORDER BY p.person_no`);

// Group by phone once; both passes work inside a phone group.
const byPhone = new Map();
for (const p of people) {
  const d = digits(p.mobile_e164);
  if (!d) continue;
  if (!byPhone.has(d)) byPhone.set(d, []);
  byPhone.get(d).push({ ...p, nm: norm(p.full_name) });
}

// ------------------------------------------------------------------- apply
if (APPLY) {
  try { await stat(APPLY); } catch { console.error(`Not found: ${APPLY}`); process.exit(1); }
  const text = await readFile(APPLY, 'utf8');
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const head = lines.shift().split(',').map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''));
  const iKeep = head.indexOf('keep_id');
  const iDrop = head.indexOf('drop_id');
  const iMerge = head.indexOf('merge');
  if (iKeep < 0 || iDrop < 0 || iMerge < 0) {
    console.error('The CSV needs keep_id, drop_id and MERGE columns.');
    process.exit(1);
  }
  const marked = [];
  for (const line of lines) {
    // Values here are ids and a yes/no, none of which contain commas.
    const c = line.split(',').map((x) => x.trim().replace(/^"|"$/g, ''));
    if (/^(y|yes|1|true|merge)$/i.test(c[iMerge] || '')) marked.push([c[iKeep], c[iDrop]]);
  }

  /*
   * Marked pairs are joined into groups before anything is merged.
   *
   * Three records of one devotee produce three rows: (A,B), (A,C), (B,C).
   * Marking all three is the natural thing to do, and applying them in order
   * would try to merge C into B after both had already gone into A — which
   * raises, and because the whole apply is one transaction, nothing at all
   * would merge. The operator would have marked the file correctly and got
   * an error for their trouble.
   *
   * So the pairs are treated as "these two are the same devotee" rather than
   * as instructions. Union-find joins them up; each group keeps the lowest
   * person_no, exactly as the exact pass does; everyone else merges into it.
   * Marking all three rows, or only two, now gives the same correct result.
   */
  const parent = new Map();
  const find = (x) => {
    if (!parent.has(x)) parent.set(x, x);
    while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); }
    return x;
  };
  const union = (a, b) => { const ra = find(a); const rb = find(b); if (ra !== rb) parent.set(rb, ra); };
  for (const [a, b] of marked) union(a, b);

  // person_no for every id involved, so the survivor is chosen on the same
  // rule as the exact pass rather than on CSV row order.
  const ids = [...new Set(marked.flat())];
  const { rows: known } = await client.query(
    'SELECT id, person_no, full_name FROM person WHERE id = ANY($1::uuid[])', [ids]);
  const byId = new Map(known.map((r) => [r.id, r]));
  const missing = ids.filter((i) => !byId.has(i));

  const groups = new Map();
  for (const id of ids) {
    if (!byId.has(id)) continue;
    const root = find(id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(byId.get(id));
  }

  const wanted = [];
  for (const members of groups.values()) {
    if (members.length < 2) continue;
    members.sort((a, b) => Number(a.person_no) - Number(b.person_no));
    const [keep, ...rest] = members;
    for (const r of rest) wanted.push([keep.id, r.id]);
  }

  console.log(`${lines.length} rows in file, ${marked.length} marked.`);
  console.log(`  ${groups.size} devotee(s) after grouping, ${wanted.length} record(s) to merge.`);
  const multi = [...groups.values()].filter((m) => m.length > 2).length;
  if (multi) console.log(`  ${multi} group(s) of three or more were joined up.`);
  if (missing.length) {
    console.log(`  ${missing.length} id(s) in the file no longer exist — already merged. Ignored.`);
  }
  if (!COMMIT) {
    console.log('Dry run. Re-run with --commit to apply.');
    await client.end(); process.exit(0);
  }
  let done = 0;
  await client.query('BEGIN');
  try {
    for (const [keep, drop] of wanted) {
      await client.query('SELECT merge_person($1,$2,$3)', [keep, drop, 'dedupe: reviewed by hand']);
      done += 1;
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`Failed after ${done}, nothing changed:`, err.message);
    await client.end(); process.exit(1);
  }
  console.log(`Merged ${done}.`);
  await client.end(); process.exit(0);
}

// -------------------------------------------------------------- exact pass
const exact = [];
for (const group of byPhone.values()) {
  if (group.length < 2) continue;
  const byName = new Map();
  for (const p of group) {
    if (!p.nm) continue;
    if (!byName.has(p.nm)) byName.set(p.nm, []);
    byName.get(p.nm).push(p);
  }
  for (const same of byName.values()) {
    if (same.length < 2) continue;
    // Oldest person_no survives: it carries the longest history and is the
    // number staff and older receipts already refer to.
    const [keep, ...drop] = same;
    for (const d of drop) exact.push({ keep, drop: d });
  }
}

console.log(`People with a mobile   ${people.length.toLocaleString()}`);
console.log(`Exact duplicates       ${exact.length.toLocaleString()} records would merge`);
console.log(`People after           ${(people.length - exact.length).toLocaleString()}`);

// -------------------------------------------------------------- fuzzy pass
const fuzzy = [];
if (FUZZY || CSV) {
  const merged = new Set(exact.map((e) => e.drop.id));
  for (const group of byPhone.values()) {
    const live = group.filter((p) => !merged.has(p.id));
    for (let i = 0; i < live.length; i += 1) {
      for (let j = i + 1; j < live.length; j += 1) {
        const why = looksSame(live[i].nm, live[j].nm);
        if (!why) continue;
        const [keep, drop] = live[i].person_no <= live[j].person_no
          ? [live[i], live[j]] : [live[j], live[i]];
        fuzzy.push({ keep, drop, why });
      }
    }
  }
  console.log(`Fuzzy candidates       ${fuzzy.length.toLocaleString()} pairs for review`);
}

if (CSV) {
  // A group number so three records of one devotee are visibly one thing
  // rather than three unrelated rows scattered through the file. Sorting by
  // it puts them together.
  const gp = new Map();
  const gfind = (x) => {
    if (!gp.has(x)) gp.set(x, x);
    while (gp.get(x) !== x) { gp.set(x, gp.get(gp.get(x))); x = gp.get(x); }
    return x;
  };
  for (const f of fuzzy) {
    const a = gfind(f.keep.id); const b = gfind(f.drop.id);
    if (a !== b) gp.set(b, a);
  }
  const groupNo = new Map();
  for (const f of fuzzy) {
    const root = gfind(f.keep.id);
    if (!groupNo.has(root)) groupNo.set(root, groupNo.size + 1);
  }
  fuzzy.sort((a, b) => groupNo.get(gfind(a.keep.id)) - groupNo.get(gfind(b.keep.id)));

  const head = ['MERGE', 'group', 'why', 'keep_person_no', 'keep_name', 'keep_gifts', 'keep_total',
    'drop_person_no', 'drop_name', 'drop_gifts', 'drop_total',
    'mobile', 'keep_email', 'drop_email', 'keep_id', 'drop_id'];
  const body = fuzzy.map((f) => [
    '', groupNo.get(gfind(f.keep.id)), f.why,
    f.keep.person_no, f.keep.full_name, f.keep.gifts, f.keep.total,
    f.drop.person_no, f.drop.full_name, f.drop.gifts, f.drop.total,
    f.keep.mobile_e164, f.keep.email, f.drop.email, f.keep.id, f.drop.id,
  ].map(csvCell).join(','));
  // BOM so Excel opens Tamil and Devanagari names correctly instead of mojibake.
  await writeFile(CSV, `﻿${[head.join(','), ...body].join('\n')}\n`, 'utf8');
  console.log(`\nWrote ${CSV}`);
  console.log('Put y in the MERGE column for each pair that is one devotee, then:');
  console.log(`  npm run dedupe-people -- --apply ${CSV} --commit`);
}

if (!COMMIT) {
  console.log('\nDry run. Nothing was written. Re-run with --commit for the exact pass.');
  await client.end();
  process.exit(0);
}

const before = await client.query(
  'SELECT count(*) AS d, coalesce(sum(amount),0) AS amt FROM donation');
let done = 0;
await client.query('BEGIN');
try {
  for (const { keep, drop } of exact) {
    await client.query('SELECT merge_person($1,$2,$3)', [keep.id, drop.id, 'dedupe: exact name+mobile']);
    done += 1;
    if (done % 500 === 0) process.stdout.write(`  ${done}…\n`);
  }
  const after = await client.query(
    'SELECT count(*) AS d, coalesce(sum(amount),0) AS amt FROM donation');
  // A merge repoints donations; it must never create or destroy one. If this
  // ever trips, the whole run is rolled back rather than half-applied.
  if (after.rows[0].d !== before.rows[0].d || String(after.rows[0].amt) !== String(before.rows[0].amt)) {
    throw new Error(`donations changed during merge: ${before.rows[0].d}/${before.rows[0].amt} -> ${after.rows[0].d}/${after.rows[0].amt}`);
  }
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  console.error(`\nFailed after ${done} merges, nothing changed:`, err.message);
  await client.end();
  process.exit(1);
}

const s = await client.query(
  `SELECT (SELECT count(*) FROM person) AS people,
          (SELECT count(*) FROM donation) AS donations,
          (SELECT sum(amount) FROM donation) AS total,
          (SELECT count(*) FROM person_merge_log) AS merges,
          (SELECT round(avg(c),2) FROM (SELECT count(*) c FROM donation GROUP BY person_id) x) AS avg_gifts`);
const r = s.rows[0];
console.log(`\nMerged ${done}.`);
console.log(`  people        ${Number(r.people).toLocaleString()}`);
console.log(`  donations     ${Number(r.donations).toLocaleString()} (unchanged)`);
console.log(`  total         ${r.total}`);
console.log(`  gifts/donor   ${r.avg_gifts}`);
console.log(`  merge log     ${Number(r.merges).toLocaleString()} rows — undo one with unmerge_person(id)`);

await client.end();
