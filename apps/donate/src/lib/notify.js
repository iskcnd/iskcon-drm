import { q } from './db.js';
import { receiptToken } from './receipt.js';

/**
 * Outbound receipts by WhatsApp and email.
 *
 * Queued, not sent inline: a donor's payment must never fail because a
 * messaging provider is slow. The queue is drained by the background runner.
 *
 * There is ONE switch — the `is_active` flag on each row of
 * notification_config, editable from the staff app. No environment variable
 * decides whether a donor is messaged, because two switches in two places is
 * how you end up sending nothing and not knowing why.
 */

const BACKOFF_MINUTES = [1, 5, 15, 60, 180, 720];
const PLACEHOLDER = /\{\{\s*([^{}]+?)\s*\}\}/g;

function receiptUrl(receiptNo) {
  const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
  return `${base}/api/receipts/${encodeURIComponent(receiptNo)}?t=${receiptToken(receiptNo)}`;
}

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const inDate = (v) => (v
  ? new Date(v).toLocaleDateString('en-GB',
    { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')
  : '');

/** Every value a template may reference. */
export function templateFields(d) {
  return {
    donor_name: d.display_name || d.full_name || 'Devotee',
    // Gallabox rejects a leading "+" — sending "+9188..." gets HTTP 422 on
    // every message. `phone` is always the bare digits.
    phone: String(d.mobile_e164 || '').replace(/^\+/, ''),
    phone_e164: d.mobile_e164 || '',
    email: d.email || '',
    amount: inr(d.amount),
    amount_raw: String(d.amount ?? ''),
    purpose: d.purpose || 'General Donation',
    receipt_no: String(d.receipt_no ?? ''),
    receipt_url: d.receipt_no ? receiptUrl(d.receipt_no) : '',
    donated_on: inDate(d.donated_on),
    seva_date: inDate(d.seva_date),
    temple_name: 'ISKCON Chennai',
  };
}

/**
 * Recursively fill every {{placeholder}} in a payload.
 *
 * Throws on an unknown placeholder rather than substituting blank. A template
 * with a typo should fail visibly in the queue, not reach a devotee with a
 * missing name — and Gallabox rejects empty template variables anyway.
 */
export function fillTemplate(node, values) {
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
      `Template placeholder {{${key}}} has no value. Available: ${Object.keys(values).join(', ')}`);
  });
}

/** Queue receipts for a paid donation. Called inside the markPaid tx. */
export async function queueReceiptNotifications(client, donationId) {
  const r = await client.query(
    `SELECT d.id, d.receipt_no, d.amount, d.donated_on, d.seva_date,
            COALESCE(cp.title_i18n->>'en', sc.name, 'General Donation') AS purpose,
            p.id AS person_id, p.full_name, p.display_name, p.email, p.mobile_e164
       FROM donation d
       JOIN person p ON p.id = d.person_id
       LEFT JOIN seva_category sc ON sc.id = d.seva_category_id
       LEFT JOIN campaign cp ON cp.id = d.campaign_id
      WHERE d.id = $1`, [donationId]);

  const d = r.rows[0];
  if (!d || !d.receipt_no) return;

  const cfgs = await client.query(
    `SELECT * FROM notification_config WHERE purpose = 'receipt' ORDER BY channel`);

  for (const cfg of cfgs.rows) {
    const to = cfg.channel === 'whatsapp' ? d.mobile_e164 : d.email;
    if (!to) continue;

    const fields = { ...(cfg.extra_values || {}), ...templateFields(d) };

    // Render now, not at send time: a broken template surfaces immediately
    // against a real donation rather than minutes later in the runner.
    let payload; let preview; let status = cfg.is_active ? 'queued' : 'skipped';
    let error = null;
    try {
      payload = cfg.channel === 'whatsapp'
        ? fillTemplate(cfg.payload_template || {}, fields)
        : {
          subject: fillTemplate(cfg.subject || '', fields),
          html: fillTemplate(cfg.html || '', fields),
        };
      preview = `${fields.receipt_no} · ${fields.amount} · ${fields.purpose}`;
    } catch (err) {
      payload = { error: err.message };
      preview = 'Template error';
      status = 'failed';
      error = err.message;
    }

    await client.query(
      `INSERT INTO notification
         (channel, purpose, person_id, donation_id, to_address, template,
          payload, body_preview, status, last_error)
       VALUES ($1,'receipt',$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (donation_id, channel, purpose)
         WHERE donation_id IS NOT NULL AND purpose = 'receipt'
       DO NOTHING`,
      [cfg.channel, d.person_id, d.id, to, cfg.template,
        JSON.stringify(payload), preview, status, error]);
  }
}

