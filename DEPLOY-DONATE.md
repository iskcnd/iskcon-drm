# Deploying the donation page

Second Railway service, same repo, same database. Follow in order.

Verified before writing this: the app builds clean (14 routes), and migration 007 is already
applied to `ISKCON-CND-DB` — `campaign`, `payment_attempt` and `webhook_outbox` all exist, and
`seva_category` has the page fields.

---

## Before anything — three things that will hurt if missed

**1. `MOCK_GATEWAYS` decides whether real money moves.**
`true` simulates payments end-to-end and touches no gateway. Deploy with `true` first, click all
the way through, check the row lands in `donation`, *then* switch to `false`. Setting `false`
without valid live keys means every donation fails at the payment step — publicly.

**2. `RECEIPT_SECRET` is not optional.**
Receipt numbers are sequential and the PDF carries the donor's name, address, PAN and amount. The
signed token in the receipt URL is the only thing preventing someone incrementing the number and
downloading other people's receipts. The code now refuses to issue a receipt if the secret is
missing or under 16 characters — that's deliberate. A missing secret should stop the app, not
silently fall back.

**3. `PUBLIC_BASE_URL` must exactly match the live domain.**
Gateways redirect back to a URL built from it. Wrong value — or `http` instead of `https`, or a
trailing slash — and the donor pays but never returns to the thank-you page. The money arrives; the
donor thinks it failed.

---

## Step 1 — create the service (click by click)

This is a **service inside the existing project**, not a new project. Railway bills by usage, so a
second small service costs close to nothing while idle.

1. Open <https://railway.app> and go to the **fearless-education** project — the one that already
   contains `iskcon-drm`.
2. Press **`Cmd/Ctrl + K`**, or click the **`+ Create`** button at the top right of the canvas.
3. Choose **GitHub Repo**.
4. Pick **`iskcnd/iskcon-drm`** — yes, the *same* repo as the DRM service. Both apps live in it.
5. Railway creates the service and immediately starts a build. **It will succeed — and that is the
   trap.** The root `package.json` has `"build": "npm run build:drm"`, so a brand-new service
   silently builds a *second copy of the DRM*, goes green, and looks finished. Nothing warns you.
   Step 8 is what makes it the donation page.
