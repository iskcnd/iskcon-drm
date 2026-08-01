import { q, tx } from './db.js';
import { CAPABILITY } from './session.js';
import { IMPORT_TYPES } from './import-types.js';

const clean = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim());
const digits = (v) => (v ? String(v).replace(/\D/g, '') : '');

// Country codes we're likely to see. Longest match wins so +91 isn't read as +9.
const CCS = ['1', '7', '20', '27', '30', '31', '33', '34', '39', '44', '49', '52', '55', '60',
  '61', '62', '63', '64', '65', '66', '81', '82', '84', '86', '90', '91', '92', '94', '95',
  '971', '974', '977', '966', '968', '973', '880', '353', '358', '971'];

/**
 * Zoho stores the phone as one string like "+919840012345". Split it so the
 * country code lands in its own column — the whole international story depends
 * on never assuming +91.
 */
export function splitPhone(raw) {
  const s = String(raw || '').trim();
  if (!s) return { cc: null, number: null };
  if (s.startsWith('+') || s.startsWith('00')) {
    const d = digits(s.startsWith('00') ? s.slice(2) : s);
    const hit = CCS.filter((c) => d.startsWith(c)).sort((a, b) => b.length - a.length)[0];
    if (hit && d.length > hit.length + 5) return { cc: `+${hit}`, number: d.slice(hit.length) };
    return { cc: '+91', number: d };
  }
  const d = digits(s);
  // A bare 12-digit number beginning 91 is an Indian number with the code stuck on.
  if (d.length === 12 && d.startsWith('91')) return { cc: '+91', number: d.slice(2) };
  return { cc: '+91', number: d || null };
}

/** Normalise whatever the source calls a payment method onto our allowed set. */
function paymentMode(def, raw) {
  const v = clean(raw);
  if (!v) return null;
  const key = v.toLowerCase().replace(/[^a-z ]/g, '').trim();
  const map = def.fixedPaymentModes || {};
  if (map[key]) return map[key];
  const allowed = ['cash', 'upi', 'card', 'netbanking', 'cheque', 'dd', 'bank_transfer', 'other'];
  return allowed.includes(key.replace(/ /g, '_')) ? key.replace(/ /g, '_') : 'other';
}

/** Normalise a name so "Ramesh  Kumar" and "ramesh kumar" compare equal. */
const normName = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function nameAgrees(rowName, person) {
  const r = normName(rowName);
  if (!r) return true; // no name supplied — nothing to disagree with
  return r === normName(person.full_name) || r === normName(person.initiated_name);
}

function coerce(def, field, raw) {
  const v = clean(raw);
  if (v === null) return null;
  if (def.numeric?.includes(field)) {
    const n = Number(v.replace(/[, ₹]/g, ''));
    if (Number.isNaN(n)) throw new Error(`"${v}" is not a number (${field})`);
    return n;
  }
  if (def.booleans?.includes(field)) return /^(y|yes|true|1)$/i.test(v);
  if (def.dates?.includes(field)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      throw new Error(`"${v}" is not a date in YYYY-MM-DD form (${field})`);
    }
    return v;
  }
  return v;
}

/**
 * Resolve one row to a devotee, in the order Divyarupa asked for:
 * internal ID first, then email, then mobile. Anything ambiguous — several
 * people on one number, or a name that disagrees with the record — is held
 * back for a human decision instead of being guessed at.
 */
async function resolvePerson(row) {
  const rowName = row.full_name;

  // Sources that give one combined phone string (Zoho) rather than cc + number.
  if (row.phone && !row.mobile_number) {
    const { cc, number } = splitPhone(row.phone);
    row.mobile_cc = row.mobile_cc || cc;
    row.mobile_number = number;
  }

  if (clean(row.person_no)) {
    const r = await q(
      'SELECT id, person_no, full_name, initiated_name, city, mobile_e164, email FROM person WHERE person_no = $1',
      [parseInt(row.person_no, 10)]);
    if (!r.rows.length) return { status: 'review', reason: 'id_not_found', candidates: [] };
    const p = r.rows[0];
    return nameAgrees(rowName, p)
      ? { status: 'matched', person: p, via: 'person_no' }
      : { status: 'review', reason: 'name_mismatch', candidates: [p], via: 'person_no' };
  }

  if (clean(row.email)) {
    const r = await q(
      'SELECT id, person_no, full_name, initiated_name, city, mobile_e164, email FROM person WHERE email = $1',
      [row.email.trim()]);
    if (r.rows.length === 1) {
      const p = r.rows[0];
      return nameAgrees(rowName, p)
        ? { status: 'matched', person: p, via: 'email' }
        : { status: 'review', reason: 'name_mismatch', candidates: [p], via: 'email' };
    }
    if (r.rows.length > 1) return { status: 'review', reason: 'multiple', candidates: r.rows, via: 'email' };
  }

  if (digits(row.mobile_number).length >= 6) {
    const cc = clean(row.mobile_cc) || '+91';
    const e164 = cc + digits(row.mobile_number);
    const r = await q(
      `SELECT id, person_no, full_name, initiated_name, city, mobile_e164, email FROM person
        WHERE mobile_e164 = $1 OR alt_mobile_e164 = $1 ORDER BY person_no`, [e164]);
    if (r.rows.length === 1) {
      const p = r.rows[0];
      return nameAgrees(rowName, p)
        ? { status: 'matched', person: p, via: 'mobile' }
        : { status: 'review', reason: 'name_mismatch', candidates: [p], via: 'mobile' };
    }
    // Several people share this number — normal for families. Never guess.
    if (r.rows.length > 1) {
      const exact = r.rows.filter((p) => nameAgrees(rowName, p));
      if (exact.length === 1) return { status: 'matched', person: exact[0], via: 'mobile+name' };
      return { status: 'review', reason: 'multiple', candidates: r.rows, via: 'mobile' };
    }
    return { status: 'review', reason: 'no_match', candidates: [] };
  }

  return { status: 'review', reason: 'no_identifier', candidates: [] };
}

