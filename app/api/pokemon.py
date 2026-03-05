"""
FastAPI Router — spiegelt die PokéAPI 1:1.

PokéAPI:       https://pokeapi.co/api/v2/pokemon?limit=20&offset=0
Dein Backend:  http://localhost:8000/api/v2/pokemon?limit=20&offset=0
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.services import cache as cache_svc

router = APIRouter()


def _build_url(request_url: str, endpoint: str, name: str) -> str:
    """Baut eine URL im PokéAPI-Format"""
    base = str(request_url).split("/api/v2")[0]
    return f"{base}/api/v2/{endpoint}/{name}/"



@router.get("/pokemon")
async def list_pokemon(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_session),
):
    total = await cache_svc.count_pokemon(session)
    items = await cache_svc.list_pokemon(session, limit=limit, offset=offset)

    # Format exakt wie PokéAPI
    results = [
        {"name": p["name"], "url": f"http://localhost:8000/api/v2/pokemon/{p['id']}/"}
        for p in items
    ]

    next_offset = offset + limit
    prev_offset = offset - limit

    return {
        "count": total,
        "next": f"http://localhost:8000/api/v2/pokemon?limit={limit}&offset={next_offset}"
                if next_offset < total else None,
        "previous": f"http://localhost:8000/api/v2/pokemon?limit={limit}&offset={prev_offset}"
                    if offset > 0 else None,
        "results": results,
    }


# ── Pokemon Detail ────────────────────────────────────────────────────────────

@router.get("/pokemon/{name_or_id}")
async def get_pokemon(
    name_or_id: str,
    session: AsyncSession = Depends(get_session),
):
    data = await cache_svc.get_pokemon(session, name_or_id)
    if not data:
        raise HTTPException(status_code=404, detail=f"Pokemon '{name_or_id}' not found")
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
        "results": [{"name": t["name"], "url": f"http://localhost:8000/api/v2/type/{t['id']}/"} for t in items],
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