"""
Cache-Service: Lese/Schreibe gecachte API-Responses aus PostgreSQL.
"""
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, and_
from sqlalchemy.dialects.postgresql import JSONB as PG_JSONB
from typing import Any

from app.models.cache import (
    CachedPokemon, CachedSpecies, CachedEvolutionChain,
    CachedType, CachedAbility, CachedMove,
    CachedGeneration, CachedItem,
)

# Pokédex-Generations-Ranges (National-Dex-IDs)
GEN_RANGES: dict[int, tuple[int, int]] = {
    1: (1, 151),
    2: (152, 251),
    3: (252, 386),
    4: (387, 493),
    5: (494, 649),
    6: (650, 721),
    7: (722, 809),
    8: (810, 905),
    9: (906, 1025),
}


# ── Pokemon ──────────────────────────────────────────────────────────────────

async def get_pokemon(session: AsyncSession, name_or_id: str) -> dict | None:
    try:
        id_ = int(name_or_id)
        result = await session.execute(select(CachedPokemon).where(CachedPokemon.id == id_))
    except ValueError:
        result = await session.execute(select(CachedPokemon).where(CachedPokemon.name == name_or_id))
    row = result.scalar_one_or_none()
    return row.data if row else None


async def save_pokemon(session: AsyncSession, data: dict) -> None:
    existing = await session.execute(
        select(CachedPokemon).where(CachedPokemon.id == data["id"])
    )
    obj = existing.scalar_one_or_none()
    if obj:
        obj.data = data
    else:
        session.add(CachedPokemon(id=data["id"], name=data["name"], data=data))


async def list_pokemon(session: AsyncSession, limit: int, offset: int) -> list[dict]:
    result = await session.execute(
        select(CachedPokemon).order_by(CachedPokemon.id).offset(offset).limit(limit)
    )
    return [row.data for row in result.scalars().all()]


async def count_pokemon(session: AsyncSession) -> int:
    result = await session.execute(select(func.count()).select_from(CachedPokemon))
    return result.scalar()


async def filter_pokemon(
    session: AsyncSession,
    limit: int,
    offset: int,
    type_name: str | None = None,
    generation: int | None = None,
) -> tuple[list[dict], int]:
    """Filtert die gecachten Pokémon nach Typ und/oder Generation."""
    conditions = []

    if type_name:
        # JSONB-Containment: data->'types' @> '[{"type":{"name":"water"}}]'
        type_json = json.dumps([{"type": {"name": type_name}}])
        conditions.append(
            CachedPokemon.data["types"].op("@>")(cast(type_json, PG_JSONB))
        )

    if generation and generation in GEN_RANGES:
        lo, hi = GEN_RANGES[generation]
        conditions.append(CachedPokemon.id.between(lo, hi))

    base_q = select(CachedPokemon)
    count_q = select(func.count()).select_from(CachedPokemon)
    if conditions:
        where = and_(*conditions)
        base_q = base_q.where(where)
        count_q = count_q.where(where)

    total = (await session.execute(count_q)).scalar()
    rows = (await session.execute(
        base_q.order_by(CachedPokemon.id).offset(offset).limit(limit)
    )).scalars().all()
    return [r.data for r in rows], total


async def get_stats(session: AsyncSession) -> dict:
    """Gibt die Anzahl gecachter Einträge pro Kategorie zurück."""
    pokemon = (await session.execute(select(func.count()).select_from(CachedPokemon))).scalar()
    types   = (await session.execute(select(func.count()).select_from(CachedType))).scalar()
    moves   = (await session.execute(select(func.count()).select_from(CachedMove))).scalar()
    abilities = (await session.execute(select(func.count()).select_from(CachedAbility))).scalar()
    return {
        "cached_pokemon": pokemon,
        "cached_types": types,
        "cached_moves": moves,
        "cached_abilities": abilities,
        "cached_generations": (await session.execute(select(func.count()).select_from(CachedGeneration))).scalar(),
        "cached_items": (await session.execute(select(func.count()).select_from(CachedItem))).scalar(),
    }


# ── Species ──────────────────────────────────────────────────────────────────

async def get_species(session: AsyncSession, name_or_id: str) -> dict | None:
    try:
        id_ = int(name_or_id)
        result = await session.execute(select(CachedSpecies).where(CachedSpecies.id == id_))
    except ValueError:
        result = await session.execute(select(CachedSpecies).where(CachedSpecies.name == name_or_id))
    row = result.scalar_one_or_none()
    return row.data if row else None


async def save_species(session: AsyncSession, data: dict) -> None:
    existing = await session.execute(
        select(CachedSpecies).where(CachedSpecies.id == data["id"])
    )
    obj = existing.scalar_one_or_none()
    if obj:
        obj.data = data
    else:
        session.add(CachedSpecies(id=data["id"], name=data["name"], data=data))


# ── Evolution Chain ───────────────────────────────────────────────────────────

async def get_evolution_chain(session: AsyncSession, id_: int) -> dict | None:
    result = await session.execute(
        select(CachedEvolutionChain).where(CachedEvolutionChain.id == id_)
    )
    row = result.scalar_one_or_none()
    return row.data if row else None


