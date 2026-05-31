"""Drop campaigns.campaign_length.

Revision ID: 017
Revises: 016
Create Date: 2026-05-31
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "017"
down_revision: Union[str, None] = "016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("ck_campaign_length", "campaigns", type_="check")
    op.drop_column("campaigns", "campaign_length")


def downgrade() -> None:
    op.add_column(
        "campaigns",
        sa.Column("campaign_length", sa.Text(), nullable=True),
    )
    op.create_check_constraint(
        "ck_campaign_length",
        "campaigns",
        "campaign_length IS NULL OR campaign_length IN ('one_shot', 'short', 'medium', 'long')",
    )
