import { q, tx } from './db.js';
import { maskName, orderRef } from './util.js';
import { enqueueZohoWebhook } from './zoho.js';
import { parsePhone } from './phone.js';
import { queueReceiptNotifications } from './notify.js';

/** Public actor sentinel for audit rows written by the donation page. */
const PUBLIC_ACTOR = process.env.PUBLIC_ACTOR_ID || null;

// ------------------------------------------------------------------ reads

export async function getPageContent() {
  const cats = await q(
    `SELECT id, slug, kind, icon, tag, min_amount, name_i18n, line_i18n, emo_i18n, presets
       FROM seva_category
      WHERE is_active AND show_on_page
      ORDER BY display_order, id`
  );
  const camps = await q(
    `SELECT c.id, c.slug, c.title_i18n, c.line_i18n, c.goal_amount, c.starts_on, c.ends_on, c.presets,
            COALESCE(s.raised, 0) AS raised, COALESCE(s.donors, 0) AS donors
       FROM campaign c
       LEFT JOIN (SELECT campaign_id, sum(amount) AS raised, count(DISTINCT person_id) AS donors
                    FROM donation WHERE status = 'paid' GROUP BY campaign_id) s ON s.campaign_id = c.id
      WHERE c.is_live
        AND (c.starts_on IS NULL OR c.starts_on <= CURRENT_DATE)
        AND (c.ends_on   IS NULL OR c.ends_on   >= CURRENT_DATE)
      ORDER BY c.display_order, c.id`
  );
  return { categories: cats.rows, campaigns: camps.rows };
}

/**
 * D13/D24: one mobile → possibly many people. Returns ONLY masked name + area,
 * keyed by opaque person id. Nothing else ever leaves this endpoint.
 */
/** "  Ramesh   Kumar " and "ramesh kumar" are the same person. */
export const normName = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export async function lookupByMobile(national, cc = '+91') {
  // Match on the full international form so a +1 and a +91 number that happen
  // to share national digits are never confused. alt_mobile counts too — a
  // devotee may have given the temple a second number.
  const e164 = `${cc}${national}`;
  const r = await q(
    `SELECT p.id, p.display_name, p.area, p.city, p.created_at,
            (SELECT max(d.donated_on) FROM donation d WHERE d.person_id = p.id) AS last_gift
       FROM person p
      WHERE p.is_active AND (p.mobile_e164 = $1 OR p.alt_mobile_e164 = $1)
      ORDER BY p.created_at
      LIMIT 12`,
    [e164]
  );

  // Collapse records that are the same person recorded twice. Two identical
  // masked names on one number are indistinguishable to the donor — offering
  // both guarantees a wrong pick and a third duplicate next time. The oldest
  // record wins, so history stays attached to one id.
  const byName = new Map();
  for (const p of r.rows) {
    const key = normName(p.display_name);
    const seen = byName.get(key);
    if (!seen) { byName.set(key, p); continue; }
    // Prefer whichever has actually donated; otherwise keep the earlier row.
    if (p.last_gift && (!seen.last_gift || p.last_gift > seen.last_gift)) byName.set(key, p);
  }

  return [...byName.values()].slice(0, 6).map((p) => ({
    person_id: p.id,
    mask: maskName(p.display_name),
    area: [p.area, p.city].filter(Boolean).join(', '),
    // A hint so two different people with similar names are still tellable
    // apart, without revealing anything to someone guessing phone numbers.
    lastGift: p.last_gift
      ? new Date(p.last_gift).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
      : null,
  }));
}

// ------------------------------------------------------------------ writes

/**
 * Creates the donation (status=pending) + first payment attempt.
 * Identity per D13/D14: an existing person_id from the masked picker, or a new
 * person. A new name on an existing mobile is a NEW person flagged needs_review.
 */
