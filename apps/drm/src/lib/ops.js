import { q, tx } from './db.js';
import { CAPABILITY } from './session.js';
import { IMPORT_OPS } from './ops-import.js';
import { ANALYTICS_OPS } from './ops-analytics.js';
import { DONATION_OPS } from './ops-donations.js';
import { TEAM_OPS } from './ops-team.js';
import { SYNC_OPS } from './ops-sync.js';
import { NOTIFY_OPS } from './ops-notify.js';
import { DISPATCH_OPS } from './ops-dispatch.js';

/**
 * Named operations. The browser can only invoke these by name — it can never
 * send SQL. Every value is bound as a parameter and every writable column is
 * on an explicit allow-list.
 */

const PERSON_WRITABLE = new Set([
  'full_name', 'initiated_name', 'gender', 'dob',
  'mobile_cc', 'mobile_number', 'alt_mobile_cc', 'alt_mobile_number', 'email',
  'whatsapp_optin', 'sms_optin', 'email_optin',
  'address_line', 'area', 'city', 'state', 'pincode', 'country',
  'preferred_language', 'pan',
  'marital_status', 'education', 'profession', 'organization',
  'outpost_id', 'notes', 'is_active', 'needs_review',
]);

const DONATION_WRITABLE = new Set([
  'amount', 'currency', 'seva_category_id', 'purpose', 'payment_mode', 'gateway',
  'txn_ref', 'receipt_no', 'is_80g', 'donated_on', 'collected_by', 'notes',
]);

const PERSON_SORTABLE = new Set([
  'person_no', 'full_name', 'display_name', 'dob', 'city', 'area', 'created_at', 'updated_at',
]);

const clean = (v) => (v === undefined || v === null || v === '' ? null : v);
const limitOf = (n) => Math.min(Math.max(parseInt(n, 10) || 200, 1), 5000);

/** Builds the WHERE clause for people views from the filter object. */
function personFilter(f = {}) {
  const w = ['1=1'];
  const p = [];
  const add = (sql, ...vals) => {
    let i = p.length;
    w.push(sql.replace(/\?/g, () => `$${++i}`));
    p.push(...vals);
  };

  if (f.tag) add('p.id IN (SELECT pt.person_id FROM person_tag pt JOIN tag t ON t.id=pt.tag_id WHERE t.slug=?)', f.tag);
  if (f.view === 'donors') w.push('p.id IN (SELECT person_id FROM donation)');
  if (f.view === 'dups') w.push("p.mobile_e164 IN (SELECT mobile_e164 FROM person WHERE mobile_e164 IS NOT NULL GROUP BY mobile_e164 HAVING count(*)>1)");
  if (f.view === 'untagged') w.push('NOT EXISTS (SELECT 1 FROM person_tag pt WHERE pt.person_id=p.id)');
  if (f.view === 'review') w.push('p.needs_review');
  if (f.search) {
    add('(p.full_name ILIKE ? OR p.initiated_name ILIKE ? OR p.email::text ILIKE ? OR p.mobile_e164 ILIKE ? OR p.person_no::text ILIKE ?)',
      ...Array(5).fill(`%${f.search}%`));
  }
  if (f.city) add('p.city = ?', f.city);
  if (f.area) add('p.area = ?', f.area);
  if (f.gender) add('p.gender = ?', f.gender);
  if (f.active === 'y') w.push('p.is_active');
  if (f.active === 'n') w.push('NOT p.is_active');
  return { where: w.join(' AND '), params: p };
}

function donationFilter(f = {}) {
  const w = ['1=1'];
  const p = [];
  const add = (sql, ...vals) => {
    let i = p.length;
    w.push(sql.replace(/\?/g, () => `$${++i}`));
    p.push(...vals);
  };
  if (f.search) {
    add('(p.full_name ILIKE ? OR p.initiated_name ILIKE ? OR d.receipt_no ILIKE ? OR p.person_no::text ILIKE ?)',
      ...Array(4).fill(`%${f.search}%`));
  }
  if (f.from) add('d.donated_on >= ?', f.from);
  if (f.to) add('d.donated_on <= ?', f.to);
  if (f.seva) add('d.seva_category_id = ?', parseInt(f.seva, 10));
  if (f.gateway) add('d.gateway = ?', f.gateway);
  return { where: w.join(' AND '), params: p };
}

