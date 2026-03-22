"""Add user_id to campaigns for multi-tenancy.

Revision ID: 005
Revises: 004
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "campaigns",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
    )
    op.create_foreign_key(
        "fk_campaigns_user_id",
        "campaigns",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_campaigns_user_id", "campaigns", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_campaigns_user_id", table_name="campaigns")
    op.drop_constraint("fk_campaigns_user_id", "campaigns", type_="foreignkey")
    op.drop_column("campaigns", "user_id")
