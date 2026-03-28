import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, Integer, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    current_location_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid,
        ForeignKey("locations.id", ondelete="SET NULL", use_alter=True),
        nullable=True,
    )
    in_game_time: Mapped[str] = mapped_column(
        Text, nullable=False, server_default="Day 1, Morning"
    )
    party_level: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default="active")
    campaign_length: Mapped[str | None] = mapped_column(Text, nullable=True)
    world_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now(), onupdate=func.now()
    )

    player_characters: Mapped[list["PlayerCharacter"]] = relationship(
        back_populates="campaign", cascade="all, delete-orphan"
    )
    locations: Mapped[list["Location"]] = relationship(
        back_populates="campaign",
        cascade="all, delete-orphan",
        foreign_keys="Location.campaign_id",
    )
    combat_sessions: Mapped[list["CombatSession"]] = relationship(
        back_populates="campaign", cascade="all, delete-orphan"
    )
    npcs: Mapped[list["Npc"]] = relationship(
        back_populates="campaign", cascade="all, delete-orphan"
    )
    quests: Mapped[list["Quest"]] = relationship(
        back_populates="campaign", cascade="all, delete-orphan"
    )
    phases: Mapped[list["CampaignPhase"]] = relationship(
        back_populates="campaign", cascade="all, delete-orphan"
    )
    ideas: Mapped[list["CampaignIdea"]] = relationship(
        back_populates="campaign", cascade="all, delete-orphan"
    )
    owner: Mapped["User"] = relationship(lazy="select")

    __table_args__ = (
        CheckConstraint("party_level >= 1 AND party_level <= 20", name="ck_party_level"),
        CheckConstraint("status IN ('draft', 'active')", name="ck_campaign_status"),
        CheckConstraint(
            "campaign_length IS NULL OR campaign_length IN ('one_shot', 'short', 'medium', 'long')",
            name="ck_campaign_length",
        ),
    )
