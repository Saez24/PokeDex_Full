#!/bin/bash
set -e

echo "⏳ Warte auf Datenbank …"
until alembic current > /dev/null 2>&1; do
    echo "   DB noch nicht bereit, warte 3s …"
    sleep 3
done

echo "🔄 Führe Migrationen aus …"
alembic upgrade head

echo "🚀 Starte Dienste (nginx + gunicorn) …"
exec supervisord -c /etc/supervisor/conf.d/app.conf