export async function createDonation(input) {
  const {
    categorySlug, campaignSlug, amount, sevaDate, isRecurring,
    personId, newPerson, prasadam, gateway, ref,
  } = input;

  return tx(async (c) => {
    let cat = null, camp = null;
    if (campaignSlug) {
      const r = await c.query(`SELECT * FROM campaign WHERE slug=$1 AND is_live`, [campaignSlug]);
      camp = r.rows[0];
      if (!camp) throw Object.assign(new Error('Campaign not found or not live'), { status: 404 });
      if (camp.seva_category_id) {
        const cr = await c.query(`SELECT * FROM seva_category WHERE id=$1`, [camp.seva_category_id]);
        cat = cr.rows[0];
      }
    } else {
      const r = await c.query(`SELECT * FROM seva_category WHERE slug=$1 AND is_active AND show_on_page`, [categorySlug]);
      cat = r.rows[0];
      if (!cat) throw Object.assign(new Error('Category not found'), { status: 404 });
    }

    const minAmount = cat?.min_amount ?? 101;
    if (!(Number(amount) >= minAmount)) {
      throw Object.assign(new Error(`Minimum offering is ₹${minAmount}`), { status: 422 });
    }
    if (newPerson?.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(newPerson.pan.toUpperCase())) {
      throw Object.assign(new Error('PAN format looks incorrect (e.g. ABCDE1234F)'), { status: 422 });
    }

    let pid = personId;
    if (!pid) {
      if (!newPerson?.name || !newPerson?.mobile) {
        throw Object.assign(new Error('Name and mobile are required'), { status: 422 });
      }

      // Parse before storing. Writing the raw string means the person trigger
      // strips the "+" from "+9198..." and then prefixes +91 again, producing
      // +91918... — a wrong number, saved without complaint.
      const phone = parsePhone(newPerson.mobile, newPerson.cc);
      if (!phone.ok) throw Object.assign(new Error(phone.reason), { status: 422 });

      // Same number AND same name is the same devotee — reuse the record.
      // D14 says a *different* name on a shared number is a different person;
      // it never meant the same person should be duplicated on every visit.
      // Without this, a returning donor who retypes their details instead of
      // tapping their name gets a second record, and the picker then shows two
      // identical options they cannot choose between.
      const existing = await c.query(
        `SELECT id, full_name FROM person
          WHERE is_active AND (mobile_e164 = $1 OR alt_mobile_e164 = $1)`,
        [phone.e164]);

      const match = existing.rows.find(
        (p) => normName(p.full_name) === normName(newPerson.name));

      if (match) {
        pid = match.id;
        // Fill in anything the donor has now given that we didn't have before.
        // COALESCE means a blank field never erases something already known.
        await c.query(
          `UPDATE person
              SET email        = COALESCE(email, $2),
                  pan          = COALESCE(pan, $3),
                  address_line = COALESCE(address_line, $4),
                  pincode      = COALESCE(pincode, $5),
                  whatsapp_optin = whatsapp_optin OR $6
            WHERE id = $1`,
          [pid, newPerson.email || null,
            newPerson.pan ? newPerson.pan.toUpperCase() : null,
            newPerson.addressLine || null, newPerson.pincode || null,
            !!newPerson.whatsappOptin]);
      } else {

      const shared = existing.rows.length > 0;
      const ins = await c.query(
        `INSERT INTO person (full_name, mobile_cc, mobile_number, email, pan, whatsapp_optin,
                             address_line, area, city, state, pincode,
                             source, needs_review, review_reason)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'donation-page',$12,$13)
         RETURNING id`,
        [
          newPerson.name.trim(), phone.cc, phone.national, newPerson.email || null,
          newPerson.pan ? newPerson.pan.toUpperCase() : null, !!newPerson.whatsappOptin,
          newPerson.addressLine || null, newPerson.area || null, newPerson.city || null,
          newPerson.state || null, newPerson.pincode || null,
          shared, shared ? 'donation page: new name on a mobile number already in records (D14)' : null,
        ]
      );
        pid = ins.rows[0].id;
      }
    } else {
      const chk = await c.query(`SELECT id FROM person WHERE id=$1 AND is_active`, [pid]);
      if (!chk.rows.length) throw Object.assign(new Error('Person not found'), { status: 404 });
      if (newPerson?.addressLine) {
        await c.query(
          `UPDATE person SET address_line=COALESCE($2,address_line), area=COALESCE($3,area),
                  city=COALESCE($4,city), state=COALESCE($5,state), pincode=COALESCE($6,pincode)
            WHERE id=$1`,
          [pid, newPerson.addressLine, newPerson.area || null, newPerson.city || null,
           newPerson.state || null, newPerson.pincode || null]
        );
      }
    }

    // Receipt T&C compliance: full name + address with PIN required for all
    // donations; PAN compulsory at ₹50,000 or more.
    const pRow = (await c.query(
      `SELECT full_name, address_line, pincode, pan FROM person WHERE id=$1`, [pid]
    )).rows[0];
    const hasAddress = (pRow.address_line || newPerson?.addressLine) && (pRow.pincode || newPerson?.pincode);
    if (!hasAddress) {
      throw Object.assign(new Error('Address with PIN code is required for the donation receipt (80G/10BE rules)'),
        { status: 422, code: 'needs_address' });
    }
    if (Number(amount) >= 50000 && !(pRow.pan || newPerson?.pan)) {
      throw Object.assign(new Error('PAN is compulsory for donations of ₹50,000 or more (Income-tax rules)'),
        { status: 422, code: 'needs_pan' });
    }
    if (newPerson?.pan && personId) {
      await c.query(`UPDATE person SET pan = COALESCE(pan, $2) WHERE id = $1`, [pid, newPerson.pan.toUpperCase()]);
    }

    // Who gets credit. The ?ref= code on the share link resolves to a Zoho
    // record id here, at donation time — Zoho's Employee_Name and
    // Volunteer_Name are lookups, and a name sent to a lookup is dropped
    // silently. Both name columns are filled too, so the staff app and the
    // day sheets read the same without a join.
    const code = String(ref || '').trim().toLowerCase();
    let staff = null; let volunteer = null;
    if (code) {
      staff = (await c.query(
        'SELECT id, name FROM zoho_employee WHERE lower(ref_code) = $1', [code])).rows[0] || null;
      if (!staff) {
        volunteer = (await c.query(
          'SELECT id, name FROM zoho_volunteer WHERE lower(ref_code) = $1 AND is_active', [code])).rows[0] || null;
      }
    }

    const don = await c.query(
      `INSERT INTO donation (person_id, amount, seva_category_id, campaign_id, seva_date,
                             is_recurring, prasadam_optin, gateway, status, external_source, donated_on,
                             staff_id, volunteer_id, collected_by, volunteer_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending','donation-page',CURRENT_DATE,$9,$10,$11,$12)
       RETURNING id`,
      [pid, amount, cat?.id || null, camp?.id || null, sevaDate || null, !!isRecurring, !!prasadam, gateway,
        staff?.id || null, volunteer?.id || null, staff?.name || null, volunteer?.name || null]
    );
    const donationId = don.rows[0].id;

    // First touch, permanent. person_id is the primary key, so ON CONFLICT DO
    // NOTHING is the whole rule: whoever brought this devotee in keeps the
    // credit, and a later link from someone else cannot take it.
    if (staff || volunteer) {
      await c.query(
        `INSERT INTO person_referral (person_id, staff_id, volunteer_id, first_donation_id, ref_code)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (person_id) DO NOTHING`,
        [pid, staff?.id || null, volunteer?.id || null, donationId, code]
      );
    }

    // Named attemptRef, not ref: `ref` is this function's referral-code
    // parameter. A `const ref` here put every earlier use of the parameter
    // into the temporal dead zone, so createDonation threw before it reached
    // the insert and no donation could be created at all.
    const attemptRef = orderRef();
    await c.query(
      `INSERT INTO payment_attempt (donation_id, gateway, attempt_no, order_ref, status)
       VALUES ($1,$2,1,$3,'initiated')`,
      [donationId, gateway, attemptRef]
    );

    const person = (await c.query(
      `SELECT full_name, display_name, email, mobile_number FROM person WHERE id=$1`, [pid]
    )).rows[0];

    return {
      donationId, orderRef: attemptRef, personId: pid,
      productinfo: camp ? `Campaign: ${camp.slug}` : `Seva: ${cat.slug}`,
      person,
    };
  }, PUBLIC_ACTOR);
}

