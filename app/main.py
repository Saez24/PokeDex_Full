from fastapi import FastAPI
from app.db.session import engine
from app.db.base import Base
from app.api import pokemon

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(pokemon.router, prefix="/api/v2")