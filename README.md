# ISKCON Chennai DRM

Custom DRM for ISKCON Chennai (Chaitanya Nitai Desh). One master record per person; every module hangs off it.

**D**evotee **R**elationship **M**anagement — not "customer". The people in this system are devotees,
and it exists for devotee care.

Next.js 16 · React 19 · PostgreSQL on Neon · deployed on Railway.

---

## The idea in one diagram

```
                    ┌──────────────────────┐
                    │   MASTER: person     │   thin, shared, one row per human
                    │   (identity only)    │
                    └──────────┬───────────┘
                               │ person_id
      ┌──────────┬─────────────┼─────────────┬──────────┬──────────┐
      ▼          ▼             ▼             ▼          ▼          ▼
  donation   course_       event_        japa_card   seminar_   membership
             enrollment    registration              reg
```

Any entry point — a donation at the counter, a course sign-up, an event registration — first
finds or creates the **master** record, then writes its own detail row. The master never
accumulates module data.

### Two decisions worth knowing before you read the code

**`person_no` is the unique key, not the mobile number.** Families share phone numbers, and the
people behind them are different people with different names and histories. Mobile is indexed but
deliberately not unique. On entry, `find_person_by_mobile()` shows everyone already using a number
so the operator can pick an existing person or confirm a new one. A warning, never a block.

**Categories are rows, not tables.** Donor, Japa Desk, IYS Boys, IYS Girls, Unnati Club and
everything like them live in `tag`, applied through `person_tag`. Adding a category is one INSERT
or one click — no migration, no developer. A person can hold several at once.

---

## Layout

This is a **monorepo**: several small apps, each on its own subdomain and its own Railway
service, all reading one Neon database.

```
packages/db/            shared by every app — the database is the contract
  migrations/           numbered, idempotent, applied in filename order
    001_foundation.sql  person master, tags, occasions, audit, imports, users
    002_donations.sql   seva categories + donations
    003_api_surface.sql curated read-only views for third parties
    004_seed_categories.sql
    005_japa.sql        japa cards + Japa Puja enrolment
  scripts/migrate.mjs        applies every migration
  scripts/create-admin.mjs   creates or updates a login

apps/drm/               Devotee Relationship Management  → drm.iskconchennai.org
  src/middleware.js         auth gate — everything except /login is protected
  src/lib/db.js             pg pool; tx() sets app.actor_id so the audit trail records who
  src/lib/session.js        HMAC-signed cookie sessions, role capabilities (Node runtime)
  src/lib/session-edge.js   same verification via Web Crypto, for middleware (Edge runtime)
  src/lib/ops.js            every allowed operation. The browser cannot send SQL
  src/lib/ops-import.js     import matching + two-phase commit
  src/lib/ops-analytics.js  everything the insights page charts
  src/lib/import-types.js   one entry per import type — add a type here, the UI follows
  src/app/Dashboard.js      the devotee grid
  src/app/import/           import page
  src/app/insights/         charts + xlsx export
  src/app/api/data/route.js single endpoint; checks role capability then dispatches to ops
  src/app/api/export/route.js xlsx generation

apps/donate/            not built yet  → donate.iskconchennai.org
apps/events/            not built yet  → events.iskconchennai.org
apps/japa/              not built yet  → japa.iskconchennai.org
apps/portal/            not built yet  → portal.iskconchennai.org
```

### Why the apps don't share runtime code yet

`packages/db` holds the migrations and setup scripts, because the schema genuinely is shared —
every app reads the same tables, and there must be exactly one definition of them.

The pool, session and ops code still lives inside `apps/drm`. Extracting a shared runtime layer
before the second app exists would mean designing an abstraction against imagined requirements.
When `donate` is written we'll see what's actually common and lift that out then. Duplicating
once and extracting later is cheaper than unpicking a wrong abstraction.

### Why there's no "run SQL" endpoint

The browser can only invoke **named operations** from `src/lib/ops.js`. Every value is bound as a
query parameter and every writable column sits on an explicit allow-list. A public URL holding
devotee PII cannot accept SQL from the client, however convenient that would be.

---

## Roles

