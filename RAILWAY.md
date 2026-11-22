# Deploying MkulimaFlow to Railway

The repository deploys as **one Railway service**: Django serves the API and the
built React app from the same domain. That keeps session cookies and CSRF checks
same-origin, so there is no CORS setup.

## What the deployment uses

| File | Purpose |
| --- | --- |
| `Dockerfile` | Builds the React app with Node, then runs Django with Gunicorn. |
| `railway.json` | Requests the Dockerfile builder and `/api/health/` health check. Railway is deprecating this file, so also set these values in the dashboard. |
| `mkulimaflow_backend/requirements.txt` | Python dependencies, including Gunicorn, WhiteNoise and the Redis cache backend. |
| `.dockerignore` | Keeps `.venv`, `node_modules`, `dist`, logs and secrets out of the image. |
| `.gitignore` | Keeps local credentials, virtualenv and build output out of git. |

On container start, Django runs `collectstatic`, applies migrations, then starts
Gunicorn. WhiteNoise serves the React build (`index.html`, `/assets`, `/images`,
`/videos`) and Django admin static files.

## Required service settings

The Dockerfile lives at the repository root and copies from **both**
`mkulimaflow_frontend/` and `mkulimaflow_backend/`. That only works when Railway
builds from the repository root, so these dashboard values must match:

| Setting | Value | Why |
| --- | --- | --- |
| Root Directory | `/` (repo root, not `mkulimaflow_backend/mkulimaflow`) | The build context must contain both top-level folders. |
| Dockerfile Path | `Dockerfile` | Relative to the root directory. |
| Healthcheck Path | `/api/health/` | `railway.json` sets this, but dashboard settings are authoritative. |
| Restart Policy | On Failure | Matches `railway.json`. |

If the Root Directory points at `mkulimaflow_backend/mkulimaflow`, the build
context no longer contains `mkulimaflow_frontend/` and every `COPY` fails with
`not found`.

## 1. Commit and push

This `MKULIMA-FLOW` folder is the git repository (`alvinp540/MKULIMA-FLOW`,
branch `main`). The deployment configuration is already committed and pushed. For
future changes:

```powershell
git add .
git status
git commit -m "Describe the change"
git push origin main
```

Before committing, confirm that `.env` is **not** staged. It is ignored, but
`git status` is the final check.

## 2. Create the Railway service

1. In Railway, choose **New Project → Deploy from GitHub repo**.
2. Select `alvinp540/MKULIMA-FLOW`.
3. Open **Settings → Source** and confirm **Root Directory** is `/` (blank or
   `/`). Clear it if it was prefilled with `mkulimaflow_backend/mkulimaflow`.
4. Confirm **Settings → Build → Dockerfile Path** is `Dockerfile`, and the builder
   is **Dockerfile**.
5. Add the environment variables below.
6. Open **Settings → Networking → Generate Domain**.
7. Wait for the health check at `/api/health/` to pass.

## 3. Environment variables

Required:

```text
DJANGO_SECRET_KEY=<long random value>
DJANGO_DEBUG=False
```

Generate a secret locally with:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

### Database

The deployed app uses a **Railway PostgreSQL service**; local development uses the
**local PostgreSQL 18 server** on `127.0.0.1:5432`. Set on the app service:

```text
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

Remove the `DB_*` variables from the app service so there is a single source of
truth. `DATABASE_URL` is read first; `DB_*` is only a fallback.

Applying the existing local data is covered in
[Seed the existing data](#4-seed-the-existing-data).

Local `.env` (database section):

```text
DB_NAME=mkulimaflow
DB_USER=mkulimaflow
DB_PASSWORD=<generated password>
DB_HOST=127.0.0.1
DB_PORT=5432
```

The role and database were created once with:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h 127.0.0.1 `
  -c "CREATE ROLE mkulimaflow LOGIN PASSWORD '<generated password>'" `
  -c "CREATE DATABASE mkulimaflow OWNER mkulimaflow"
```

