"""Drop campaigns.world_description.

Revision ID: 010
Revises: 009
Create Date: 2026-04-20
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "010"
down_revision: Union[str, None] = "009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("campaigns", "world_description")


def downgrade() -> None:
    op.add_column(
        "campaigns",
        sa.Column("world_description", sa.Text(), nullable=True),
    )
