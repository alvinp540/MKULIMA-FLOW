# MkulimaFlow production deployment guide

## 1. Deployment architecture

```text
Users
  |
  v
Vercel: React + Vite frontend
  |  HTTPS REST calls (credentials: include)
  |  VITE_API_BASE_URL=https://<railway-backend-domain>
  v
Railway: Django API + admin + Gunicorn + WhiteNoise (admin/static only)
  |
  |  Railway private network
  v
Railway PostgreSQL
```

Optional but recommended: Railway Redis on the same private network, used for
shared response caching and `cached_db` sessions.

The frontend and backend are independently deployable. React never connects to
PostgreSQL. Django remains the authoritative application layer.

Health endpoints:

| Path | Purpose |
| --- | --- |
| `/health/` | Liveness. Returns `200 {"status":"ok"}` without touching the database. |
| `/health/db/` | Readiness. Returns `503` if `SELECT 1` fails. |
| `/api/health/` | Backwards-compatible alias of `/health/`. |

## 2. Audit summary and current readiness

Detected structure:

| Item | Detected value |
| --- | --- |
| Git repo root | `C:\Users\alvin\Documents\mkulimaflow\MKULIMA-FLOW` |
| Frontend root | `mkulimaflow_frontend/` |
| Backend root | `mkulimaflow_backend/` |
| Django management root | `mkulimaflow_backend/mkulimaflow/` |
| Django project package | `mkulimaflow_backend/mkulimaflow/mkulimaflowproject/` (`settings.py`, `urls.py`, `wsgi.py`) |
| Django app | `mkulimaflowapp` |
| Frontend package manager | npm; real lockfile at `mkulimaflow_frontend/package-lock.json` |
| Frontend framework | React 19 + Vite 8 + React Router 7 |
| Python/dependency file | `mkulimaflow_backend/requirements.txt` |
| Database | PostgreSQL; custom `DATABASE_URL` parser already exists |
| Authentication | Django session cookies + CSRF header; no JWT |
| Media uploads | None (`FileField`/`ImageField` not used) |
| Existing deployment files | `Dockerfile`, `railway.json`, `.dockerignore`, `.gitignore`, `RAILWAY.md` |
| New frontend deployment files | `mkulimaflow_frontend/vercel.json`, `mkulimaflow_frontend/.env.example` |

Important audit findings that shaped the changes:

- The old `Dockerfile` built React into the backend image (single-service
  architecture). It now builds only Django.
- The frontend used relative `/api/...` URLs and relied on a local Vite proxy or
  the Django monolith. `authService.js` now applies `VITE_API_BASE_URL` to every
  request while preserving the local proxy when the variable is empty.
- There was no CORS support and cookies were `SameSite=Lax`. Both were corrected
  for Vercel → Railway cross-site requests.
- No REST framework, `dj-database-url`, or Python env library is used. They were
  **not** added: the existing Django views and custom URL parser work as-is.
  `django-cors-headers` was added because the split architecture needs it.
- No model or migration changes were needed. Migrations remain untouched.

**Overall readiness:** code-ready for the split deployment. Cloud services,
domains, environment variables, and live integration still require manual
action in Railway and Vercel. Nothing was pushed or deployed by this work.

## 3. Prerequisites

- GitHub repository: `https://github.com/alvinp540/MKULIMA-FLOW.git`, branch `main`.
- Railway account with permission to create services and variables.
- Vercel account with permission to import the repository.
- Generated `DJANGO_SECRET_KEY` (do not reuse the local development key).
- Railway PostgreSQL and (recommended) Railway Redis services.
- Railway backend public domain or custom domain.
- Vercel frontend domain.
- Local Python venv: `C:\Users\alvin\Documents\mkulimaflow\MKULIMA-FLOW\.venv`.
- Local PostgreSQL database is unrelated to production and remains unchanged.

Generate a secret:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

## 4. Required environment variables

### Railway app service

