"""
Admin Router — Seed-Endpoints für Swagger.

Schutz: ADMIN_SECRET Header (gesetzt in .env)

POST /admin/seed        → startet Seed im Hintergrund
GET  /admin/seed/status → zeigt aktuellen Status
DELETE /admin/seed      → bricht laufenden Seed ab
"""
import asyncio
import json
import os
from datetime import datetime
from typing import Literal

import httpx
from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Query
from pydantic import BaseModel

from app.db.session import AsyncSessionLocal
from app.services import cache as cache_svc
from app.services.pokeapi import fetch_endpoint, fetch_list, fetch
from app.models.cache import SeedProgress
from sqlalchemy import select

router = APIRouter(prefix="/admin", tags=["Admin"])

ADMIN_SECRET = os.getenv("ADMIN_SECRET", "changeme")

# ── Redis-backed Seed State ───────────────────────────────────────────────────
# Speichert den Seed-Status in Redis, damit alle gunicorn-Worker
# denselben State sehen (kein per-Worker In-Memory-State).

_SEED_KEY = "admin:seed:state"
_SEED_TTL = 86400  # 24 h

_DEFAULT_STATE: dict = {
    "status": "idle",
    "started_at": None,
    "finished_at": None,
    "current_step": "",
    "progress": 0,
    "total": 0,
    "errors": [],
}

# In-Memory-Fallback (wenn Redis nicht verfügbar — gleicher Worker)
_mem_state: dict = dict(_DEFAULT_STATE)


async def _read_state() -> dict:
    """Liest den Seed-State aus Redis; Fallback auf In-Memory."""
    from app.services.redis import get_redis
    try:
        r = await get_redis()
        raw = await r.get(_SEED_KEY)
        if raw:
            return json.loads(raw)
    except Exception:
        pass
    return dict(_mem_state)


async def _write_state(state: dict) -> None:
    """Schreibt den Seed-State nach Redis und In-Memory-Fallback."""
    _mem_state.update(state)
    from app.services.redis import get_redis
    try:
        r = await get_redis()
        await r.set(_SEED_KEY, json.dumps(state, default=str), ex=_SEED_TTL)
    except Exception:
        pass  # Fallback bereits aktualisiert


# ── Schemas ───────────────────────────────────────────────────────────────────

class SeedRequest(BaseModel):
    limit: int = 151
    offset: int = 0
    skip_moves: bool = True

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "summary": "Gen 1 ohne Moves (schnell)",
                    "value": {"limit": 151, "offset": 0, "skip_moves": True},
                },
                {
                    "summary": "Gen 1 mit Moves (langsam)",
                    "value": {"limit": 151, "offset": 0, "skip_moves": False},
                },
                {
                    "summary": "Nur erste 20",
                    "value": {"limit": 20, "offset": 0, "skip_moves": True},
                },
            ]
        }
    }


class SeedStatusResponse(BaseModel):
    status: str
    started_at: datetime | None
    finished_at: datetime | None
    current_step: str
    progress: int
    total: int
    errors: list[str]


# ── Auth Helper ───────────────────────────────────────────────────────────────

def require_secret(x_admin_secret: str = Header(..., description="Admin secret from .env")):
    if x_admin_secret != ADMIN_SECRET:
        raise HTTPException(status_code=401, detail="Invalid admin secret")


# ── Background Seed Task ──────────────────────────────────────────────────────

