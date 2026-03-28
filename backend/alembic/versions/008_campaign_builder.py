"""Campaign builder: status/length/world_description on campaigns, parent_id on locations, campaign_phases, campaign_ideas, phase_quests, phase_locations.

Revision ID: 008
Revises: 007
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- campaigns: add status, campaign_length, world_description ---
    op.add_column(
        "campaigns",
        sa.Column(
            "status",
            sa.Text(),
            server_default="active",
            nullable=False,
        ),
    )
    op.add_column(
        "campaigns",
        sa.Column("campaign_length", sa.Text(), nullable=True),
    )
    op.add_column(
        "campaigns",
        sa.Column("world_description", sa.Text(), nullable=True),
    )
    op.create_check_constraint(
        "ck_campaign_status",
        "campaigns",
        "status IN ('draft', 'active')",
    )
    op.create_check_constraint(
        "ck_campaign_length",
        "campaigns",
        "campaign_length IS NULL OR campaign_length IN ('one_shot', 'short', 'medium', 'long')",
    )

    # --- locations: add parent_id ---
    op.add_column(
        "locations",
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_locations_parent_id",
        "locations",
        "locations",
        ["parent_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_locations_parent_id", "locations", ["parent_id"])

    # --- campaign_phases table ---
    op.create_table(
        "campaign_phases",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "sort_order",
            sa.Integer(),
            server_default="0",
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
        sa.ForeignKeyConstraint(
            ["campaign_id"], ["campaigns.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_campaign_phases_campaign_id", "campaign_phases", ["campaign_id"])

    op.execute("""
        CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON campaign_phases
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_updated_at();
    """)

    # --- campaign_ideas table ---
    op.create_table(
        "campaign_ideas",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("tag", sa.Text(), nullable=False),
        sa.Column(
            "is_done",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column(
            "sort_order",
            sa.Integer(),
            server_default="0",
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
            "tag IN ('story', 'location', 'character')",
            name="ck_campaign_idea_tag",
        ),
        sa.ForeignKeyConstraint(
            ["campaign_id"], ["campaigns.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_campaign_ideas_campaign_id", "campaign_ideas", ["campaign_id"])

    op.execute("""
        CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON campaign_ideas
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_updated_at();
    """)

    # --- phase_quests junction table ---
    op.create_table(
        "phase_quests",
        sa.Column("phase_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("quest_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["phase_id"], ["campaign_phases.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["quest_id"], ["quests.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("phase_id", "quest_id"),
    )

    # --- phase_locations junction table ---
    op.create_table(
        "phase_locations",
        sa.Column("phase_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("location_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["phase_id"], ["campaign_phases.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["location_id"], ["locations.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("phase_id", "location_id"),
    )


def downgrade() -> None:
    # --- junction tables ---
    op.drop_table("phase_locations")
    op.drop_table("phase_quests")

    # --- campaign_ideas ---
    op.execute("DROP TRIGGER IF EXISTS set_updated_at ON campaign_ideas;")
    op.drop_index("ix_campaign_ideas_campaign_id", table_name="campaign_ideas")
    op.drop_table("campaign_ideas")

    # --- campaign_phases ---
    op.execute("DROP TRIGGER IF EXISTS set_updated_at ON campaign_phases;")
    op.drop_index("ix_campaign_phases_campaign_id", table_name="campaign_phases")
    op.drop_table("campaign_phases")

    # --- locations: parent_id ---
    op.drop_index("ix_locations_parent_id", table_name="locations")
    op.drop_constraint("fk_locations_parent_id", "locations", type_="foreignkey")
    op.drop_column("locations", "parent_id")

    # --- campaigns: new columns and constraints ---
    op.drop_constraint("ck_campaign_length", "campaigns", type_="check")
    op.drop_constraint("ck_campaign_status", "campaigns", type_="check")
    op.drop_column("campaigns", "world_description")
    op.drop_column("campaigns", "campaign_length")
    op.drop_column("campaigns", "status")
