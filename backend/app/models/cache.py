"""
Wir speichern die API-Antworten als JSONB in PostgreSQL.
Das ist die einfachste Lösung um 1:1 Kompatibilität mit der PokéAPI zu garantieren —
kein kompliziertes ORM-Mapping, einfach den Response cachen und zurückgeben.
"""
from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from app.db.base import Base


class CachedPokemon(Base):
    """Gecachter /pokemon/{id} Response"""
    __tablename__ = "cached_pokemon"

    id       = Column(Integer, primary_key=True)   # Pokémon ID
    name     = Column(String, unique=True, index=True)
    data     = Column(JSONB, nullable=False)        # vollständiger API-Response


class CachedSpecies(Base):
    """Gecachter /pokemon-species/{id} Response"""
    __tablename__ = "cached_species"

    id       = Column(Integer, primary_key=True)
    name     = Column(String, unique=True, index=True)
    data     = Column(JSONB, nullable=False)


class CachedEvolutionChain(Base):
    """Gecachter /evolution-chain/{id} Response"""
    __tablename__ = "cached_evolution_chain"

    id       = Column(Integer, primary_key=True)
    data     = Column(JSONB, nullable=False)


class CachedType(Base):
    """Gecachter /type/{name} Response"""
    __tablename__ = "cached_type"

    id       = Column(Integer, primary_key=True)
    name     = Column(String, unique=True, index=True)
    data     = Column(JSONB, nullable=False)


class CachedAbility(Base):
    """Gecachter /ability/{name} Response"""
    __tablename__ = "cached_ability"

    id       = Column(Integer, primary_key=True)
    name     = Column(String, unique=True, index=True)
    data     = Column(JSONB, nullable=False)


class CachedMove(Base):
    """Gecachter /move/{name} Response"""
    __tablename__ = "cached_move"

    id       = Column(Integer, primary_key=True)
    name     = Column(String, unique=True, index=True)
    data     = Column(JSONB, nullable=False)


class CachedGeneration(Base):
    """Gecachter /generation/{id} Response"""
    __tablename__ = "cached_generation"

    id       = Column(Integer, primary_key=True)
    name     = Column(String, unique=True, index=True)
    data     = Column(JSONB, nullable=False)


class CachedItem(Base):
    """Gecachter /item/{name} Response"""
    __tablename__ = "cached_item"

    id       = Column(Integer, primary_key=True)
    name     = Column(String, unique=True, index=True)
    data     = Column(JSONB, nullable=False)


class SeedProgress(Base):
    """Verfolgt welche Pokémon bereits geseedet wurden"""
    __tablename__ = "seed_progress"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    entity     = Column(String, nullable=False)   # z.B. "pokemon", "species"
    name       = Column(String, nullable=False)
    status     = Column(String, default="done")   # done | error
    error_msg  = Column(Text, nullable=True)