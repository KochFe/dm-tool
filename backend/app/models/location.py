import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Location(Base):
    __tablename__ = "locations"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False
    )
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("locations.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    biome: Mapped[str] = mapped_column(Text, nullable=False, server_default="urban")
    created_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now(), onupdate=func.now()
    )

    campaign: Mapped["Campaign"] = relationship(
        back_populates="locations", foreign_keys=[campaign_id]
    )
    parent: Mapped["Location | None"] = relationship(
        back_populates="children", remote_side="Location.id", foreign_keys=[parent_id]
    )
    children: Mapped[list["Location"]] = relationship(
        back_populates="parent", foreign_keys="Location.parent_id"
    )
    npcs: Mapped[list["Npc"]] = relationship(back_populates="location")
    quests: Mapped[list["Quest"]] = relationship(back_populates="location")
