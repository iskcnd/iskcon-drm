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

## Step 1 — create the service

Railway → project **fearless-education** → **New** → **GitHub Repo** → `iskcnd/iskcon-drm`
(the same repo the DRM service already uses).

Then **Settings → Config-as-code** → `apps/donate/railway.json`

That file already carries the build and start commands. Do **not** set a Root Directory — the
lockfile lives at the repo root, and building from a subfolder loses version pinning.

---

## Step 2 — variables

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

Settings → Networking → **Custom Domain** → `donate.iskconchennai.org`, then add the CNAME Railway
shows you at your DNS provider.

**Check the spelling character by character.** The DRM lost half a day to `iskconcgennai`. Wait for
DNS to resolve before switching `MOCK_GATEWAYS` off — a gateway redirect to a domain that doesn't
resolve loses the donor.

---

## Step 4 — test in mock mode

- [ ] Page loads, categories render
- [ ] Pick an amount, submit, complete the mock payment
- [ ] Thank-you page appears with a receipt link
- [ ] Receipt PDF downloads and the details are right
- [ ] Change one character of the `t=` token in the receipt URL → **403**
- [ ] Row present in `donation` with the right amount, category and `seva_date`
- [ ] Donor present in `person`, tagged Donor
- [ ] `webhook_outbox` has a pending row
- [ ] `POST /api/internal/outbox` with `x-cron-key` drains it, and Zoho receives it
- [ ] Same request **without** the header → 401

The token test matters most. If a tampered token returns a PDF, stop and tell me.

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
