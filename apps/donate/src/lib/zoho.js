import { q } from './db.js';

/**
 * Zoho Flow incoming-webhook sync (D30/D34).
 * The payload mirrors the format Divyarupa supplied on 01-Aug-2026. Zoho record
 * ids come from mapping columns on seva_category/campaign; page-wide constants
 * come from env. ZOHO_WEBHOOK_URL carries the zapikey — env only, never in git.
 */

/**
 * Zoho's date format: "03-Aug-2026". Always a string, always Asia/Kolkata.
 *
 * ISO dates are rejected by Zoho's validation, and UTC is wrong regardless —
 * a donation at 09:00 IST is 03:30 UTC the same day, but one at 02:00 IST is
 * still the *previous* day in UTC. Getting this wrong silently backdates
 * donations made late at night.
 */
export function zohoDate(value) {
  if (!value) return '';
  const dt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dt.getTime())) return '';
  return dt
    .toLocaleDateString('en-GB', {
      timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric',
    })
    .replace(/ /g, '-');
}

/** Text field: never null, never undefined. Zoho rejects nulls outright. */
const t = (v) => (v === null || v === undefined ? '' : String(v).trim());

/**
 * Amount as a decimal string — "1.00", not "1" and not the number 1.
 * §6 of the API reference is explicit about this and it applies to every
 * INR field on the form.
 */
const inr = (v) => (v === null || v === undefined || v === '' ? '' : Number(v).toFixed(2));

/**
 * Picklists reject anything outside their option list, and a rejected value
 * fails the whole record rather than just that field. Send only what is
 * allowed; send "" when what we hold is not on the list.
 */
const pick = (value, allowed) => {
  const v = t(value);
  if (!v) return '';
  const hit = allowed.find((a) => a.toLowerCase() === v.toLowerCase());
  return hit || '';
};

const LANGUAGES = ['Tamil', 'English', 'Telugu', 'Hindi', 'Bengali'];

/** Zoho's Payment_Status vocabulary. Our own statuses are a superset. */
const PAYMENT_STATUS = { paid: 'paid', pending: 'created', failed: 'failed' };