async def run_seed(limit: int, offset: int, skip_moves: bool):
    """Läuft als asyncio Background Task — schreibt State nach Redis."""
    state: dict = {
        **_DEFAULT_STATE,
        "status": "running",
        "started_at": datetime.now().isoformat(),
        "errors": [],
    }
    await _write_state(state)

    async def is_cancelled() -> bool:
        current = await _read_state()
        return current.get("status") != "running"

    async with httpx.AsyncClient() as client:
        try:
            # ── 1. Typen ──
            state["current_step"] = "Loading types …"
            await _write_state(state)
            type_list = await fetch_list(client, "type")
            async with AsyncSessionLocal() as session:
                for item in type_list["results"]:
                    name = item["name"]
                    existing = await session.execute(
                        select(SeedProgress).where(
                            SeedProgress.entity == "type",
                            SeedProgress.name == name,
                            SeedProgress.status == "done",
                        )
                    )
                    if existing.scalar_one_or_none():
                        continue
                    try:
                        data = await fetch_endpoint(client, "type", name)
                        await cache_svc.save_type(session, data)
                        session.add(SeedProgress(entity="type", name=name, status="done"))
                        await session.commit()
                    except Exception as e:
                        await session.rollback()
                        state["errors"].append(f"type/{name}: {e}")
                        await _write_state(state)

            # ── 2. Pokémon ──
            pokemon_list = await fetch_list(client, "pokemon", limit=limit, offset=offset)
            state["total"] = len(pokemon_list["results"])
            await _write_state(state)
            all_abilities: set[str] = set()
            all_moves: set[str] = set()

            for i, item in enumerate(pokemon_list["results"]):
                if await is_cancelled():
                    break

                name = item["name"]
                state["current_step"] = f"Pokémon {i + 1}/{state['total']}: {name}"
                state["progress"] = i + 1
                await _write_state(state)

                async with AsyncSessionLocal() as session:
                    # Pokemon
                    already = await session.execute(
                        select(SeedProgress).where(
                            SeedProgress.entity == "pokemon",
                            SeedProgress.name == name,
                            SeedProgress.status == "done",
                        )
                    )
                    if not already.scalar_one_or_none():
                        try:
                            poke_data = await fetch_endpoint(client, "pokemon", name)
                            await cache_svc.save_pokemon(session, poke_data)
                            session.add(SeedProgress(entity="pokemon", name=name, status="done"))
                            await session.commit()
                        except Exception as e:
                            await session.rollback()
                            state["errors"].append(f"pokemon/{name}: {e}")
                            await _write_state(state)
                            continue
                    else:
                        poke_data = await cache_svc.get_pokemon(session, name)

                    if poke_data:
                        for a in poke_data.get("abilities", []):
                            all_abilities.add(a["ability"]["name"])
                        for m in poke_data.get("moves", []):
                            all_moves.add(m["move"]["name"])

                    # Species + Evolution Chain
                    already_species = await session.execute(
                        select(SeedProgress).where(
                            SeedProgress.entity == "species",
                            SeedProgress.name == name,
                            SeedProgress.status == "done",
                        )
                    )
                    if not already_species.scalar_one_or_none():
                        try:
                            species_data = await fetch_endpoint(client, "pokemon-species", name)
                            await cache_svc.save_species(session, species_data)
                            session.add(SeedProgress(entity="species", name=name, status="done"))

                            chain_url = species_data["evolution_chain"]["url"]
                            chain_id = int(chain_url.rstrip("/").split("/")[-1])
                            already_chain = await session.execute(
                                select(SeedProgress).where(
                                    SeedProgress.entity == "evolution_chain",
                                    SeedProgress.name == str(chain_id),
                                    SeedProgress.status == "done",
                                )
                            )
                            if not already_chain.scalar_one_or_none():
                                chain_data = await fetch(client, chain_url)
                                await cache_svc.save_evolution_chain(session, chain_data)
                                session.add(SeedProgress(entity="evolution_chain", name=str(chain_id), status="done"))

                            await session.commit()
                        except Exception as e:
                            await session.rollback()
                            state["errors"].append(f"species/{name}: {e}")
                            await _write_state(state)

            # ── 3. Abilities ──
            state["current_step"] = f"Loading {len(all_abilities)} abilities …"
            await _write_state(state)
            async with AsyncSessionLocal() as session:
                for ab_name in sorted(all_abilities):
                    if await is_cancelled():
                        break
                    already = await session.execute(
                        select(SeedProgress).where(
                            SeedProgress.entity == "ability",
                            SeedProgress.name == ab_name,
                            SeedProgress.status == "done",
                        )
                    )
                    if already.scalar_one_or_none():
                        continue
                    try:
                        data = await fetch_endpoint(client, "ability", ab_name)
                        await cache_svc.save_ability(session, data)
                        session.add(SeedProgress(entity="ability", name=ab_name, status="done"))
                        await session.commit()
                    except Exception as e:
                        await session.rollback()
                        state["errors"].append(f"ability/{ab_name}: {e}")
                        await _write_state(state)

            # ── 4. Moves (optional) ──
            if not skip_moves:
                state["current_step"] = f"Loading {len(all_moves)} moves …"
                await _write_state(state)
                async with AsyncSessionLocal() as session:
                    for move_name in sorted(all_moves):
                        if await is_cancelled():
                            break
                        already = await session.execute(
                            select(SeedProgress).where(
                                SeedProgress.entity == "move",
                                SeedProgress.name == move_name,
                                SeedProgress.status == "done",
                            )
                        )
                        if already.scalar_one_or_none():
                            continue
                        try:
                            data = await fetch_endpoint(client, "move", move_name)
                            await cache_svc.save_move(session, data)
                            session.add(SeedProgress(entity="move", name=move_name, status="done"))
                            await session.commit()
                        except Exception as e:
                            await session.rollback()
                            state["errors"].append(f"move/{move_name}: {e}")
                            await _write_state(state)

            current = await _read_state()
            if current.get("status") == "running":
                state["status"] = "done"
                state["current_step"] = "Completed"
                await _write_state(state)

        except Exception as e:
            state["status"] = "error"
            state["current_step"] = f"Fatal error: {e}"
            state["errors"].append(str(e))
            await _write_state(state)

        finally:
            state["finished_at"] = datetime.now().isoformat()
            await _write_state(state)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/seed",
    summary="Start database seed",
    description="""
Loads Pokémon data from the PokéAPI into PostgreSQL in the background.

- Already cached entries are **skipped automatically** (idempotent)
- Check progress with `GET /admin/seed/status`
- Cancel with `DELETE /admin/seed`

Requires `X-Admin-Secret` header.
    """,
)
async def start_seed(
    body: SeedRequest,
    background_tasks: BackgroundTasks,
    x_admin_secret: str = Header(..., description="Admin secret from .env"),
):
    require_secret(x_admin_secret)

    current = await _read_state()
    if current.get("status") == "running":
        raise HTTPException(status_code=409, detail="Seed already running")

    await _write_state({**_DEFAULT_STATE, "status": "running", "started_at": datetime.now().isoformat(), "errors": []})

    background_tasks.add_task(
        run_seed,
        limit=body.limit,
        offset=body.offset,
        skip_moves=body.skip_moves,
    )

    return {
        "message": "Seed started in background",
        "config": body.model_dump(),
        "status_url": "/admin/seed/status",
    }


