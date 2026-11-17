# Deploying MkulimaFlow to Railway

The repository deploys as **one Railway service**: Django serves the API and the
built React app from the same domain. That keeps session cookies and CSRF checks
same-origin, so there is no CORS setup.

## What the deployment uses

| File | Purpose |
| --- | --- |
| `Dockerfile` | Builds the React app with Node, then runs Django with Gunicorn. |
| `railway.json` | Requests the Dockerfile builder and `/api/health/` health check. Railway is deprecating this file, so also set these values in the dashboard. |
| `mkulimaflow_backend/requirements.txt` | Python dependencies, including Gunicorn and WhiteNoise. |
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

Use **either** a Railway PostgreSQL service **or** your existing Aiven database.

Railway PostgreSQL:

```text
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

Aiven / external PostgreSQL:

```text
DB_NAME=defaultdb
DB_USER=avnadmin
DB_PASSWORD=<password>
DB_HOST=pg-8205-mkulimaflowapp.a.aivencloud.com
DB_PORT=26736
DB_SSLMODE=require
```

The app reads `DATABASE_URL` first. If it is absent, it uses the `DB_*` values.

Copy `DB_HOST` from the Aiven console **in full** — it must end in
`.aivencloud.com`. A host missing its top-level domain produces
`failed to resolve host ... Name or service not known`. Also allow Railway's
traffic in Aiven under **Allowed IP addresses** (`0.0.0.0/0` for a public
service), otherwise the connection will time out after DNS resolves.

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

## 4. Create an admin user

Use the Railway CLI:

```powershell
railway link
railway run python mkulimaflow_backend/mkulimaflow/manage.py createsuperuser
```

Or open a shell on the service and run it from
`/app/backend/mkulimaflow`.

## 5. Custom domain

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
- **Database connection error** — verify the DB host/port, and set
  `DB_SSLMODE=require` for Aiven. Confirm the database allows the Railway
  service's public IP.
- **Payment methods disabled** — expected in production without credentials.
  Set `PAYMENTS_DEMO_MODE=True` for staging, or configure real M-Pesa keys.
- **Health check or restart policy not applied from `railway.json`** — Railway is
  deprecating Config as Code (files stop being read on 2026-12-01, and new
  services cannot opt in). Set the healthcheck path and restart policy in the
  dashboard as listed under [Required service settings](#required-service-settings).
