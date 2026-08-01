# japa

Japa Desk — card issue, completion, Japa Puja enrolment

Not built yet. Planned as its own Railway service on `japa.iskconchennai.org`,
reading the same Neon database as the DRM app.

When this starts:
1. `npm init -w apps/japa` and copy the shape of `apps/drm`.
2. Add a Railway service with **Root Directory** `apps/japa`.
3. Reuse the migrations in `packages/db` — never create tables from app code.
