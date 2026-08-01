# portal

Devotee self-service — own history, receipts, enrolments

Not built yet. Planned as its own Railway service on `portal.iskconchennai.org`,
reading the same Neon database as the DRM app.

When this starts:
1. `npm init -w apps/portal` and copy the shape of `apps/drm`.
2. Add a Railway service with **Root Directory** `apps/portal`.
3. Reuse the migrations in `packages/db` — never create tables from app code.