/** Next attempt on the cascade after a gateway failure. */
/**
 * Last-resort record of a payment the gateway confirmed but we failed to
 * process. Written outside any transaction that might itself fail, and
 * deliberately dependency-free: if this can't be stored, the money is only in
 * the gateway's records and someone has to find it by hand.
 */
export async function recordUnreconciled(gateway, payload, error) {
  await q(
    `INSERT INTO unreconciled_payment (gateway, order_ref, gateway_txn_id, amount, raw, error)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (gateway, gateway_txn_id) DO UPDATE
       SET error = EXCLUDED.error, seen_count = unreconciled_payment.seen_count + 1`,
    [
      gateway,
      payload.txnid || payload.order_ref || null,
      payload.mihpayid || payload.easepayid || payload.razorpay_payment_id || null,
      Number(payload.amount) || null,
      JSON.stringify(payload),
      String(error).slice(0, 1000),
    ]
  );
}

export async function createFallbackAttempt(donationId, gateway) {
  return tx(async (c) => {
    const d = await c.query(
      `SELECT d.id, d.amount, d.status, p.full_name, p.email, p.mobile_number,
              COALESCE(sc.slug, cp.slug) AS slug, cp.slug AS campaign_slug,
              (SELECT max(attempt_no) FROM payment_attempt WHERE donation_id=d.id) AS attempts
         FROM donation d
         JOIN person p ON p.id = d.person_id
         LEFT JOIN seva_category sc ON sc.id = d.seva_category_id
         LEFT JOIN campaign cp ON cp.id = d.campaign_id
        WHERE d.id = $1`,
      [donationId]
    );
    const row = d.rows[0];
    if (!row) throw Object.assign(new Error('Donation not found'), { status: 404 });
    if (row.status !== 'pending') throw Object.assign(new Error('Donation is not pending'), { status: 409 });

    const ref = orderRef();
    await c.query(
      `INSERT INTO payment_attempt (donation_id, gateway, attempt_no, order_ref, status)
       VALUES ($1,$2,$3,$4,'initiated')`,
      [donationId, gateway, (row.attempts || 0) + 1, ref]
    );
    await c.query(`UPDATE donation SET gateway=$2 WHERE id=$1`, [donationId, gateway]);
    return { orderRef: ref, amount: row.amount, person: row, productinfo: row.campaign_slug ? `Campaign: ${row.campaign_slug}` : `Seva: ${row.slug}` };
  }, PUBLIC_ACTOR);
}

