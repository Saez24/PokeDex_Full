"""
Redis Cache-Schicht — nur für Pokemon List + Detail.
Sitzt vor PostgreSQL und liefert gecachte Responses in < 1ms.

Architektur:
  Request → Redis hit  → sofort zurück
          → Redis miss → PostgreSQL → in Redis speichern → zurück
"""
import json
import os
from typing import Any
import redis.asyncio as aioredis
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
TTL = 60 * 60 * 24  # 24 Stunden in Sekunden

# Key-Prefix damit Redis-Keys nicht mit anderen Apps kollidieren
PREFIX = "pokedex"

_redis: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = await aioredis.from_url(
            REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis


async def close_redis():
    global _redis
    if _redis:
        await _redis.aclose()
        _redis = None


# ── Key-Builder ───────────────────────────────────────────────────────────────

def key_pokemon_detail(name_or_id: str) -> str:
    return f"{PREFIX}:pokemon:{name_or_id}"

def key_pokemon_list(limit: int, offset: int) -> str:
    return f"{PREFIX}:pokemon_list:{limit}:{offset}"


# ── Generic get/set ───────────────────────────────────────────────────────────

async def get(key: str) -> Any | None:
    try:
        r = await get_redis()
        raw = await r.get(key)
        if raw is None:
            return None
        return json.loads(raw)
    except Exception:
        # Redis-Fehler nie propagieren — einfach Cache-Miss zurückgeben
        return None


async def set(key: str, value: Any, ttl: int = TTL) -> None:
    try:
        r = await get_redis()
        await r.set(key, json.dumps(value, ensure_ascii=False), ex=ttl)
    except Exception:
        pass  # Redis-Fehler still ignorieren


async def delete(key: str) -> None:
    try:
        r = await get_redis()
        await r.delete(key)
    except Exception:
        pass


async def flush_pokemon_cache() -> int:
    """Löscht alle Pokémon-Keys aus Redis (z.B. nach Re-Seed)"""
    try:
        r = await get_redis()
        keys = await r.keys(f"{PREFIX}:pokemon*")
        if keys:
            await r.delete(*keys)
        return len(keys)
    except Exception:
        return 0