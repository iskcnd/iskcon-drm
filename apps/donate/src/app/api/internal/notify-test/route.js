import {
  templateFields, fillTemplate, sampleDonation, sendWhatsApp, sendEmail,
} from '@/lib/notify';
import { parsePhone } from '@/lib/phone';
import { q } from '@/lib/db';
import { json, bad, safeEqual } from '@/lib/util';

/**
 * Send one real message, to one address the operator names, right now.
 *
 * POST /api/internal/notify-test   header: x-cron-key: $CRON_KEY
 *   { config: <notification_config row>, to: "<phone|email>", donationId?: <id> }
 *
 * Called by the staff app, which holds no messaging credentials — Gallabox and
 * Resend keys live only here. It is deliberately the SAME code path a receipt
 * takes: the same templateFields, the same fillTemplate, the same sender. A
 * test that used a shortcut would prove nothing about the real thing.
 *
 * Nothing is written to the notification table. A test is not a receipt, and
 * it must never occupy the one-per-donation slot a real receipt needs.
 */
export async function POST(request) {
  if (!process.env.CRON_KEY || !safeEqual(request.headers.get('x-cron-key'), process.env.CRON_KEY)) {
    return bad('Unauthorized', 401);
  }

  let body;
  try { body = await request.json(); } catch { return bad('Body must be JSON'); }

  const cfg = body?.config;
  const to = String(body?.to || '').trim();
  if (!cfg?.channel) return bad('config.channel is required');
  if (!to) return bad('Enter the number or address to send the test to');

  // Real donation when one is named, otherwise a stand-in — so a template can
  // be proven on day one, before any money has moved.
  let d = sampleDonation();
  if (body.donationId) {
    const r = await q(
      `SELECT d.receipt_no, d.amount, d.donated_on, d.seva_date,
              COALESCE(cp.title_i18n->>'en', sc.name, 'General Donation') AS purpose,
              p.display_name, p.full_name, p.email, p.mobile_e164
         FROM donation d
         JOIN person p ON p.id = d.person_id
         LEFT JOIN seva_category sc ON sc.id = d.seva_category_id
         LEFT JOIN campaign cp ON cp.id = d.campaign_id
        WHERE d.id = $1`, [body.donationId]);
    if (!r.rows[0]) return bad('That donation was not found', 404);
    d = r.rows[0];
  }

  // The destination is whatever the operator typed, not the donor's. Normalise
  // it here: a pasted "+91 88073 56653" reaches Gallabox as a 422 otherwise,
  // which reads like a credential problem and sends people hunting in the
  // wrong place.
  let destination = to;
  if (cfg.channel === 'whatsapp') {
    const p = parsePhone(to);
    if (!p.ok) return bad(`That does not look like a mobile number: ${p.reason}`);
    d = { ...d, mobile_e164: p.e164 };
    destination = p.e164;
  } else {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return bad('That does not look like an email address');
    d = { ...d, email: to };
  }

  const fields = { ...(cfg.extra_values || {}), ...templateFields(d) };

  let payload;
  try {
    payload = cfg.channel === 'whatsapp'
      ? fillTemplate(cfg.payload_template || {}, fields)
      : {
        subject: fillTemplate(cfg.subject || '', fields),
        html: fillTemplate(cfg.html || '', fields),
      };
  } catch (err) {
    return json({ ok: false, stage: 'template', error: err.message, fields });
  }

  const n = { channel: cfg.channel, payload, to_address: destination };
  try {
    const providerId = cfg.channel === 'whatsapp' ? await sendWhatsApp(n) : await sendEmail(n);
    return json({ ok: true, stage: 'sent', to: destination, providerId, payload });
  } catch (err) {
    // The provider's own words, not ours. "Gallabox HTTP 401: Unauthorized"
    // tells the operator exactly where to look; "send failed" does not.
    return json({ ok: false, stage: 'provider', to: destination, error: err.message, payload });
  }
}
