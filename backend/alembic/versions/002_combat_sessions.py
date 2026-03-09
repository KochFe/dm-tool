"""add combat_sessions table

Revision ID: 002
Revises: 001
Create Date: 2026-03-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "combat_sessions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.Text(), nullable=True),
        sa.Column(
            "combatants",
            postgresql.JSONB(),
            server_default="[]",
            nullable=False,
        ),
        sa.Column(
            "current_turn_index",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
        sa.Column(
            "round_number",
            sa.Integer(),
            server_default="1",
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Text(),
            server_default="active",
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('active', 'completed')", name="ck_combat_session_status"
        ),
        sa.ForeignKeyConstraint(
            ["campaign_id"], ["campaigns.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_combat_sessions_campaign_id", "combat_sessions", ["campaign_id"]
    )

    op.execute("""
        CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON combat_sessions
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_updated_at();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS set_updated_at ON combat_sessions;")
    op.drop_index("ix_combat_sessions_campaign_id", table_name="combat_sessions")
    op.drop_table("combat_sessions")
