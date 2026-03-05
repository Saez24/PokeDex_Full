from sqlalchemy import create_engine
from alembic import context
from app.db.base import Base
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL").replace("+asyncpg", "")

config = context.config
config.set_main_option("sqlalchemy.url", DATABASE_URL)

from app.models.cache import (  # noqa
    CachedPokemon, CachedSpecies, CachedEvolutionChain,
    CachedType, CachedAbility, CachedMove, SeedProgress,
)

target_metadata = Base.metadata


def run_migrations_offline():
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = create_engine(DATABASE_URL)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()