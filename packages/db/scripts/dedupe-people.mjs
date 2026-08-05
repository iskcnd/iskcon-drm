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
 *            automatically. It writes a CSV and nothing happens until the
 *            file comes back with --apply.
 *
 * THE REVIEW FILE IS ONE ROW PER RECORD, NOT PER PAIR.
 *
 * The first version listed candidate pairs and asked "should these two
 * merge?". That is not what the temple knows. Four records of one devotee
 * produced four pair-rows, there was no way to say which record was the real
 * one, and no way at all to say "the right name is Manoj Chandani and the
 * right email is manojchandani@hotmail.com" when those sat on different rows.
 *
 * Now each record is its own row, rows sit together under a group number, and
 * the columns to fill in are:
 *
 *   KEEP         y on the ONE record that is real. Everything else in the
 *                group merges into it. No KEEP means the group is left alone.
 *   EXCLUDE      y on a record that is a different person after all.
 *   final_name   pre-filled, editable. Applied to the survivor after merging.
 *   final_email  same. merge_person only fills blanks, so replacing a value
 *                the survivor already has must happen here.
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

/**
 * A real CSV reader, because the file comes back from Excel. Names contain
 * commas ("Kumar, S"), Excel quotes them, and splitting on commas would tear
 * a record in half and merge the wrong devotee.
 */
