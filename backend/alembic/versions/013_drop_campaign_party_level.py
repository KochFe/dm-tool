"""Drop campaigns.party_level.

Revision ID: 013
Revises: 012
Create Date: 2026-05-16
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "013"
down_revision: Union[str, None] = "012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("ck_party_level", "campaigns", type_="check")
    op.drop_column("campaigns", "party_level")


def downgrade() -> None:
    op.add_column(
        "campaigns",
        sa.Column("party_level", sa.Integer(), nullable=False, server_default="1"),
    )
    op.create_check_constraint(
        "ck_party_level",
        "campaigns",
        "party_level >= 1 AND party_level <= 20",
    )