The previous Aiven database (`pg-8205-mkulimaflowapp.a.aivencloud.com`) is no
longer used by the app; its rows were imported into the local server. The
credentials remain in `.env` as comments for reference. If you ever point the app
back at Aiven, copy `DB_HOST` in full — it must end in `.aivencloud.com`, and the
service must allow the client IP under **Allowed IP addresses**.

### Redis (recommended)

Redis speeds up repeated reads by caching API responses and session lookups.
Create a **Redis** service in the same Railway project, then set on the app
service:

```text
REDIS_URL=${{Redis.REDIS_URL}}
```

Railway's `REDIS_URL` already contains the host, password and database. If the
service is named something other than `Redis`, use that service name in the
reference. The app uses `django-redis` for its cache and `cached_db` sessions:
sessions still survive a Redis restart because the database remains the source
of truth.

Without `REDIS_URL`, the app falls back to a process-local cache and DB-backed
sessions, so the deployment still works. `REDIS_IGNORE_EXCEPTIONS=True` (the
default) keeps requests serving from the database if Redis is briefly
unavailable. Optional tuning variables:

```text
REDIS_ENABLED=True
REDIS_IGNORE_EXCEPTIONS=True
REDIS_MAX_CONNECTIONS=50
CACHE_TIMEOUT=300
CACHE_KEY_PREFIX=mkulimaflow
```

Use a unique `CACHE_KEY_PREFIX` if several Django apps share one Redis database.
Owner-scoped reads are cached (farms, flocks, egg/feed/health lists, dashboards
and reports). Every cached key includes the user id and a per-user version, and
model save/delete signals bump that version, so a write invalidates stale
responses immediately. Auth/session, CSRF, settings and payment-status endpoints
are deliberately not cached because they depend on cookies or live external
state.

### Payments

M-Pesa is live when Daraja credentials are present:

```text
MPESA_ENV=production
MPESA_CONSUMER_KEY=<key>
MPESA_CONSUMER_SECRET=<secret>
MPESA_SHORTCODE=<shortcode>
MPESA_PASSKEY=<passkey>
MPESA_USD_TO_KES_RATE=130
```

Leave `MPESA_CALLBACK_URL` blank on Railway. It is built automatically as:

```text
https://<RAILWAY_PUBLIC_DOMAIN>/api/payments/mpesa/callback/
```

Set it explicitly if you use a custom domain.

Visa and PayPal have no live gateway integration yet. To keep the demo checkout
working with `DJANGO_DEBUG=False` on a staging deployment:

```text
PAYMENTS_DEMO_MODE=True
```

The checkout clearly labels these as demo payments and no money moves. Set it to
`False` for a live deployment once real Visa/PayPal integration exists.

### Optional

Railway automatically adds its public/private domains to `ALLOWED_HOSTS` and
`CSRF_TRUSTED_ORIGINS`, so these are only needed for custom domains:

```text
DJANGO_ALLOWED_HOSTS=app.example.com
DJANGO_CSRF_TRUSTED_ORIGINS=https://app.example.com
```

## 4. Seed the existing data

The local development data lives in the local PostgreSQL 18 server. Copy it into
the Railway PostgreSQL service so the deployed app starts with the same users,
farms and flocks.

Do this **before creating a superuser**: `loaddata` matches rows by primary key,
so a pre-existing user with `pk=1` would be overwritten by the exported `alvin`
user.

1. Add the PostgreSQL service to the Railway project and set
   `DATABASE_URL=${{Postgres.DATABASE_URL}}` on the app service. Deploy once so
   the container's `migrate` step creates the schema.
2. On the PostgreSQL service, open **Settings → Networking → TCP Proxy** and copy
   **`DATABASE_PUBLIC_URL`**. The private URL
   (`postgres.railway.internal`) only resolves inside Railway.
