import crypto from 'crypto';
import { q, tx } from './db.js';
import { CAPABILITY } from './session.js';

const clean = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim());
const num = (v) => (clean(v) === null ? null : Number(v));
const pageSize = (n) => Math.min(Math.max(parseInt(n, 10) || 50, 1), 500);

/** Must match apps/donate receiptToken() exactly, or staff links won't open. */
function receiptToken(receiptNo) {
  const secret = process.env.RECEIPT_SECRET || process.env.CRON_KEY;
  if (!secret) return null;
  return crypto.createHmac('sha256', secret).update(String(receiptNo)).digest('hex').slice(0, 16);
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
    add(`(p.full_name ILIKE ? OR p.initiated_name ILIKE ? OR d.receipt_no ILIKE ?
          OR p.mobile_e164 ILIKE ? OR p.person_no::text = ?)`,
      ...Array(4).fill(`%${f.search}%`), f.search.replace(/\D/g, '') || '0');
  }
  if (f.from) add('d.donated_on >= ?', f.from);
  if (f.to) add('d.donated_on <= ?', f.to);
  if (f.sevaFrom) add('d.seva_date >= ?', f.sevaFrom);
  if (f.sevaTo) add('d.seva_date <= ?', f.sevaTo);
  if (f.category) add('d.seva_category_id = ?', parseInt(f.category, 10));
  if (f.gateway) add('d.gateway = ?', f.gateway);
  if (f.mode) add('d.payment_mode = ?', f.mode);
  if (f.status) add('COALESCE(d.status, ?) = ?', 'success', f.status);
  if (f.staff) add(`lower(btrim(regexp_replace(d.collected_by,'\\s+',' ','g'))) = lower(?)`, f.staff);
  if (f.volunteer) add(`lower(btrim(regexp_replace(d.volunteer_name,'\\s+',' ','g'))) = lower(?)`, f.volunteer);
  if (f.minAmount) add('d.amount >= ?', Number(f.minAmount));
  if (f.noReceipt) w.push('d.receipt_no IS NULL');
  return { where: w.join(' AND '), params: p };
}