// ------------------------------------------------------------------ senders

/**
 * Gallabox. The payload was rendered when queued, so this only posts it.
 *
 * `recipient` must carry `phone` or `rawPhone`, spelled exactly — Gallabox
 * does not recognise `rawphone` and returns 422 for every send. Checked here
 * so a bad template fails with a clear message instead of a provider error.
 */
async function sendWhatsApp(n) {
  const url = process.env.GALLABOX_API_URL || 'https://server.gallabox.com/devapi/messages/whatsapp';
  const apiKey = process.env.GALLABOX_API_KEY;
  const apiSecret = process.env.GALLABOX_API_SECRET;
  if (!apiKey) throw new Error('GALLABOX_API_KEY is not set');

  const body = { ...(n.payload || {}) };
  if (!body.channelId) body.channelId = process.env.GALLABOX_CHANNEL_ID || '';
  if (!body.channelId) throw new Error('No channelId — set it in the template or GALLABOX_CHANNEL_ID');

  const keys = Object.keys(body.recipient || {});
  if (!keys.includes('phone') && !keys.includes('rawPhone')) {
    const near = keys.find((k) => k.toLowerCase() === 'rawphone' || k.toLowerCase() === 'phone');
    throw new Error(
      `recipient must contain "phone" or "rawPhone" (case-sensitive). Found: ${keys.join(', ')}`
      + (near ? `. Rename "${near}" to "rawPhone".` : ''));
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apiKey,
      ...(apiSecret ? { apiSecret } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Gallabox HTTP ${res.status}: ${text.slice(0, 300)}`);
  try { return JSON.parse(text)?.id || null; } catch { return null; }
}

/** Email via Resend. */
async function sendEmail(n) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set');
  const from = process.env.EMAIL_FROM || 'ISKCON Chennai <info@iskconchennai.org>';
  const p = n.payload || {};

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from, to: [n.to_address], subject: p.subject || 'Your ISKCON Chennai receipt', html: p.html || '',
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Resend HTTP ${res.status}: ${text.slice(0, 300)}`);
  try { return JSON.parse(text)?.id || null; } catch { return null; }
}

// ------------------------------------------------------------------- runner

export async function processNotifications(limit = 20) {
  const due = await q(
    `SELECT n.* FROM notification n
      WHERE n.status IN ('queued','failed')
        AND n.next_attempt_at <= now()
      ORDER BY n.id LIMIT $1
      FOR UPDATE SKIP LOCKED`, [limit]);

  let sent = 0; let failed = 0;
  for (const n of due.rows) {
    try {
      const providerId = n.channel === 'whatsapp' ? await sendWhatsApp(n) : await sendEmail(n);
      await q(
        `UPDATE notification SET status='sent', sent_at=now(), attempts=attempts+1,
                provider_id=$2, last_error=NULL
          WHERE id=$1`, [n.id, providerId]);
      sent += 1;
    } catch (err) {
      const attempts = n.attempts + 1;
      const dead = attempts >= BACKOFF_MINUTES.length;
      const mins = BACKOFF_MINUTES[Math.min(attempts, BACKOFF_MINUTES.length - 1)];
      await q(
        `UPDATE notification
            SET status=$2, attempts=$3, last_error=$4,
                next_attempt_at = now() + ($5 || ' minutes')::interval
          WHERE id=$1`,
        [n.id, dead ? 'dead' : 'failed', attempts, String(err.message).slice(0, 500), String(mins)]);
      failed += 1;
    }
  }
  return { processed: due.rows.length, sent, failed };
}
