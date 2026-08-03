import { q, tx } from './db.js';
import { CAPABILITY } from './session.js';

const clean = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim());

/** Fields a template can reference. Kept in step with notify.js in apps/donate. */
export const TEMPLATE_FIELDS = [
  ['donor_name', 'Donor name'],
  ['amount', 'Amount, e.g. ₹1,001'],
  ['amount_raw', 'Amount, digits only'],
  ['purpose', 'Seva / campaign name'],
  ['receipt_no', 'Receipt number'],
  ['receipt_url', 'Link to the receipt PDF'],
  ['donated_on', 'Payment date, 03-Aug-2026'],
  ['seva_date', 'Seva date, 03-Aug-2026'],
  ['temple_name', 'ISKCON Chennai'],
];

export const NOTIFY_OPS = {
  'notif.list': {
    cap: CAPABILITY.read,
    async run() {
      const [cfg, recent, counts] = await Promise.all([
        q('SELECT * FROM notification_config ORDER BY purpose, channel'),
        q(`SELECT n.id, n.channel, n.purpose, n.to_address, n.status, n.attempts,
                  n.last_error, n.body_preview, n.sent_at, n.created_at,
                  d.receipt_no, p.display_name AS donor
             FROM notification n
             LEFT JOIN donation d ON d.id = n.donation_id
             LEFT JOIN person p ON p.id = n.person_id
            ORDER BY n.id DESC LIMIT 50`),
        q('SELECT status, count(*) AS n FROM notification GROUP BY status'),
      ]);
      return {
        configs: cfg.rows,
        recent: recent.rows,
        counts: counts.rows,
        fields: TEMPLATE_FIELDS,
        // Read from the DRM service; the donate service has its own copy.
        channelsEnabled: (process.env.NOTIFY_CHANNELS || '')
          .split(',').map((s) => s.trim()).filter(Boolean),
      };
    },
  },

  'notif.save': {
    cap: CAPABILITY.bulk,
    async run({ data }, user) {
      const d = data || {};
      if (!clean(d.name)) throw new Error('Name is required');
      if (!clean(d.channel)) throw new Error('Channel is required');
      if (d.channel === 'whatsapp' && !clean(d.template)) {
        throw new Error('A Gallabox template name is required for WhatsApp messages');
      }
      const slug = clean(d.slug)
        || `${clean(d.purpose) || 'message'}-${d.channel}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-');

      const vars = Array.isArray(d.variables)
        ? d.variables.filter(Boolean)
        : String(d.variables || '').split(',').map((s) => s.trim()).filter(Boolean);

      return tx(user.id, async (c) => {
        if (d.id) {
          const r = await c.query(
            `UPDATE notification_config
                SET name=$2, purpose=$3, channel=$4, is_active=$5, template=$6,
                    subject=$7, body=$8, attach_receipt=$9, variables=$10, notes=$11
              WHERE id=$1 RETURNING id`,
            [d.id, clean(d.name), clean(d.purpose) || 'receipt', d.channel, !!d.is_active,
              clean(d.template), clean(d.subject), clean(d.body), !!d.attach_receipt,
              JSON.stringify(vars), clean(d.notes)]);
          if (!r.rowCount) throw new Error('Not found');
          return r.rows[0];
        }
        const r = await c.query(
          `INSERT INTO notification_config
             (slug, name, purpose, channel, is_active, template, subject, body,
              attach_receipt, variables, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [slug, clean(d.name), clean(d.purpose) || 'receipt', d.channel, !!d.is_active,
            clean(d.template), clean(d.subject), clean(d.body), !!d.attach_receipt,
            JSON.stringify(vars), clean(d.notes)]);
        return r.rows[0];
      });
    },
  },

  'notif.toggle': {
    cap: CAPABILITY.bulk,
    async run({ id, on }, user) {
      return tx(user.id, async (c) => {
        const r = await c.query(
          'UPDATE notification_config SET is_active=$2 WHERE id=$1 RETURNING id, is_active',
          [id, !!on]);
        if (!r.rowCount) throw new Error('Not found');
        return r.rows[0];
      });
    },
  },

  /** Re-queue a message that failed or was skipped. */
  'notif.resend': {
    cap: CAPABILITY.bulk,
    async run({ id }, user) {
      return tx(user.id, async (c) => {
        const r = await c.query(
          `UPDATE notification
              SET status='queued', next_attempt_at=now(), attempts=0, last_error=NULL
            WHERE id=$1 RETURNING id, channel, to_address`, [id]);
        if (!r.rowCount) throw new Error('Message not found');
        return r.rows[0];
      });
    },
  },

  /**
   * Preview exactly what would be sent for a given donation, without sending.
   * Catches a wrong variable order before a donor sees it.
   */
  'notif.preview': {
    cap: CAPABILITY.bulk,
    async run({ configId, donationId }) {
      const cfg = (await q('SELECT * FROM notification_config WHERE id=$1', [configId])).rows[0];
      if (!cfg) throw new Error('Message not found');

      const d = (await q(
        `SELECT d.receipt_no, d.amount, d.donated_on, d.seva_date,
                COALESCE(cp.title_i18n->>'en', sc.name, 'General Donation') AS purpose,
                p.display_name, p.full_name, p.email, p.mobile_e164
           FROM donation d
           JOIN person p ON p.id = d.person_id
           LEFT JOIN seva_category sc ON sc.id = d.seva_category_id
           LEFT JOIN campaign cp ON cp.id = d.campaign_id
          WHERE d.id = $1`, [donationId])).rows[0];
      if (!d) throw new Error('Donation not found');

      const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
      const dt = (v) => (v
        ? new Date(v).toLocaleDateString('en-GB',
          { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')
        : '');

      const fields = {
        donor_name: d.display_name || d.full_name,
        amount: inr(d.amount),
        amount_raw: String(d.amount),
        purpose: d.purpose,
        receipt_no: String(d.receipt_no || '—'),
        receipt_url: `${process.env.DONATE_BASE_URL || ''}/api/receipts/${d.receipt_no}?t=…`,
        donated_on: dt(d.donated_on),
        seva_date: dt(d.seva_date),
        temple_name: 'ISKCON Chennai',
      };

      const values = (cfg.variables || []).map((k, i) => ({
        position: i + 1, field: k, value: fields[k] ?? '(unknown field)',
      }));

      return {
        config: cfg,
        to: cfg.channel === 'whatsapp' ? d.mobile_e164 : d.email,
        values,
        subject: (cfg.subject || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => fields[k] ?? ''),
        body: (cfg.body || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => fields[k] ?? ''),
        attachReceipt: cfg.attach_receipt,
      };
    },
  },
};