export const DONATION_OPS = {
  /* ------------------------------------------------------------- listing */
  'don.list': {
    cap: CAPABILITY.read,
    async run({ filter = {}, page = 1, size = 50 }) {
      const { where, params } = donationFilter(filter);
      const lim = pageSize(size);
      const off = (Math.max(parseInt(page, 10) || 1, 1) - 1) * lim;

      const rows = await q(
        `SELECT d.id, d.donated_on, d.seva_date, d.amount, d.currency, d.receipt_no,
                d.payment_mode, d.gateway, d.status, d.is_80g, d.seva_type, d.festival,
                d.collected_by, d.volunteer_name, d.notes, d.external_id,
                s.name AS seva_category, s.id AS seva_category_id,
                c.slug AS campaign,
                p.person_no, p.display_name AS donor, p.mobile_e164, p.email, p.pan,
                (SELECT count(*) FROM donation_archana da WHERE da.donation_id = d.id) AS archana_count
           FROM donation d
           JOIN person p ON p.id = d.person_id
           LEFT JOIN seva_category s ON s.id = d.seva_category_id
           LEFT JOIN campaign c ON c.id = d.campaign_id
          WHERE ${where}
          ORDER BY d.donated_on DESC, d.id DESC
          LIMIT ${lim} OFFSET ${off}`, params);

      const agg = await q(
        `SELECT count(*) AS n, COALESCE(sum(d.amount),0) AS total,
                count(DISTINCT d.person_id) AS donors, COALESCE(avg(d.amount),0) AS avg
           FROM donation d JOIN person p ON p.id = d.person_id WHERE ${where}`, params);

      return { rows: rows.rows, stats: agg.rows[0], page: Number(page) || 1, size: lim };
    },
  },

  'don.detail': {
    cap: CAPABILITY.read,
    async run({ id }) {
      const d = await q(
        `SELECT d.*, s.name AS seva_category, p.person_no, p.display_name AS donor,
                p.full_name, p.mobile_e164, p.email, p.pan, p.address_line, p.area, p.city,
                p.state, p.pincode
           FROM donation d
           JOIN person p ON p.id = d.person_id
           LEFT JOIN seva_category s ON s.id = d.seva_category_id
          WHERE d.id = $1`, [id]);
      if (!d.rows.length) throw new Error('Donation not found');

      const [archana, attempts, outbox] = await Promise.all([
        q('SELECT * FROM donation_archana WHERE donation_id = $1 ORDER BY id', [id]),
        q('SELECT attempt_no, gateway, status, gateway_txn_id, created_at FROM payment_attempt WHERE donation_id=$1 ORDER BY attempt_no', [id]).catch(() => ({ rows: [] })),
        q('SELECT id, status, attempts, last_error FROM webhook_outbox WHERE donation_id=$1 ORDER BY id DESC', [id]).catch(() => ({ rows: [] })),
      ]);

      const row = d.rows[0];
      const t = row.receipt_no ? receiptToken(row.receipt_no) : null;
      return {
        donation: row,
        archana: archana.rows,
        attempts: attempts.rows,
        outbox: outbox.rows,
        receiptUrl: t && process.env.DONATE_BASE_URL
          ? `${process.env.DONATE_BASE_URL}/api/receipts/${row.receipt_no}?t=${t}`
          : null,
      };
    },
  },

  'don.update': {
    cap: CAPABILITY.write,
    async run({ id, field, value }, user) {
      const allowed = new Set(['donated_on', 'seva_date', 'seva_type', 'festival', 'purpose',
        'payment_mode', 'collected_by', 'volunteer_name', 'notes', 'is_80g', 'seva_category_id']);
      if (!allowed.has(field)) throw new Error(`Field "${field}" is not editable here`);
      return tx(user.id, async (c) => {
        const r = await c.query(`UPDATE donation SET ${field}=$2 WHERE id=$1 RETURNING id`,
          [id, field === 'seva_category_id' ? num(value) : clean(value)]);
        if (!r.rowCount) throw new Error('Donation not found');
        return r.rows[0];
      });
    },
  },

  /**
   * Issues a receipt number for a paid donation that somehow has none.
   *
   * Refuses unless the donation is actually paid. A receipt is a statement
   * that the temple received money — issuing one against a pending or failed
   * payment creates a document the donor could present, and burns a number out
   * of a series that must stay continuous and auditable.
   */
  'don.issueReceipt': {
    cap: CAPABILITY.write,
    async run({ id }, user) {
      return tx(user.id, async (c) => {
        const chk = await c.query(
          'SELECT id, status, receipt_no, amount FROM donation WHERE id = $1', [id]);
        if (!chk.rowCount) throw new Error('Donation not found');

        const d = chk.rows[0];
        if (d.receipt_no) {
          return { receipt_no: d.receipt_no, token: receiptToken(d.receipt_no), already: true };
        }
        if (d.status !== 'paid') {
          throw new Error(
            `This donation is "${d.status}", not paid. A receipt can only be issued once the `
            + 'payment is confirmed. If the money did arrive, mark the donation paid first — '
            + 'check the Zoho sync tab or the gateway dashboard.');
        }

        const r = await c.query(
          `UPDATE donation SET receipt_no = COALESCE(receipt_no, next_receipt_no())
            WHERE id = $1 AND status = 'paid' RETURNING receipt_no`, [id]);
        if (!r.rowCount) throw new Error('Donation is no longer paid — nothing issued');
        const no = r.rows[0].receipt_no;
        return { receipt_no: no, token: receiptToken(no) };
      });
    },
  },

  /* ---------------------------------------------------------- categories */
  'cat.list': {
    cap: CAPABILITY.read,
    async run() {
      const r = await q(
        `SELECT sc.*, (SELECT count(*) FROM donation d WHERE d.seva_category_id = sc.id) AS donations,
                (SELECT COALESCE(sum(d.amount),0) FROM donation d WHERE d.seva_category_id = sc.id) AS raised
           FROM seva_category sc ORDER BY sc.display_order, sc.name`);
      return { rows: r.rows };
    },
  },

  'cat.save': {
    cap: CAPABILITY.bulk,
    async run({ data }, user) {
      const d = data || {};
      if (!clean(d.name)) throw new Error('Name is required');
      const slug = clean(d.slug)
        || clean(d.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      const cols = {
        slug,
        name: clean(d.name),
        kind: clean(d.kind) || 'one_time',
        icon: clean(d.icon),
        display_order: num(d.display_order) ?? 100,
        min_amount: num(d.min_amount) ?? 101,
        name_i18n: JSON.stringify(d.name_i18n || {}),
        line_i18n: JSON.stringify(d.line_i18n || {}),
        emo_i18n: JSON.stringify(d.emo_i18n || {}),
        presets: JSON.stringify(d.presets || []),
        show_on_page: !!d.show_on_page,
        is_active: d.is_active !== false,
        tag: clean(d.tag),
        zoho_seva_type_id: clean(d.zoho_seva_type_id),
        zoho_category_id: clean(d.zoho_category_id),
      };

      return tx(user.id, async (c) => {
        if (d.id) {
          const keys = Object.keys(cols);
          const sets = keys.map((k, i) => `${k}=$${i + 2}`).join(',');
          const r = await c.query(
            `UPDATE seva_category SET ${sets} WHERE id=$1 RETURNING id, slug`,
            [d.id, ...keys.map((k) => cols[k])]);
          if (!r.rowCount) throw new Error('Category not found');
          return r.rows[0];
        }
        const keys = Object.keys(cols);
        const r = await c.query(
          `INSERT INTO seva_category (${keys.join(',')})
           VALUES (${keys.map((_, i) => `$${i + 1}`).join(',')})
           ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
           RETURNING id, slug`, keys.map((k) => cols[k]));
        return r.rows[0];
      });
    },
  },

  /* ------------------------------------------------------ ops day sheets */
  'seva.daySheet': {
    cap: CAPABILITY.read,
    async run({ date, days = 1 }) {
      const d = clean(date) || new Date().toISOString().slice(0, 10);
      const n = Math.min(Math.max(parseInt(days, 10) || 1, 1), 31);

      const [kitchen, pujari, totals] = await Promise.all([
        q(`SELECT * FROM v_kitchen_day_sheet
            WHERE seva_date >= $1::date AND seva_date < $1::date + $2::int`, [d, n]),
        q(`SELECT * FROM v_pujari_day_sheet
            WHERE seva_date >= $1::date AND seva_date < $1::date + $2::int`, [d, n]),
        q(`SELECT count(*) AS bookings, COALESCE(sum(amount),0) AS total
             FROM donation
            WHERE seva_date >= $1::date AND seva_date < $1::date + $2::int`, [d, n]),
      ]);
      return { date: d, days: n, kitchen: kitchen.rows, pujari: pujari.rows, totals: totals.rows[0] };
    },
  },

  /* ----------------------------------------------------------- reporting */
  'don.reports': {
    cap: CAPABILITY.read,
    async run({ from, to, grain = 'month' } = {}) {
      const g = ['day', 'week', 'month', 'year'].includes(grain) ? grain : 'month';
      const f = clean(from) || new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
      const t = clean(to) || new Date().toISOString().slice(0, 10);

      const [series, byStaff, byVolunteer, byCategory, topDonors, newVsReturning] = await Promise.all([
        q(`SELECT to_char(date_trunc($3,d.donated_on),'YYYY-MM-DD') AS bucket,
                  count(*) AS gifts, sum(d.amount) AS total, count(DISTINCT d.person_id) AS donors
             FROM donation d WHERE d.donated_on BETWEEN $1 AND $2
            GROUP BY 1 ORDER BY 1`, [f, t, g]),

        q(`SELECT COALESCE(e.name, NULLIF(btrim(d.collected_by),''), 'Unrecorded') AS name,
                  count(*) AS gifts, sum(d.amount) AS total, count(DISTINCT d.person_id) AS donors
             FROM donation d
             LEFT JOIN zoho_employee e
                    ON e.match_name = lower(btrim(regexp_replace(d.collected_by,'\\s+',' ','g')))
            WHERE d.donated_on BETWEEN $1 AND $2
            GROUP BY 1 ORDER BY total DESC`, [f, t]),

        q(`SELECT COALESCE(v.name, NULLIF(btrim(d.volunteer_name),''), 'Unrecorded') AS name,
                  COALESCE(e.name,'—') AS reports_to,
                  count(*) AS gifts, sum(d.amount) AS total
             FROM donation d
             LEFT JOIN zoho_volunteer v
                    ON v.match_name = lower(btrim(regexp_replace(d.volunteer_name,'\\s+',' ','g')))
             LEFT JOIN zoho_employee e ON e.id = v.employee_id
            WHERE d.donated_on BETWEEN $1 AND $2
            GROUP BY 1,2 ORDER BY total DESC`, [f, t]),

        q(`SELECT COALESCE(s.name,'Unspecified') AS name, count(*) AS gifts, sum(d.amount) AS total
             FROM donation d LEFT JOIN seva_category s ON s.id = d.seva_category_id
            WHERE d.donated_on BETWEEN $1 AND $2
            GROUP BY 1 ORDER BY total DESC`, [f, t]),

        q(`SELECT p.person_no, p.display_name, count(*) AS gifts, sum(d.amount) AS total
             FROM donation d JOIN person p ON p.id = d.person_id
            WHERE d.donated_on BETWEEN $1 AND $2
            GROUP BY 1,2 ORDER BY total DESC LIMIT 20`, [f, t]),

        // A donor is "new" if this window contains their very first gift.
        q(`WITH firsts AS (SELECT person_id, min(donated_on) AS first_on FROM donation GROUP BY 1)
           SELECT count(*) FILTER (WHERE fs.first_on BETWEEN $1 AND $2) AS new_donors,
                  count(*) FILTER (WHERE fs.first_on < $1) AS returning_donors
             FROM (SELECT DISTINCT d.person_id FROM donation d
                    WHERE d.donated_on BETWEEN $1 AND $2) x
             JOIN firsts fs ON fs.person_id = x.person_id`, [f, t]),
      ]);

      return {
        from: f, to: t, grain: g,
        series: series.rows,
        byStaff: byStaff.rows,
        byVolunteer: byVolunteer.rows,
        byCategory: byCategory.rows,
        topDonors: topDonors.rows,
        mix: newVsReturning.rows[0],
      };
    },
  },

  /** Birthdays and anniversaries among donors — the outreach list. */
  'don.occasions': {
    cap: CAPABILITY.read,
    async run({ days = 7 } = {}) {
      const n = Math.min(Math.max(parseInt(days, 10) || 7, 1), 60);
      const r = await q(
        `SELECT p.person_no, p.display_name, p.mobile_e164, p.dob,
                to_char(p.dob,'DD Mon') AS day_label,
                COALESCE(e.name,'—') AS mapped_to,
                (SELECT COALESCE(sum(amount),0) FROM donation d WHERE d.person_id = p.id) AS lifetime
           FROM person p
           LEFT JOIN person_referral pr ON pr.person_id = p.id
           LEFT JOIN zoho_employee e ON e.id = pr.staff_id
          WHERE p.dob IS NOT NULL AND p.is_active
            AND EXISTS (SELECT 1 FROM donation d WHERE d.person_id = p.id)
            AND to_char(p.dob,'MM-DD') = ANY (
                  SELECT to_char(CURRENT_DATE + s, 'MM-DD') FROM generate_series(0, $1) s)
          ORDER BY to_char(p.dob,'MM-DD')`, [n - 1]);
      return { rows: r.rows };
    },
  },

  /** Outbox health — a broken Zoho sync must be visible without opening the DB. */
  'don.syncHealth': {
    cap: CAPABILITY.read,
    async run() {
      const r = await q(
        `SELECT status, count(*) AS n, max(attempts) AS max_attempts
           FROM webhook_outbox GROUP BY status`).catch(() => ({ rows: [] }));
      const stuck = await q(
        `SELECT id, donation_id, attempts, last_error
           FROM webhook_outbox WHERE status IN ('failed','pending') AND attempts > 3
          ORDER BY id DESC LIMIT 10`).catch(() => ({ rows: [] }));
      return { byStatus: r.rows, stuck: stuck.rows };
    },
  },
};
