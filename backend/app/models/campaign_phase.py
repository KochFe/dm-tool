import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Integer, Table, Column, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


phase_quests = Table(
    "phase_quests",
    Base.metadata,
    Column("phase_id", Uuid, ForeignKey("campaign_phases.id", ondelete="CASCADE"), primary_key=True),
    Column("quest_id", Uuid, ForeignKey("quests.id", ondelete="CASCADE"), primary_key=True),
)

phase_locations = Table(
    "phase_locations",
    Base.metadata,
    Column("phase_id", Uuid, ForeignKey("campaign_phases.id", ondelete="CASCADE"), primary_key=True),
    Column("location_id", Uuid, ForeignKey("locations.id", ondelete="CASCADE"), primary_key=True),
)


class CampaignPhase(Base):
    __tablename__ = "campaign_phases"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    created_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now(), onupdate=func.now()
    )

    campaign: Mapped["Campaign"] = relationship(back_populates="phases")
    quests: Mapped[list["Quest"]] = relationship(secondary=phase_quests, lazy="selectin")
    locations: Mapped[list["Location"]] = relationship(secondary=phase_locations, lazy="selectin")
