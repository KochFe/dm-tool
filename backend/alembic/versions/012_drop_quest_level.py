"""Drop quests.level.

Revision ID: 012
Revises: 011
Create Date: 2026-05-16
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "012"
down_revision: Union[str, None] = "011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("quests", "level")


def downgrade() -> None:
    op.add_column(
        "quests",
        sa.Column("level", sa.Integer(), nullable=True),
    )
