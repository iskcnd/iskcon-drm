# Inbound webhooks and the lookup API

How third parties get data **into** the DRM, and how they read a little back out.

Status: **design, not built.** Decisions at the bottom need answering first.

---

## The shape

```
  course site ─┐
  payment gw  ─┤                  ┌─ validate + verify signature
  japa kiosk  ─┼─→  POST /api/v1  ─┤─ log raw payload  (inbound_event)
  event form  ─┤                  ├─ match to a person (same ladder as import)
  outposts    ─┘                  └─ write to the module table
                                              │
                                              ▼
                                       ISKCON-CND-DB
```

**One door in.** Every integration posts to the same endpoint family on the DRM app. Not because
it's tidy, but because the hard part — deciding *which devotee this is* — must have exactly one
implementation. Two systems answering "is this the same person?" differently is how a master
database quietly rots.

---

## Why not let them write to Neon directly

It's technically possible and it's the wrong trade:

| | Direct to Neon | Through the app |
|---|---|---|
| Person matching | every caller reimplements it | one implementation, shared with the importer |
| Bad payload | corrupt row, found months later | rejected at the door, logged, replayable |
| Duplicate webhook | double-counted donation | idempotency key catches it |
| Who called, when | not recorded | logged per key |
| Rate limiting | none | per key |
| Rotating access | change the DB password, everything breaks | revoke one key |

The database is the system of record. Things that write to it should go through something that
understands the rules.

---

## Practice 1 — log the raw payload before you parse it

```sql
CREATE TABLE inbound_event (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  received_at    timestamptz NOT NULL DEFAULT now(),
  integration_id uuid NOT NULL REFERENCES integration(id),
  event_type     text NOT NULL,          -- donation.created, course.enrolled, japa.card_issued
  external_id    text,                   -- the sender's own id for this event
  payload        jsonb NOT NULL,         -- exactly what arrived
  signature_ok   boolean,
  status         text NOT NULL DEFAULT 'received'
                 CHECK (status IN ('received','processed','failed','duplicate','ignored')),
  error          text,
  person_id      uuid REFERENCES person(id),
  target_table   text,
  target_id      text,
  processed_at   timestamptz
);
```

This is the single most valuable habit with webhooks. Write the payload down **before** you try to
understand it. When a sender changes a field name at 2am, you haven't lost the data — you fix the
parser and replay the failed rows. Without this table, a parsing bug is permanent data loss and you
won't know how much you lost.

---

## Practice 2 — idempotency, because webhooks retry

Senders retry on timeout. If your endpoint is slow once, you get the same donation twice.

Same mechanism already used for the Zoho import: `external_source` + `external_id`, unique in the
database. Not a UI check — a constraint. Re-delivery hits the constraint and returns the original
result with `200`, rather than inserting a second ₹5,000 donation.

If a sender provides no id of its own, require an `Idempotency-Key` header and store that instead.

---

## Practice 3 — return 200 fast, fail loudly to yourself

Acknowledge within a second or two. If processing is slow, write `inbound_event` and process on the
next tick — the sender only needs to know you have it.

Never return `500` for a payload you'll never be able to process. That makes the sender retry
forever. Return `200`, mark the event `failed`, and surface it on a dashboard for someone to look at.

---

## Practice 4 — one identity ladder, shared with the importer

Reuse `resolvePerson()` from `ops-import.js` exactly as-is:

`person_no` → `email` → `mobile` → name check → ambiguous cases held.

For webhooks there's no operator standing by, so ambiguity resolves differently:

| Case | Import | Webhook |
|---|---|---|
| Clean match | link | link |
| No match, full details present | create | create, flag `needs_review` |
| Name disagrees | ask operator | **create new, flag for review** — never silently attach money to the wrong devotee |
| Several share the number | ask operator | same — create new, flag |

The asymmetry is deliberate. A wrongly-linked donation is worse than a duplicate person: duplicates
are mergeable later, misattributed money is a receipt sent to the wrong person.

---

## Practice 5 — a key per integration, not one shared secret

```sql
CREATE TABLE integration (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL UNIQUE,        -- 'course-site', 'payu', 'japa-kiosk'
  name         text NOT NULL,
  scopes       text[] NOT NULL DEFAULT '{}',-- 'write:donation','write:enrolment','read:lookup'
  key_hash     text NOT NULL,               -- bcrypt of the API key; the key itself is shown once
  key_prefix   text NOT NULL,               -- first 8 chars, so keys are identifiable in logs
  hmac_secret  text,                        -- for senders that sign payloads
  rate_per_min integer NOT NULL DEFAULT 120,
  is_active    boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
```