function parseCsv(text) {
  const out = []; let row = []; let cell = ''; let q = false;
  const t = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < t.length; i += 1) {
    const c = t[i];
    if (q) {
      if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i += 1; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); out.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); out.push(row); }
  return out.filter((r) => r.some((x) => String(x).trim() !== ''));
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
  const rows = parseCsv(text);
  if (!rows.length) { console.error('The file is empty.'); process.exit(1); }
  const head = rows.shift().map((h) => h.trim().toLowerCase());
  const col = (n) => head.indexOf(n);
  const iGroup = col('group'); const iKeep = col('keep'); const iExclude = col('exclude');
  const iId = col('person_id'); const iName = col('final_name'); const iEmail = col('final_email');
  if (iGroup < 0 || iKeep < 0 || iId < 0) {
    console.error('The CSV needs group, KEEP and person_id columns.');
    process.exit(1);
  }

  const yes = (v) => /^(y|yes|1|true|x)$/i.test((v || '').trim());

  // One row per person record. A group is one devotee; the row marked KEEP
  // survives and the rest merge into it. Nothing is inferred: a group with no
  // KEEP is skipped, because guessing which record to keep is the one thing
  // this file exists to stop us doing.
  const groups = new Map();
  for (const r of rows) {
    const g = (r[iGroup] || '').trim();
    const id = (r[iId] || '').trim();
    if (!g || !id) continue;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push({
      id,
      keep: yes(r[iKeep]),
      exclude: iExclude >= 0 && yes(r[iExclude]),
      finalName: iName >= 0 ? (r[iName] || '').trim() : '',
      finalEmail: iEmail >= 0 ? (r[iEmail] || '').trim() : '',
    });
  }

  const plan = []; const problems = [];
  let skipped = 0; let excluded = 0;
  for (const [g, members] of groups) {
    const live = members.filter((m) => !m.exclude);
    excluded += members.length - live.length;
    const keepers = live.filter((m) => m.keep);
    if (keepers.length === 0) { skipped += 1; continue; }
    if (keepers.length > 1) {
      problems.push(`group ${g}: ${keepers.length} rows marked KEEP — mark exactly one`);
      continue;
    }
    const keep = keepers[0];
    const drops = live.filter((m) => m !== keep);
    if (!drops.length) { skipped += 1; continue; }
    plan.push({ group: g, keep, drops });
  }

  if (problems.length) {
    console.error('Cannot apply:');
    for (const p of problems) console.error(`  ${p}`);
    await client.end(); process.exit(1);
  }

  const merges = plan.reduce((n, p) => n + p.drops.length, 0);
  const renames = plan.filter((p) => p.keep.finalName || p.keep.finalEmail).length;
  console.log(`${rows.length} rows, ${groups.size} groups.`);
  console.log(`  ${plan.length} group(s) to merge — ${merges} record(s) folded in`);
  console.log(`  ${skipped} group(s) skipped (no KEEP marked)`);
  if (excluded) console.log(`  ${excluded} row(s) excluded as a different person`);
  if (renames) console.log(`  ${renames} survivor(s) will have name/email set from the file`);

  if (!COMMIT) {
    console.log('\nDry run. Nothing was written. Re-run with --commit to apply.');
    await client.end(); process.exit(0);
  }

  let done = 0; let fixed = 0;
  await client.query('BEGIN');
  try {
    for (const p of plan) {
      for (const d of p.drops) {
        await client.query('SELECT merge_person($1,$2,$3)',
          [p.keep.id, d.id, `dedupe: reviewed, group ${p.group}`]);
        done += 1;
      }
      // After merging. merge_person only fills blanks, so a correction that
      // REPLACES the survivor's name or email has to be applied afterwards —
      // that is the whole point of the two editable columns.
      if (p.keep.finalName || p.keep.finalEmail) {
        const r = await client.query(
          `UPDATE person
              SET full_name = COALESCE(NULLIF($2,''), full_name),
                  email     = COALESCE(NULLIF($3,'')::citext, email)
            WHERE id = $1`,
          [p.keep.id, p.keep.finalName, p.keep.finalEmail]);
        fixed += r.rowCount;
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`\nFailed after ${done} merges, nothing changed:`, err.message);
    await client.end(); process.exit(1);
  }
  console.log(`\nMerged ${done} record(s) into ${plan.length} devotee(s); ${fixed} name/email correction(s).`);
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
  /*
   * ONE ROW PER RECORD, not per pair.
   *
   * The first version asked "should these two merge?" — which is not what the
   * temple knows. What Divyarupa knows is "this is the real Manoj Chandani,
   * and this is his correct name and email". Four pair-rows for one devotee
   * made that impossible to express, and left the survivor picked by
   * person_no whether or not it was the right record.
   *
   * So: every record in a cluster gets its own row, the rows sit together
   * under a group number, and the operator marks KEEP on the one that is
   * real. final_name and final_email are pre-filled and editable, because the
   * right name is sometimes on the wrong record.
   */
  const gp = new Map();
  const gfind = (x) => {
    if (!gp.has(x)) gp.set(x, x);
    while (gp.get(x) !== x) { gp.set(x, gp.get(gp.get(x))); x = gp.get(x); }
    return x;
  };
  const why = new Map();
  for (const f of fuzzy) {
    const a = gfind(f.keep.id); const b = gfind(f.drop.id);
    if (a !== b) gp.set(b, a);
    why.set(f.drop.id, f.why);
    if (!why.has(f.keep.id)) why.set(f.keep.id, f.why);
  }

  const byId = new Map();
  for (const f of fuzzy) { byId.set(f.keep.id, f.keep); byId.set(f.drop.id, f.drop); }

  const clusters = new Map();
  for (const p of byId.values()) {
    const root = gfind(p.id);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root).push(p);
  }

  const head = ['group', 'KEEP', 'EXCLUDE', 'final_name', 'final_email',
    'person_no', 'name', 'gifts', 'total', 'email', 'pan', 'mobile',
    'address_line', 'why', 'person_id'];
  const body = [];
  let g = 0;
  for (const members of [...clusters.values()].sort((a, b) => b.length - a.length)) {
    g += 1;
    // Most gifts first, then oldest: the record with the history is usually
    // the real one, so the likely answer is at the top of each group.
    members.sort((a, b) => Number(b.gifts) - Number(a.gifts)
      || Number(a.person_no) - Number(b.person_no));
    for (const m of members) {
      body.push([g, '', '', m.full_name, m.email, m.person_no, m.full_name,
        m.gifts, m.total, m.email, m.pan, m.mobile_e164,
        m.address_line, why.get(m.id) || '', m.id].map(csvCell).join(','));
    }
    body.push('');   // blank line between devotees, so groups read as blocks
  }
  await writeFile(CSV, `\uFEFF${[head.join(','), ...body].join('\n')}\n`, 'utf8');

  console.log(`\nWrote ${CSV}`);
  console.log(`  ${clusters.size} devotee(s), ${byId.size} record(s) to review`);
  console.log('  In each group put y in KEEP against the record to keep.');
  console.log('  Correct final_name / final_email on that row if they are wrong.');
  console.log('  Put y in EXCLUDE for a record that is a different person.');
  console.log('  A group with no KEEP is left alone.');
  console.log(`\n  npm run dedupe-people -- --apply ${CSV} --commit`);
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