| Variable | Value | Notes |
| --- | --- | --- |
| `DJANGO_SECRET_KEY` | long random value | Required. `SECRET_KEY` is accepted as an alias. |
| `DJANGO_DEBUG` | `False` | Required in production. |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Use the real service name if not `Postgres`. |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` | Recommended. Use the real Redis service name. |
| `CORS_ALLOWED_ORIGINS` | `https://<frontend>.vercel.app` | Comma-separated; origin only, no trailing slash. |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | `https://<frontend>.vercel.app` | Also auto-derived from `CORS_ALLOWED_ORIGINS`, but set explicitly for clarity. |
| `DJANGO_ALLOWED_HOSTS` | backend custom domain | Only needed for custom domains; Railway domains are auto-detected. |
| `DJANGO_COOKIE_SAMESITE` | leave unset | Auto becomes `None` when CORS origin is set and `DEBUG=False`. |
| `DJANGO_HSTS_INCLUDE_SUBDOMAINS` | `True` | Set `False` only if a custom domain has insecure subdomains. |
| `DJANGO_HSTS_PRELOAD` | `True` | Same caution as above. |
| `PAYMENTS_DEMO_MODE` | `True` for staging | Keeps the labelled Visa/PayPal demo available with `DEBUG=False`. |
| `MPESA_*` | real credentials | Only when live M-Pesa is configured. |
| `MPESA_CALLBACK_URL` | backend callback URL | Auto-built from Railway domain; set explicitly for custom domains. |

Database fallback variables (`DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`,
`DB_PORT`, `DB_SSLMODE`) are for local development. Remove them from the Railway
app service so `DATABASE_URL` is the only database source.

Email variables (optional; for password reset/admin mail):

```text
DJANGO_EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=<smtp-host>
EMAIL_PORT=587
EMAIL_HOST_USER=<smtp-user>
EMAIL_HOST_PASSWORD=<smtp-password>
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=no-reply@<your-domain>
```

### Vercel project

| Variable | Value | Notes |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `https://<railway-backend-domain>` | Origin only: no `/api`, no trailing slash. |
| `MKULIMAFLOW_API_TARGET` | not set in Vercel | Local-only Vite proxy override; see `.env.example`. |

Never put `DJANGO_SECRET_KEY`, database credentials, Redis passwords, or other
backend secrets in `VITE_` variables. Vite inlines them into the browser bundle.

## 5. Railway project setup

### 5.1 Create the project

1. Railway → **New Project** → **Deploy from GitHub repo**.
2. Select `alvinp540/MKULIMA-FLOW` and branch `main`.
3. Name the backend service, for example `mkulimaflow-api`.
4. Open **Settings → Source** and set **Root Directory** to `/` (repository
   root). It must contain `Dockerfile`.
5. Open **Settings → Build** and set:
   - Builder: **Dockerfile**
   - Dockerfile Path: `Dockerfile`
6. Open **Settings → Deploy** and set:
   - Healthcheck Path: `/health/`
   - Restart Policy: **On Failure**
7. Add the variables from section 4.
8. Open **Settings → Networking → Generate Domain** and copy the backend domain.

`railway.json` contains matching values, but Railway dashboard settings are
authoritative and should be set explicitly.

### 5.2 Provision PostgreSQL

1. **New → Database → Add PostgreSQL** in the same Railway project.
2. Keep the service private. Do not enable a public TCP proxy except temporarily
   for the data import in section 5.5.
3. On the backend service set:

   ```text
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   ```

   Replace `Postgres` with the actual service name if different.
4. Remove any `DB_*` variables from the Railway app service.
5. Do not try to reach the private database during the Docker build. The
   container's start command runs migrations at runtime.

### 5.3 Provision Redis (recommended)

1. **New → Database → Add Redis** in the same Railway project.
2. On the backend service set:

   ```text
   REDIS_URL=${{Redis.REDIS_URL}}
   ```

   Replace `Redis` with the actual service name if different.
3. If multiple Django apps share the Redis database, set a unique
   `CACHE_KEY_PREFIX`.