3. Export the local data (writes `.local/seed.json`, which is git-ignored):

   ```powershell
   cd mkulimaflow_backend\mkulimaflow
   ..\..\.venv\Scripts\python.exe manage.py export_data -o ..\..\.local\seed.json
   ```

   The command writes groups before users and orders models by foreign-key
   dependency, which `dumpdata` does not guarantee on its own.
4. Import it into Railway PostgreSQL:

   ```powershell
   $env:DATABASE_URL = "<DATABASE_PUBLIC_URL>"
   ..\..\.venv\Scripts\python.exe manage.py loaddata ..\..\.local\seed.json
   ```

   Expected output: `Installed 19 object(s) from 1 fixture(s)`.
5. Check the result in the deployed app: the three users, three farms and four
   flocks should be visible. Password hashes are exported as-is, so existing
   passwords keep working.
6. Close the TCP proxy if you do not need external access.

Notes:

- The seed file contains password hashes. `.local/` is ignored by git and by the
  Docker build; delete the file after importing if you prefer.
- `loaddata` is additive and overwrites rows with the same primary key. Run it
  once on a fresh database.
- Re-run `export_data` whenever the local data changes; it reads whatever the
  local `.env` points at.

## 5. Create an admin user

Use the Railway CLI:

```powershell
railway link
railway run python mkulimaflow_backend/mkulimaflow/manage.py createsuperuser
```

Or open a shell on the service and run it from
`/app/backend/mkulimaflow`.

## 6. Custom domain

After attaching a domain in Railway:

```text
DJANGO_ALLOWED_HOSTS=app.example.com
DJANGO_CSRF_TRUSTED_ORIGINS=https://app.example.com
MPESA_CALLBACK_URL=https://app.example.com/api/payments/mpesa/callback/
```

## Troubleshooting

- **Build fails with `COPY ... not found`** — the service Root Directory is not
  the repository root. `mkulimaflow_frontend/` and `mkulimaflow_backend/` must
  both be in the build context, so set **Settings → Source → Root Directory** to
  `/` and redeploy. `Dockerfile Path` must be `Dockerfile`.
- **`failed to resolve host '...'` / `Name or service not known`** — the database
  host value is wrong or incomplete. A truncated host such as
  `pg-8205-mkulimaflowapp.a.aivencloud` must be
  `pg-8205-mkulimaflowapp.a.aivencloud.com`. Check **Variables → `DB_HOST`** and,
  if it is set, **`DATABASE_URL`** (a URL takes priority over `DB_*`). Settings
  now fail with a clear message when a database variable is missing.
- **400 Bad Request / CSRF failure** — the public domain is missing from
  `DJANGO_ALLOWED_HOSTS` or `DJANGO_CSRF_TRUSTED_ORIGINS`. Railway's generated
  domain is handled automatically; custom domains are not.
- **Static files or images return 404** — the frontend build did not reach
  `backend/mkulimaflow/frontend_dist`. Check the Docker build log.
- **`loaddata` cannot reach the database during seeding** — use the
  **`DATABASE_PUBLIC_URL`** copied from the Postgres service's TCP proxy.
  `DATABASE_URL` points at `postgres.railway.internal`, which only resolves
  inside Railway.
- **Database connection error** — verify the DB host/port, and set
  `DB_SSLMODE=require` for Aiven. Confirm the database allows the client IP.
- **Responses feel slower than expected** — confirm `REDIS_URL` is set on the app
  service and that the Redis service is healthy. With `REDIS_IGNORE_EXCEPTIONS`
  the app keeps working from PostgreSQL when Redis is down, but without the
  cache speed-up.
- **Payment methods disabled** — expected in production without credentials.
  Set `PAYMENTS_DEMO_MODE=True` for staging, or configure real M-Pesa keys.
- **Health check or restart policy not applied from `railway.json`** — Railway is
  deprecating Config as Code (files stop being read on 2026-12-01, and new
  services cannot opt in). Set the healthcheck path and restart policy in the
  dashboard as listed under [Required service settings](#required-service-settings).