export const IMPORT_OPS = {
  /** Dry run. Nothing is written; the operator sees exactly what will happen. */
  'import.preview': {
    cap: CAPABILITY.bulk,
    async run({ type, rows }) {
      const def = IMPORT_TYPES[type];
      if (!def) throw new Error(`Unknown import type: ${type}`);
      if (!Array.isArray(rows) || !rows.length) throw new Error('No rows to preview');
      if (rows.length > 20000) throw new Error('Split files larger than 20,000 rows');

      // Which source ids are already in the database? One query, not one per row.
      const seen = new Set();
      if (def.externalSource) {
        const ids = rows.map((r) => clean(r.external_id)).filter(Boolean);
        if (ids.length) {
          const ex = await q(
            'SELECT external_id FROM donation WHERE external_source = $1 AND external_id = ANY($2)',
            [def.externalSource, ids]);
          ex.rows.forEach((r) => seen.add(String(r.external_id)));
        }
      }

      const results = [];
      let matched = 0; let review = 0; let errors = 0; let duplicates = 0; let willCreate = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const out = { i, row };

        if (def.externalSource && clean(row.external_id) && seen.has(String(row.external_id).trim())) {
          out.status = 'duplicate';
          out.message = 'Already imported — same source record id';
          duplicates++;
          results.push(out);
          continue;
        }

        // Field-level validation first — a bad date is an error, not a review item.
        try {
          for (const f of def.required) {
            if (!clean(row[f])) throw new Error(`${f} is required`);
          }
          for (const f of def.fields) coerce(def, f, row[f]);
        } catch (err) {
          out.status = 'error';
          out.message = err.message;
          errors++;
          results.push(out);
          continue;
        }

        if (def.link === 'master') {
          out.status = 'matched';
          out.action = 'create';
          matched++;
        } else {
          const r = await resolvePerson(row);
          out.status = r.status;
          out.via = r.via;
          out.reason = r.reason;
          out.candidates = r.candidates || [];

          if (r.status === 'matched') {
            out.personId = r.person.id;
            out.personLabel = `#${r.person.person_no} ${r.person.full_name}`;
            matched++;
          } else if (def.autoCreatePerson && ['no_match', 'no_identifier'].includes(r.reason)
                     && clean(row.full_name)) {
            // No candidate at all, and the row carries the donor's own details:
            // a new donor, not an ambiguity. Ambiguous cases still fall through
            // to review below.
            out.status = 'will_create';
            out.action = 'create';
            willCreate++;
          } else {
            review++;
          }
        }
        results.push(out);
      }

      return { type, total: rows.length, matched, review, errors, duplicates, willCreate, results };
    },
  },

  /**
   * Commit. `resolutions` maps row index -> { action, personId } for anything
   * the preview held back. Rows with no resolution are skipped.
   */
  'import.commit': {
    cap: CAPABILITY.bulk,
    async run({ type, rows, resolutions = {}, tagSlug, sourceFile }, user) {
      const def = IMPORT_TYPES[type];
      if (!def) throw new Error(`Unknown import type: ${type}`);
      if (!Array.isArray(rows) || !rows.length) throw new Error('Nothing to import');

      return tx(user.id, async (c) => {
        const b = await c.query(
          `INSERT INTO import_batch (source_file, target_table, row_count, status, column_mapping, imported_by, notes)
           VALUES ($1,$2,$3,'committed',$4,$5,$6) RETURNING id`,
          [sourceFile || 'upload', def.table, rows.length,
            JSON.stringify(def.fields), user.id, `import type: ${type}`]);
        const batchId = b.rows[0].id;
        const src = `import:${batchId}`;
        const tag = def.forceTag || tagSlug || null;

        let inserted = 0; let skipped = 0; let created = 0; let duplicates = 0;
        const newPersonIds = [];

        // -------------------------------------------------- master imports
        if (def.link === 'master') {
          const cols = def.fields.filter((f) => rows.some((r) => clean(r[f]) !== null));
          if (!cols.includes('full_name')) cols.push('full_name');
          if (!cols.includes('mobile_cc')) cols.push('mobile_cc');

          for (let i = 0; i < rows.length; i += 200) {
            const chunk = rows.slice(i, i + 200);
            const params = [];
            const tuples = chunk.map((r) => {
              const t = cols.map((k) => {
                params.push(k === 'mobile_cc' ? (clean(r[k]) || '+91') : clean(r[k]));
                return `$${params.length}`;
              });
              params.push(src); t.push(`$${params.length}`);
              params.push(user.id); t.push(`$${params.length}`);
              return `(${t.join(',')})`;
            });
            const res = await c.query(
              `INSERT INTO person (${cols.join(',')}, source, created_by)
               VALUES ${tuples.join(',')} RETURNING id`, params);
            res.rows.forEach((x) => newPersonIds.push(x.id));
          }
          inserted = newPersonIds.length;
          created = inserted;

        // -------------------------------------------------- module imports
        } else {
          // Source ids already present — never double-count money.
          const seen = new Set();
          if (def.externalSource) {
            const ids = rows.map((r) => clean(r.external_id)).filter(Boolean);
            if (ids.length) {
              const ex = await c.query(
                'SELECT external_id FROM donation WHERE external_source = $1 AND external_id = ANY($2)',
                [def.externalSource, ids]);
              ex.rows.forEach((r) => seen.add(String(r.external_id)));
            }
          }

          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const res = resolutions[i] || resolutions[String(i)];

            if (res?.action === 'skip') { skipped++; continue; }

            const extId = clean(row.external_id);
            if (def.externalSource && extId && seen.has(extId)) { duplicates++; continue; }

            let personId = res?.personId || null;

            if (!personId) {
              const r = await resolvePerson(row);
              if (r.status === 'matched') {
                personId = r.person.id;
              } else if (res?.action === 'create'
                         || (def.autoCreatePerson && ['no_match', 'no_identifier'].includes(r.reason)
                             && clean(row.full_name))) {
                const { cc, number } = row.phone
                  ? splitPhone(row.phone)
                  : { cc: clean(row.mobile_cc) || '+91', number: digits(row.mobile_number) || null };
                const p = await c.query(
                  `INSERT INTO person (full_name, mobile_cc, mobile_number, email, address_line,
                                       source, needs_review, review_reason, created_by)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
                  [clean(row.full_name) || 'Unnamed', cc, number, clean(row.email),
                    clean(row.address_line), src,
                    !!def.flagAutoCreated,
                    def.flagAutoCreated ? `Created automatically by ${type} import` : null,
                    user.id]);
                personId = p.rows[0].id;
                newPersonIds.push(personId);
                created++;
              } else {
                skipped++;
                continue;
              }
            }

            const data = {};
            for (const f of def.fields) {
              if (f === 'payment_mode') {
                const m = paymentMode(def, row[f]);
                if (m) data[f] = m;
                continue;
              }
              const v = coerce(def, f, row[f]);
              if (v !== null) data[f] = v;
            }

            // Text lookups, e.g. seva category name -> id. autoCreate means a
            // new category in the source never blocks an import.
            for (const [field, lk] of Object.entries(def.lookups || {})) {
              const name = data[field];
              delete data[field];
              if (name == null) continue;
              const slug = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
              let l = await c.query(
                `SELECT id FROM ${lk.table} WHERE slug = $1 OR lower(name) = lower($2) LIMIT 1`,
                [slug, String(name)]);
              if (!l.rows.length && lk.autoCreate) {
                l = await c.query(
                  `INSERT INTO ${lk.table} (slug, name) VALUES ($1,$2)
                   ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
                  [slug, String(name)]);
              }
              if (l.rows.length) data[lk.column] = l.rows[0].id;
            }

            if (def.externalSource) {
              data.external_source = def.externalSource;
              if (extId) data.external_id = extId;
            }

            const keys = Object.keys(data);
            const vals = keys.map((k) => data[k]);
            await c.query(
              `INSERT INTO ${def.table} (person_id, ${keys.join(',')}, created_by)
               VALUES ($1, ${keys.map((_, n) => `$${n + 2}`).join(',')}, $${keys.length + 2})`,
              [personId, ...vals, user.id]);
            inserted++;
            if (extId) seen.add(extId);

            if (def.table === 'donation') {
              await c.query(
                `INSERT INTO person_tag (person_id, tag_id, source, tagged_by)
                 SELECT $1, id, 'auto', $2 FROM tag WHERE slug='donor' ON CONFLICT DO NOTHING`,
                [personId, user.id]);
            }
          }
        }

        if (tag && newPersonIds.length) {
          for (let i = 0; i < newPersonIds.length; i += 200) {
            await c.query(
              `INSERT INTO person_tag (person_id, tag_id, source, tagged_by)
               SELECT p.id, t.id, $3, $4 FROM person p, tag t
                WHERE p.id = ANY($1) AND t.slug = $2 ON CONFLICT DO NOTHING`,
              [newPersonIds.slice(i, i + 200), tag, src, user.id]);
          }
        }

        await c.query('UPDATE import_batch SET inserted_count=$2, completed_at=now() WHERE id=$1',
          [batchId, inserted]);

        return { batchId, inserted, skipped, created, duplicates, tag };
      });
    },
  },
};
