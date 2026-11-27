# Railway backend notes

This file is a short Railway-specific appendix. The authoritative, full guide is
[`DEPLOYMENT.md`](DEPLOYMENT.md).

## Architecture

The Railway service runs **only the Django API and admin**. React is deployed
separately on Vercel. The backend container no longer builds or serves the React
app.

| Setting | Dashboard value |
| --- | --- |
| Root Directory | `/` (the repository root, which contains `Dockerfile`) |
| Builder | Dockerfile |
| Dockerfile Path | `Dockerfile` |
| Healthcheck Path | `/health/` |
| Restart Policy | On Failure |

`railway.json` contains the same build and deploy values, but Railway is
deprecating Config as Code. The dashboard values are authoritative and must be
set there as well.

The container start command is defined in `Dockerfile`:

```sh
python manage.py collectstatic --noinput \
  && python manage.py migrate --noinput \
  && exec gunicorn mkulimaflowproject.wsgi:application \
       --bind 0.0.0.0:${PORT:-8000} \
       --workers ${WEB_CONCURRENCY:-2} \
       --timeout 90 \
       --access-logfile - \
       --error-logfile -
```

Migrations therefore run at container start, after Railway networking is
available. Do not add a separate build-time migration step.

## Minimum app-service variables

```text
DJANGO_SECRET_KEY=<generate-a-long-random-value>
DJANGO_DEBUG=False
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
CORS_ALLOWED_ORIGINS=https://<your-vercel-app>.vercel.app
DJANGO_CSRF_TRUSTED_ORIGINS=https://<your-vercel-app>.vercel.app
```

Use the actual Postgres and Redis service names from your Railway project if
they are not named `Postgres` and `Redis`. Remove any `DB_*` variables from the
Railway app service so `DATABASE_URL` is the single source of truth.

For a custom backend domain also set:

```text
DJANGO_ALLOWED_HOSTS=<your-backend-domain>
MPESA_CALLBACK_URL=https://<your-backend-domain>/api/payments/mpesa/callback/
```

`DJANGO_CSRF_TRUSTED_ORIGINS` must also include the Vercel origin. See
[`DEPLOYMENT.md`](DEPLOYMENT.md#cors-csrf-and-cookies) for details.

## Database and data seeding

Add a Railway PostgreSQL service; do not expose it publicly unless you
temporarily enable the TCP proxy to import data. `DATABASE_URL` uses Railway's
private hostname inside the app service.

To load the existing local fixture:

1. Enable the Postgres service's TCP proxy and copy `DATABASE_PUBLIC_URL`.
2. From `mkulimaflow_backend/mkulimaflow`:

   ```powershell
   $env:DATABASE_URL = "<DATABASE_PUBLIC_URL>"
   ..\..\.venv\Scripts\python.exe manage.py migrate --noinput
   ..\..\.venv\Scripts\python.exe manage.py loaddata ..\..\.local\seed.json
   ```

3. Disable the TCP proxy afterwards.
4. Create a superuser after seeding so `loaddata` does not overwrite it:

   ```powershell
   ..\..\.venv\Scripts\python.exe manage.py createsuperuser
   ```

## Troubleshooting

- **400 Bad Request / CSRF failure** — add the Vercel origin to
  `CORS_ALLOWED_ORIGINS` and `DJANGO_CSRF_TRUSTED_ORIGINS`.
- **CORS blocked in the browser** — confirm `CORS_ALLOWED_ORIGINS` is the Vercel
  origin without a trailing slash and that `CORS_ALLOW_CREDENTIALS=True`.
- **`COPY ... not found`** — Root Directory must be `/`; the Dockerfile Path is
  `Dockerfile` relative to that root.
- **Database host resolution failure** — remove `DB_HOST`/`DB_*` from the app
  service and use `DATABASE_URL=${{Postgres.DATABASE_URL}}`.
- **Responses feel slower than expected** — confirm `REDIS_URL` is set and the
  Redis service is healthy. Without Redis the app still works from PostgreSQL.
- **Payments are disabled** — expected without gateway credentials. Use
  `PAYMENTS_DEMO_MODE=True` for a clearly-labelled staging demo.
