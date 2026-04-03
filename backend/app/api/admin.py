"""
Admin Router — Seed-Endpoints für Swagger.

Schutz: ADMIN_SECRET Header (gesetzt in .env)

POST /admin/seed        → startet Seed im Hintergrund
GET  /admin/seed/status → zeigt aktuellen Status
DELETE /admin/seed      → bricht laufenden Seed ab
"""
import asyncio
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

# ── In-Memory Seed State ──────────────────────────────────────────────────────

class SeedState:
    status: Literal["idle", "running", "done", "error"] = "idle"
    started_at: datetime | None = None
    finished_at: datetime | None = None
    current_step: str = ""
    progress: int = 0          # Anzahl verarbeiteter Pokémon
    total: int = 0
    errors: list[str] = []
    task: asyncio.Task | None = None

    def reset(self):
        self.status = "idle"
        self.started_at = None
        self.finished_at = None
        self.current_step = ""
        self.progress = 0
        self.total = 0
        self.errors = []
        self.task = None


seed_state = SeedState()


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
    """Läuft als asyncio Background Task"""
    state = seed_state
    state.status = "running"
    state.started_at = datetime.now()
    state.errors = []

    async with httpx.AsyncClient() as client:
        try:
            # ── 1. Typen ──
            state.current_step = "Loading types …"
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
                        state.errors.append(f"type/{name}: {e}")

            # ── 2. Pokémon ──
            pokemon_list = await fetch_list(client, "pokemon", limit=limit, offset=offset)
            state.total = len(pokemon_list["results"])
            all_abilities: set[str] = set()
            all_moves: set[str] = set()

            for i, item in enumerate(pokemon_list["results"]):
                if state.status != "running":
                    break  # Abbruch durch DELETE-Endpoint

                name = item["name"]
                state.current_step = f"Pokémon {i + 1}/{state.total}: {name}"
                state.progress = i + 1

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
                            state.errors.append(f"pokemon/{name}: {e}")
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
                            state.errors.append(f"species/{name}: {e}")

            # ── 3. Abilities ──
            state.current_step = f"Loading {len(all_abilities)} abilities …"
            async with AsyncSessionLocal() as session:
                for ab_name in sorted(all_abilities):
                    if state.status != "running":
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
                        state.errors.append(f"ability/{ab_name}: {e}")

            # ── 4. Moves (optional) ──
            if not skip_moves:
                state.current_step = f"Loading {len(all_moves)} moves …"
                async with AsyncSessionLocal() as session:
                    for move_name in sorted(all_moves):
                        if state.status != "running":
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
                            state.errors.append(f"move/{move_name}: {e}")

            if state.status == "running":
                state.status = "done"
                state.current_step = "Completed"

        except Exception as e:
            state.status = "error"
            state.current_step = f"Fatal error: {e}"
            state.errors.append(str(e))

        finally:
            state.finished_at = datetime.now()


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

    if seed_state.status == "running":
        raise HTTPException(status_code=409, detail="Seed already running")

    seed_state.reset()
    seed_state.status = "running"
    seed_state.started_at = datetime.now()

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

    return SeedStatusResponse(
        status=seed_state.status,
        started_at=seed_state.started_at,
        finished_at=seed_state.finished_at,
        current_step=seed_state.current_step,
        progress=seed_state.progress,
        total=seed_state.total,
        errors=seed_state.errors[-20:],  # max 20 letzte Fehler
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

    if seed_state.status != "running":
        raise HTTPException(status_code=409, detail="No seed is currently running")

    seed_state.status = "cancelled"
    seed_state.finished_at = datetime.now()
    seed_state.current_step = "Cancelled by user"

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