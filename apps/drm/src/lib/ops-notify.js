import { q, tx } from './db.js';
import { CAPABILITY } from './session.js';

const clean = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim());
const PLACEHOLDER = /\{\{\s*([^{}]+?)\s*\}\}/g;

/**
 * Recursive {{placeholder}} fill — same rules as apps/donate/src/lib/notify.js.
 * Unknown placeholders throw so the preview shows the problem.
 */
function fillTemplate(node, values) {
  if (Array.isArray(node)) return node.map((v) => fillTemplate(v, values));
  if (node && typeof node === 'object') {
    return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, fillTemplate(v, values)]));
  }
  if (typeof node !== 'string') return node;
  return node.replace(PLACEHOLDER, (_, rawKey) => {
    const key = rawKey.trim();
    if (key in values) return String(values[key] ?? '');
    const ci = Object.keys(values).find((k) => k.toLowerCase() === key.toLowerCase());
    if (ci) return String(values[ci] ?? '');
    throw new Error(
      `Placeholder {{${key}}} has no value. Available: ${Object.keys(values).join(', ')}`);
  });
}

/** Fields a template can reference. Kept in step with notify.js in apps/donate. */
export const TEMPLATE_FIELDS = [
  ['donor_name', 'Donor name'],
  ['phone', 'Mobile, no "+" — Gallabox rejects it'],
  ['phone_e164', 'Mobile with +91'],
  ['email', 'Email address'],
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

      // WhatsApp templates are pasted as raw Gallabox JSON. Validate it here so
      // a malformed paste is rejected at save, not discovered at send time.
      let payloadTemplate = null;
      if (d.channel === 'whatsapp') {
        try {
          payloadTemplate = typeof d.payload_template === 'string'
            ? JSON.parse(d.payload_template)
            : d.payload_template;
        } catch (err) {
          throw new Error(`The Gallabox payload isn't valid JSON: ${err.message}`);
        }
        if (!payloadTemplate || typeof payloadTemplate !== 'object') {
          throw new Error('Paste the complete Gallabox payload as a JSON object');
        }
        const keys = Object.keys(payloadTemplate.recipient || {});
        if (!keys.includes('phone') && !keys.includes('rawPhone')) {
          throw new Error(
            'recipient must contain "phone" or "rawPhone" (case-sensitive). '
            + `Found: ${keys.join(', ') || 'nothing'}. Gallabox returns 422 for every send otherwise.`);
        }
      }

      let extra = {};
      try {
        extra = typeof d.extra_values === 'string'
          ? JSON.parse(d.extra_values || '{}')
          : (d.extra_values || {});
      } catch (err) {
        throw new Error(`Extra values aren't valid JSON: ${err.message}`);
      }

      return tx(user.id, async (c) => {
        if (d.id) {
          const r = await c.query(
            `UPDATE notification_config
                SET name=$2, purpose=$3, channel=$4, is_active=$5, template=$6,
                    subject=$7, html=$8, attach_receipt=$9, payload_template=$10,
                    extra_values=$11, notes=$12
              WHERE id=$1 RETURNING id`,
            [d.id, clean(d.name), clean(d.purpose) || 'receipt', d.channel, !!d.is_active,
              clean(d.template), clean(d.subject), clean(d.html), !!d.attach_receipt,
              payloadTemplate ? JSON.stringify(payloadTemplate) : null,
              JSON.stringify(extra), clean(d.notes)]);
          if (!r.rowCount) throw new Error('Not found');
          return r.rows[0];
        }
        const r = await c.query(
          `INSERT INTO notification_config
             (slug, name, purpose, channel, is_active, template, subject, html,
              attach_receipt, payload_template, extra_values, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [slug, clean(d.name), clean(d.purpose) || 'receipt', d.channel, !!d.is_active,
            clean(d.template), clean(d.subject), clean(d.html), !!d.attach_receipt,
            payloadTemplate ? JSON.stringify(payloadTemplate) : null,
            JSON.stringify(extra), clean(d.notes)]);
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
   * Send one real message to an address the operator names.
   *
   * The staff app holds no Gallabox or Resend credentials — deliberately, so
   * that rotating a messaging key touches one service. So this hands the
   * template to the donation service, which runs the identical code path a
   * receipt takes and reports back what the provider said.
   */
  'notif.test': {
    cap: CAPABILITY.bulk,
    async run({ configId, donationId, draft, to }) {
      const dest = String(to || '').trim();
      if (!dest) throw new Error('Enter the number or address to send the test to');

      const cfg = draft || (await q('SELECT * FROM notification_config WHERE id=$1', [configId])).rows[0];
      if (!cfg) throw new Error('Message not found');

      const base = (process.env.DONATE_BASE_URL || '').replace(/\/$/, '');
      if (!base) {
        throw new Error(
          'DONATE_BASE_URL is not set on this service, so there is nowhere to send from. '
          + 'Set it to the donation site URL in Railway.');
      }
      if (!process.env.CRON_KEY) {
        throw new Error(
          'CRON_KEY is not set on this service. It must match CRON_KEY on the donation '
          + 'service — that shared secret is what authorises this call.');
      }

      let res; let text;
      try {
        res = await fetch(`${base}/api/internal/notify-test`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-cron-key': process.env.CRON_KEY },
          body: JSON.stringify({ config: cfg, donationId, to: dest }),
        });
        text = await res.text();
      } catch (err) {
        throw new Error(`Could not reach the donation service at ${base}: ${err.message}`);
      }

      let out;
      try { out = JSON.parse(text); } catch { out = null; }
      if (!out) throw new Error(`Donation service returned HTTP ${res.status}: ${text.slice(0, 300)}`);
      if (res.status === 401) {
        throw new Error('The donation service rejected CRON_KEY. The two services must share the same value.');
      }
      if (out.error && res.status >= 400) throw new Error(out.error);
      return out;
    },
  },

  /**
   * Render exactly what would be sent, without sending.
   *
   * Uses a real donation when one is given, otherwise sample values — so a
   * template can be checked before any donation exists. A missing placeholder
   * is reported as an error here rather than reaching a devotee.
   */
  'notif.preview': {
    cap: CAPABILITY.bulk,
    async run({ configId, donationId, draft }) {
      const cfg = draft || (await q('SELECT * FROM notification_config WHERE id=$1', [configId])).rows[0];
      if (!cfg) throw new Error('Message not found');

      const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
      const dt = (v) => (v
        ? new Date(v).toLocaleDateString('en-GB',
          { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')
        : '');

      let d = null;
      if (donationId) {
        d = (await q(
          `SELECT d.receipt_no, d.amount, d.donated_on, d.seva_date,
                  COALESCE(cp.title_i18n->>'en', sc.name, 'General Donation') AS purpose,
                  p.display_name, p.full_name, p.email, p.mobile_e164
             FROM donation d
             JOIN person p ON p.id = d.person_id
             LEFT JOIN seva_category sc ON sc.id = d.seva_category_id
             LEFT JOIN campaign cp ON cp.id = d.campaign_id
            WHERE d.id = $1`, [donationId])).rows[0] || null;
      }

      const fields = d ? {
        donor_name: d.display_name || d.full_name,
        phone: String(d.mobile_e164 || '').replace(/^\+/, ''),
        phone_e164: d.mobile_e164 || '',
        email: d.email || '',
        amount: inr(d.amount),
        amount_raw: String(d.amount),
        purpose: d.purpose,
        receipt_no: String(d.receipt_no || ''),
        receipt_url: `${(process.env.DONATE_BASE_URL || '').replace(/\/$/, '')}/api/receipts/${d.receipt_no}?t=SAMPLE`,
        donated_on: dt(d.donated_on),
        seva_date: dt(d.seva_date),
        temple_name: 'ISKCON Chennai',
      } : {
        donor_name: 'Ramesh Kumar',
        phone: '919840012345',
        phone_e164: '+919840012345',
        email: 'donor@example.com',
        amount: '₹1,001',
        amount_raw: '1001',
        purpose: 'Annadanam',
        receipt_no: '200001',
        receipt_url: `${(process.env.DONATE_BASE_URL || '').replace(/\/$/, '')}/api/receipts/200001?t=SAMPLE`,
        donated_on: dt(new Date()),
        seva_date: dt(new Date()),
        temple_name: 'ISKCON Chennai',
      };

      const all = { ...(cfg.extra_values || {}), ...fields };

      try {
        if (cfg.channel === 'whatsapp') {
          const payload = fillTemplate(cfg.payload_template || {}, all);
          const keys = Object.keys(payload.recipient || {});
          const warnings = [];
          if (!keys.includes('phone') && !keys.includes('rawPhone')) {
            warnings.push('recipient has no "phone" or "rawPhone" key — Gallabox will reject every send with 422.');
          }
          if (!payload.channelId) warnings.push('No channelId in the template; GALLABOX_CHANNEL_ID will be used.');
          return { channel: 'whatsapp', to: all.phone, json: payload, fields: all, warnings, sample: !d };
        }
        return {
          channel: 'email',
          to: all.email,
          subject: fillTemplate(cfg.subject || '', all),
          html: fillTemplate(cfg.html || '', all),
          fields: all,
          warnings: [],
          sample: !d,
        };
      } catch (err) {
        return { error: err.message, fields: all, sample: !d };
      }
    },
  },
};
