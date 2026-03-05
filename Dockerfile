# Multi-stage build
FROM python:3.14-slim-bookworm AS builder

LABEL maintainer="Saez24" \
      version="1.0.0" \
      description="Production FastAPI for Pokedex"

# Build-Dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Dependencies installieren
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir gunicorn

COPY update-deps.sh /app/update-deps.sh
RUN chmod +x /app/update-deps.sh    

# Runtime Stage
FROM python:3.14-slim-bookworm

# Version für Health & Swagger
ARG VERSION="1.0.0"
ENV APP_VERSION=$VERSION

# Nur Runtime-Dependencies
RUN apt-get update && apt-get install -y \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Umgebungsvariablen
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# Python packages kopieren
COPY --from=builder /usr/local/lib/python3.14/site-packages /usr/local/lib/python3.14/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# App-Code kopieren
COPY . .

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh


EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Production-Start mit Gunicorn + Uvicorn workers
ENTRYPOINT ["/app/entrypoint.sh"]