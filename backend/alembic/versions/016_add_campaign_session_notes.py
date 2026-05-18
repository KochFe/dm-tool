"""Add campaign_session_notes table and drop campaigns.notes.

Revision ID: 016
Revises: 015
Create Date: 2026-05-18
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "016"
down_revision: Union[str, None] = "015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "campaign_session_notes",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "campaign_id",
            sa.Uuid(),
            sa.ForeignKey("campaigns.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.Text(), nullable=True),
        sa.Column("body", sa.Text(), nullable=True, server_default=""),
        sa.Column("status", sa.Text(), nullable=False, server_default="open"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_csn_campaign_id",
        "campaign_session_notes",
        ["campaign_id"],
    )
    op.create_index(
        "ux_csn_one_open_per_campaign",
        "campaign_session_notes",
        ["campaign_id"],
        unique=True,
        postgresql_where=sa.text("status = 'open'"),
    )
    op.drop_column("campaigns", "notes")


def downgrade() -> None:
    op.add_column(
        "campaigns",
        sa.Column("notes", sa.Text(), nullable=True),
    )
    op.drop_index(
        "ux_csn_one_open_per_campaign",
        table_name="campaign_session_notes",
    )
    op.drop_index(
        "ix_csn_campaign_id",
        table_name="campaign_session_notes",
    )
    op.drop_table("campaign_session_notes")
