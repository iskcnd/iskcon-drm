# events

Event and seminar registration — public links, QR check-in

Not built yet. Planned as its own Railway service on `events.iskconchennai.org`,
reading the same Neon database as the DRM app.

When this starts:
1. `npm init -w apps/events` and copy the shape of `apps/drm`.
2. Add a Railway service with **Root Directory** `apps/events`.
3. Reuse the migrations in `packages/db` — never create tables from app code.
