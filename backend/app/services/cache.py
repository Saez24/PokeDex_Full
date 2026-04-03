"""
Cache-Service: Lese/Schreibe gecachte API-Responses aus PostgreSQL.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Any

from app.models.cache import (
    CachedPokemon, CachedSpecies, CachedEvolutionChain,
    CachedType, CachedAbility, CachedMove,
)


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
    from sqlalchemy import func
    result = await session.execute(select(func.count()).select_from(CachedPokemon))
    return result.scalar()


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