export const OPS = {
  // ------------------------------------------------------------------ meta
  'meta': {
    cap: CAPABILITY.read,
    async run() {
      const [tags, seva, counts, outposts] = await Promise.all([
        q(`SELECT t.slug, t.name, COALESCE(t.category,'Other') AS cat,
                  (SELECT count(*) FROM person_tag pt JOIN person p ON p.id=pt.person_id
                    WHERE pt.tag_id=t.id AND p.is_active) AS n
             FROM tag t WHERE t.is_active
            ORDER BY COALESCE(t.category,'Other'), t.name`),
        q('SELECT id, name FROM seva_category WHERE is_active ORDER BY name'),
        q(`SELECT (SELECT count(*) FROM person WHERE is_active) AS people,
                  (SELECT count(*) FROM donation) AS dons,
                  (SELECT count(*) FROM person p WHERE p.id IN (SELECT person_id FROM donation)) AS donors,
                  (SELECT count(*) FROM v_person_duplicate_candidates) AS dups,
                  (SELECT count(*) FROM person p
                    WHERE NOT EXISTS (SELECT 1 FROM person_tag pt WHERE pt.person_id=p.id)) AS untagged`),
        q('SELECT id, code, name FROM outpost WHERE is_active ORDER BY name'),
      ]);
      return { tags: tags.rows, seva: seva.rows, counts: counts.rows[0], outposts: outposts.rows };
    },
  },

  // ---------------------------------------------------------------- people
  'people.list': {
    cap: CAPABILITY.read,
    async run({ filter = {}, sort = 'person_no', dir = 'ASC', limit = 200 }) {
      const col = PERSON_SORTABLE.has(sort) ? sort : 'person_no';
      const d = String(dir).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      const { where, params } = personFilter(filter);
      const rows = await q(
        `SELECT p.id, p.person_no, p.full_name, p.initiated_name, p.display_name, p.gender, p.dob,
                p.mobile_cc, p.mobile_number, p.mobile_e164, p.email, p.address_line, p.area, p.city,
                p.state, p.pincode, p.country, p.preferred_language, p.pan, p.marital_status,
                p.education, p.profession, p.organization, p.outpost_id, p.notes,
                p.whatsapp_optin, p.is_active, p.needs_review,
                (SELECT array_agg(t.name ORDER BY t.name) FROM person_tag pt
                   JOIN tag t ON t.id=pt.tag_id WHERE pt.person_id=p.id) AS tags,
                (SELECT count(*) FROM person p2
                  WHERE p2.mobile_e164=p.mobile_e164 AND p2.mobile_e164 IS NOT NULL) AS shares_mobile_with
           FROM person p WHERE ${where}
          ORDER BY p.${col} ${d} LIMIT ${limitOf(limit)}`, params);

      const stats = await q(
        `SELECT count(*) AS n,
                count(*) FILTER (WHERE p.is_active) AS act,
                count(*) FILTER (WHERE p.mobile_number IS NOT NULL) AS wm,
                count(*) FILTER (WHERE p.email IS NOT NULL) AS we
           FROM person p WHERE ${where}`, params);

      return { rows: rows.rows, stats: stats.rows[0] };
    },
  },

  'people.findByMobile': {
    cap: CAPABILITY.read,
    async run({ mobile, cc = '+91' }) {
      if (!mobile || String(mobile).replace(/\D/g, '').length < 5) return { rows: [] };
      const r = await q('SELECT person_no, display_name, city, is_active FROM find_person_by_mobile($1,$2)', [mobile, cc]);
      return { rows: r.rows };
    },
  },

  'people.create': {
    cap: CAPABILITY.write,
    async run(payload, user) {
      const data = payload.data || {};
      if (!clean(data.full_name)) throw new Error('Full name is required');
      const cols = Object.keys(data).filter((k) => PERSON_WRITABLE.has(k));
      if (!cols.includes('mobile_cc')) { cols.push('mobile_cc'); data.mobile_cc = data.mobile_cc || '+91'; }

      return tx(user.id, async (c) => {
        const vals = cols.map((k) => clean(data[k]));
        const ph = cols.map((_, i) => `$${i + 1}`).join(',');
        const r = await c.query(
          `INSERT INTO person (${cols.join(',')}, source, created_by)
           VALUES (${ph}, 'dashboard', $${cols.length + 1}) RETURNING id, person_no`,
          [...vals, user.id]);

        const tags = Array.isArray(payload.tags) ? payload.tags : [];
        if (tags.length) {
          await c.query(
            `INSERT INTO person_tag (person_id, tag_id, source, tagged_by)
             SELECT $1, id, 'dashboard', $3 FROM tag WHERE slug = ANY($2)
             ON CONFLICT DO NOTHING`, [r.rows[0].id, tags, user.id]);
        }
        return r.rows[0];
      });
    },
  },

  'people.update': {
    cap: CAPABILITY.write,
    async run({ id, field, value }, user) {
      if (!PERSON_WRITABLE.has(field)) throw new Error(`Field "${field}" is not editable`);
      return tx(user.id, async (c) => {
        const r = await c.query(
          `UPDATE person SET ${field} = $2 WHERE id = $1 RETURNING person_no`, [id, clean(value)]);
        if (!r.rowCount) throw new Error('Record not found');
        return r.rows[0];
      });
    },
  },

  'people.bulkTag': {
    cap: CAPABILITY.bulk,
    async run({ ids, slug, newTag }, user) {
      if (!Array.isArray(ids) || !ids.length) throw new Error('No rows selected');
      return tx(user.id, async (c) => {
        let target = slug;
        if (newTag && newTag.name) {
          target = newTag.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          await c.query(
            `INSERT INTO tag (slug, name, category) VALUES ($1,$2,$3) ON CONFLICT (slug) DO NOTHING`,
            [target, newTag.name, newTag.category || 'Other']);
        }
        if (!target) throw new Error('No category chosen');
        const r = await c.query(
          `INSERT INTO person_tag (person_id, tag_id, source, tagged_by)
           SELECT p.id, t.id, 'dashboard', $3 FROM person p, tag t
            WHERE p.id = ANY($1) AND t.slug = $2
           ON CONFLICT DO NOTHING RETURNING person_id`, [ids, target, user.id]);
        return { tagged: r.rowCount, slug: target };
      });
    },
  },

  'people.import': {
    cap: CAPABILITY.bulk,
    async run({ rows, columns, tagSlug, sourceFile }, user) {
      if (!Array.isArray(rows) || !rows.length) throw new Error('Nothing to import');
      if (rows.length > 20000) throw new Error('Too many rows in one import — split into files of 20,000 or fewer');
      const cols = columns.filter((k) => PERSON_WRITABLE.has(k));
      if (!cols.includes('full_name')) throw new Error('full_name column is required');
      if (!cols.includes('mobile_cc')) cols.push('mobile_cc');

      return tx(user.id, async (c) => {
        const b = await c.query(
          `INSERT INTO import_batch (source_file, target_table, row_count, status, column_mapping, imported_by)
           VALUES ($1,'person',$2,'committed',$3,$4) RETURNING id`,
          [sourceFile || 'upload', rows.length, JSON.stringify(cols), user.id]);
        const batchId = b.rows[0].id;
        const src = `import:${batchId}`;

        const inserted = [];
        for (let i = 0; i < rows.length; i += 200) {
          const chunk = rows.slice(i, i + 200);
          const params = [];
          const tuples = chunk.map((r) => {
            const t = cols.map((k) => {
              params.push(k === 'mobile_cc' ? (clean(r[k]) || '+91') : clean(r[k]));
              return `$${params.length}`;
            });
            params.push(src);
            t.push(`$${params.length}`);
            params.push(user.id);
            t.push(`$${params.length}`);
            return `(${t.join(',')})`;
          });
          const res = await c.query(
            `INSERT INTO person (${cols.join(',')}, source, created_by)
             VALUES ${tuples.join(',')} RETURNING id`, params);
          res.rows.forEach((x) => inserted.push(x.id));
        }

        if (tagSlug) {
          await c.query(
            `INSERT INTO person_tag (person_id, tag_id, source, tagged_by)
             SELECT p.id, t.id, $3, $4 FROM person p, tag t
              WHERE p.id = ANY($1) AND t.slug = $2 ON CONFLICT DO NOTHING`,
            [inserted, tagSlug, src, user.id]);
        }

        await c.query('UPDATE import_batch SET inserted_count=$2, completed_at=now() WHERE id=$1',
          [batchId, inserted.length]);

        const dup = await c.query(
          `SELECT count(*) AS n FROM person p
            WHERE p.source=$1 AND p.mobile_e164 IS NOT NULL
              AND EXISTS (SELECT 1 FROM person p2 WHERE p2.mobile_e164=p.mobile_e164 AND p2.id<>p.id)`, [src]);

        return { batchId, inserted: inserted.length, sharingMobile: Number(dup.rows[0].n) };
      });
    },
  },

  // ------------------------------------------------------------- donations
  'donations.list': {
    cap: CAPABILITY.read,
    async run({ filter = {}, limit = 200 }) {
      const { where, params } = donationFilter(filter);
      const rows = await q(
        `SELECT d.id, d.donated_on, p.person_no, p.display_name AS donor, d.amount, d.currency,
                d.seva_category_id, d.payment_mode, d.gateway, d.receipt_no, d.is_80g,
                d.collected_by, d.notes
           FROM donation d JOIN person p ON p.id=d.person_id
          WHERE ${where} ORDER BY d.donated_on DESC, d.id DESC LIMIT ${limitOf(limit)}`, params);
      const stats = await q(
        `SELECT count(*) AS n, COALESCE(sum(d.amount),0) AS total,
                COALESCE(avg(d.amount),0) AS avg, count(DISTINCT d.person_id) AS donors
           FROM donation d JOIN person p ON p.id=d.person_id WHERE ${where}`, params);
      return { rows: rows.rows, stats: stats.rows[0] };
    },
  },

  'donations.create': {
    cap: CAPABILITY.write,
    async run({ personId, data = {} }, user) {
      if (!personId) throw new Error('Pick a donor first');
      if (!clean(data.amount)) throw new Error('Amount is required');
      const cols = Object.keys(data).filter((k) => DONATION_WRITABLE.has(k));
      return tx(user.id, async (c) => {
        const params = [personId, ...cols.map((k) => clean(data[k])), user.id];
        const ph = cols.map((_, i) => `$${i + 2}`).join(',');
        const r = await c.query(
          `INSERT INTO donation (person_id, ${cols.join(',')}, created_by)
           VALUES ($1, ${ph}, $${params.length}) RETURNING id`, params);
        // Anyone who gives becomes a Donor automatically.
        await c.query(
          `INSERT INTO person_tag (person_id, tag_id, source, tagged_by)
           SELECT $1, id, 'auto', $2 FROM tag WHERE slug='donor' ON CONFLICT DO NOTHING`,
          [personId, user.id]);
        return r.rows[0];
      });
    },
  },

  'donations.update': {
    cap: CAPABILITY.write,
    async run({ id, field, value }, user) {
      if (!DONATION_WRITABLE.has(field)) throw new Error(`Field "${field}" is not editable`);
      return tx(user.id, async (c) => {
        const r = await c.query(`UPDATE donation SET ${field}=$2 WHERE id=$1 RETURNING id`, [id, clean(value)]);
        if (!r.rowCount) throw new Error('Record not found');
        return r.rows[0];
      });
    },
  },

  'donations.searchDonor': {
    cap: CAPABILITY.read,
    async run({ term }) {
      if (!term || term.length < 2) return { rows: [] };
      const r = await q(
        `SELECT id, person_no, display_name, city, mobile_e164 FROM person
          WHERE full_name ILIKE $1 OR initiated_name ILIKE $1 OR mobile_e164 ILIKE $1 OR person_no::text ILIKE $1
          ORDER BY person_no LIMIT 8`, [`%${term}%`]);
      return { rows: r.rows };
    },
  },

  // --------------------------------------------------------------- batches
  'batches.list': {
    cap: CAPABILITY.bulk,
    async run() {
      const r = await q(
        `SELECT ib.id, ib.source_file, ib.target_table, ib.row_count, ib.inserted_count,
                ib.status, ib.started_at, u.full_name AS imported_by_name,
                (SELECT count(*) FROM person p WHERE p.source='import:'||ib.id) AS still_present
           FROM import_batch ib LEFT JOIN app_user u ON u.id = ib.imported_by
          ORDER BY ib.id DESC LIMIT 100`);
      return { rows: r.rows };
    },
  },

  'batches.rollback': {
    cap: CAPABILITY.admin,
    async run({ batchId }, user) {
      const src = `import:${parseInt(batchId, 10)}`;
      return tx(user.id, async (c) => {
        const kept = await c.query(
          `SELECT count(*) AS n FROM person WHERE source=$1 AND id IN (SELECT person_id FROM donation)`, [src]);
        await c.query(
          `DELETE FROM person_tag WHERE person_id IN
             (SELECT id FROM person WHERE source=$1 AND id NOT IN (SELECT person_id FROM donation))`, [src]);
        const del = await c.query(
          `DELETE FROM person WHERE source=$1 AND id NOT IN (SELECT person_id FROM donation) RETURNING id`, [src]);
        await c.query(`UPDATE import_batch SET status='rolled_back' WHERE id=$1`, [parseInt(batchId, 10)]);
        return { deleted: del.rowCount, kept: Number(kept.rows[0].n) };
      });
    },
  },
};

Object.assign(OPS, IMPORT_OPS, ANALYTICS_OPS, DONATION_OPS, TEAM_OPS, SYNC_OPS, NOTIFY_OPS, DISPATCH_OPS);

export async function runOp(name, payload, user) {
  const op = OPS[name];
  if (!op) throw new Error(`Unknown operation: ${name}`);
  return op.run(payload || {}, user);
}

export function capabilityFor(name) {
  return OPS[name]?.cap;
}
