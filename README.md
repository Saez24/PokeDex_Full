# Pokédex — FastAPI Backend

A high-performance caching proxy for the [PokéAPI](https://pokeapi.co). Mirrors the official API format 100% — your frontend can switch between the two with a single line change.

![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green?logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.12+-blue?logo=python)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)
![Redis](https://img.shields.io/badge/Redis-7-red?logo=redis)

---

## ✨ Features

- **3-layer caching**: Redis (< 1ms) → PostgreSQL (~ 5ms) → PokéAPI (~ 300ms)
- **100% PokéAPI-compatible** JSON responses — no frontend changes needed
- **Idempotent seed script** — safely re-runnable, skips already cached entries
- **Multilingual data** — types, abilities, moves, species names stored in full
- **Graceful Redis degradation** — works without Redis, falls back to PostgreSQL
- Stores raw JSONB — no complex ORM mapping, guaranteed response fidelity

---

## 🏗️ Architecture

```
┌─────────────┐     ┌──────────────────────────────────────┐
│   Angular   │────▶│           FastAPI Backend             │
│  Frontend   │     │                                       │
└─────────────┘     │  ┌─────────┐  miss  ┌─────────────┐  │
                    │  │  Redis  │───────▶│  PostgreSQL │  │
                    │  │ < 1ms   │        │   ~ 5ms     │  │
                    │  └─────────┘        └─────────────┘  │
                    └──────────────────────────────────────┘
                              ▲ seed only
                    ┌─────────────────┐
                    │    PokéAPI      │
                    │   ~ 300ms       │
                    └─────────────────┘
```

### Project Structure

```
pokedex_backend/
├── app/
│   ├── api/
│   │   └── pokemon.py          # FastAPI router — mirrors PokéAPI endpoints
│   ├── db/
│   │   ├── base.py             # SQLAlchemy declarative base
│   │   └── session.py          # Async engine + session factory
│   ├── models/
│   │   └── cache.py            # JSONB cache tables + SeedProgress
│   ├── schemas/
│   │   └── pokemon.py          # Pydantic response schemas
│   └── services/
│       ├── cache.py            # PostgreSQL read/write helpers
│       ├── pokeapi.py          # PokéAPI HTTP client (retry, rate-limit)
│       └── redis.py            # Redis get/set with silent fallback
├── scripts/
│   └── seed_db.py              # Seed script — loads PokéAPI into PostgreSQL
├── alembic/
│   ├── env.py
│   └── versions/
├── docker-compose.yml          # Redis container
├── requirements.txt
└── .env
```

### Database Schema

All data is stored as raw JSONB — identical to the PokéAPI response:

| Table | Primary Key | Description |
|---|---|---|
| `cached_pokemon` | `id` (int) | Full `/pokemon/{id}` response |
| `cached_species` | `id` (int) | Full `/pokemon-species/{id}` response |
| `cached_evolution_chain` | `id` (int) | Full `/evolution-chain/{id}` response |
| `cached_type` | `id` (int) | Full `/type/{name}` response |
| `cached_ability` | `id` (int) | Full `/ability/{name}` response |
| `cached_move` | `id` (int) | Full `/move/{name}` response |
| `seed_progress` | `id` (auto) | Tracks seeded entities for idempotency |

### Redis Key Schema

| Key pattern | TTL | Content |
|---|---|---|
| `pokedex:pokemon:{name_or_id}` | 24h | Full Pokémon JSON |
| `pokedex:pokemon_list:{limit}:{offset}` | 24h | Paginated list response |

---

## 🚀 Getting Started

### Prerequisites

- Python 3.12+
- PostgreSQL 15+
- Docker (for Redis)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/pokedex-backend.git
cd pokedex-backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Linux / macOS
venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env
```

Edit `.env` with your database credentials (see [Environment Variables](#-environment-variables)).

### Database Setup

```bash
# Start Redis
docker compose up -d

# Run database migrations
alembic upgrade head

# Seed Gen 1 Pokémon (recommended starting point)
python -m scripts.seed_db --limit 151

# Or seed without moves (much faster, load moves lazily in frontend)
python -m scripts.seed_db --limit 151 --skip-moves
```

### Start the Server

```bash
uvicorn app.main:app --reload
```

API available at [http://localhost:8000](http://localhost:8000)  
Interactive docs at [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🔧 Environment Variables

Create a `.env` file in the project root:

```env
# PostgreSQL connection string (asyncpg driver required)
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/pokedex

# Redis connection string
REDIS_URL=redis://localhost:6379

# Comma-separated list of allowed CORS origins
ALLOWED_HOSTS=http://localhost:4200
```

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | PostgreSQL async connection string |
| `REDIS_URL` | ❌ | `redis://localhost:6379` | Redis connection string |
| `ALLOWED_HOSTS` | ❌ | `http://localhost:4200` | CORS allowed origins |

---

## 📜 Scripts

### Seed Script

```bash
# Seed Generation 1 (151 Pokémon) — recommended
python -m scripts.seed_db --limit 151

# Seed with custom range
python -m scripts.seed_db --limit 100 --offset 150

# Skip moves (saves ~400 API calls per 20 Pokémon)
python -m scripts.seed_db --limit 151 --skip-moves

# Full National Dex
python -m scripts.seed_db --limit 1025
```

The seed script is **idempotent** — already cached entries are skipped automatically. You can safely re-run it after failures.

### Other Commands

| Command | Description |
|---|---|
| `uvicorn app.main:app --reload` | Start dev server with hot-reload |
| `alembic upgrade head` | Apply all pending migrations |
| `alembic revision --autogenerate -m "msg"` | Generate new migration |
| `alembic downgrade base` | Roll back all migrations |
| `docker compose up -d` | Start Redis container |
| `docker compose down` | Stop Redis container |

---

## 🌐 API Endpoints

All endpoints mirror the PokéAPI format exactly.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v2/pokemon` | Paginated Pokémon list |
| `GET` | `/api/v2/pokemon/{name_or_id}` | Pokémon detail |
| `GET` | `/api/v2/pokemon-species/{name_or_id}` | Species + localized names |
| `GET` | `/api/v2/evolution-chain/{id}` | Evolution chain |
| `GET` | `/api/v2/type` | All types list |
| `GET` | `/api/v2/type/{name_or_id}` | Type detail + localized names |
| `GET` | `/api/v2/ability/{name_or_id}` | Ability detail + localized names |
| `GET` | `/api/v2/move/{name_or_id}` | Move detail + localized names |
| `DELETE` | `/api/v2/cache/pokemon` | Flush Pokémon keys from Redis |
| `GET` | `/health` | Health check incl. Redis status |

### Example Responses

Both URLs return identical JSON:
```
https://pokeapi.co/api/v2/pokemon/25
http://localhost:8000/api/v2/pokemon/25
```

---

## ⚡ Performance

| Scenario | Response Time |
|---|---|
| Redis hit (warm cache) | < 1ms |
| PostgreSQL hit (cold Redis) | ~ 5ms |
| PokéAPI (after seed: never) | ~ 200–500ms |

After seeding, the PokéAPI is never called again during normal operation.

---

## 📦 Dependencies

| Package | Purpose |
|---|---|
| `fastapi` | Web framework |
| `uvicorn` | ASGI server |
| `sqlalchemy` | ORM + async PostgreSQL |
| `asyncpg` | Async PostgreSQL driver |
| `alembic` | Database migrations |
| `redis` | Async Redis client |
| `httpx` | Async HTTP client for PokéAPI |
| `python-dotenv` | Environment variable loading |
| `pydantic` | Request/response validation |