async def save_evolution_chain(session: AsyncSession, data: dict) -> None:
    existing = await session.execute(
        select(CachedEvolutionChain).where(CachedEvolutionChain.id == data["id"])
    )
    obj = existing.scalar_one_or_none()
    if obj:
        obj.data = data
    else:
        session.add(CachedEvolutionChain(id=data["id"], data=data))


# ── Type ─────────────────────────────────────────────────────────────────────

async def get_type(session: AsyncSession, name_or_id: str) -> dict | None:
    try:
        id_ = int(name_or_id)
        result = await session.execute(select(CachedType).where(CachedType.id == id_))
    except ValueError:
        result = await session.execute(select(CachedType).where(CachedType.name == name_or_id))
    row = result.scalar_one_or_none()
    return row.data if row else None


async def save_type(session: AsyncSession, data: dict) -> None:
    existing = await session.execute(
        select(CachedType).where(CachedType.id == data["id"])
    )
    obj = existing.scalar_one_or_none()
    if obj:
        obj.data = data
    else:
        session.add(CachedType(id=data["id"], name=data["name"], data=data))


async def list_types(session: AsyncSession) -> list[dict]:
    result = await session.execute(select(CachedType).order_by(CachedType.id))
    return [row.data for row in result.scalars().all()]


# ── Ability ──────────────────────────────────────────────────────────────────

async def get_ability(session: AsyncSession, name_or_id: str) -> dict | None:
    try:
        id_ = int(name_or_id)
        result = await session.execute(select(CachedAbility).where(CachedAbility.id == id_))
    except ValueError:
        result = await session.execute(select(CachedAbility).where(CachedAbility.name == name_or_id))
    row = result.scalar_one_or_none()
    return row.data if row else None


async def save_ability(session: AsyncSession, data: dict) -> None:
    existing = await session.execute(
        select(CachedAbility).where(CachedAbility.id == data["id"])
    )
    obj = existing.scalar_one_or_none()
    if obj:
        obj.data = data
    else:
        session.add(CachedAbility(id=data["id"], name=data["name"], data=data))


# ── Move ─────────────────────────────────────────────────────────────────────

async def get_move(session: AsyncSession, name_or_id: str) -> dict | None:
    try:
        id_ = int(name_or_id)
        result = await session.execute(select(CachedMove).where(CachedMove.id == id_))
    except ValueError:
        result = await session.execute(select(CachedMove).where(CachedMove.name == name_or_id))
    row = result.scalar_one_or_none()
    return row.data if row else None


async def save_move(session: AsyncSession, data: dict) -> None:
    existing = await session.execute(
        select(CachedMove).where(CachedMove.id == data["id"])
    )
    obj = existing.scalar_one_or_none()
    if obj:
        obj.data = data
    else:
        session.add(CachedMove(id=data["id"], name=data["name"], data=data))


# ── Generation ───────────────────────────────────────────────────────────────

async def get_generation(session: AsyncSession, id_or_name: str) -> dict | None:
    try:
        id_ = int(id_or_name)
        result = await session.execute(select(CachedGeneration).where(CachedGeneration.id == id_))
    except ValueError:
        result = await session.execute(select(CachedGeneration).where(CachedGeneration.name == id_or_name))
    row = result.scalar_one_or_none()
    return row.data if row else None


async def save_generation(session: AsyncSession, data: dict) -> None:
    existing = await session.execute(
        select(CachedGeneration).where(CachedGeneration.id == data["id"])
    )
    obj = existing.scalar_one_or_none()
    if obj:
        obj.data = data
    else:
        session.add(CachedGeneration(id=data["id"], name=data["name"], data=data))


async def list_generations(session: AsyncSession) -> list[dict]:
    result = await session.execute(select(CachedGeneration).order_by(CachedGeneration.id))
    return [row.data for row in result.scalars().all()]


# ── Item ─────────────────────────────────────────────────────────────────────

async def get_item(session: AsyncSession, name_or_id: str) -> dict | None:
    try:
        id_ = int(name_or_id)
        result = await session.execute(select(CachedItem).where(CachedItem.id == id_))
    except ValueError:
        result = await session.execute(select(CachedItem).where(CachedItem.name == name_or_id))
    row = result.scalar_one_or_none()
    return row.data if row else None


async def save_item(session: AsyncSession, data: dict) -> None:
    existing = await session.execute(
        select(CachedItem).where(CachedItem.id == data["id"])
    )
    obj = existing.scalar_one_or_none()
    if obj:
        obj.data = data
    else:
        session.add(CachedItem(id=data["id"], name=data["name"], data=data))


async def list_items(
    session: AsyncSession, limit: int, offset: int
) -> tuple[list[dict], int]:
    total = (await session.execute(select(func.count()).select_from(CachedItem))).scalar()
    rows = (await session.execute(
        select(CachedItem).order_by(CachedItem.id).offset(offset).limit(limit)
    )).scalars().all()
    return [r.data for r in rows], total