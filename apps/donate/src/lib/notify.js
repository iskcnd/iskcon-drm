import { q } from './db.js';
import { receiptToken } from './receipt.js';

/**
 * Outbound receipts by WhatsApp and email.
 *
 * Queued, not sent inline. A donor's payment must never fail because a
 * messaging provider is slow or down — the money is already taken by then.
 * The queue is drained by the same background runner as the Zoho outbox.
 *
 * NOTIFY_CHANNELS decides who sends during the Zoho transition:
 *   NOTIFY_CHANNELS=              -> send nothing; Zoho is messaging the donor
 *   NOTIFY_CHANNELS=whatsapp      -> WhatsApp only
 *   NOTIFY_CHANNELS=whatsapp,email
 * Rows are still written when a channel is off, with status 'skipped', so the
 * history shows what would have gone and to whom.
 */

const channels = () =>
  (process.env.NOTIFY_CHANNELS || '')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

export const channelEnabled = (c) => channels().includes(c);

const BACKOFF_MINUTES = [1, 5, 15, 60, 180, 720];

function receiptUrl(receiptNo) {
  const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
  return `${base}/api/receipts/${encodeURIComponent(receiptNo)}?t=${receiptToken(receiptNo)}`;
}

/**
 * Every field a template can reference, built once per donation.
 * Adding a field here makes it available to every message without code changes
 * elsewhere — the mapping lives in notification_config.variables.
 */
