# syntax=docker/dockerfile:1

# Build the React frontend
FROM node:22-alpine AS frontend
WORKDIR /app

COPY mkulimaflow_frontend/package.json mkulimaflow_frontend/package-lock.json ./
RUN npm ci

COPY mkulimaflow_frontend/ ./
RUN npm run build


# Run Django and serve the built frontend with WhiteNoise
FROM python:3.13-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY mkulimaflow_backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY mkulimaflow_backend/ ./backend/
COPY --from=frontend /app/dist ./backend/mkulimaflow/frontend_dist

WORKDIR /app/backend/mkulimaflow

EXPOSE 8000

CMD ["sh", "-c", "python manage.py collectstatic --noinput && python manage.py migrate --noinput && exec gunicorn mkulimaflowproject.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers ${WEB_CONCURRENCY:-2} --timeout 90 --access-logfile - --error-logfile -"]
