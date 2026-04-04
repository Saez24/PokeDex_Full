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
    type_name: str | None = Query(default=None, alias="type", description="Filtert nach Typ (z.B. 'water')"),
    generation: int | None = Query(default=None, ge=1, le=9, description="Filtert nach Generation (1–9)"),
    session: AsyncSession = Depends(get_session),
):
    is_filtered = type_name is not None or generation is not None

    if is_filtered:
        redis_key = redis_svc.key_pokemon_filter(limit, offset, type_name, generation)
    else:
        redis_key = redis_svc.key_pokemon_list(limit, offset)

    # 1. Redis
    cached = await redis_svc.get(redis_key)
    if cached is not None:
        return cached

    # 2. PostgreSQL
    if is_filtered:
        items, total = await cache_svc.filter_pokemon(
            session, limit=limit, offset=offset,
            type_name=type_name, generation=generation,
        )
    else:
        total = await cache_svc.count_pokemon(session)
        items = await cache_svc.list_pokemon(session, limit=limit, offset=offset)

    next_offset = offset + limit
    prev_offset = offset - limit

    # Query-Params für Pagination-URLs bei gefilterter Anfrage
    base_params = f"limit={limit}"
    if type_name:
        base_params += f"&type={type_name}"
    if generation:
        base_params += f"&generation={generation}"

    response = {
        "count": total,
        "next": f"{BASE_URL}/pokemon?{base_params}&offset={next_offset}"
                if next_offset < total else None,
        "previous": f"{BASE_URL}/pokemon?{base_params}&offset={prev_offset}"
                    if offset > 0 else None,
        "results": [
            {"name": p["name"], "url": f"{BASE_URL}/pokemon/{p['id']}/"}
            for p in items
        ],
    }

    await redis_svc.set(redis_key, response)
    return response


# ── Pokemon Compare ───────────────────────────────────────────────────────────
# WICHTIG: Muss VOR /pokemon/{name_or_id} definiert sein (Routing-Reihenfolge)

@router.get("/pokemon/compare")
async def compare_pokemon(
    ids: str = Query(..., description="Komma-getrennte Pokémon-IDs oder Namen (max. 4)"),
    session: AsyncSession = Depends(get_session),
):
    id_list = [i.strip() for i in ids.split(",") if i.strip()][:4]
    if not id_list:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="Mindestens eine ID muss angegeben werden")

    results = []
    not_found = []
    for id_ in id_list:
        # 1. Redis
        cached = await redis_svc.get(redis_svc.key_pokemon_detail(id_))
        if cached is not None:
            results.append(cached)
            continue
        # 2. PostgreSQL
        data = await cache_svc.get_pokemon(session, id_)
        if data:
            results.append(data)
        else:
            not_found.append(id_)

    return {"count": len(results), "results": results, "not_found": not_found}


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
    # Direkt aus Cache laden
    data = await cache_svc.get_species(session, name_or_id)
    if data:
        return data

    # Fallback für Formvarianten (z.B. "pyroar-male" → Species "pyroar"):
    # Pokémon-Daten laden und daraus den echten Species-Namen ermitteln.
    poke_data = await cache_svc.get_pokemon(session, name_or_id)
    if poke_data:
        species_name = poke_data.get("species", {}).get("name")
        if species_name and species_name != name_or_id:
            data = await cache_svc.get_species(session, species_name)
            if data:
                return data

    raise HTTPException(status_code=404, detail=f"Species '{name_or_id}' not found")


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


# ── Stats ────────────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_stats(session: AsyncSession = Depends(get_session)):
    """Gibt die Anzahl gecachter Einträge pro Kategorie zurück."""
    return await cache_svc.get_stats(session)


# ── Generation ──────────────────────────────────────────────────────────────

@router.get("/generation")
async def list_generations(session: AsyncSession = Depends(get_session)):
    redis_key = redis_svc.key_generation_list()
    cached = await redis_svc.get(redis_key)
    if cached is not None:
        return cached

    items = await cache_svc.list_generations(session)
    response = {
        "count": len(items),
        "results": [{"name": g["name"], "url": f"{BASE_URL}/generation/{g['id']}/"} for g in items],
    }
    await redis_svc.set(redis_key, response)
    return response


@router.get("/generation/{id_or_name}")
async def get_generation(
    id_or_name: str,
    session: AsyncSession = Depends(get_session),
):
    redis_key = redis_svc.key_generation(id_or_name)
    cached = await redis_svc.get(redis_key)
    if cached is not None:
        return cached

    data = await cache_svc.get_generation(session, id_or_name)
    if not data:
        raise HTTPException(status_code=404, detail=f"Generation '{id_or_name}' not found")

    await redis_svc.set(redis_key, data)
    # Auch unter Alternativ-Key (ID ↔ Name) speichern
    alt_key = redis_svc.key_generation(data["name"] if id_or_name.isdigit() else str(data["id"]))
    await redis_svc.set(alt_key, data)
    return data


# ── Item ───────────────────────────────────────────────────────────────────────

@router.get("/item")
async def list_items(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_session),
):
    redis_key = redis_svc.key_item_list(limit, offset)
    cached = await redis_svc.get(redis_key)
    if cached is not None:
        return cached

    items, total = await cache_svc.list_items(session, limit=limit, offset=offset)
    next_offset = offset + limit
    prev_offset = offset - limit
    response = {
        "count": total,
        "next": f"{BASE_URL}/item?limit={limit}&offset={next_offset}" if next_offset < total else None,
        "previous": f"{BASE_URL}/item?limit={limit}&offset={prev_offset}" if offset > 0 else None,
        "results": [{"name": it["name"], "url": f"{BASE_URL}/item/{it['id']}/"} for it in items],
    }
    await redis_svc.set(redis_key, response)
    return response


@router.get("/item/{name_or_id}")
async def get_item(
    name_or_id: str,
    session: AsyncSession = Depends(get_session),
):
    redis_key = redis_svc.key_item(name_or_id)
    cached = await redis_svc.get(redis_key)
    if cached is not None:
        return cached

    data = await cache_svc.get_item(session, name_or_id)
    if not data:
        raise HTTPException(status_code=404, detail=f"Item '{name_or_id}' not found")

    await redis_svc.set(redis_key, data)
    alt_key = redis_svc.key_item(data["name"] if name_or_id.isdigit() else str(data["id"]))
    await redis_svc.set(alt_key, data)
    return data


# ── Admin ─────────────────────────────────────────────────────────────────────

@router.delete("/cache/pokemon")
async def flush_pokemon_cache():
    """Löscht alle Pokémon-Keys aus Redis (nach Re-Seed aufrufen)"""
    deleted = await redis_svc.flush_pokemon_cache()
    return {"deleted_keys": deleted}