function templateFields(d) {
  const amount = `₹${Number(d.amount).toLocaleString('en-IN')}`;
  return {
    donor_name: d.display_name || d.full_name || 'Devotee',
    amount,
    amount_raw: String(d.amount),
    purpose: d.purpose,
    receipt_no: String(d.receipt_no),
    receipt_url: receiptUrl(d.receipt_no),
    donated_on: d.donated_on
      ? new Date(d.donated_on).toLocaleDateString('en-GB',
        { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')
      : '',
    seva_date: d.seva_date
      ? new Date(d.seva_date).toLocaleDateString('en-GB',
        { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')
      : '',
    temple_name: 'ISKCON Chennai',
  };
}

const fill = (text, fields) =>
  String(text || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => fields[k] ?? '');

/** Queue the receipt for a paid donation. Called inside the markPaid tx. */
export async function queueReceiptNotifications(client, donationId) {
  const r = await client.query(
    `SELECT d.id, d.receipt_no, d.amount, d.donated_on, d.seva_date,
            COALESCE(cp.title_i18n->>'en', sc.name, 'General Donation') AS purpose,
            p.id AS person_id, p.full_name, p.display_name, p.email,
            p.mobile_e164, p.whatsapp_optin, p.email_optin
       FROM donation d
       JOIN person p ON p.id = d.person_id
       LEFT JOIN seva_category sc ON sc.id = d.seva_category_id
       LEFT JOIN campaign cp ON cp.id = d.campaign_id
      WHERE d.id = $1`, [donationId]);

  const d = r.rows[0];
  if (!d || !d.receipt_no) return;

  const fields = templateFields(d);

  // What to send is configuration, not code.
  const cfgs = await client.query(
    `SELECT * FROM notification_config WHERE purpose = 'receipt' ORDER BY channel`);

  for (const cfg of cfgs.rows) {
    const to = cfg.channel === 'whatsapp' ? d.mobile_e164 : d.email;
    if (!to) continue;                       // nothing to send to

    const variables = (cfg.variables || []).map((k) => fields[k] ?? '');

    const payload = cfg.channel === 'whatsapp'
      ? {
        variables,
        recipientName: fields.donor_name,
        ...(cfg.attach_receipt
          ? { mediaUrl: fields.receipt_url, mediaName: `Receipt-${fields.receipt_no}.pdf` }
          : {}),
      }
      : {
        subject: fill(cfg.subject, fields),
        body: fill(cfg.body, fields),
        fields,
        ...(cfg.attach_receipt ? { receiptUrl: fields.receipt_url } : {}),
      };

    // A message is only sent when both the channel and this specific message
    // are enabled. Otherwise the row is still written as 'skipped', so the
    // history shows what would have gone and to whom.
    const status = channelEnabled(cfg.channel) && cfg.is_active ? 'queued' : 'skipped';

    await client.query(
      `INSERT INTO notification
         (channel, purpose, person_id, donation_id, to_address, template, payload, body_preview, status)
       VALUES ($1,'receipt',$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (donation_id, channel, purpose)
         WHERE donation_id IS NOT NULL AND purpose = 'receipt'
       DO NOTHING`,
      [cfg.channel, d.person_id, d.id, to, cfg.template,
        JSON.stringify(payload),
        `Receipt ${fields.receipt_no} · ${fields.amount} · ${fields.purpose}`,
        status]);
  }
}

// ------------------------------------------------------------------ senders

/**
 * Gallabox WhatsApp.
 *
 * The exact request shape depends on the Gallabox account and template, so
 * everything is configurable. Confirm against your Gallabox docs before going
 * live — a wrong field name here fails silently as a provider error.
 */
async function sendWhatsApp(n) {
  const url = process.env.GALLABOX_API_URL || 'https://server.gallabox.com/devapi/messages/whatsapp';
  const apiKey = process.env.GALLABOX_API_KEY;
  const apiSecret = process.env.GALLABOX_API_SECRET;
  const channelId = process.env.GALLABOX_CHANNEL_ID;
  if (!apiKey || !channelId) throw new Error('GALLABOX_API_KEY / GALLABOX_CHANNEL_ID not set');

  const p = n.payload || {};

  // Gallabox expects bodyValues as an OBJECT keyed "1","2","3"… — not an array.
  // An array is accepted by JSON but the variables arrive unmapped.
  const bodyValues = {};
  (p.variables || []).forEach((v, i) => { bodyValues[String(i + 1)] = String(v ?? ''); });

  const body = {
    channelId,
    channelType: 'whatsapp',
    recipient: {
      name: p.recipientName || 'Devotee',
      // Gallabox wants the number without the leading "+".
      phone: String(n.to_address).replace(/^\+/, ''),
    },
    whatsapp: {
      type: 'template',
      template: {
        templateName: n.template,
        bodyValues,
        // Document header — the receipt PDF itself. Gallabox fetches this URL,
        // so it must be publicly reachable; ours carries its own signed token.
        ...(p.mediaUrl
          ? { headerValues: { mediaUrl: p.mediaUrl, mediaName: p.mediaName || 'Receipt.pdf' } }
          : {}),
      },
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apiKey,
      ...(apiSecret ? { apiSecret } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Gallabox ${res.status}: ${text.slice(0, 300)}`);
  try { return JSON.parse(text)?.id || null; } catch { return null; }
}

/**
 * Email over an HTTP API (Resend or SendGrid), chosen with EMAIL_PROVIDER.
 * HTTP rather than SMTP so there's no extra dependency and no long-lived
 * connection to babysit inside a request handler.
 */
async function sendEmail(n) {
  const provider = (process.env.EMAIL_PROVIDER || '').toLowerCase();
  const from = process.env.EMAIL_FROM || 'ISKCON Chennai <info@iskconchennai.org>';
  const p = n.payload || {};

  const html = `
    <div style="font-family:system-ui,Segoe UI,sans-serif;color:#141413;line-height:1.6">
      <p>Hare Krishna ${escapeHtml(p.name || '')},</p>
      <p>Thank you for your offering of <b>${escapeHtml(p.amount || '')}</b> towards
         <b>${escapeHtml(p.purpose || '')}</b>.</p>
      <p>Your receipt number is <b>${escapeHtml(p.receiptNo || '')}</b>.</p>
      <p><a href="${p.url}" style="background:#B4633F;color:#fff;padding:10px 18px;
            border-radius:6px;text-decoration:none;display:inline-block">Download your receipt</a></p>
      <p style="font-size:12px;color:#6b6b68">
        This receipt is an acknowledgement only and not for claiming 80G deduction.
        Form 10BE will be issued as per Income-tax Act timelines.
      </p>
      <p>Your servant,<br>ISKCON Chennai</p>
    </div>`;

  if (provider === 'resend') {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('RESEND_API_KEY not set');
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to: [n.to_address], subject: p.subject, html }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Resend ${res.status}: ${text.slice(0, 300)}`);
    try { return JSON.parse(text)?.id || null; } catch { return null; }
  }

  if (provider === 'sendgrid') {
    const key = process.env.SENDGRID_API_KEY;
    if (!key) throw new Error('SENDGRID_API_KEY not set');
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: n.to_address }] }],
        from: { email: from.match(/<(.+)>/)?.[1] || from },
        subject: p.subject,
        content: [{ type: 'text/html', value: html }],
      }),
    });
    if (!res.ok) throw new Error(`SendGrid ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return null;
  }

  throw new Error('EMAIL_PROVIDER is not set (expected "resend" or "sendgrid")');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// ------------------------------------------------------------------- runner

/** Delivers due notifications. Called by the background runner. */
export async function processNotifications(limit = 20) {
  const active = channels();
  if (!active.length) return { skipped: true, reason: 'NOTIFY_CHANNELS empty' };

  const due = await q(
    `SELECT * FROM notification
      WHERE status IN ('queued','failed')
        AND channel = ANY($2)
        AND next_attempt_at <= now()
      ORDER BY id LIMIT $1
      FOR UPDATE SKIP LOCKED`,
    [limit, active]);

  let sent = 0; let failed = 0;
  for (const n of due.rows) {
    try {
      const providerId = n.channel === 'whatsapp' ? await sendWhatsApp(n) : await sendEmail(n);
      await q(
        `UPDATE notification SET status='sent', sent_at=now(), attempts=attempts+1, provider_id=$2
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
