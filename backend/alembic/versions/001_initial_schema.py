"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-03-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create campaigns table (without current_location_id FK initially)
    op.create_table(
        "campaigns",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("current_location_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("in_game_time", sa.Text(), server_default="Day 1, Morning", nullable=False),
        sa.Column("party_level", sa.Integer(), server_default="1", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("party_level >= 1 AND party_level <= 20", name="ck_party_level"),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create locations table
    op.create_table(
        "locations",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("biome", sa.Text(), server_default="urban", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["campaign_id"], ["campaigns.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_locations_campaign_id", "locations", ["campaign_id"])

    # Create player_characters table
    op.create_table(
        "player_characters",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("race", sa.Text(), nullable=False),
        sa.Column("character_class", sa.Text(), nullable=False),
        sa.Column("level", sa.Integer(), server_default="1", nullable=False),
        sa.Column("hp_current", sa.Integer(), nullable=False),
        sa.Column("hp_max", sa.Integer(), nullable=False),
        sa.Column("armor_class", sa.Integer(), nullable=False),
        sa.Column("passive_perception", sa.Integer(), server_default="10", nullable=False),
        sa.Column("inventory", postgresql.JSONB(), server_default="[]", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("level >= 1 AND level <= 20", name="ck_pc_level"),
        sa.CheckConstraint("hp_max >= 1", name="ck_hp_max"),
        sa.CheckConstraint("armor_class >= 0", name="ck_armor_class"),
        sa.ForeignKeyConstraint(["campaign_id"], ["campaigns.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_player_characters_campaign_id", "player_characters", ["campaign_id"])

    # Add circular FK: campaigns.current_location_id -> locations.id
    op.create_foreign_key(
        "fk_campaigns_current_location",
        "campaigns",
        "locations",
        ["current_location_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # Create updated_at trigger function
    op.execute("""
        CREATE OR REPLACE FUNCTION trigger_set_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    for table in ("campaigns", "locations", "player_characters"):
        op.execute(f"""
            CREATE TRIGGER set_updated_at
            BEFORE UPDATE ON {table}
            FOR EACH ROW
            EXECUTE FUNCTION trigger_set_updated_at();
        """)


def downgrade() -> None:
    for table in ("player_characters", "locations", "campaigns"):
        op.execute(f"DROP TRIGGER IF EXISTS set_updated_at ON {table};")
    op.execute("DROP FUNCTION IF EXISTS trigger_set_updated_at();")

    op.drop_constraint("fk_campaigns_current_location", "campaigns", type_="foreignkey")
    op.drop_table("player_characters")
    op.drop_table("locations")
    op.drop_table("campaigns")