6. Click the new service → **Settings**.
7. **Service Name** → rename to `iskcon-donate` so the two are distinguishable at a glance.
8. Scroll to **Build** and set **Custom Build Command**:

   ```
   npm run build:donate
   ```

   Then **Deploy** → **Custom Start Command**:

   ```
   npm run start:donate
   ```

   (`apps/donate/railway.json` in the repo says the same thing, but explicit service settings are
   visible in the UI, so there's no guessing about which app a service runs.)

9. **Leave Root Directory empty.** Tempting to set `apps/donate`, but `package-lock.json` lives at
   the repo root where npm workspaces put it. Build from a subfolder and Railway can't see the
   lockfile, so it resolves fresh dependency versions on every deploy — you lose the pinning that
   guarantees it builds what was tested.
10. Go to **Settings → Deploy** and turn **Serverless / App Sleeping** **off**. Fine for staff
    tools; wrong for a payment page. A donor hitting a cold start mid-payment is worth far more
    than the container cost you'd save.

Don't deploy yet — variables first, or the build fails again.

---

## Step 2 — variables

Railway → `iskcon-donate` → **Variables** → **`{} Raw Editor`**. Paste the whole block below in one
go, then fill in the blanks before saving.

Copy the values marked *(same as DRM)* from the `iskcon-drm` service — open its Variables tab and
use the eye icon to reveal each.

```bash
# --- copy these from the iskcon-drm service ---
DATABASE_URL=                      # (same as DRM) pooled Neon string
PUBLIC_ACTOR_ID=                   # (same as DRM) app_user uuid for public writes
ZOHO_WEBHOOK_URL=                  # (same as DRM) includes ?zapikey=...
ZOHO_PAYMENT_TYPE_ID=251028000000612003
ZOHO_DEFAULT_SEVA_TYPE_ID=251028000000067075
ZOHO_DEFAULT_CATEGORY_ID=251028000000014003
CRON_KEY=                          # (same as DRM)
ADMIN_API_KEY=                     # (same as DRM)
RECEIPT_SECRET=                    # (same as DRM)
PAYU_KEY=
PAYU_SALT=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
EASEBUZZ_KEY=
EASEBUZZ_SALT=

# --- new / environment-specific ---
NODE_ENV=production
PUBLIC_BASE_URL=https://donate.iskconchennai.org
MOCK_GATEWAYS=false
PAYU_ENV=test
EASEBUZZ_ENV=test
HERO_VIDEO_ID=5QpfnawBEXY
```

**`PUBLIC_BASE_URL` is the one that isn't currently set anywhere.** Until the custom domain is live
you can point it at the Railway-generated domain from step 3 — gateways need a URL that actually
resolves, and `donate.iskconchennai.org` won't until DNS propagates.

Save. Railway redeploys automatically, and this build should succeed.

### Afterwards — tidy the DRM service

Once donate is running, delete these from `iskcon-drm`, which has no use for them:

`PAYU_KEY` `PAYU_SALT` `PAYU_ENV` `RAZORPAY_KEY_ID` `RAZORPAY_KEY_SECRET` `EASEBUZZ_KEY`
`EASEBUZZ_SALT` `EASEBUZZ_ENV` `MOCK_GATEWAYS` `HERO_VIDEO_ID` `ZOHO_WEBHOOK_URL`
`ZOHO_PAYMENT_TYPE_ID` `ZOHO_DEFAULT_SEVA_TYPE_ID` `ZOHO_DEFAULT_CATEGORY_ID` `PUBLIC_ACTOR_ID`

**Keep** `DATABASE_URL`, `SESSION_SECRET`, `SESSION_HOURS`, `NODE_ENV`, and — for now —
`CRON_KEY`, `ADMIN_API_KEY`, `RECEIPT_SECRET` if you'd rather not risk removing the wrong one
mid-test. Tidy those last.

Not urgent, and nothing breaks either way. It's simply that a gateway salt and the Zoho zapikey
shouldn't exist in more services than need them.

---

## Step 2b — old variable reference

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | same pooled Neon string as DRM | Both apps share one database |
| `PUBLIC_BASE_URL` | `https://donate.iskconchennai.org` | Must match the live domain exactly |
| `NODE_ENV` | `production` | |
| `MOCK_GATEWAYS` | `true` for the first deploy | Switch to `false` only after a live-key test |
| `PAYU_ENV` | `test` → `production` | |
| `PAYU_KEY` | from PayU dashboard | |
| `PAYU_SALT` | from PayU dashboard | Secret |
| `RAZORPAY_KEY_ID` | from Razorpay | |
| `RAZORPAY_KEY_SECRET` | from Razorpay | Secret |
| `EASEBUZZ_ENV` | `test` → `production` | |
| `EASEBUZZ_KEY` | from Easebuzz | |
| `EASEBUZZ_SALT` | from Easebuzz | Secret |
| `ZOHO_WEBHOOK_URL` | full URL **including** `?zapikey=…` | Secret — the zapikey is the auth |
| `ZOHO_PAYMENT_TYPE_ID` | `251028000000612003` | Default when a category has no mapping |
| `ZOHO_DEFAULT_SEVA_TYPE_ID` | `251028000000067075` | |
| `ZOHO_DEFAULT_CATEGORY_ID` | `251028000000014003` | |
| `CRON_KEY` | `openssl rand -base64 32` | Guards `POST /api/internal/outbox` |
| `ADMIN_API_KEY` | `openssl rand -base64 32` | Guards `/api/admin/*` |
| `RECEIPT_SECRET` | `openssl rand -base64 32` | **Required.** Separate from `CRON_KEY` |
| `PUBLIC_ACTOR_ID` | uuid from `app_user` | Optional but recommended — see below |
| `HERO_VIDEO_ID` | YouTube id | Optional; defaults to `5QpfnawBEXY` |

Generate the three secrets **separately**, not one value reused:

```powershell
1..3 | % { [Convert]::ToBase64String((1..32 | % {Get-Random -Max 256})) }
```

### PUBLIC_ACTOR_ID

Audit triggers record who made each change. Public donations have no logged-in user, so without
this they're attributed to nobody. Create a service account and use its id:

```sql
INSERT INTO app_user (email, full_name, role, is_active)
VALUES ('donate-app@iskconchennai.org', 'Donation page (service)', 'view_only', true)
ON CONFLICT (email) DO NOTHING
RETURNING id;
```

`view_only` is deliberate — it's an audit identity, not a login. It has no password, so it cannot
be signed in to.

---

## Step 3 — domain

### 3a. Test on Railway's own domain first

`iskcon-donate` → **Settings** → **Networking** → **Generate Domain**.

You'll get something like `iskcon-donate-production.up.railway.app`. Set `PUBLIC_BASE_URL` to
exactly that (with `https://`, no trailing slash) and run your dry test against it. This works
immediately — no DNS wait, no propagation, and gateway redirects resolve straight away.

### 3b. Add the real domain once the dry test passes

**Settings → Networking → Custom Domain** → `donate.iskconchennai.org`

Railway shows a CNAME target. At your DNS provider add:

| Type | Name | Value |
|---|---|---|
| CNAME | `donate` | *(the target Railway shows)* |

**Read the domain back character by character before saving.** The DRM lost half a day to
`iskconcgennai` — a transposed `h` and `g` that looked right at a glance.

Then check it resolves before switching `PUBLIC_BASE_URL` over:

```powershell
nslookup donate.iskconchennai.org
```

Only once that returns Railway's target should you update `PUBLIC_BASE_URL` to the custom domain.
A gateway redirecting a paying donor to a domain that doesn't resolve loses both the donor and
their confidence, even though the money went through.

---

## Step 3c — did it actually deploy?

Before testing anything, confirm the build used the right app. `iskcon-donate` → **Deployments** →
click the latest → **Build Logs**. Look for:

```
Found workspace with 2 packages
> npm run build:donate
```

If it says `build:drm`, the Config-as-code path in step 1 didn't take. Re-check it reads exactly
`apps/donate/railway.json`.

Then open the Railway domain. You should see the donation page with your six visible seva
categories. An empty page means the app is up but no category has `show_on_page = true` — a
database issue, not a deploy one.

---

## Step 4 — dry test

You're on gateway **test** keys with `MOCK_GATEWAYS=false`, so this exercises the real PayU test
flow — no real money, real code path.

**In the browser**

- [ ] Page loads and the six seva categories render
- [ ] Pick a category and an amount, fill in name / phone / email, submit
- [ ] PayU's test page appears — this proves `PAYU_KEY` / `PAYU_SALT` and the hash are right
- [ ] Complete the test payment
- [ ] You land back on the thank-you page — this proves `PUBLIC_BASE_URL` is correct
- [ ] The receipt link opens a PDF with the right name, amount and seva
- [ ] **Change one character of the `t=` value in the receipt URL → 403.** Do not skip this. If a
      tampered token still returns a PDF, stop and tell me — it means anyone can walk the receipt
      number series and read other donors' details.

**In the database** — run in the Neon SQL editor:

```sql
SELECT d.id, d.amount, d.donated_on, d.seva_date, d.receipt_no, d.payment_mode, d.gateway,
       s.name AS seva, p.person_no, p.full_name, p.mobile_e164, p.needs_review
  FROM donation d
  JOIN person p ON p.id = d.person_id
  LEFT JOIN seva_category s ON s.id = d.seva_category_id
 ORDER BY d.id DESC LIMIT 5;

SELECT id, status, attempt_no, gateway, gateway_txn_id FROM payment_attempt ORDER BY id DESC LIMIT 5;
SELECT id, status, attempts, last_error FROM webhook_outbox ORDER BY id DESC LIMIT 5;
```

- [ ] The donation row is there, amount correct, tied to a `person`
- [ ] `payment_attempt` shows `success`
- [ ] `webhook_outbox` has a **pending** row

**The Zoho sync** — replace the host and key:

```bash
curl -i -X POST "https://<your-domain>/api/internal/outbox" -H "x-cron-key: <CRON_KEY>"
```

- [ ] Returns 200 and the outbox row flips to `sent`
- [ ] The record appears in Zoho with the right amount and donor
- [ ] Same request **without** the header → **401**

If the outbox row goes to `failed`, read `last_error` — it's usually the zapikey missing from
`ZOHO_WEBHOOK_URL`, or a Zoho field rejecting a value.

**Then check nothing was silently dropped:**

```sql
SELECT * FROM v_unmapped_staff;
```

Empty is good. Rows here mean an employee or volunteer name reached Zoho blank.

---

## Step 5 — go live

1. Enter real gateway keys
2. `PAYU_ENV` / `EASEBUZZ_ENV` → `production`
3. `MOCK_GATEWAYS` → `false`
4. **Donate ₹101 yourself with a real card or UPI.** Confirm the money reaches the temple account,
   the receipt is right, and Zoho received it. Refund it afterwards if you like — the point is to
   have one real end-to-end transaction before announcing the page.
5. Only then share the link

---

## Step 6 — schedule the outbox drain

The webhook outbox holds Zoho syncs until something drains it. Nothing does that automatically yet.

Railway → **New** → **Cron** on the same repo, every 5 minutes:

```bash
curl -fsS -X POST "$PUBLIC_BASE_URL/api/internal/outbox" -H "x-cron-key: $CRON_KEY"
```

Without this, donations record correctly but never reach Zoho, and the outbox grows silently.
Worth a note in your calendar to check `SELECT count(*) FROM webhook_outbox WHERE status='pending'`
in the first week.

---

## About Cloudflare R2

**Nothing in the code uses it, and your account currently has no buckets.** Receipts are rendered
on demand from the database — `receipt.js` says so explicitly — so there are no files to store and
no R2 variables to set. Don't add any.

Worth keeping for later, when there genuinely are files:

- 80G Form 10BE certificates, if those get archived rather than regenerated
- Campaign and category images for the donation page (currently only `public/logo.png`)
- Scheduled database exports, which is a better answer than Neon's 6-hour recovery window
- The hero video, if you'd rather self-host than depend on YouTube

None of those are Phase A. Leave R2 unconfigured rather than wiring up credentials nothing reads.