export async function buildPayload(client, donationId) {
  const r = await client.query(
    `SELECT d.*, p.full_name, p.email, p.mobile_number, p.mobile_e164, p.pan,
            p.address_line, p.area, p.city, p.state, p.pincode, p.country,
            p.gender, p.dob, p.preferred_language,
            sc.zoho_seva_type_id  AS cat_seva_type, sc.zoho_category_id AS cat_category, sc.name AS cat_name,
            cp.zoho_seva_type_id  AS camp_seva_type, cp.zoho_category_id AS camp_category, cp.slug AS camp_slug,
            (SELECT gateway_txn_id FROM payment_attempt
              WHERE donation_id = d.id AND status='success'
              ORDER BY attempt_no DESC LIMIT 1) AS txn_id,
            ze.zoho_id AS employee_zoho_id,
            zv.zoho_id AS volunteer_zoho_id,
            po.office_name AS po_office, po.district AS po_district, po.state AS po_state,
            po.latitude    AS po_lat,    po.longitude AS po_lng,
            (SELECT count(*) FROM donation e
              WHERE e.person_id = d.person_id AND e.status = 'paid' AND e.id <= d.id) AS paid_seq
       FROM donation d
       JOIN person p ON p.id = d.person_id
       LEFT JOIN seva_category sc ON sc.id = d.seva_category_id
       LEFT JOIN campaign cp ON cp.id = d.campaign_id
       -- Employee_Name and Volunteer_Name are Zoho lookups: they want a record
       -- id, not a name. Prefer the foreign key set from ?ref= at donation
       -- time; fall back to a whitespace-normalised name match, which is all
       -- rows imported from Zoho have (their exports carry values like
       -- "   Anna Daan  Counter  ").
       LEFT JOIN zoho_employee ze
              ON ze.id = d.staff_id
              OR (d.staff_id IS NULL AND d.collected_by IS NOT NULL
                  AND ze.match_name = lower(btrim(regexp_replace(d.collected_by, '\s+', ' ', 'g'))))
       LEFT JOIN zoho_volunteer zv
              ON zv.id = d.volunteer_id
              OR (d.volunteer_id IS NULL AND d.volunteer_name IS NOT NULL AND zv.is_active
                  AND zv.match_name = lower(btrim(regexp_replace(d.volunteer_name, '\s+', ' ', 'g'))))
       -- The page asks for a street line and a PIN. Zoho wants district, state
       -- and coordinates too. India Post publishes the mapping, so derive them
       -- rather than making a devotee type them on a phone.
       LEFT JOIN LATERAL resolve_pincode(p.pincode) po ON TRUE
      WHERE d.id = $1`,
    [donationId]
  );
  const d = r.rows[0];
  if (!d) throw new Error(`Donation ${donationId} not found`);

  // What the donor typed wins; the PIN directory fills the blanks. Their own
  // locality is more precise than the post office's name for it, but an empty
  // field helps nobody.
  const address = {
    address_line_1: t(d.address_line),
    address_line_2: t(d.area) || t(d.po_office),
    district_city: t(d.city) || t(d.po_district),
    state_province: t(d.state) || t(d.po_state),
    postal_code: t(d.pincode),
    country: t(d.country) || 'India',
    latitude: d.po_lat === null || d.po_lat === undefined ? '' : String(d.po_lat),
    longitude: d.po_lng === null || d.po_lng === undefined ? '' : String(d.po_lng),
  };

  const employeeId = t(d.employee_zoho_id);
  const wants80G = Boolean(d.is_80g && d.pan);

  // §7: leave non-applicable fields as "" or false — never omit them. A field
  // Zoho expects and does not receive is a validation failure, not a default.
  return {
    data: {
      // ── Basic / Seva info ────────────────────────────────────────────────
      // Zoho wants "03-Aug-2026", not ISO, and computed in Asia/Kolkata:
      // toISOString() is UTC, so a donation after 05:30 IST would carry the
      // previous day's date.
      Date_field: zohoDate(d.donated_on),
      Form_Type: 'Page',
      PTFS: 'Yes',
      // Empty rather than the raw name: a name sent to a lookup field is
      // silently dropped, so an unmapped staff member should show up blank and
      // be caught by v_unmapped_staff rather than look like it worked.
      Employee_Name: employeeId,
      Volunteer_Name: t(d.volunteer_zoho_id),
      Select_Seva_Category: t(d.camp_category || d.cat_category || process.env.ZOHO_DEFAULT_CATEGORY_ID),
      Select_Festival: '',
      Seva_Type: t(d.camp_seva_type || d.cat_seva_type || process.env.ZOHO_DEFAULT_SEVA_TYPE_ID),
      Seva_Types: [],
      Select_Seva: '',
      Select_Seva_Date: zohoDate(d.seva_date),
      Select_Seva_Date1: '',
      Seva_Amount: '',
      Sponsor_Type: 'Amount of Your Choice',
      Sponsor_Type_nitya: d.is_recurring ? 'Monthly' : '',
      Payment_Type1: 'Full Payment',
      Installment_Type: '',

      // ── Payee details ────────────────────────────────────────────────────
      Amount: inr(d.amount),
      Membership_Amount: '',
      // The whole name goes in first_name. That is what the existing Zoho
      // donation records hold, and splitting "Divyarupa Gaurachandra Das" into
      // first and last would not match them. All four keys are present because
      // the field is compound and partial objects are rejected.
      Name: {
        prefix: d.gender === 'M' ? 'Mr.' : d.gender === 'F' ? 'Ms.' : '',
        first_name: t(d.full_name),
        last_name: '',
        suffix: '',
      },
      Phone: t(d.mobile_e164 || d.mobile_number),
      Email: t(d.email),
      Payment_Type: t(process.env.ZOHO_PAYMENT_TYPE_ID),
      Cheque_no: '',
      Cheque_Date: '',
      Bank_Name: '',
      Branch_Name: '',
      Transaction_ID: t(d.txn_id || d.txn_ref),
      Bank_Account: '',

      // ── Address & PAN ────────────────────────────────────────────────────
      Address: address,
      // Was missing entirely while the 80G flag was being sent as true. Zoho
      // would have carried donors marked for an 80G certificate with no PAN to
      // issue it against — and PAN is what Form 10BE is built from.
      PAN_No: t(d.pan).toUpperCase(),

      // ── Preferences ──────────────────────────────────────────────────────
      // Real booleans. These are checkbox fields; the string "false" is a
      // non-empty string, which is not the same thing as unchecked.
      As_a_token_of_gratitude_we_wish_to_send_prasadam_Kindly_share_your_address: Boolean(d.prasadam_optin),
      would_you_like_to_receive_an_80_G: wants80G,
      Same_as_Payee: false,
      Would_you_like_to_receive_prasadam_on_your_Special_Occassions: false,
      Would_you_like_to_turn_on_Do_Not_Disturb: false,
      Family_Dependent: false,

      // ── Patron details (Life Patron / membership only) ───────────────────
      Name1: '',
      Phone_Number1: '',
      Email1: '',
      Address_Type: '',
      Address1: {
        address_line_1: '', address_line_2: '', district_city: '', state_province: '',
        postal_code: '', country: '', latitude: '', longitude: '',
      },
      Relationship_with_payee: '',
      Preferred_Language: pick(d.preferred_language, LANGUAGES),
      Life_Patron_Rec_ID: '',

      // ── Special occasions ────────────────────────────────────────────────
      Date_of_Birth: zohoDate(d.dob),
      Date_of_Anniversary: '',

      // ── Payment details ──────────────────────────────────────────────────
      Centre: '',
      Payment_Link: '',
      Payment_Response: '',
      Payment_Capture_Response: '',
      Whatsapp_Response: '',
      Payment_Status: PAYMENT_STATUS[d.status] || '',
      Payment_Reference_ID: t(d.txn_id || d.txn_ref),
      Next_Notification_Days: '',
      Old_Nitya_seva_Rec_ID: '',
      Nitya_Seva_Noification_Status: '',
      Donor_Master: '',
      Stop_Notification_Status: '',

      // ── Welcome message / routing ────────────────────────────────────────
      Welcome_Temp_Code: '',
      Header_Type: '',
      // §7: the supervising preacher, used for hierarchy reporting.
      Root_Employee: employeeId,
      Root_Volunteer: '',
      Donor_Master_ID: '',

      // ── Donor stage ──────────────────────────────────────────────────────
      // Only the first-gift case is stated in the reference. Sending a guess
      // for returning donors would write a value Zoho's own reports do not
      // recognise, so those stay empty until the vocabulary is confirmed.
      Donor_Stage: Number(d.paid_seq) <= 1 ? 'First Time Donor' : '',
      Nithya_Seva_Status: '',
      Donor_Donation_Count: '',
      Receipt: '',
      Membership_Pending_Amount: '',
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
