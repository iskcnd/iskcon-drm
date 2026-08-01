# donate

Public donation page — PayU primary, Razorpay fallback, 80G receipts

Not built yet. Planned as its own Railway service on `donate.iskconchennai.org`,
reading the same Neon database as the DRM app.

When this starts:
1. `npm init -w apps/donate` and copy the shape of `apps/drm`.
2. Add a Railway service with **Root Directory** `apps/donate`.
3. Reuse the migrations in `packages/db` — never create tables from app code.
