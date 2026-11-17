# Deploying MkulimaFlow to Railway

The repository deploys as **one Railway service**: Django serves the API and the
built React app from the same domain. That keeps session cookies and CSRF checks
same-origin, so there is no CORS setup.

## What the deployment uses

| File | Purpose |
| --- | --- |
| `Dockerfile` | Builds the React app with Node, then runs Django with Gunicorn. |
| `railway.json` | Tells Railway to use the Dockerfile and `/api/health/` as the health check. |
| `mkulimaflow_backend/requirements.txt` | Python dependencies, including Gunicorn and WhiteNoise. |
| `.dockerignore` | Keeps `.venv`, `node_modules`, `dist`, logs and secrets out of the image. |
| `.gitignore` | Keeps local credentials, virtualenv and build output out of git. |

On container start, Django runs `collectstatic`, applies migrations, then starts
Gunicorn. WhiteNoise serves the React build (`index.html`, `/assets`, `/images`,
`/videos`) and Django admin static files.

## 1. Commit and push

This `MKULIMA-FLOW` folder is the git repository (`alvinp540/MKULIMA-FLOW`,
branch `main`). From this folder:

```powershell
git add .
git status
git commit -m "Prepare Railway deployment"
git push origin main
```

Before committing, confirm that `.env` is **not** staged. It is ignored, but
`git status` is the final check.

## 2. Create the Railway service

1. In Railway, choose **New Project → Deploy from GitHub repo**.
2. Select `alvinp540/MKULIMA-FLOW`. Railway reads `railway.json` and the root
   `Dockerfile` automatically; leave the root directory as the repository root.
3. Add the environment variables below.
4. Open **Settings → Networking → Generate Domain**.
5. Wait for the health check at `/api/health/` to pass.

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
DB_HOST=<host>.aivencloud.com
DB_PORT=<port>
DB_SSLMODE=require
```

The app reads `DATABASE_URL` first. If it is absent, it uses the `DB_*` values.

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
