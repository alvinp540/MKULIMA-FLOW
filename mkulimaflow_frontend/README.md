# MkulimaFlow frontend

React, Vite, and Tailwind CSS frontend for the Django authentication API.

## Run locally

1. Start Django from `mkulimaflow_backend\mkulimaflow`:

   ```powershell
   ..\..\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8765
   ```

2. Start the frontend from `mkulimaflow_frontend`:

   ```powershell
   npm install
   npm run dev
   ```

   Open `http://127.0.0.1:5173`.

Vite proxies `/api` requests to `http://127.0.0.1:8765`. Set the
`MKULIMAFLOW_API_TARGET` environment variable before starting Vite to use a
different backend address. Django's local `.env` should allow the frontend
origin in `DJANGO_CSRF_TRUSTED_ORIGINS`. Tailwind CSS is integrated through
the Vite plugin; application styles are written as Tailwind utility classes.

## Authentication

The frontend uses Django session cookies and CSRF-protected JSON endpoints:

- `GET /api/auth/csrf/` — initialize the CSRF cookie and return a token.
- `GET /api/auth/session/` — restore the current signed-in user.
- `POST /api/auth/login/` — sign in with username/email, password, and role.
- `POST /api/auth/signup/` — create an account and sign in.
- `POST /api/auth/logout/` — end the current session.

No authentication tokens or passwords are stored in browser local storage.
