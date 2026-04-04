"""
Gemeinsame Fixtures für alle Backend-Tests.

Strategie:
- Keine echte DB, kein echtes Redis nötig.
- AsyncSession wird via AsyncMock gemockt.
- Redis-Abhängigkeit wird per FastAPI dependency_overrides neutralisiert.
"""
import os
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

# Dummy-DB-URL setzen BEVOR app.main importiert wird,
# damit SQLAlchemy keinen echten Engine baut.
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379")

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app                   # noqa: E402
from app.db.session import get_session     # noqa: E402
from app.services import redis as redis_svc  # noqa: E402


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_session():
    """Gemockte AsyncSession — gibt konfigurierbare scalars/execute zurück."""
    session = AsyncMock()
    return session


@pytest.fixture
def client(mock_session):
    """
    FastAPI TestClient mit überschriebener DB-Session und deaktiviertem Redis.
    Redis get() gibt immer None zurück (Cache-Miss), set/delete sind no-ops.
    """
    async def override_get_session():
        yield mock_session

    app.dependency_overrides[get_session] = override_get_session

    # Redis immer als Cache-Miss simulieren
    with patch.object(redis_svc, "get", new=AsyncMock(return_value=None)), \
         patch.object(redis_svc, "set", new=AsyncMock()), \
         patch.object(redis_svc, "delete", new=AsyncMock()):
        yield TestClient(app)

    app.dependency_overrides.clear()


# ── Hilfsfunktionen für Mock-Rückgaben ───────────────────────────────────────

def make_execute_result(scalar_value):
    """
    Erstellt ein execute()-Ergebnis, das bei scalar_one_or_none() den
    übergebenen Wert zurückgibt.
    """
    result = MagicMock()
    result.scalar_one_or_none.return_value = scalar_value
    result.scalar.return_value = scalar_value
    result.scalars.return_value.all.return_value = (
        scalar_value if isinstance(scalar_value, list) else
        [scalar_value] if scalar_value is not None else []
    )
    return result


def make_row(data: dict):
    """Erstellt ein CachedXxx-ähnliches Objekt mit .data-Attribut."""
    row = MagicMock()
    row.data = data
    return row