Redis caches owner-scoped GET responses and sessions. If Redis is down,
`REDIS_IGNORE_EXCEPTIONS=True` lets requests fall back to PostgreSQL without the
speed benefit.

### 5.4 Deploy, migrate, and restart

The Dockerfile start command does this automatically:

```sh
python manage.py collectstatic --noinput
python manage.py migrate --noinput
exec gunicorn mkulimaflowproject.wsgi:application \
  --bind 0.0.0.0:${PORT:-8000} \
  --workers ${WEB_CONCURRENCY:-2} \
  --timeout 90 \
  --access-logfile - \
  --error-logfile -
```

Notes:

- Railway injects `PORT`; the container respects it.
- Gunicorn logs to stdout/stderr so Railway collects them.
- Use one backend replica for migrations, or run migrations as a separate
  controlled step before scaling out. Do not run concurrent migrations.
- Never add a command that drops tables or resets the database.

### 5.5 Seed the existing data (optional but recommended)

The local fixture is `.local/seed.json` (git-ignored; contains password hashes).
Import it before creating a new superuser.

1. Export from local PostgreSQL if the fixture needs refreshing:

   ```powershell
   cd C:\Users\alvin\Documents\mkulimaflow\MKULIMA-FLOW\mkulimaflow_backend\mkulimaflow
   ..\..\.venv\Scripts\python.exe manage.py export_data -o ..\..\.local\seed.json
   ```

2. In Railway Postgres, enable **Settings → Networking → TCP Proxy** and copy
   `DATABASE_PUBLIC_URL`. Do not use the private hostname from your local machine.
3. Import:

   ```powershell
   $env:DATABASE_URL = "<DATABASE_PUBLIC_URL>"
   ..\..\.venv\Scripts\python.exe manage.py migrate --noinput
   ..\..\.venv\Scripts\python.exe manage.py loaddata ..\..\.local\seed.json
   ```

   Expected: `Installed 19 object(s) from 1 fixture(s)`.
4. Disable the TCP proxy.
5. Clear the local variable in that shell:

   ```powershell
   Remove-Item Env:DATABASE_URL
   ```

### 5.6 Create a superuser

Prefer the Railway service shell, working directory
`/app/backend/mkulimaflow`:

```sh
python manage.py createsuperuser
```

Or from the repository root with Railway CLI linked:

```powershell
railway link
railway run python mkulimaflow_backend/mkulimaflow/manage.py createsuperuser
```

### 5.7 Custom domain

If you attach a custom backend domain, set:

```text
DJANGO_ALLOWED_HOSTS=<backend-domain>
DJANGO_CSRF_TRUSTED_ORIGINS=https://<backend-domain>,https://<frontend>.vercel.app
MPESA_CALLBACK_URL=https://<backend-domain>/api/payments/mpesa/callback/
```

Railway-generated domains are already added to `ALLOWED_HOSTS` and
`CSRF_TRUSTED_ORIGINS` automatically.

## 6. Vercel frontend setup

1. Vercel → **Add New → Project** → import `alvinp540/MKULIMA-FLOW`.
2. Set **Root Directory** to `mkulimaflow_frontend`. This is essential: the repo
   root `package-lock.json` is an empty stub with no `package.json`.
3. Framework Preset: **Vite**.
4. Build settings:
   - Install Command: `npm ci`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Node.js Version: **22.x** (Vite 8 requires Node 20.19+ or 22.12+).
6. Add the environment variable:

   ```text
   VITE_API_BASE_URL=https://<railway-backend-domain>
   ```

7. Deploy. Changing a `VITE_` variable requires a rebuild/redeploy.
8. `mkulimaflow_frontend/vercel.json` contains the SPA fallback rewrite to
   `/index.html`, so direct refreshes of `/flocks`, `/settings`, etc. work.

Local build commands:

```powershell
cd C:\Users\alvin\Documents\mkulimaflow\MKULIMA-FLOW\mkulimaflow_frontend
npm ci
npm run build
```

