import { q } from './db.js';

/**
 * Zoho Flow incoming-webhook sync (D30/D34).
 * The payload mirrors the format Divyarupa supplied on 01-Aug-2026. Zoho record
 * ids come from mapping columns on seva_category/campaign; page-wide constants
 * come from env. ZOHO_WEBHOOK_URL carries the zapikey — env only, never in git.
 */

export async function buildPayload(client, donationId) {
  const r = await client.query(
    `SELECT d.*, p.full_name, p.email, p.mobile_number, p.mobile_e164, p.pan,
            p.address_line, p.area, p.city, p.state, p.pincode,
            sc.zoho_seva_type_id  AS cat_seva_type, sc.zoho_category_id AS cat_category, sc.name AS cat_name,
            cp.zoho_seva_type_id  AS camp_seva_type, cp.zoho_category_id AS camp_category, cp.slug AS camp_slug,
            (SELECT gateway_txn_id FROM payment_attempt
              WHERE donation_id = d.id AND status='success'
              ORDER BY attempt_no DESC LIMIT 1) AS txn_id,
            ze.zoho_id AS employee_zoho_id,
            zv.zoho_id AS volunteer_zoho_id
       FROM donation d
       JOIN person p ON p.id = d.person_id
       LEFT JOIN seva_category sc ON sc.id = d.seva_category_id
       LEFT JOIN campaign cp ON cp.id = d.campaign_id
       -- Employee_Name and Volunteer_Name are lookup fields in Zoho Creator:
       -- they expect a record id, not the person's name. Matching is on a
       -- whitespace-normalised name because the exports carry values like
       -- "   Anna Daan  Counter  ".
       LEFT JOIN zoho_employee ze
              ON ze.match_name = lower(btrim(regexp_replace(d.collected_by, '\s+', ' ', 'g')))
       LEFT JOIN zoho_volunteer zv
              ON zv.match_name = lower(btrim(regexp_replace(d.volunteer_name, '\s+', ' ', 'g')))
             AND zv.is_active
      WHERE d.id = $1`,
    [donationId]
  );
  const d = r.rows[0];
  if (!d) throw new Error(`Donation ${donationId} not found`);

  return {
    data: {
      Email: d.email || '',
      Address: {
        country: 'India',
        district_city: d.city || '',
        latitude: '',
        address_line_1: d.address_line || '',
        state_province: d.state || '',
        address_line_2: d.area || '',
        postal_code: d.pincode || '',
        longitude: '',
      },
      Payment_Type: process.env.ZOHO_PAYMENT_TYPE_ID || '',
      Same_as_Payee: 'false',
      Name: { first_name: d.full_name },
      Form_Type: 'Page',
      would_you_like_to_receive_an_80_G: d.is_80g && d.pan ? 'true' : 'false',
      Would_you_like_to_receive_prasadam_on_your_Special_Occassions: 'false',
      Seva_Type: d.camp_seva_type || d.cat_seva_type || process.env.ZOHO_DEFAULT_SEVA_TYPE_ID || '',
      Sponsor_Type: 'Amount of Your Choice',
      Transaction_ID: d.txn_id || d.txn_ref || '',
      // Full international form. Your Zoho donation export stores phones as
      // "+919840012345", so sending the bare national number would create
      // records that don't match the ones already there — and would be wrong
      // outright for overseas donors.
      Phone: d.mobile_e164 || d.mobile_number || '',
      As_a_token_of_gratitude_we_wish_to_send_prasadam_Kindly_share_your_address: d.prasadam_optin ? 'true' : 'false',
      // Zoho record ids, resolved above. Falls back to empty rather than the
      // raw name — sending a name to a lookup field silently drops the value,
      // so an unmapped staff member should show up as blank and be caught by
      // the v_unmapped_staff view rather than looking like it worked.
      Employee_Name: d.employee_zoho_id || '',
      Volunteer_Name: d.volunteer_zoho_id || '',
      Amount: String(d.amount),
      Select_Seva_Category: d.camp_category || d.cat_category || process.env.ZOHO_DEFAULT_CATEGORY_ID || '',
      Date_field: d.donated_on instanceof Date ? d.donated_on.toISOString().slice(0, 10) : String(d.donated_on),
      PTFS: 'Yes',
      Seva_Types: [],
    },
  };
}

/**
 * Called inside the markPaid transaction.
 *
 * The row is queued even when ZOHO_WEBHOOK_URL is unset. During the migration
 * every donation must reach Zoho, and a donation that was never queued leaves
 * no trace at all — you'd have to diff both systems to find it. Queue it, let
 * the runner skip delivery, and the backlog is visible and replayable the
 * moment the URL is configured.
 */
export async function enqueueZohoWebhook(client, donationId) {
  const payload = await buildPayload(client, donationId);
  await client.query(
    `INSERT INTO webhook_outbox (donation_id, payload) VALUES ($1, $2)`,
    [donationId, JSON.stringify(payload)]
  );
}

const BACKOFF_MINUTES = [1, 5, 15, 60, 180, 360, 720, 1440]; // then dead

/** Delivers due outbox rows. Invoked by the cron route. */
export async function processOutbox(limit = 20) {
  const url = process.env.ZOHO_WEBHOOK_URL;
  if (!url) return { skipped: true };
  // SKIP LOCKED so a manual run and the background runner can never pick up the
  // same row and send a donation to Zoho twice.
  const due = await q(
    `SELECT id, donation_id, payload, attempts FROM webhook_outbox
      WHERE status IN ('pending','failed') AND next_attempt_at <= now()
      ORDER BY id LIMIT $1
      FOR UPDATE SKIP LOCKED`,
    [limit]
  );
  let sent = 0, failed = 0;
  for (const row of due.rows) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(row.payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
      await q(`UPDATE webhook_outbox SET status='sent', sent_at=now(), attempts=attempts+1 WHERE id=$1`, [row.id]);
      sent += 1;
    } catch (err) {
      const attempts = row.attempts + 1;
      const dead = attempts >= BACKOFF_MINUTES.length;
      const mins = BACKOFF_MINUTES[Math.min(attempts, BACKOFF_MINUTES.length - 1)];
      await q(
        `UPDATE webhook_outbox
            SET status=$2, attempts=$3, last_error=$4,
                next_attempt_at=now() + ($5 || ' minutes')::interval
          WHERE id=$1`,
        [row.id, dead ? 'dead' : 'failed', attempts, String(err.message).slice(0, 500), String(mins)]
      );
      failed += 1;
    }
  }
  return { processed: due.rows.length, sent, failed };
}
