"""
HTTP-Client für die offizielle PokéAPI.
Wird nur beim Seeden verwendet.
"""
import httpx
import asyncio
from typing import Any

POKEAPI_BASE = "https://pokeapi.co/api/v2"
TIMEOUT = 30.0
MAX_RETRIES = 3


async def fetch(client: httpx.AsyncClient, url: str, retries: int = MAX_RETRIES) -> Any:
    """Fetch mit automatischem Retry bei Rate-Limiting"""
    for attempt in range(retries):
        try:
            resp = await client.get(url, timeout=TIMEOUT)
            if resp.status_code == 429:
                wait = int(resp.headers.get("Retry-After", 60))
                print(f"  ⏳ Rate limited, warte {wait}s …")
                await asyncio.sleep(wait)
                continue
            resp.raise_for_status()
            return resp.json()
        except httpx.TimeoutException:
            if attempt < retries - 1:
                await asyncio.sleep(2 ** attempt)
                continue
            raise
    raise RuntimeError(f"Failed after {retries} retries: {url}")


async def fetch_endpoint(client: httpx.AsyncClient, endpoint: str, slug: str) -> Any:
    return await fetch(client, f"{POKEAPI_BASE}/{endpoint}/{slug}")


async def fetch_list(
    client: httpx.AsyncClient,
    endpoint: str,
    limit: int = 10000,
    offset: int = 0,
) -> Any:
    return await fetch(client, f"{POKEAPI_BASE}/{endpoint}?limit={limit}&offset={offset}")