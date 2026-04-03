#!/bin/bash
set -e

echo "Waiting for database..."

until alembic current > /dev/null 2>&1; do
  sleep 2
done

echo "Running migrations..."
alembic upgrade head

exec gunicorn app.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000