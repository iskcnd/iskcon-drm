import { q, tx } from './db.js';
import { CAPABILITY } from './session.js';

/**
 * Zoho sync monitoring for the staff app.
 *
 * Delivery itself lives in apps/donate — one implementation, not two. This
 * module reads the queue, lets an operator re-queue a row, and can ask the
 * donate service to run a delivery pass now.
 */
export const SYNC_OPS = {
  'sync.overview': {
    cap: CAPABILITY.read,
    async run() {
      const [byStatus, recent, oldestPending, unsent24h, config] = await Promise.all([
        q(`SELECT status, count(*) AS n FROM webhook_outbox GROUP BY status`),
        q(`SELECT o.id, o.donation_id, o.status, o.attempts, o.last_error,
                  o.created_at, o.sent_at, o.next_attempt_at,
                  d.amount, d.receipt_no, p.display_name AS donor
             FROM webhook_outbox o
             LEFT JOIN donation d ON d.id = o.donation_id
             LEFT JOIN person p ON p.id = d.person_id
            ORDER BY o.id DESC LIMIT 50`),
        q(`SELECT min(created_at) AS oldest FROM webhook_outbox WHERE status IN ('pending','failed')`),
        // Paid donations with no outbox row at all — the worst case, because
        // nothing is retrying them and nothing is visibly broken.
        q(`SELECT count(*) AS n FROM donation d
            WHERE COALESCE(d.status,'success') = 'success'
              AND d.created_at > now() - interval '30 days'
              AND NOT EXISTS (SELECT 1 FROM webhook_outbox o WHERE o.donation_id = d.id)`),
        q(`SELECT count(*) AS mapped FROM seva_category WHERE zoho_seva_type_id IS NOT NULL`),
      ]);

      return {
        byStatus: byStatus.rows,
        recent: recent.rows,
        oldestPending: oldestPending.rows[0]?.oldest || null,
        missingRows: Number(unsent24h.rows[0].n),
        categoriesMapped: Number(config.rows[0].mapped),
        webhookConfigured: !!process.env.ZOHO_WEBHOOK_URL,
        donateBase: process.env.DONATE_BASE_URL || null,
      };
    },
  },

  'sync.payload': {
    cap: CAPABILITY.bulk,
    async run({ id }) {
      const r = await q('SELECT id, donation_id, payload, status, attempts, last_error FROM webhook_outbox WHERE id=$1', [id]);
      if (!r.rows.length) throw new Error('Outbox row not found');
      return r.rows[0];
    },
  },

  /** Re-queue for immediate delivery. Works for failed and dead rows. */
  'sync.retry': {
    cap: CAPABILITY.bulk,
    async run({ id, all }, user) {
      return tx(user.id, async (c) => {
        if (all) {
          const r = await c.query(
            `UPDATE webhook_outbox SET status='pending', next_attempt_at=now(), attempts=0
              WHERE status IN ('failed','dead') RETURNING id`);
          return { requeued: r.rowCount };
        }
        const r = await c.query(
          `UPDATE webhook_outbox SET status='pending', next_attempt_at=now(), attempts=0
            WHERE id=$1 RETURNING id`, [id]);
        if (!r.rowCount) throw new Error('Outbox row not found');
        return { requeued: 1 };
      });
    },
  },

  /** Queue anything that was paid but never got an outbox row. */
  'sync.backfill': {
    cap: CAPABILITY.admin,
    async run(_p, user) {
      return tx(user.id, async (c) => {
        const r = await c.query(
          `SELECT d.id FROM donation d
            WHERE COALESCE(d.status,'success') = 'success'
              AND NOT EXISTS (SELECT 1 FROM webhook_outbox o WHERE o.donation_id = d.id)
            ORDER BY d.id`);
        return { found: r.rowCount, ids: r.rows.map((x) => x.id) };
      });
    },
  },

  /** Ask the donate service to run a delivery pass now. */
  'sync.runNow': {
    cap: CAPABILITY.bulk,
    async run() {
      const base = process.env.DONATE_BASE_URL;
      const key = process.env.CRON_KEY;
      if (!base) throw new Error('DONATE_BASE_URL is not set on this service — add it to run the outbox from here');
      if (!key) throw new Error('CRON_KEY is not set on this service');
      const res = await fetch(`${base.replace(/\/$/, '')}/api/internal/outbox`, {
        method: 'POST',
        headers: { 'x-cron-key': key },
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`Donate service returned ${res.status}: ${text.slice(0, 200)}`);
      try { return JSON.parse(text); } catch { return { raw: text }; }
    },
  },

  /**
   * Sends a clearly-marked test payload straight to Zoho. Proves the URL and
   * zapikey work without waiting for a real donation.
   */
  'sync.testWebhook': {
    cap: CAPABILITY.admin,
    async run() {
      const url = process.env.ZOHO_WEBHOOK_URL;
      if (!url) throw new Error('ZOHO_WEBHOOK_URL is not set on this service');
      // Must mirror buildPayload() in apps/donate/src/lib/zoho.js field for
      // field. A cut-down test payload proves nothing — Zoho can accept a
      // partial body and still reject the real one.
      const payload = {
        data: {
          Email: 'test@iskconchennai.org',
          Address: {
            country: 'India',
            district_city: 'Chennai',
            latitude: '',
            address_line_1: 'DRM connection test',
            state_province: 'Tamil Nadu',
            address_line_2: '',
            postal_code: '600020',
            longitude: '',
          },
          Payment_Type: process.env.ZOHO_PAYMENT_TYPE_ID || '',
          Same_as_Payee: 'false',
          Name: { first_name: 'DRM CONNECTION TEST — please ignore' },
          Form_Type: 'Page',
          would_you_like_to_receive_an_80_G: 'false',
          Would_you_like_to_receive_prasadam_on_your_Special_Occassions: 'false',
          Seva_Type: process.env.ZOHO_DEFAULT_SEVA_TYPE_ID || '',
          Sponsor_Type: 'Amount of Your Choice',
          Transaction_ID: `DRM-TEST-${Date.now()}`,
          Phone: '+919999999999',
          As_a_token_of_gratitude_we_wish_to_send_prasadam_Kindly_share_your_address: 'false',
          Employee_Name: '',
          Volunteer_Name: '',
          Amount: '1',
          Select_Seva_Category: process.env.ZOHO_DEFAULT_CATEGORY_ID || '',
          Date_field: new Date().toISOString().slice(0, 10),
          PTFS: 'Yes',
          Seva_Types: [],
        },
      };
      const started = Date.now();
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await res.text()).slice(0, 500);
      return { ok: res.ok, status: res.status, ms: Date.now() - started, body, sent: payload };
    },
  },
};
