"""npcs, quests tables and player_characters expansion

Revision ID: 003
Revises: 002
Create Date: 2026-03-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Create npcs table ---
    op.create_table(
        "npcs",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("location_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("race", sa.Text(), nullable=False),
        sa.Column("npc_class", sa.Text(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("personality", sa.Text(), nullable=True),
        sa.Column("secrets", sa.Text(), nullable=True),
        sa.Column("motivation", sa.Text(), nullable=True),
        sa.Column("stats", postgresql.JSONB(), nullable=True),
        sa.Column(
            "is_alive",
            sa.Boolean(),
            server_default=sa.text("true"),
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
        sa.ForeignKeyConstraint(
            ["location_id"], ["locations.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_npcs_campaign_id", "npcs", ["campaign_id"])
    op.create_index("ix_npcs_location_id", "npcs", ["location_id"])

    op.execute("""
        CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON npcs
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_updated_at();
    """)

    # --- Create quests table ---
    op.create_table(
        "quests",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("location_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.Text(),
            server_default="not_started",
            nullable=False,
        ),
        sa.Column("reward", sa.Text(), nullable=True),
        sa.Column("level", sa.Integer(), nullable=True),
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
            "status IN ('not_started', 'in_progress', 'completed', 'failed')",
            name="ck_quest_status",
        ),
        sa.ForeignKeyConstraint(
            ["campaign_id"], ["campaigns.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["location_id"], ["locations.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_quests_campaign_id", "quests", ["campaign_id"])
    op.create_index("ix_quests_location_id", "quests", ["location_id"])

    op.execute("""
        CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON quests
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_updated_at();
    """)

    # --- Expand player_characters: ability scores ---
    for col, default in [
        ("strength", "10"),
        ("dexterity", "10"),
        ("constitution", "10"),
        ("intelligence", "10"),
        ("wisdom", "10"),
        ("charisma", "10"),
        ("proficiency_bonus", "2"),
        ("speed", "30"),
    ]:
        op.add_column(
            "player_characters",
            sa.Column(
                col,
                sa.Integer(),
                server_default=default,
                nullable=False,
            ),
        )

    # --- Expand player_characters: JSONB proficiency / spell columns ---
    op.add_column(
        "player_characters",
        sa.Column(
            "saving_throw_proficiencies",
            postgresql.JSONB(),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
    )
    op.add_column(
        "player_characters",
        sa.Column(
            "skill_proficiencies",
            postgresql.JSONB(),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
    )
    op.add_column(
        "player_characters",
        sa.Column(
            "spell_slots",
            postgresql.JSONB(),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    # --- Drop updated_at triggers ---
    op.execute("DROP TRIGGER IF EXISTS set_updated_at ON quests;")
    op.execute("DROP TRIGGER IF EXISTS set_updated_at ON npcs;")

    # --- Drop quests ---
    op.drop_index("ix_quests_location_id", table_name="quests")
    op.drop_index("ix_quests_campaign_id", table_name="quests")
    op.drop_table("quests")

    # --- Drop npcs ---
    op.drop_index("ix_npcs_location_id", table_name="npcs")
    op.drop_index("ix_npcs_campaign_id", table_name="npcs")
    op.drop_table("npcs")

    # --- Remove player_characters JSONB columns ---
    for col in ("spell_slots", "skill_proficiencies", "saving_throw_proficiencies"):
        op.drop_column("player_characters", col)

    # --- Remove player_characters integer columns ---
    for col in (
        "speed",
        "proficiency_bonus",
        "charisma",
        "wisdom",
        "intelligence",
        "constitution",
        "dexterity",
        "strength",
    ):
        op.drop_column("player_characters", col)
