from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

from app.api.pokemon import router as pokemon_router
from app.api.admin import router as admin_router
from app.models import cache  # noqa
from app.services.redis import get_redis, close_redis

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        r = await get_redis()
        await r.ping()
        print("✅ Redis verbunden")
    except Exception as e:
        print(f"⚠️  Redis nicht erreichbar: {e} — läuft ohne Redis-Cache")
    yield
    await close_redis()


app = FastAPI(
    title="Pokédex API",
    description="""
Caching proxy for the PokéAPI — 100% compatible JSON format.

## Authentication
Admin endpoints require the `X-Admin-Secret` header (set `ADMIN_SECRET` in `.env`).

## Seeding
Use `POST /admin/seed` to load Pokémon data into the database.
Monitor progress with `GET /admin/seed/status`.
    """,
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv("ALLOWED_HOSTS", "http://localhost:4200").split(",")
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(pokemon_router, prefix="/api/v2")
app.include_router(admin_router)


@app.get("/health", tags=["Health"])
async def health():
    redis_ok = False
    try:
        r = await get_redis()
        await r.ping()
        redis_ok = True
    except Exception:
        pass
    return {
        "status": "ok",
        "redis": "connected" if redis_ok else "unavailable",
    }