@router.get(
    "/seed/status",
    response_model=SeedStatusResponse,
    summary="Get seed status",
    description="Returns the current status of the seed task.",
)
async def get_seed_status(
    x_admin_secret: str = Header(..., description="Admin secret from .env"),
):
    require_secret(x_admin_secret)

    state = await _read_state()
    return SeedStatusResponse(
        status=state.get("status", "idle"),
        started_at=state.get("started_at"),
        finished_at=state.get("finished_at"),
        current_step=state.get("current_step", ""),
        progress=state.get("progress", 0),
        total=state.get("total", 0),
        errors=state.get("errors", [])[-20:],
    )


@router.delete(
    "/seed",
    summary="Cancel running seed",
    description="Stops the seed after the current Pokémon finishes. Already cached data is kept.",
)
async def cancel_seed(
    x_admin_secret: str = Header(..., description="Admin secret from .env"),
):
    require_secret(x_admin_secret)

    current = await _read_state()
    if current.get("status") != "running":
        raise HTTPException(status_code=409, detail="No seed is currently running")

    await _write_state({**current, "status": "cancelled", "finished_at": datetime.now().isoformat(), "current_step": "Cancelled by user"})

    return {"message": "Seed cancelled. Already cached data is preserved."}


@router.delete(
    "/cache",
    summary="Flush Redis pokemon cache",
    description="Deletes all Pokémon keys from Redis. Call this after re-seeding.",
)
async def flush_cache(
    x_admin_secret: str = Header(..., description="Admin secret from .env"),
):
    require_secret(x_admin_secret)

    from app.services.redis import flush_pokemon_cache
    deleted = await flush_pokemon_cache()
    return {"message": f"Flushed {deleted} Redis keys"}