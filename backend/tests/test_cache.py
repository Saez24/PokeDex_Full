"""
Unit-Tests für app/services/cache.py.

Alle DB-Queries werden via AsyncMock abgefangen — kein PostgreSQL nötig.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services import cache as cache_svc


# ── Hilfsfunktionen ───────────────────────────────────────────────────────────

def _make_row(data: dict):
    row = MagicMock()
    row.data = data
    return row


def _session_returning(scalar_value):
    """Session, deren execute() ein Ergebnis mit scalar_one_or_none zurückgibt."""
    session = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = scalar_value
    result.scalar.return_value = scalar_value if not isinstance(scalar_value, list) else len(scalar_value)
    result.scalars.return_value.all.return_value = (
        scalar_value if isinstance(scalar_value, list) else
        ([scalar_value] if scalar_value else [])
    )
    session.execute = AsyncMock(return_value=result)
    return session


# ── Pokemon ───────────────────────────────────────────────────────────────────

class TestGetPokemon:
    async def test_found_by_name(self):
        data = {"id": 1, "name": "bulbasaur"}
        session = _session_returning(_make_row(data))
        result = await cache_svc.get_pokemon(session, "bulbasaur")
        assert result == data

    async def test_found_by_id(self):
        data = {"id": 25, "name": "pikachu"}
        session = _session_returning(_make_row(data))
        result = await cache_svc.get_pokemon(session, "25")
        assert result == data

    async def test_not_found(self):
        session = _session_returning(None)
        result = await cache_svc.get_pokemon(session, "unknown")
        assert result is None


class TestCountPokemon:
    async def test_returns_count(self):
        session = _session_returning(151)
        count = await cache_svc.count_pokemon(session)
        assert count == 151


class TestFilterPokemon:
    async def test_no_filters(self):
        rows = [_make_row({"id": i, "name": f"p{i}"}) for i in range(1, 4)]
        session = AsyncMock()

        count_result = MagicMock()
        count_result.scalar.return_value = 3

        list_result = MagicMock()
        list_result.scalars.return_value.all.return_value = rows

        session.execute = AsyncMock(side_effect=[count_result, list_result])

        items, total = await cache_svc.filter_pokemon(session, limit=20, offset=0)
        assert total == 3
        assert len(items) == 3

    async def test_unknown_generation_ignored(self):
        """Generation 99 existiert nicht — GEN_RANGES hat keinen Eintrag → kein Filter."""
        rows = [_make_row({"id": 1, "name": "bulbasaur"})]
        session = AsyncMock()

        count_result = MagicMock()
        count_result.scalar.return_value = 1

        list_result = MagicMock()
        list_result.scalars.return_value.all.return_value = rows

        session.execute = AsyncMock(side_effect=[count_result, list_result])

        items, total = await cache_svc.filter_pokemon(
            session, limit=20, offset=0, generation=99
        )
        assert total == 1


# ── Generation ────────────────────────────────────────────────────────────────

class TestGetGeneration:
    async def test_found_by_name(self):
        data = {"id": 1, "name": "generation-i"}
        session = _session_returning(_make_row(data))
        result = await cache_svc.get_generation(session, "generation-i")
        assert result == data

    async def test_found_by_id(self):
        data = {"id": 1, "name": "generation-i"}
        session = _session_returning(_make_row(data))
        result = await cache_svc.get_generation(session, "1")
        assert result == data

    async def test_not_found(self):
        session = _session_returning(None)
        result = await cache_svc.get_generation(session, "999")
        assert result is None


class TestListGenerations:
    async def test_returns_all(self):
        rows = [_make_row({"id": i, "name": f"generation-{i}"}) for i in range(1, 10)]
        result = MagicMock()
        result.scalars.return_value.all.return_value = rows
        session = AsyncMock()
        session.execute = AsyncMock(return_value=result)
        items = await cache_svc.list_generations(session)
        assert len(items) == 9


# ── Item ──────────────────────────────────────────────────────────────────────

class TestGetItem:
    async def test_found_by_name(self):
        data = {"id": 1, "name": "potion"}
        session = _session_returning(_make_row(data))
        result = await cache_svc.get_item(session, "potion")
        assert result == data

    async def test_not_found(self):
        session = _session_returning(None)
        result = await cache_svc.get_item(session, "nonexistent-item")
        assert result is None


# ── Stats ─────────────────────────────────────────────────────────────────────

class TestGetStats:
    async def test_returns_all_keys(self):
        session = AsyncMock()
        count_result = MagicMock()
        count_result.scalar.return_value = 10
        session.execute = AsyncMock(return_value=count_result)

        stats = await cache_svc.get_stats(session)
        assert "cached_pokemon" in stats
        assert "cached_types" in stats
        assert "cached_moves" in stats
        assert "cached_abilities" in stats
        assert "cached_generations" in stats
        assert "cached_items" in stats
