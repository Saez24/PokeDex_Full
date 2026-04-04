# PokéDex — Fullstack App

> Eine moderne Pokémon-Referenz-App mit Angular 21 Frontend und FastAPI Backend.

[![Publish Fullstack Image](https://github.com/Saez24/PokeDex_Full/actions/workflows/publish-app.yml/badge.svg)](https://github.com/Saez24/PokeDex_Full/actions/workflows/publish-app.yml)

---

## Über die App

PokéDex ist eine vollständige Pokémon-Informationsplattform, die Daten von der [PokéAPI](https://pokeapi.co) bezieht und lokal cached, um schnelle Antwortzeiten zu garantieren.

**Features:**

- **Pokédex-Grid** — Alle Pokémon durchsuchbar, filterbar nach Typ (18 Typen) und Generation (Gen I–IX), virtuelles Scrollen für flüssige Performance
- **Pokémon-Detailseiten** — Stats, Fähigkeiten mit Beschreibungen, Breeding-Infos, Evolutionskette, Attacken (Level-up / TM / Ei), Shiny-Toggle, Pokémon-Cry (Audio), Formvarianten (Alola, Galar, Mega …), Favoriten-System
- **Vergleichsmodus** — Bis zu 4 Pokémon nebeneinander mit Stat-Bars und Winner-Highlight
- **Team Builder** — 6 Slots, Typ-Abdeckungsanalyse, URL-Export
- **Typ-Chart** — Interaktive 18×18-Schadensmatrix mit Angreifer/Verteidiger-Auswahl
- **Typ-Detailseiten** — Offensive/defensive Matchups, alle Pokémon des Typs paginiert
- **Move-Enzyklopädie** — Alle Attacken mit Filter nach Typ, Klasse und Name
- **Dark/Light-Mode** — Systemweit oder manuell umschaltbar
- **PWA** — Installierbar, Service-Worker-Cache für Offline-Nutzung
- **i18n** — Englisch (Basis) + Deutsch

---

## Stack

| Schicht  | Technologie                                              |
| -------- | -------------------------------------------------------- |
| Frontend | Angular 21 · Zoneless · Signals · Angular Material 3     |
| Backend  | FastAPI · SQLAlchemy 2.0 · asyncpg · Gunicorn            |
| Caching  | Redis (L1) → PostgreSQL JSONB (L2) → PokéAPI (L3)        |
| Serving  | nginx (SPA + API-Proxy) via supervisord                  |
| Testing  | Vitest (Frontend, 15 Tests) · pytest (Backend, 46 Tests) |
| CI/CD    | GitHub Actions → GHCR Docker Image                       |

---

## Architektur (Single Container)

```
Browser
  └── nginx (Port 80)
        ├── /api/*  → proxy → gunicorn (127.0.0.1:8000) → FastAPI
        │                          └── Redis L1
        │                          └── PostgreSQL L2
        │                          └── PokéAPI L3 (Seed)
        └── /*      → Angular SPA (static files)
```

PostgreSQL und Redis laufen als **separate Container** und werden über Umgebungsvariablen eingebunden.

---

## Deployment (Unraid / Docker)

### Image pullen

```bash
docker pull ghcr.io/saez24/pokedex-app:latest
```

### Container starten

```bash
docker run -d \
  --name pokedex \
  -p 80:80 \
  -e DATABASE_URL="postgresql+asyncpg://user:pass@<pg-host>:5432/pokedex" \
  -e REDIS_URL="redis://<redis-host>:6379" \
  -e ALLOWED_HOSTS="http://<deine-ip>" \
  -e ADMIN_SECRET="<dein-geheimes-passwort>" \
  ghcr.io/saez24/pokedex-app:latest
```

### Umgebungsvariablen

| Variable        | Beschreibung                                           | Beispiel                                      |
| --------------- | ------------------------------------------------------ | --------------------------------------------- |
| `DATABASE_URL`  | Async PostgreSQL Connection String                     | `postgresql+asyncpg://user:pass@host/pokedex` |
| `REDIS_URL`     | Redis Connection String                                | `redis://192.168.1.10:6379`                   |
| `ALLOWED_HOSTS` | CORS-erlaubte Origins (kommagetrennt)                  | `http://192.168.1.50`                         |
| `ADMIN_SECRET`  | Passwort für Admin-Endpoints (`X-Admin-Secret`-Header) | `supersecret`                                 |

### Datenbank seeden

Nach dem ersten Start die Pokémon-Daten von der PokéAPI laden:

```bash
# Alle 1025 Pokémon + Typen + Generationen + Items (dauert ~15 min)
docker exec pokedex python3 -m scripts.seed_db --limit 1025

# Nur Gen 1 (schnell, ~2 min)
docker exec pokedex python3 -m scripts.seed_db --limit 151 --skip-moves --skip-items
```

---

## Entwicklung

### Voraussetzungen

- Node.js 22+
- Python 3.13+
- PostgreSQL
- Redis

### Frontend

```bash
cd frontend
npm install
ng serve          # http://localhost:4200
```

### Backend

```bash
cd backend
cp .env.example .env   # DATABASE_URL + REDIS_URL eintragen
alembic upgrade head
uvicorn app.main:app --reload
```

### Tests

```bash
# Frontend (Vitest)
cd frontend
npm test

# Backend (pytest)
cd backend
python3 -m pytest tests/ -v
```

---

## CI/CD

Bei Push auf den `production`-Branch oder einem Tag `v*`:

1. **pytest** — 46 Backend-Tests müssen grün sein
2. **Docker Build** — Multi-stage (Angular + Python → nginx + gunicorn)
3. **Push** → `ghcr.io/saez24/pokedex-app:latest`

---

## Lizenz

[MIT](LICENSE)