| Capability | Super admin | Module manager | Data entry | View only |
|---|---|---|---|---|
| View records | ✅ | ✅ | ✅ | ✅ |
| Create / edit | ✅ | ✅ | ✅ | ❌ |
| Import, export, bulk tag | ✅ | ✅ | ❌ | ❌ |
| Roll back an import | ✅ | ❌ | ❌ | ❌ |

Enforced server-side in `src/app/api/data/route.js`. The UI hides what you can't do, but hiding a
button is not security — the check that matters is on the server.

---

## Pages

| Page | Who | What |
|---|---|---|
| `/` | everyone | Devotee grid — categories, search, filters, inline edit, CSV import/export, batches |
| `/import` | module manager+ | Typed imports: devotees, IYS Boys/Girls, Unnati Club, donations, **Zoho donations**, japa cards. Accepts `.xlsx` directly as well as CSV |
| `/insights` | everyone | Charts across donations, growth, demographics, segments, data quality. Export to xlsx |

### How imports match a row to a devotee

For anything that belongs to an existing devotee (donations, japa cards), the row is resolved in
this order: **`person_no` → `email` → `mobile_number`**.

At each step, if `full_name` is present and disagrees with the record found, the row is **held for
review** rather than linked. If several devotees share the number — normal in families — and the
name doesn't pick one out, it's held too. Nothing is guessed.

The operator then decides per row: link to a specific devotee, create a new one, or skip.
Undecided rows are skipped, never assumed. Preview writes nothing; only commit does.

### Zoho donations

`zoho_donations` takes the Zoho export **unmodified** — upload the `.xlsx`, no renaming, no CSV
conversion. All 20 of its columns are mapped or explicitly ignored.

Three things this import does that the generic one doesn't:

- **Seva date is kept separate from the payment date.** A Zoho row can be paid on 1 August for a
  seva on 21 August. `donated_on` follows the money, `seva_date` follows the seva. Losing either
  would break a real workflow — finance reports on one, the kitchen works from the other.
- **Zoho's record `ID` is stored and unique per source.** Re-importing an overlapping export skips
  what's already there instead of double-counting donations. This is enforced by a database
  constraint, not just by the UI.
- **Unmatched donors are created, not queued.** The export carries the donor's own name, phone,
  email and address, so a row matching nobody is a new donor rather than an ambiguity. They're
  created and flagged `needs_review` for auditing. Genuinely ambiguous cases — a name that
  disagrees, or several devotees sharing a number — still stop for a decision.

Seva categories are auto-created as Zoho introduces them, so a new category never blocks an
import. `Seva Type` is stored as free text on the donation.

## Local development

```bash
npm install                       # installs every workspace
cp apps/drm/.env.example apps/drm/.env.local
npm run migrate                   # build the schema  (DATABASE_URL must be set)
npm run create-admin -- "you@example.org" "Your Name" "a-strong-password" super_admin
npm run dev:drm                   # http://localhost:3000
```

Generate a session secret with `openssl rand -base64 48`.

---

## Deploying

See **[DEPLOY.md](DEPLOY.md)** for the full GitHub → Railway walkthrough.

---

## Operational notes

- **Nothing is hard-deleted** except an explicit import rollback. People are deactivated via `is_active`.
- **Every write is audited** into `audit.change_log` with the actor, the old and new row, and the
  list of changed fields. Writes go through `tx()`, which sets `app.actor_id` for the triggers.
- **Anyone with a donation cannot be deleted.** `donation.person_id` is `ON DELETE RESTRICT`, so
  even an import rollback keeps them.
- **Imports are reversible.** Each import stamps its rows `source = 'import:<batch_id>'`.
- **Consent before messaging.** `whatsapp_optin` / `sms_optin` / `email_optin` exist for a reason —
  the DPDP Act applies.
- **Third parties read the `api` schema only.** PAN, email and full address are excluded; phone is
  masked; DOB becomes an age band. Grant them `drm_readonly`, never access to `public`.

## Data protection

The database is hosted on AWS **ap-southeast-1 (Singapore)** — outside India. Worth knowing for
DPDP and for anything trustees ask.

Before real data goes live:
- Raise Neon point-in-time recovery beyond the default 6 hours.
- Set an IP allowlist on the Neon project.
- Give every staff member their own login. Shared logins destroy the audit trail.
