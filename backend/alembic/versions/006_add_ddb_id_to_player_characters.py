"""Add ddb_id to player_characters for D&D Beyond import tracking.

Revision ID: 006
Revises: 005
"""

from alembic import op
import sqlalchemy as sa

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "player_characters",
        sa.Column("ddb_id", sa.BigInteger(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("player_characters", "ddb_id")
