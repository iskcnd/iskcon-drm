module.exports = [
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[project]/apps/donate/src/lib/db.js [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "pool",
    ()=>pool,
    "q",
    ()=>q,
    "tx",
    ()=>tx
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$pg$29$__ = __turbopack_context__.i("[externals]/pg [external] (pg, cjs, [project]/node_modules/pg)");
;
__TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$pg$29$__["default"].types.setTypeParser(1700, (v)=>v === null ? null : parseFloat(v));
__TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$pg$29$__["default"].types.setTypeParser(20, (v)=>v === null ? null : parseInt(v, 10));
const globalForPg = globalThis;
const pool = globalForPg._donatePool || new __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$pg$29$__["default"].Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    max: 8,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000
});
if ("TURBOPACK compile-time truthy", 1) globalForPg._donatePool = pool;
function q(text, params = []) {
    return pool.query(text, params);
}
async function tx(fn, actorId = null) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('SELECT set_config($1, $2, true)', [
            'app.actor_id',
            actorId || ''
        ]);
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK').catch(()=>{});
        throw err;
    } finally{
        client.release();
    }
}
}),
"[externals]/node:crypto [external] (node:crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:crypto", () => require("node:crypto"));

module.exports = mod;
}),
"[project]/apps/donate/src/lib/util.js [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "bad",
    ()=>bad,
    "clientIp",
    ()=>clientIp,
    "hmac256",
    ()=>hmac256,
    "json",
    ()=>json,
    "maskName",
    ()=>maskName,
    "orderRef",
    ()=>orderRef,
    "rateLimit",
    ()=>rateLimit,
    "safeEqual",
    ()=>safeEqual,
    "sha512",
    ()=>sha512
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:crypto [external] (node:crypto, cjs)");
;
function maskName(name) {
    if (!name) return 'Devotee';
    const parts = name.trim().split(/\s+/);
    const first = parts[0];
    const head = first.slice(0, 2);
    const tail = first.length > 3 ? first.slice(-1) : '';
    const dots = '•'.repeat(Math.max(first.length - head.length - tail.length, 1));
    const initial = parts.length > 1 ? ' ' + parts[parts.length - 1][0] : '';
    return `${head}${dots}${tail}${initial}`;
}
function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'content-type': 'application/json',
            'cache-control': 'no-store'
        }
    });
}
function bad(message, status = 400) {
    return json({
        error: message
    }, status);
}
function sha512(s) {
    return __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["default"].createHash('sha512').update(s).digest('hex');
}
function hmac256(s, key) {
    return __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["default"].createHmac('sha256', key).update(s).digest('hex');
}
function orderRef() {
    return 'ICC' + Date.now().toString(36).toUpperCase() + __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["default"].randomBytes(4).toString('hex').toUpperCase();
}
function safeEqual(a, b) {
    const ba = Buffer.from(String(a || ''));
    const bb = Buffer.from(String(b || ''));
    return ba.length === bb.length && __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["default"].timingSafeEqual(ba, bb);
}
/**
 * In-memory fixed-window rate limiter (per instance — fine on a single Railway
 * replica; move to Postgres/Redis if we ever scale out). Critical for /api/lookup:
 * masked-no-OTP (D24) is only acceptable with hard throttling.
 */ const buckets = new Map();