Local development uses the Vite proxy and does not need `VITE_API_BASE_URL`:

```powershell
npm run dev
```

The proxy target defaults to `http://127.0.0.1:8765` and can be overridden with
`MKULIMAFLOW_API_TARGET`.

## 7. CORS, CSRF, and cookies

- `CORS_ALLOWED_ORIGINS` is restricted to explicit Vercel origins; no wildcard is
  used in production.
- `CORS_ALLOW_CREDENTIALS=True` is required because the frontend sends
  `credentials: 'include'`.
- With a configured CORS origin and `DEBUG=False`, the backend automatically
  sets `SESSION_COOKIE_SAMESITE=None` and `CSRF_COOKIE_SAMESITE=None`. Cookies are
  already `Secure` when `DEBUG=False`.
- `CSRF_TRUSTED_ORIGINS` receives the CORS origins automatically and can also be
  set explicitly.
- The frontend requests `/api/auth/csrf/` first and sends `X-CSRFToken` for all
  non-GET requests. This behavior is unchanged.
- If you keep API calls same-origin through a Vercel proxy instead of
  `VITE_API_BASE_URL`, you can leave `CORS_ALLOWED_ORIGINS` empty.
- Vercel preview deployments are not allowed automatically. Add each preview
  domain explicitly to both `CORS_ALLOWED_ORIGINS` and
  `DJANGO_CSRF_TRUSTED_ORIGINS`, or use a dedicated staging backend. Do not use
  `CORS_ALLOW_ALL_ORIGINS=True` in production.

## 8. Local development

Backend `.env` (repo root, git-ignored) currently targets local PostgreSQL:

```text
DB_NAME=mkulimaflow
DB_USER=mkulimaflow
DB_PASSWORD=<local-password>
DB_HOST=127.0.0.1
DB_PORT=5432
DJANGO_DEBUG=True
```

Useful commands:

```powershell
cd C:\Users\alvin\Documents\mkulimaflow\MKULIMA-FLOW\mkulimaflow_backend\mkulimaflow
..\..\.venv\Scripts\python.exe manage.py check
..\..\.venv\Scripts\python.exe manage.py migrate
..\..\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8765
```

Run the frontend separately on `5173`; it proxies `/api` to `8765`.

## 9. Validation performed

Backend (actual results):

| Check | Result |
| --- | --- |
| `manage.py check` | Passed |
| `manage.py makemigrations --check --dry-run` | Passed; no changes detected |
| `manage.py showmigrations` | All app migrations applied locally |
| `manage.py check --deploy` with production env | Passed with 0 issues |
| `manage.py collectstatic --noinput --dry-run` | Passed; 130 static files found |
| WSGI import (`mkulimaflowproject.wsgi:application`) | Passed |
| `/health/` and `/health/db/` via Django test client | `200` / `200` |
| New CORS/cookie probe | Correct origin, credentials header, `SameSite=None` |
| Full test suite | **19/19 passed** using a temporary SQLite test-settings override |

Frontend (actual results):

| Check | Result |
| --- | --- |
| `npm run build` with no `VITE_API_BASE_URL` | Passed |
| `npm run build` with `VITE_API_BASE_URL=https://backend.example` | Passed; value present in bundle |
| `npm ci` | Failed locally with Windows `EPERM` on a native binary; `npm install` repaired the local install and builds pass. Vercel uses Linux. |

Known environment limitations:

