"""add_generation_item

Revision ID: c3e42f9b1d84
Revises: a6c86641a377
Create Date: 2026-04-04 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c3e42f9b1d84'
down_revision: Union[str, Sequence[str], None] = 'a6c86641a377'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'cached_generation',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('data', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_cached_generation_name'), 'cached_generation', ['name'], unique=True
    )
    op.create_table(
        'cached_item',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('data', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_cached_item_name'), 'cached_item', ['name'], unique=True
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_cached_item_name'), table_name='cached_item')
    op.drop_table('cached_item')
    op.drop_index(op.f('ix_cached_generation_name'), table_name='cached_generation')
    op.drop_table('cached_generation')
