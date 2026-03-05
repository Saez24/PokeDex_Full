from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from app.api.pokemon import router
from app.models import cache

load_dotenv()

app = FastAPI(
    title="Pokédex API",
    description="Caching-Proxy für die PokéAPI — 100% kompatibles JSON-Format",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv("ALLOWED_HOSTS", "http://localhost:4200").split(",")
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(router, prefix="/api/v2")


@app.get("/health")
async def health():
    return {"status": "ok"}