Per-integration keys mean you can revoke the course site without breaking the payment gateway, and
the logs tell you which system sent what. A single shared secret gives you neither, and rotating it
requires coordinating every vendor at once.

For payment gateways (PayU, Razorpay) verify the **HMAC signature** on the raw body — those senders
sign their callbacks, and an unsigned "payment succeeded" webhook is an invitation to fraud.

---

## Endpoints

### Writes

```
POST /api/v1/donation
POST /api/v1/enrolment
POST /api/v1/japa-card
POST /api/v1/registration
```

```
Authorization: Bearer drm_live_a1b2c3...
Idempotency-Key: course-site-8891        (if you have no id of your own)
```

```json
{
  "external_id": "COURSE-8891",
  "occurred_at": "2026-08-01T10:15:00+05:30",
  "person": {
    "full_name": "Ramesh Kumar",
    "phone": "+919840012345",
    "email": "ramesh@example.com",
    "address_line": "12 Gandhi Street, Adyar, Chennai 600020"
  },
  "data": {
    "course": "Bhakti Sastri",
    "batch": "2026-A",
    "fee": 2500,
    "enrolled_on": "2026-08-01"
  }
}
```

Response:

```json
{ "ok": true, "person_no": 142, "created_person": false,
  "record_id": 5567, "duplicate": false, "needs_review": false }
```

Always the same envelope: `person` (who) + `data` (what happened). Senders don't need to know
your column names, and you can change them without breaking every integration.

### Read — phone lookup

```
GET /api/v1/lookup?phone=%2B919840012345
Authorization: Bearer drm_live_...
```

```json
{ "matches": [
  { "person_no": 142, "display_name": "Radha Ramana Das",
    "city": "Chennai", "area": "Adyar",
    "categories": ["Donor", "Japa Desk"],
    "whatsapp_optin": true }
]}
```

Note what is **not** there: no PAN, no full address, no email, no date of birth, no donation
amounts. A lookup endpoint answers "do we know this person, and what may I say to them" — nothing
more. Anything richer needs a scope of its own and a reason.

`matches` is an array because one number can belong to a family. That's not an edge case here — it
was a deliberate schema decision.

**Guardrails, all of which need the app:**

- Requires `read:lookup` scope
- Rate limited per key, low by default (60/min) — a legitimate kiosk needs a handful per minute
- Every lookup written to `api_access_log` with key, phone hash and result count
- A daily volume alert: an integration that suddenly pulls 10× its normal rate is either broken or
  harvesting

Without these, the endpoint is a devotee-directory download service with a phone number as the
password.

---

## If you still want to skip Railway

There is a legitimate version: **Neon Data API** (PostgREST) over the existing `api` schema, with
the `drm_readonly` role and row-level security.

That schema already excludes PAN, email and full address, and masks the phone — it was built for
exactly this. What you'd give up: rate limiting, per-caller audit, and the ability to revoke one
consumer without touching the others.

Reasonable for a **trusted internal** consumer (a reporting tool, a dashboard you host).
Not reasonable for anything public-facing or vendor-operated.

---

## Suggested build order

1. `integration`, `inbound_event`, `api_access_log` tables
2. Auth middleware — key lookup, scope check, rate limit
3. `POST /api/v1/donation` — the highest-value one, and it forces the idempotency work
4. `GET /api/v1/lookup`
5. A **Integrations** page in the DRM: create/revoke keys, watch the event stream, replay failures
6. The remaining write endpoints, which are then just new mappings

Steps 1–3 are the real work. After that each new integration is configuration, not code.

---

## Open decisions

1. **Which systems, concretely?** Course site, japa kiosk, event forms — who operates each, and can
   they send an HTTP POST with a bearer token, or do they only support a plain form-style callback?
2. **Who consumes the lookup?** A kiosk at the temple, an outpost, a vendor's app? That decides
   whether it's public-internet or IP-restricted.
3. **Should lookup return donation history?** Currently no, deliberately. A kiosk showing "you gave
   ₹5,000 last month" is useful but a much larger disclosure through a guessable key.
4. **Payment gateway callbacks** — do PayU and Razorpay call you directly, or does the donation site
   sit in between? Changes whether we verify their signature or yours.
5. **Volume?** Tens of events a day or thousands? Decides whether processing stays synchronous.
