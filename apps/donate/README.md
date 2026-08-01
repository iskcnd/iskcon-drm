# donate

Public donation page backend — PayU primary, Razorpay + Easebuzz failsafe (D23),
Zoho Flow webhook sync (D30), receipt series (D33). Runs on its own Railway
service (`donate.iskconchennai.org`), same Neon database as the DRM app.

## Flow

```
page → POST /api/donations           creates person (if new) + donation(pending) + attempt #1 (PayU)
     → browser goes to gateway
     → gateway returns to /api/payments/<gw>/return (hash/signature verified)
        success → donation=paid, receipt_no assigned, Zoho webhook queued in same txn
        failure → attempt marked failed; page calls POST /api/donations/:id/retry
                  → attempt #2 (Razorpay) → attempt #3 (Easebuzz)
outbox → POST /api/internal/outbox (cron, x-cron-key) delivers queued Zoho webhooks with backoff
```

## Endpoints

| Route | What |
|---|---|
| `GET /api/categories` | Live categories + live campaigns with computed progress |
| `POST /api/lookup` | `{mobile}` → masked matches `[{person_id, mask, area}]`. Hard rate-limited (D24) |
| `POST /api/donations` | Create donation, get gateway launch payload |
| `POST /api/donations/:id/retry` | Next gateway on the cascade after failure |
| `POST /api/payments/payu/return` | PayU surl/furl (server-verified hash) |
| `POST /api/payments/easebuzz/return` | Easebuzz surl/furl (server-verified hash) |
| `POST /api/payments/razorpay/verify` | Razorpay checkout result (server-verified signature) |
| `GET /api/payments/mock` | Only when `MOCK_GATEWAYS=true` |
| `POST /api/internal/outbox` | Deliver pending Zoho webhooks (`x-cron-key`) |
| `GET/POST/PATCH /api/admin/categories` | Category CRUD (`x-admin-key`) |
| `GET/POST/PATCH /api/admin/campaigns` | Campaign CRUD (`x-admin-key`) |

## Local dev

```bash
npm install
cp apps/donate/.env.example apps/donate/.env.local   # fill DATABASE_URL, keep MOCK_GATEWAYS=true
DATABASE_URL=... npm run migrate                      # applies 001–007
npm run dev -w @iskcon/donate                         # http://localhost:3001
```

Mock end-to-end test:
```bash
curl -s localhost:3001/api/categories | head
curl -s -X POST localhost:3001/api/donations -H 'content-type: application/json' \
  -d '{"categorySlug":"annadanam","amount":501,"newPerson":{"name":"Test Devotee","mobile":"9000000001"}}'
# open the returned payment.url → marks paid, assigns receipt, queues webhook
```

## Deployment checklist (Railway)

1. New service, **Root Directory** left at repo root, `railway.json` in this folder drives build/start (`build:donate` / `start:donate`).
2. Set every variable from `.env.example`. `MOCK_GATEWAYS=false`, `PAYU_ENV=production`, `EASEBUZZ_ENV=production` only when go-live is approved.
3. Add the return URLs to each gateway dashboard (PayU surl/furl, Easebuzz, Razorpay allowed origins).
4. Cron: hit `POST /api/internal/outbox` every minute (Railway cron or an Activepieces schedule) with header `x-cron-key`.
5. Custom domain `donate.iskconchennai.org`.

## Notes

- **Recurring Nitya Seva (D26):** currently recorded as `is_recurring` + a first one-time payment. Gateway mandates/subscriptions (PayU SI / Razorpay Subscriptions) are a separate phase — the schema is ready.
- **Receipts (D33 — both during transition):** we assign `receipt_no` AND fire the Zoho webhook. If Zoho also emails a receipt, donors get two — adjust the Zoho flow to suppress its receipt, or flip D33 to single-issuer before launch.
- **Date_field format** in the Zoho payload is ISO `YYYY-MM-DD` — confirm the Zoho Flow accepts this or tell me the expected format.