function rateLimit(key, limit, windowMs) {
    const now = Date.now();
    const b = buckets.get(key);
    if (!b || now - b.start > windowMs) {
        buckets.set(key, {
            start: now,
            count: 1
        });
        return true;
    }
    b.count += 1;
    if (buckets.size > 50_000) buckets.clear(); // safety valve
    return b.count <= limit;
}
function clientIp(request) {
    return (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
}
}),
"[project]/apps/donate/src/lib/zoho.js [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "buildPayload",
    ()=>buildPayload,
    "enqueueZohoWebhook",
    ()=>enqueueZohoWebhook,
    "processOutbox",
    ()=>processOutbox
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$donate$2f$src$2f$lib$2f$db$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/donate/src/lib/db.js [app-rsc] (ecmascript)");
;
async function buildPayload(client, donationId) {
    const r = await client.query(`SELECT d.*, p.full_name, p.email, p.mobile_number, p.pan,
            p.address_line, p.area, p.city, p.state, p.pincode,
            sc.zoho_seva_type_id  AS cat_seva_type, sc.zoho_category_id AS cat_category, sc.name AS cat_name,
            cp.zoho_seva_type_id  AS camp_seva_type, cp.zoho_category_id AS camp_category, cp.slug AS camp_slug,
            (SELECT gateway_txn_id FROM payment_attempt
              WHERE donation_id = d.id AND status='success'
              ORDER BY attempt_no DESC LIMIT 1) AS txn_id
       FROM donation d
       JOIN person p ON p.id = d.person_id
       LEFT JOIN seva_category sc ON sc.id = d.seva_category_id
       LEFT JOIN campaign cp ON cp.id = d.campaign_id
      WHERE d.id = $1`, [
        donationId
    ]);
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
                longitude: ''
            },
            Payment_Type: process.env.ZOHO_PAYMENT_TYPE_ID || '',
            Same_as_Payee: 'false',
            Name: {
                first_name: d.full_name
            },
            Form_Type: 'Page',
            would_you_like_to_receive_an_80_G: d.is_80g && d.pan ? 'true' : 'false',
            Would_you_like_to_receive_prasadam_on_your_Special_Occassions: 'false',
            Seva_Type: d.camp_seva_type || d.cat_seva_type || process.env.ZOHO_DEFAULT_SEVA_TYPE_ID || '',
            Sponsor_Type: 'Amount of Your Choice',
            Transaction_ID: d.txn_id || d.txn_ref || '',
            Phone: d.mobile_number || '',
            As_a_token_of_gratitude_we_wish_to_send_prasadam_Kindly_share_your_address: d.prasadam_optin ? 'true' : 'false',
            Employee_Name: d.collected_by || '',
            Volunteer_Name: d.volunteer_name || '',
            Amount: String(d.amount),
            Select_Seva_Category: d.camp_category || d.cat_category || process.env.ZOHO_DEFAULT_CATEGORY_ID || '',
            Date_field: d.donated_on instanceof Date ? d.donated_on.toISOString().slice(0, 10) : String(d.donated_on),
            PTFS: 'Yes',
            Seva_Types: []
        }
    };
}
async function enqueueZohoWebhook(client, donationId) {
    if (!process.env.ZOHO_WEBHOOK_URL) return; // sync disabled
    const payload = await buildPayload(client, donationId);
    await client.query(`INSERT INTO webhook_outbox (donation_id, payload) VALUES ($1, $2)`, [
        donationId,
        JSON.stringify(payload)
    ]);
}
const BACKOFF_MINUTES = [
    1,
    5,
    15,
    60,
    180,
    360,
    720,
    1440
]; // then dead
async function processOutbox(limit = 20) {
    const url = process.env.ZOHO_WEBHOOK_URL;
    if (!url) return {
        skipped: true
    };
    const due = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$donate$2f$src$2f$lib$2f$db$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["q"])(`SELECT id, donation_id, payload, attempts FROM webhook_outbox
      WHERE status IN ('pending','failed') AND next_attempt_at <= now()
      ORDER BY id LIMIT $1`, [
        limit
    ]);
    let sent = 0, failed = 0;
    for (const row of due.rows){
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json'
                },
                body: JSON.stringify(row.payload)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$donate$2f$src$2f$lib$2f$db$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["q"])(`UPDATE webhook_outbox SET status='sent', sent_at=now(), attempts=attempts+1 WHERE id=$1`, [
                row.id
            ]);
            sent += 1;
        } catch (err) {
            const attempts = row.attempts + 1;
            const dead = attempts >= BACKOFF_MINUTES.length;
            const mins = BACKOFF_MINUTES[Math.min(attempts, BACKOFF_MINUTES.length - 1)];
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$donate$2f$src$2f$lib$2f$db$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["q"])(`UPDATE webhook_outbox
            SET status=$2, attempts=$3, last_error=$4,
                next_attempt_at=now() + ($5 || ' minutes')::interval
          WHERE id=$1`, [
                row.id,
                dead ? 'dead' : 'failed',
                attempts,
                String(err.message).slice(0, 500),
                String(mins)
            ]);
            failed += 1;
        }
    }
    return {
        processed: due.rows.length,
        sent,
        failed
    };
}
}),
"[project]/apps/donate/src/lib/ops-donate.js [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createDonation",
    ()=>createDonation,
    "createFallbackAttempt",
    ()=>createFallbackAttempt,
    "getPageContent",
    ()=>getPageContent,
    "lookupByMobile",
    ()=>lookupByMobile,
    "markAttemptFailed",
    ()=>markAttemptFailed,
    "markPaid",
    ()=>markPaid
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$donate$2f$src$2f$lib$2f$db$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/donate/src/lib/db.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$donate$2f$src$2f$lib$2f$util$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/donate/src/lib/util.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$donate$2f$src$2f$lib$2f$zoho$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/donate/src/lib/zoho.js [app-rsc] (ecmascript)");
;
;
;
/** Public actor sentinel for audit rows written by the donation page. */ const PUBLIC_ACTOR = process.env.PUBLIC_ACTOR_ID || null;
async function getPageContent() {
    const cats = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$donate$2f$src$2f$lib$2f$db$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["q"])(`SELECT id, slug, kind, icon, tag, min_amount, name_i18n, line_i18n, emo_i18n, presets
       FROM seva_category
      WHERE is_active AND show_on_page
      ORDER BY display_order, id`);
    const camps = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$donate$2f$src$2f$lib$2f$db$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["q"])(`SELECT c.id, c.slug, c.title_i18n, c.line_i18n, c.goal_amount, c.starts_on, c.ends_on, c.presets,
            COALESCE(s.raised, 0) AS raised, COALESCE(s.donors, 0) AS donors
       FROM campaign c
       LEFT JOIN (SELECT campaign_id, sum(amount) AS raised, count(DISTINCT person_id) AS donors
                    FROM donation WHERE status = 'paid' GROUP BY campaign_id) s ON s.campaign_id = c.id
      WHERE c.is_live
        AND (c.starts_on IS NULL OR c.starts_on <= CURRENT_DATE)
        AND (c.ends_on   IS NULL OR c.ends_on   >= CURRENT_DATE)
      ORDER BY c.display_order, c.id`);
    return {
        categories: cats.rows,
        campaigns: camps.rows
    };
}
async function lookupByMobile(mobile10) {
    const r = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$donate$2f$src$2f$lib$2f$db$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["q"])(`SELECT id, display_name, area, city
       FROM person
      WHERE is_active AND mobile_number = $1
      ORDER BY created_at
      LIMIT 6`, [
        mobile10
    ]);
    return r.rows.map((p)=>({
            person_id: p.id,
            mask: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$donate$2f$src$2f$lib$2f$util$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["maskName"])(p.display_name),
            area: [
                p.area,
                p.city
            ].filter(Boolean).join(', ')
        }));
}
async function createDonation(input) {
    const { categorySlug, campaignSlug, amount, sevaDate, isRecurring, personId, newPerson, prasadam, gateway } = input;
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$donate$2f$src$2f$lib$2f$db$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tx"])(async (c)=>{
        let cat = null, camp = null;
        if (campaignSlug) {
            const r = await c.query(`SELECT * FROM campaign WHERE slug=$1 AND is_live`, [
                campaignSlug
            ]);
            camp = r.rows[0];
            if (!camp) throw Object.assign(new Error('Campaign not found or not live'), {
                status: 404
            });
            if (camp.seva_category_id) {
                const cr = await c.query(`SELECT * FROM seva_category WHERE id=$1`, [
                    camp.seva_category_id
                ]);
                cat = cr.rows[0];
            }
        } else {
            const r = await c.query(`SELECT * FROM seva_category WHERE slug=$1 AND is_active AND show_on_page`, [
                categorySlug
            ]);
            cat = r.rows[0];
            if (!cat) throw Object.assign(new Error('Category not found'), {
                status: 404
            });
        }
        const minAmount = cat?.min_amount ?? 101;
        if (!(Number(amount) >= minAmount)) {
            throw Object.assign(new Error(`Minimum offering is ₹${minAmount}`), {
                status: 422
            });
        }
        if (newPerson?.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(newPerson.pan.toUpperCase())) {
            throw Object.assign(new Error('PAN format looks incorrect (e.g. ABCDE1234F)'), {
                status: 422
            });
        }
        let pid = personId;
        if (!pid) {
            if (!newPerson?.name || !newPerson?.mobile) {
                throw Object.assign(new Error('Name and mobile are required'), {
                    status: 422
                });
            }
            const dupe = await c.query(`SELECT count(*)::int AS n FROM person WHERE mobile_number=$1`, [
                newPerson.mobile
            ]);
            const shared = dupe.rows[0].n > 0;
            const ins = await c.query(`INSERT INTO person (full_name, mobile_number, email, pan, whatsapp_optin,
                             address_line, area, city, state, pincode,
                             source, needs_review, review_reason)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'donation-page',$11,$12)
         RETURNING id`, [
                newPerson.name.trim(),
                newPerson.mobile,
                newPerson.email || null,
                newPerson.pan ? newPerson.pan.toUpperCase() : null,
                !!newPerson.whatsappOptin,
                newPerson.addressLine || null,
                newPerson.area || null,
                newPerson.city || null,
                newPerson.state || null,
                newPerson.pincode || null,
                shared,
                shared ? 'donation page: new name on a mobile number already in records (D14)' : null
            ]);
            pid = ins.rows[0].id;
        } else {
            const chk = await c.query(`SELECT id FROM person WHERE id=$1 AND is_active`, [
                pid
            ]);
            if (!chk.rows.length) throw Object.assign(new Error('Person not found'), {
                status: 404
            });
            if (newPerson?.addressLine) {
                await c.query(`UPDATE person SET address_line=COALESCE($2,address_line), area=COALESCE($3,area),
                  city=COALESCE($4,city), state=COALESCE($5,state), pincode=COALESCE($6,pincode)
            WHERE id=$1`, [
                    pid,
                    newPerson.addressLine,
                    newPerson.area || null,
                    newPerson.city || null,
                    newPerson.state || null,
                    newPerson.pincode || null
                ]);
            }
        }
        // Receipt T&C compliance: full name + address with PIN required for all
        // donations; PAN compulsory at ₹50,000 or more.
        const pRow = (await c.query(`SELECT full_name, address_line, pincode, pan FROM person WHERE id=$1`, [
            pid
        ])).rows[0];
        const hasAddress = (pRow.address_line || newPerson?.addressLine) && (pRow.pincode || newPerson?.pincode);
        if (!hasAddress) {
            throw Object.assign(new Error('Address with PIN code is required for the donation receipt (80G/10BE rules)'), {
                status: 422,
                code: 'needs_address'
            });
        }
        if (Number(amount) >= 50000 && !(pRow.pan || newPerson?.pan)) {
            throw Object.assign(new Error('PAN is compulsory for donations of ₹50,000 or more (Income-tax rules)'), {
                status: 422,
                code: 'needs_pan'
            });
        }
        if (newPerson?.pan && personId) {
            await c.query(`UPDATE person SET pan = COALESCE(pan, $2) WHERE id = $1`, [
                pid,
                newPerson.pan.toUpperCase()
            ]);
        }
        const don = await c.query(`INSERT INTO donation (person_id, amount, seva_category_id, campaign_id, seva_date,
                             is_recurring, prasadam_optin, gateway, status, external_source, donated_on)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending','donation-page',CURRENT_DATE)
       RETURNING id`, [
            pid,
            amount,
            cat?.id || null,
            camp?.id || null,
            sevaDate || null,
            !!isRecurring,
            !!prasadam,
            gateway
        ]);
        const donationId = don.rows[0].id;
        const ref = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$donate$2f$src$2f$lib$2f$util$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["orderRef"])();
        await c.query(`INSERT INTO payment_attempt (donation_id, gateway, attempt_no, order_ref, status)
       VALUES ($1,$2,1,$3,'initiated')`, [
            donationId,
            gateway,
            ref
        ]);
        const person = (await c.query(`SELECT full_name, display_name, email, mobile_number FROM person WHERE id=$1`, [
            pid
        ])).rows[0];
        return {
            donationId,
            orderRef: ref,
            personId: pid,
            productinfo: camp ? `Campaign: ${camp.slug}` : `Seva: ${cat.slug}`,
            person
        };
    }, PUBLIC_ACTOR);
}
async function createFallbackAttempt(donationId, gateway) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$donate$2f$src$2f$lib$2f$db$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tx"])(async (c)=>{
        const d = await c.query(`SELECT d.id, d.amount, d.status, p.full_name, p.email, p.mobile_number,
              COALESCE(sc.slug, cp.slug) AS slug, cp.slug AS campaign_slug,
              (SELECT max(attempt_no) FROM payment_attempt WHERE donation_id=d.id) AS attempts
         FROM donation d
         JOIN person p ON p.id = d.person_id
         LEFT JOIN seva_category sc ON sc.id = d.seva_category_id
         LEFT JOIN campaign cp ON cp.id = d.campaign_id
        WHERE d.id = $1`, [
            donationId
        ]);
        const row = d.rows[0];
        if (!row) throw Object.assign(new Error('Donation not found'), {
            status: 404
        });
        if (row.status !== 'pending') throw Object.assign(new Error('Donation is not pending'), {
            status: 409
        });
        const ref = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$donate$2f$src$2f$lib$2f$util$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["orderRef"])();
        await c.query(`INSERT INTO payment_attempt (donation_id, gateway, attempt_no, order_ref, status)
       VALUES ($1,$2,$3,$4,'initiated')`, [
            donationId,
            gateway,
            (row.attempts || 0) + 1,
            ref
        ]);
        await c.query(`UPDATE donation SET gateway=$2 WHERE id=$1`, [
            donationId,
            gateway
        ]);
        return {
            orderRef: ref,
            amount: row.amount,
            person: row,
            productinfo: row.campaign_slug ? `Campaign: ${row.campaign_slug}` : `Seva: ${row.slug}`
        };
    }, PUBLIC_ACTOR);
}
async function markAttemptFailed(ref, raw) {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$donate$2f$src$2f$lib$2f$db$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["q"])(`UPDATE payment_attempt SET status='failure', raw_response=$2 WHERE order_ref=$1 AND status='initiated'`, [
        ref,
        raw ? JSON.stringify(raw) : null
    ]);
}
async function markPaid(ref, { gatewayTxnId, mode, raw }) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$donate$2f$src$2f$lib$2f$db$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tx"])(async (c)=>{
        const a = await c.query(`UPDATE payment_attempt SET status='success', gateway_txn_id=$2, raw_response=$3
        WHERE order_ref=$1 AND status IN ('initiated','created')
        RETURNING donation_id, gateway`, [
            ref,
            gatewayTxnId || null,
            raw ? JSON.stringify(raw) : null
        ]);
        if (!a.rows.length) {
            const existing = await c.query(`SELECT donation_id FROM payment_attempt WHERE order_ref=$1 AND status='success'`, [
                ref
            ]);
            if (existing.rows.length) return {
                donationId: existing.rows[0].donation_id,
                already: true
            };
            throw Object.assign(new Error('Unknown order reference'), {
                status: 404
            });
        }
        const { donation_id, gateway } = a.rows[0];
        const d = await c.query(`UPDATE donation
          SET status='paid', gateway=$2, txn_ref=$3, gateway_status='success',
              payment_mode='upi', receipt_no=COALESCE(receipt_no, next_receipt_no())
        WHERE id=$1 AND status='pending'
        RETURNING id, receipt_no`, [
            donation_id,
            mode === 'mock' ? 'other' : gateway,
            gatewayTxnId || ref
        ]);
        if (d.rows.length) {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$donate$2f$src$2f$lib$2f$zoho$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["enqueueZohoWebhook"])(c, donation_id);
        }
        const receipt = d.rows.length ? d.rows[0].receipt_no : (await c.query(`SELECT receipt_no FROM donation WHERE id=$1`, [
            donation_id
        ])).rows[0]?.receipt_no;
        return {
            donationId: donation_id,
            receiptNo: receipt,
            already: !d.rows.length
        };
    }, PUBLIC_ACTOR);
}
}),
"[project]/apps/donate/src/app/DonateClient.js [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const __TURBOPACK__default__export__ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call the default export of [project]/apps/donate/src/app/DonateClient.js <module evaluation> from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/apps/donate/src/app/DonateClient.js <module evaluation>", "default");
}),
"[project]/apps/donate/src/app/DonateClient.js [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const __TURBOPACK__default__export__ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call the default export of [project]/apps/donate/src/app/DonateClient.js from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/apps/donate/src/app/DonateClient.js", "default");
}),
"[project]/apps/donate/src/app/DonateClient.js [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$donate$2f$src$2f$app$2f$DonateClient$2e$js__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/apps/donate/src/app/DonateClient.js [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$donate$2f$src$2f$app$2f$DonateClient$2e$js__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/apps/donate/src/app/DonateClient.js [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$donate$2f$src$2f$app$2f$DonateClient$2e$js__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/apps/donate/src/app/page.js [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Home,
    "dynamic",
    ()=>dynamic
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$donate$2f$src$2f$lib$2f$ops$2d$donate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/donate/src/lib/ops-donate.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$donate$2f$src$2f$app$2f$DonateClient$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/donate/src/app/DonateClient.js [app-rsc] (ecmascript)");
;
;
;
const dynamic = 'force-dynamic'; // categories/campaign progress are live data
async function Home() {
    let categories = [], campaigns = [];
    try {
        ({ categories, campaigns } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$donate$2f$src$2f$lib$2f$ops$2d$donate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getPageContent"])());
    } catch (e) {
        console.error('page content:', e);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$donate$2f$src$2f$app$2f$DonateClient$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
        categories: categories,
        campaigns: campaigns,
        videoId: process.env.HERO_VIDEO_ID || '5QpfnawBEXY'
    }, void 0, false, {
        fileName: "[project]/apps/donate/src/app/page.js",
        lineNumber: 14,
        columnNumber: 5
    }, this);
}
}),
"[project]/apps/donate/src/app/page.js [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/apps/donate/src/app/page.js [app-rsc] (ecmascript)"));
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0hm2kfi._.js.map