/** Marks an attempt failed (verified gateway response). */
export async function markAttemptFailed(ref, raw) {
  await q(
    `UPDATE payment_attempt SET status='failure', raw_response=$2 WHERE order_ref=$1 AND status='initiated'`,
    [ref, raw ? JSON.stringify(raw) : null]
  );
}

/**
 * Success path: idempotent on order_ref. Assigns our receipt number (D33) and
 * queues the Zoho webhook in the same transaction — the donation and its
 * outbox row commit or roll back together.
 */
export async function markPaid(ref, { gatewayTxnId, mode, raw }) {
  return tx(async (c) => {
    const a = await c.query(
      `UPDATE payment_attempt SET status='success', gateway_txn_id=$2, raw_response=$3
        WHERE order_ref=$1 AND status IN ('initiated','created')
        RETURNING donation_id, gateway`,
      [ref, gatewayTxnId || null, raw ? JSON.stringify(raw) : null]
    );
    if (!a.rows.length) {
      const existing = await c.query(
        `SELECT donation_id FROM payment_attempt WHERE order_ref=$1 AND status='success'`, [ref]
      );
      if (existing.rows.length) return { donationId: existing.rows[0].donation_id, already: true };
      throw Object.assign(new Error('Unknown order reference'), { status: 404 });
    }
    const { donation_id, gateway } = a.rows[0];

    const d = await c.query(
      `UPDATE donation
          SET status='paid', gateway=$2, txn_ref=$3, gateway_status='success',
              payment_mode='upi', receipt_no=COALESCE(receipt_no, next_receipt_no())
        WHERE id=$1 AND status='pending'
        RETURNING id, receipt_no`,
      [donation_id, mode === 'mock' ? 'other' : gateway, gatewayTxnId || ref]
    );
    if (d.rows.length) {
      await enqueueZohoWebhook(c, donation_id);
      // Queued, never sent inline: the money is already taken by this point,
      // so a slow messaging provider must not be able to fail the payment.
      await queueReceiptNotifications(c, donation_id);
    }
    const receipt = d.rows.length
      ? d.rows[0].receipt_no
      : (await c.query(`SELECT receipt_no FROM donation WHERE id=$1`, [donation_id])).rows[0]?.receipt_no;
    return { donationId: donation_id, receiptNo: receipt, already: !d.rows.length };
  }, PUBLIC_ACTOR);
}
