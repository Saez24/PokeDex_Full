"""
Integrationstests für alle API-Endpoints in app/api/pokemon.py.

- Echter FastAPI-Router, echter JSON-Parsing-Stack.
- DB-Session und Redis werden per dependency_overrides / patch gemockt.
- Kein PostgreSQL, kein Redis nötig.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services import redis as redis_svc


# ── Hilfsfunktionen ───────────────────────────────────────────────────────────

def _make_row(data: dict):
    row = MagicMock()
    row.data = data
    return row


def _session_one(data):
    """Session die bei scalar_one_or_none() data zurückgibt."""
    session = AsyncMock()
    r = MagicMock()
    r.scalar_one_or_none.return_value = _make_row(data) if data else None
    r.scalar.return_value = 1 if data else 0
    r.scalars.return_value.all.return_value = [_make_row(data)] if data else []
    session.execute = AsyncMock(return_value=r)
    return session


def _session_list(rows: list, count: int = None):
    """Session die bei scalars().all() eine Liste zurückgibt."""
    if count is None:
        count = len(rows)
    session = AsyncMock()

    # execute() wird mehrfach aufgerufen (count + list)
    count_result = MagicMock()
    count_result.scalar.return_value = count
    count_result.scalar_one_or_none.return_value = None

    list_result = MagicMock()
    list_result.scalars.return_value.all.return_value = [_make_row(r) for r in rows]
    list_result.scalar.return_value = count

    session.execute = AsyncMock(side_effect=[count_result, list_result])
    return session


# ── Pokémon List ──────────────────────────────────────────────────────────────

class TestListPokemon:
    def test_returns_list(self, client, mock_session):
        rows = [{"id": 1, "name": "bulbasaur"}, {"id": 4, "name": "charmander"}]
        count_r = MagicMock()
        count_r.scalar.return_value = 2
        list_r = MagicMock()
        list_r.scalars.return_value.all.return_value = [_make_row(r) for r in rows]
        mock_session.execute = AsyncMock(side_effect=[count_r, list_r])

        resp = client.get("/api/v2/pokemon")
        assert resp.status_code == 200
        body = resp.json()
        assert body["count"] == 2
        assert len(body["results"]) == 2
        assert body["results"][0]["name"] == "bulbasaur"

    def test_next_link_present_when_more(self, client, mock_session):
        rows = [{"id": i, "name": f"p{i}"} for i in range(1, 21)]
        count_r = MagicMock()
        count_r.scalar.return_value = 100
        list_r = MagicMock()
        list_r.scalars.return_value.all.return_value = [_make_row(r) for r in rows]
        mock_session.execute = AsyncMock(side_effect=[count_r, list_r])

        resp = client.get("/api/v2/pokemon?limit=20&offset=0")
        assert resp.status_code == 200
        assert resp.json()["next"] is not None

    def test_no_next_link_at_end(self, client, mock_session):
        rows = [{"id": 1, "name": "bulbasaur"}]
        count_r = MagicMock()
        count_r.scalar.return_value = 1
        list_r = MagicMock()
        list_r.scalars.return_value.all.return_value = [_make_row(r) for r in rows]
        mock_session.execute = AsyncMock(side_effect=[count_r, list_r])

        resp = client.get("/api/v2/pokemon?limit=20&offset=0")
        assert resp.json()["next"] is None


# ── Pokémon Detail ─────────────────────────────────────────────────────────────

class TestGetPokemon:
    def test_found_by_name(self, client, mock_session):
        data = {"id": 1, "name": "bulbasaur", "types": []}
        r = MagicMock()
        r.scalar_one_or_none.return_value = _make_row(data)
        mock_session.execute = AsyncMock(return_value=r)

        resp = client.get("/api/v2/pokemon/bulbasaur")
        assert resp.status_code == 200
        assert resp.json()["name"] == "bulbasaur"

    def test_not_found_returns_404(self, client, mock_session):
        r = MagicMock()
        r.scalar_one_or_none.return_value = None
        mock_session.execute = AsyncMock(return_value=r)

        resp = client.get("/api/v2/pokemon/doesnotexist")
        assert resp.status_code == 404


# ── Pokémon Compare ───────────────────────────────────────────────────────────

class TestComparePokemon:
    def test_returns_multiple(self, client, mock_session):
        bulbasaur = {"id": 1, "name": "bulbasaur"}
        charmander = {"id": 4, "name": "charmander"}

        r1 = MagicMock()
        r1.scalar_one_or_none.return_value = _make_row(bulbasaur)
        r2 = MagicMock()
        r2.scalar_one_or_none.return_value = _make_row(charmander)
        mock_session.execute = AsyncMock(side_effect=[r1, r2])

        resp = client.get("/api/v2/pokemon/compare?ids=1,4")
        assert resp.status_code == 200
        body = resp.json()
        assert body["count"] == 2
        assert len(body["results"]) == 2

    def test_not_found_in_not_found_list(self, client, mock_session):
        r = MagicMock()
        r.scalar_one_or_none.return_value = None
        mock_session.execute = AsyncMock(return_value=r)

        resp = client.get("/api/v2/pokemon/compare?ids=9999")
        assert resp.status_code == 200
        body = resp.json()
        assert body["count"] == 0
        assert "9999" in body["not_found"]

    def test_empty_ids_returns_422(self, client, mock_session):
        resp = client.get("/api/v2/pokemon/compare?ids=")
        assert resp.status_code == 422

    def test_max_4_results(self, client, mock_session):
        """Auch mit 6 IDs werden max. 4 abgefragt."""
        data = {"id": 1, "name": "bulbasaur"}
        r = MagicMock()
        r.scalar_one_or_none.return_value = _make_row(data)
        mock_session.execute = AsyncMock(return_value=r)

        resp = client.get("/api/v2/pokemon/compare?ids=1,2,3,4,5,6")
        assert resp.status_code == 200
        assert resp.json()["count"] <= 4


# ── Stats ─────────────────────────────────────────────────────────────────────

class TestStats:
    def test_returns_all_categories(self, client, mock_session):
        r = MagicMock()
        r.scalar.return_value = 42
        mock_session.execute = AsyncMock(return_value=r)

        resp = client.get("/api/v2/stats")
        assert resp.status_code == 200
        body = resp.json()
        for key in ("cached_pokemon", "cached_types", "cached_moves",
                    "cached_abilities", "cached_generations", "cached_items"):
            assert key in body


# ── Generation ────────────────────────────────────────────────────────────────

class TestGeneration:
    def test_list(self, client, mock_session):
        gens = [{"id": i, "name": f"generation-{i}"} for i in range(1, 4)]
        r = MagicMock()
        r.scalars.return_value.all.return_value = [_make_row(g) for g in gens]
        mock_session.execute = AsyncMock(return_value=r)

        resp = client.get("/api/v2/generation")
        assert resp.status_code == 200
        assert resp.json()["count"] == 3

    def test_detail_found(self, client, mock_session):
        data = {"id": 1, "name": "generation-i", "pokemon_species": []}
        r = MagicMock()
        r.scalar_one_or_none.return_value = _make_row(data)
        mock_session.execute = AsyncMock(return_value=r)

        resp = client.get("/api/v2/generation/1")
        assert resp.status_code == 200
        assert resp.json()["name"] == "generation-i"

    def test_detail_not_found(self, client, mock_session):
        r = MagicMock()
        r.scalar_one_or_none.return_value = None
        mock_session.execute = AsyncMock(return_value=r)

        resp = client.get("/api/v2/generation/999")
        assert resp.status_code == 404


# ── Item ──────────────────────────────────────────────────────────────────────

class TestItem:
    def test_list(self, client, mock_session):
        items = [{"id": 1, "name": "potion"}, {"id": 2, "name": "super-potion"}]
        count_r = MagicMock()
        count_r.scalar.return_value = 2
        list_r = MagicMock()
        list_r.scalars.return_value.all.return_value = [_make_row(it) for it in items]
        mock_session.execute = AsyncMock(side_effect=[count_r, list_r])

        resp = client.get("/api/v2/item")
        assert resp.status_code == 200
        body = resp.json()
        assert body["count"] == 2
        assert len(body["results"]) == 2

    def test_detail_found(self, client, mock_session):
        data = {"id": 1, "name": "potion", "cost": 300, "effect_entries": []}
        r = MagicMock()
        r.scalar_one_or_none.return_value = _make_row(data)
        mock_session.execute = AsyncMock(return_value=r)

        resp = client.get("/api/v2/item/potion")
        assert resp.status_code == 200
        assert resp.json()["name"] == "potion"

    def test_detail_not_found(self, client, mock_session):
        r = MagicMock()
        r.scalar_one_or_none.return_value = None
        mock_session.execute = AsyncMock(return_value=r)

        resp = client.get("/api/v2/item/nonexistent")
        assert resp.status_code == 404

    def test_pagination_next_link(self, client, mock_session):
        items = [{"id": i, "name": f"item-{i}"} for i in range(1, 21)]
        count_r = MagicMock()
        count_r.scalar.return_value = 500
        list_r = MagicMock()
        list_r.scalars.return_value.all.return_value = [_make_row(it) for it in items]
        mock_session.execute = AsyncMock(side_effect=[count_r, list_r])

        resp = client.get("/api/v2/item?limit=20&offset=0")
        assert resp.status_code == 200
        assert resp.json()["next"] is not None
