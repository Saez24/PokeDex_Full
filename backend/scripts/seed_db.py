"""
Seed-Script: Lädt alle Daten von der PokéAPI und speichert sie in PostgreSQL.

Ausführen: python -m scripts.seed_db
Optional:  python -m scripts.seed_db --limit 151  (nur Gen 1)
           python -m scripts.seed_db --offset 0 --limit 20  (nur erste Seite)

Das Script ist idempotent — bereits gecachte Einträge werden übersprungen.
"""
import asyncio
import argparse
import sys
import httpx
from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.cache import SeedProgress
from app.services.pokeapi import fetch, fetch_endpoint, fetch_list
from app.services import cache as cache_svc

# Parallelität — nicht zu hoch um Rate-Limits zu vermeiden
CONCURRENCY = 5


async def already_seeded(session, entity: str, name: str) -> bool:
    result = await session.execute(
        select(SeedProgress).where(
            SeedProgress.entity == entity,
            SeedProgress.name == name,
            SeedProgress.status == "done",
        )
    )
    return result.scalar_one_or_none() is not None


async def mark_done(session, entity: str, name: str):
    session.add(SeedProgress(entity=entity, name=name, status="done"))


async def mark_error(session, entity: str, name: str, error: str):
    session.add(SeedProgress(entity=entity, name=name, status="error", error_msg=error))


# ── Semaphore-gestützte Fetch-Funktion ────────────────────────────────────────

async def fetch_with_sem(sem: asyncio.Semaphore, client: httpx.AsyncClient, url: str):
    async with sem:
        return await fetch(client, url)


# ── Einzelne Seeder ───────────────────────────────────────────────────────────

async def seed_types(client: httpx.AsyncClient):
    print("\n📦 Lade Typen …")
    type_list = await fetch_list(client, "type")

    async with AsyncSessionLocal() as session:
        for item in type_list["results"]:
            name = item["name"]
            if await already_seeded(session, "type", name):
                print(f"  ✓ {name} (gecacht)")
                continue
            try:
                data = await fetch_endpoint(client, "type", name)
                await cache_svc.save_type(session, data)
                await mark_done(session, "type", name)
                await session.commit()
                print(f"  ✅ {name}")
            except Exception as e:
                await session.rollback()
                await mark_error(session, "type", name, str(e))
                await session.commit()
                print(f"  ❌ {name}: {e}")


async def seed_abilities(client: httpx.AsyncClient, ability_names: list[str]):
    print(f"\n📦 Lade {len(ability_names)} Abilities …")
    sem = asyncio.Semaphore(CONCURRENCY)

    async with AsyncSessionLocal() as session:
        for name in ability_names:
            if await already_seeded(session, "ability", name):
                continue
            try:
                async with sem:
                    data = await fetch_endpoint(client, "ability", name)
                await cache_svc.save_ability(session, data)
                await mark_done(session, "ability", name)
                await session.commit()
                print(f"  ✅ ability/{name}")
            except Exception as e:
                await session.rollback()
                await mark_error(session, "ability", name, str(e))
                await session.commit()
                print(f"  ❌ ability/{name}: {e}")


async def seed_moves(client: httpx.AsyncClient, move_names: list[str]):
    print(f"\n📦 Lade {len(move_names)} Moves …")
    sem = asyncio.Semaphore(CONCURRENCY)

    async with AsyncSessionLocal() as session:
        for name in move_names:
            if await already_seeded(session, "move", name):
                continue
            try:
                async with sem:
                    data = await fetch_endpoint(client, "move", name)
                await cache_svc.save_move(session, data)
                await mark_done(session, "move", name)
                await session.commit()
                print(f"  ✅ move/{name}")
            except Exception as e:
                await session.rollback()
                await mark_error(session, "move", name, str(e))
                await session.commit()
                print(f"  ❌ move/{name}: {e}")


