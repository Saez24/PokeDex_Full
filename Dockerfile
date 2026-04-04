# ── Stage 1: Build Angular Frontend ──────────────────────────────────────────
FROM node:22-alpine AS frontend-builder

WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --ignore-scripts

COPY frontend/ .
# Production-Build — API-Calls gehen über nginx → /api/v2/ (kein hardcodierter Host)
RUN npm run build -- --configuration=production

# ── Stage 2: Python-Dependencies ─────────────────────────────────────────────
FROM python:3.13-slim-bookworm AS backend-builder

RUN apt-get update && apt-get install -y \
    gcc g++ libpq-dev libffi-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY backend/requirements.txt .
COPY backend/update-deps.sh .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt gunicorn && \
    chmod +x update-deps.sh && \
    bash update-deps.sh && \
    pip install --no-cache-dir gunicorn

# ── Stage 3: Runtime ──────────────────────────────────────────────────────────
FROM python:3.13-slim-bookworm

LABEL maintainer="Saez24" \
      description="PokéDex Fullstack — nginx (SPA) + gunicorn (API) via supervisord"

ARG VERSION="1.0.0"
ENV APP_VERSION=$VERSION \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# nginx + supervisor + curl (health-check) + libpq (asyncpg)
RUN apt-get update && apt-get install -y \
    nginx supervisor libpq5 curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python packages
COPY --from=backend-builder /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
COPY --from=backend-builder /usr/local/bin /usr/local/bin

# Backend-Code (app/, alembic/, alembic.ini, ...)
COPY backend/ .

# Angular-Build → nginx document-root
COPY --from=frontend-builder /build/dist/pokedex_angular/browser /usr/share/nginx/html

# Konfigurationsdateien
COPY nginx-combined.conf /etc/nginx/sites-available/default
COPY supervisord.conf     /etc/supervisor/conf.d/app.conf

COPY entrypoint-combined.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

# Healthcheck über den nginx-Proxy → API
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -sf http://localhost/api/v2/stats || exit 1

ENTRYPOINT ["/entrypoint.sh"]
