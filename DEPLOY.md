# Deploying to Railway

Follow in order. Roughly 20 minutes end to end.

---

## Step 1 — push to GitHub

The repo is `git@github.com:iskcnd/iskcon-drm.git` (private — it describes the shape of devotee
data, so keep it that way). The local remote is already pointed there.

The repo is `git@github.com:iskcnd/iskcon-drm.git` — private, and it should stay that way; it
describes the shape of devotee data.

Start git history fresh. In PowerShell, from `D:\CRM\iskcon-crm`:

```powershell
Remove-Item -Recurse -Force .git
git init
git branch -M main
git add -A
git commit -m "ISKCON Chennai DRM — foundation schema, dashboard, auth"
git remote add origin git@github.com:iskcnd/iskcon-drm.git
git push -u origin main
```

No `--force` needed — both sides start empty.

`.gitignore` already excludes `.env*` and `node_modules`. **Check that no `.env` appears in
`git status` before you commit.** A leaked `DATABASE_URL` hands over the entire devotee database.

> Rename the local folder `D:\CRM\iskcon-crm` → `D:\CRM\iskcon-drm` in Explorer when convenient.
> The folder name has no effect on the repo or the deploy — it's just tidiness.

---

## Step 2 — get your Neon connection string

Neon console → **ISKCON-CND-DB** → **Connect**.

Choose the **pooled** connection (host contains `-pooler`). Railway keeps the Node process alive
and each instance opens several connections; pooling is what stops you exhausting the limit.

It looks like:

```
postgresql://neondb_owner:PASSWORD@ep-xxxx-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

---

## Step 3 — build the schema

From your machine, with Node installed:

```bash
cd D:\CRM\iskcon-crm
npm install
set DATABASE_URL=postgresql://...        # PowerShell: $env:DATABASE_URL="postgresql://..."
npm run migrate
```

Every migration is idempotent, so this is safe on the existing database — it fills in anything
missing and leaves the rest alone.

---

## Step 4 — create your login

```bash
node scripts/create-admin.mjs "info@iskconchennai.org" "Divyarupa" "a-long-strong-password" super_admin
```

Use a real password manager. This account can export every devotee record.

---

## Monorepo — one Railway service per app

The repo now holds several apps. Each subdomain is its own Railway service pointing at the **same
repo** but a different **Root Directory**.

| App | Root Directory | Domain |
|---|---|---|
| DRM | `apps/drm` | `drm.iskconchennai.org` |
| Donations | `apps/donate` | `donate.iskconchennai.org` |
| Events | `apps/events` | `events.iskconchennai.org` |
| Japa Desk | `apps/japa` | `japa.iskconchennai.org` |
| Portal | `apps/portal` | `portal.iskconchennai.org` |

**For the existing DRM service, this is the one setting you must change:**

Railway → `iskcon-drm` → **Settings** → **Source** → **Root Directory** → `apps/drm`

Without it Railway builds the repo root, finds no `app` directory, and the deploy fails.

Each service gets its own `DATABASE_URL` and `SESSION_SECRET`. Use the **same** `SESSION_SECRET`
across apps only if you want a single sign-on session to work across subdomains — otherwise give
each its own.

---

## Step 5 — create the Railway service

1. <https://railway.app> → **New Project** → **Deploy from GitHub repo**
2. Authorise Railway on your GitHub account and pick `iskcon-drm`
3. Railway detects Next.js and configures the build itself — nothing to set

---

## Step 6 — set the environment variables

Railway → your service → **Variables** → add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | your pooled Neon connection string |
| `SESSION_SECRET` | output of `openssl rand -base64 48` — **must be at least 24 characters** |
| `SESSION_HOURS` | `12` (optional) |
| `NODE_ENV` | `production` |

**`SESSION_SECRET` must be random and secret.** It signs the login cookies. Anyone who knows it can
forge a super-admin session. Never reuse the example value, and never commit it.

Railway redeploys automatically when you save.

---

## Step 7 — generate the URL

Railway → **Settings** → **Networking** → **Generate Domain**.

You'll get something like `iskcon-drm-production.up.railway.app`. Open it, sign in with the account
from step 4.

### Custom domain (optional)

Settings → Networking → **Custom Domain** → enter `drm.iskconchennai.org`, then add the CNAME record
Railway shows you at your DNS provider. TLS is issued automatically.

---

## Step 8 — check it works

- [ ] `/login` loads and rejects a wrong password
- [ ] Signing in lands you on the dashboard with your categories in the sidebar
- [ ] Search finds a person
- [ ] Double-clicking a cell saves the edit
- [ ] Export downloads a CSV
- [ ] Signing out returns you to `/login`
- [ ] Opening the URL in a private window redirects to `/login` — **do this one**, it proves the
      auth gate is actually on

---

## Adding staff

```bash
node scripts/create-admin.mjs "name@example.org" "Their Name" "their-password" data_entry
```

Roles: `super_admin`, `module_manager`, `data_entry`, `view_only`.

**One login each.** Shared accounts make the audit log meaningless — "who changed this donation?"
becomes unanswerable, which is exactly the question you'll need to answer one day.

---

## Everyday operations

**Deploy a change** — push to `main`; Railway rebuilds automatically.

**Change the schema** — add a new numbered file in `db/` (`005_courses.sql`), run `npm run migrate`.
Never edit an applied migration; write a new one.

**Read the logs** — Railway → Deployments → the running deployment.

**Undo a bad import** — dashboard → Import batches → Undo import. Super admin only.

---

## Before real devotee data goes in

1. **Raise Neon backup retention.** It's 6 hours by default. A bad import found the next morning is
   unrecoverable. Neon → Settings → history retention → 7 days.
2. **Set the Neon IP allowlist** to Railway's egress addresses plus the temple office. Currently any
   address with the password can connect.
3. **Rotate the database password** if the connection string has been pasted into chat, email, or
   anywhere else.
4. **Delete the test rows** — 4 people, 3 donations, `source = 'test'`.

---

## Troubleshooting

### Railway can't find the repo

The repo exists on GitHub but doesn't appear in Railway's "Deploy from GitHub repo" list.

Railway's GitHub App was installed with **"Only select repositories"**, and that grant is a fixed
list. Any repo created afterwards is invisible to Railway until you add it.

1. GitHub → **Settings** → **Applications** → **Installed GitHub Apps** → **Railway** → **Configure**
2. *Repository access* → **All repositories**, or add `iskcon-drm` to the selected list
3. **Save**, then reload the New Project page in Railway

Still missing? Railway caches the list — disconnect and reconnect GitHub under Railway
Account Settings → Integrations. If the repo belongs to a GitHub **organisation** rather than a
personal account, the app has to be installed on the organisation separately, and an org owner
has to approve it.

### Deploying without GitHub

If the GitHub connection stays stubborn, deploy straight from your machine:

```bash
npm i -g @railway/cli
railway login
railway init          # creates the project
railway up            # uploads and builds this folder
```

Set the variables afterwards with `railway variables --set DATABASE_URL=... --set SESSION_SECRET=...`,
or in the web dashboard. You lose auto-deploy-on-push, so it's a fallback rather than the goal —
but it gets you running today.

---

| Symptom | Cause |
|---|---|
| "Unexpected end of JSON input" on sign-in | The server returned an empty body. Usually a **wrong or misspelled custom domain** pointing somewhere that isn't Railway, or the app crashed before replying. Test the `*.up.railway.app` URL first to isolate — if that works, the problem is your domain or DNS, not the app |
| Password accepted but you land back on `/login` | `SESSION_SECRET` is missing or **shorter than 24 characters**. Check deploy logs for "SESSION_SECRET is only N characters" |
| Redirect loop on `/login` | `SESSION_SECRET` differs between builds, or is missing |
| "Not signed in" straight after signing in | Cookie rejected — confirm you're on HTTPS in production |
| `getaddrinfo ENOTFOUND` in logs | `DATABASE_URL` wrong or missing |
| "too many connections" | Use the **pooled** Neon string, not the direct one |
| Build fails on `SESSION_SECRET` | Set it as a Railway variable; the build imports the session module |
| Edits don't save | Your role lacks the capability — check the roles table in README |