async def seed_pokemon_and_species(
    client: httpx.AsyncClient,
    limit: int,
    offset: int,
) -> tuple[set[str], set[str]]:
    """
    Haupt-Seeder: Lädt Pokémon + Species + Evolution Chains.
    Gibt alle gefundenen Ability- und Move-Namen zurück.
    """
    print(f"\n📦 Lade Pokémon (limit={limit}, offset={offset}) …")

    pokemon_list = await fetch_list(client, "pokemon", limit=limit, offset=offset)
    all_abilities: set[str] = set()
    all_moves: set[str] = set()

    for item in pokemon_list["results"]:
        name = item["name"]

        async with AsyncSessionLocal() as session:
            # ── Pokemon ──
            if not await already_seeded(session, "pokemon", name):
                try:
                    poke_data = await fetch_endpoint(client, "pokemon", name)
                    await cache_svc.save_pokemon(session, poke_data)
                    await mark_done(session, "pokemon", name)
                    await session.commit()
                    print(f"  ✅ pokemon/{name}")
                except Exception as e:
                    await session.rollback()
                    await mark_error(session, "pokemon", name, str(e))
                    await session.commit()
                    print(f"  ❌ pokemon/{name}: {e}")
                    continue
            else:
                print(f"  ✓ pokemon/{name} (gecacht)")
                # Daten aus Cache lesen für Ability/Move-Sammlung
                poke_data = await cache_svc.get_pokemon(session, name)

            # Abilities + Moves sammeln
            if poke_data:
                for a in poke_data.get("abilities", []):
                    all_abilities.add(a["ability"]["name"])
                for m in poke_data.get("moves", []):
                    all_moves.add(m["move"]["name"])

            # ── Species ──
            if not await already_seeded(session, "species", name):
                try:
                    species_data = await fetch_endpoint(client, "pokemon-species", name)
                    await cache_svc.save_species(session, species_data)
                    await mark_done(session, "species", name)

                    # ── Evolution Chain ──
                    chain_url = species_data["evolution_chain"]["url"]
                    chain_id = int(chain_url.rstrip("/").split("/")[-1])

                    if not await already_seeded(session, "evolution_chain", str(chain_id)):
                        chain_data = await fetch(client, chain_url)
                        await cache_svc.save_evolution_chain(session, chain_data)
                        await mark_done(session, "evolution_chain", str(chain_id))

                    await session.commit()
                    print(f"  ✅ species/{name}")
                except Exception as e:
                    await session.rollback()
                    await mark_error(session, "species", name, str(e))
                    await session.commit()
                    print(f"  ❌ species/{name}: {e}")
            else:
                print(f"  ✓ species/{name} (gecacht)")

    return all_abilities, all_moves


# ── Main ──────────────────────────────────────────────────────────────────────

async def main(limit: int, offset: int, skip_moves: bool):
    print("🚀 Starte Seed …")
    print(f"   Pokémon: offset={offset}, limit={limit}")

    async with httpx.AsyncClient() as client:
        # 1. Typen
        await seed_types(client)

        # 2. Pokémon + Species + Evolution Chains
        all_abilities, all_moves = await seed_pokemon_and_species(client, limit, offset)

        # 3. Abilities
        await seed_abilities(client, sorted(all_abilities))

        # 4. Moves (optional überspringen — sehr viele!)
        if skip_moves:
            print(f"\n⏭️  Moves übersprungen ({len(all_moves)} gefunden)")
        else:
            await seed_moves(client, sorted(all_moves))

    print("\n✅ Seed abgeschlossen!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PokéAPI Seed Script")
    parser.add_argument("--limit",  type=int, default=151, help="Anzahl Pokémon (default: 151 = Gen 1)")
    parser.add_argument("--offset", type=int, default=0,   help="Start-Offset (default: 0)")
    parser.add_argument("--skip-moves", action="store_true", help="Moves nicht laden (spart Zeit)")
    args = parser.parse_args()

    asyncio.run(main(limit=args.limit, offset=args.offset, skip_moves=args.skip_moves))