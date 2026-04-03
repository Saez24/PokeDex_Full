"""
FastAPI Router mit Redis-Cache-Schicht.

Flow für /pokemon/{name}:
  1. Redis hit?  → sofort zurück (< 1ms)
  2. PostgreSQL? → in Redis speichern → zurück (~ 5ms)
  3. 404         → nicht gefunden

Flow für /pokemon?limit=20&offset=0:
  1. Redis hit?  → sofort zurück
  2. PostgreSQL  → in Redis speichern → zurück
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.services import cache as cache_svc
from app.services import redis as redis_svc

router = APIRouter()

BASE_URL = "http://localhost:8000/api/v2"


# ── Pokemon List ──────────────────────────────────────────────────────────────

@router.get("/pokemon")
async def list_pokemon(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_session),
):
    redis_key = redis_svc.key_pokemon_list(limit, offset)

    # 1. Redis
    cached = await redis_svc.get(redis_key)
    if cached is not None:
        return cached

    # 2. PostgreSQL
    total = await cache_svc.count_pokemon(session)
    items = await cache_svc.list_pokemon(session, limit=limit, offset=offset)

    next_offset = offset + limit
    prev_offset = offset - limit

    response = {
        "count": total,
        "next": f"{BASE_URL}/pokemon?limit={limit}&offset={next_offset}"
                if next_offset < total else None,
        "previous": f"{BASE_URL}/pokemon?limit={limit}&offset={prev_offset}"
                    if offset > 0 else None,
        "results": [
            {"name": p["name"], "url": f"{BASE_URL}/pokemon/{p['id']}/"}
            for p in items
        ],
    }

    await redis_svc.set(redis_key, response)
    return response


# ── Pokemon Detail ────────────────────────────────────────────────────────────

@router.get("/pokemon/{name_or_id}")
async def get_pokemon(
    name_or_id: str,
    session: AsyncSession = Depends(get_session),
):
    redis_key = redis_svc.key_pokemon_detail(name_or_id)

    # 1. Redis
    cached = await redis_svc.get(redis_key)
    if cached is not None:
        return cached

    # 2. PostgreSQL
    data = await cache_svc.get_pokemon(session, name_or_id)
    if not data:
        raise HTTPException(status_code=404, detail=f"Pokemon '{name_or_id}' not found")

    # In Redis speichern — sowohl unter Name als auch ID
    await redis_svc.set(redis_key, data)
    if name_or_id != str(data["id"]):
        await redis_svc.set(redis_svc.key_pokemon_detail(str(data["id"])), data)

    return data


# ── Pokemon Species ───────────────────────────────────────────────────────────

@router.get("/pokemon-species/{name_or_id}")
async def get_species(
    name_or_id: str,
    session: AsyncSession = Depends(get_session),
):
    data = await cache_svc.get_species(session, name_or_id)
    if not data:
        raise HTTPException(status_code=404, detail=f"Species '{name_or_id}' not found")
    return data


# ── Evolution Chain ───────────────────────────────────────────────────────────

@router.get("/evolution-chain/{id}")
async def get_evolution_chain(
    id: int,
    session: AsyncSession = Depends(get_session),
):
    data = await cache_svc.get_evolution_chain(session, id)
    if not data:
        raise HTTPException(status_code=404, detail=f"Evolution chain {id} not found")
    return data


# ── Type ─────────────────────────────────────────────────────────────────────

@router.get("/type")
async def list_types(session: AsyncSession = Depends(get_session)):
    items = await cache_svc.list_types(session)
    return {
        "count": len(items),
        "next": None,
        "previous": None,
        "results": [
            {"name": t["name"], "url": f"{BASE_URL}/type/{t['id']}/"}
            for t in items
        ],
    }


@router.get("/type/{name_or_id}")
async def get_type(
    name_or_id: str,
    session: AsyncSession = Depends(get_session),
):
    data = await cache_svc.get_type(session, name_or_id)
    if not data:
        raise HTTPException(status_code=404, detail=f"Type '{name_or_id}' not found")
    return data


# ── Ability ───────────────────────────────────────────────────────────────────

@router.get("/ability/{name_or_id}")
async def get_ability(
    name_or_id: str,
    session: AsyncSession = Depends(get_session),
):
    data = await cache_svc.get_ability(session, name_or_id)
    if not data:
        raise HTTPException(status_code=404, detail=f"Ability '{name_or_id}' not found")
    return data


# ── Move ──────────────────────────────────────────────────────────────────────

@router.get("/move/{name_or_id}")
async def get_move(
    name_or_id: str,
    session: AsyncSession = Depends(get_session),
):
    data = await cache_svc.get_move(session, name_or_id)
    if not data:
        raise HTTPException(status_code=404, detail=f"Move '{name_or_id}' not found")
    return data


# ── Admin ─────────────────────────────────────────────────────────────────────

@router.delete("/cache/pokemon")
async def flush_pokemon_cache():
    """Löscht alle Pokémon-Keys aus Redis (nach Re-Seed aufrufen)"""
    deleted = await redis_svc.flush_pokemon_cache()
    return {"deleted_keys": deleted}