- `python manage.py test` against local PostgreSQL is blocked because the local
  `mkulimaflow` role lacks `CREATEDB`. Fix with:

  ```powershell
  & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h 127.0.0.1 `
    -c "ALTER ROLE mkulimaflow CREATEDB;"
  ```

- Gunicorn cannot start on Windows because its dependency `fcntl` is Unix-only.
  The command is valid in the Linux Docker image; Docker is not installed
  locally, so the image was not built here.
- No Railway or Vercel services were created, so no live cloud integration tests
  were run.

## 10. Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| Railways build fails with `COPY ... not found` | Root Directory is not `/` or Dockerfile Path is wrong. |
| `DisallowedHost` | Add custom backend domain to `DJANGO_ALLOWED_HOSTS`. Railway domains are automatic. |
| Browser CORS error | Set exact Vercel origin in `CORS_ALLOWED_ORIGINS`; no trailing slash. |
| 403 CSRF failure | Add Vercel origin to `DJANGO_CSRF_TRUSTED_ORIGINS`; verify cookies are allowed by the browser. |
| Login works locally but not on Vercel | Confirm `VITE_API_BASE_URL`, redeploy frontend, and check `SameSite=None` / `Secure` cookies. |
| Direct route refresh 404s | Confirm `mkulimaflow_frontend/vercel.json` is deployed with the frontend root. |
| Database host resolution failure | Use `DATABASE_URL` reference; remove `DB_*` from Railway. |
| Healthcheck fails | Check `/health/` in a browser/curl and inspect Gunicorn stdout/stderr. |
| Static/admin CSS missing | Confirm `collectstatic` ran in container start logs and WhiteNoise middleware is enabled. |
| Slow repeated reads | Check Redis service health and `REDIS_URL` reference. |
| Payments disabled | Expected without credentials; use `PAYMENTS_DEMO_MODE=True` for labelled staging demo. |

## 11. Production verification checklist

After both deployments:

1. `GET https://<railway-domain>/health/` returns 200 and `{"status":"ok"}`.
2. `GET https://<railway-domain>/health/db/` returns 200.
3. Vercel frontend loads at its domain.
4. Direct refresh of `/testimonials`, `/flocks`, and `/settings` works.
5. Browser Network tab shows API calls going to `VITE_API_BASE_URL`.
6. `/api/auth/csrf/` succeeds and sets a cookie.
7. Registration/login works and session survives a page refresh.
8. Protected routes redirect when logged out.
9. A create/update/delete in the dashboard writes to PostgreSQL and persists
   after backend redeploy.
10. CORS response headers contain the exact Vercel origin and
    `Access-Control-Allow-Credentials: true`.
11. Admin static files load at `/static/admin/...`.
12. Redis cache hit reduces repeated endpoint latency; a write invalidates cached
    reads immediately.
13. Payment config endpoint returns expected demo/live state; callback URL is the
    backend domain.

## 12. Remaining manual actions

- Create Railway PostgreSQL and Redis services.
- Create Railway backend service, set all dashboard settings and variables.
- Generate the Railway backend domain (or configure a custom one).
- Import `.local/seed.json` via Postgres TCP proxy if existing data is required.
- Create the production superuser.
- Import the GitHub repo into Vercel with Root Directory `mkulimaflow_frontend`.
- Set `VITE_API_BASE_URL` to the final Railway domain and redeploy.
- Run the verification checklist above.
- Commit and push these changes when authorized. This work did **not** push to
  GitHub or trigger any deployment.

## 13. Files changed or created

Modified:

- `.env.example`
- `Dockerfile`
- `mkulimaflow_backend/requirements.txt`
- `mkulimaflow_backend/mkulimaflow/mkulimaflowproject/settings.py`
- `mkulimaflow_backend/mkulimaflow/mkulimaflowproject/urls.py`
- `mkulimaflow_backend/mkulimaflow/mkulimaflowapp/urls.py`
- `mkulimaflow_backend/mkulimaflow/mkulimaflowapp/views.py`
- `mkulimaflow_backend/mkulimaflow/mkulimaflowapp/tests.py`
- `mkulimaflow_frontend/src/services/authService.js`
- `railway.json`
- `RAILWAY.md`

Created:

- `DEPLOYMENT.md`
- `mkulimaflow_frontend/.env.example`
- `mkulimaflow_frontend/vercel.json`

No migrations, models, business logic, UI components, or authentication flows
were rebuilt or removed.
