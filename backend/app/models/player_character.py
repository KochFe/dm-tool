import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, Integer, JSON, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PlayerCharacter(Base):
    __tablename__ = "player_characters"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    race: Mapped[str] = mapped_column(Text, nullable=False)
    character_class: Mapped[str] = mapped_column(Text, nullable=False)
    level: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    hp_current: Mapped[int] = mapped_column(Integer, nullable=False)
    hp_max: Mapped[int] = mapped_column(Integer, nullable=False)
    armor_class: Mapped[int] = mapped_column(Integer, nullable=False)
    passive_perception: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="10"
    )
    inventory: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    # Ability scores
    strength: Mapped[int] = mapped_column(Integer, nullable=False, server_default="10")
    dexterity: Mapped[int] = mapped_column(Integer, nullable=False, server_default="10")
    constitution: Mapped[int] = mapped_column(Integer, nullable=False, server_default="10")
    intelligence: Mapped[int] = mapped_column(Integer, nullable=False, server_default="10")
    wisdom: Mapped[int] = mapped_column(Integer, nullable=False, server_default="10")
    charisma: Mapped[int] = mapped_column(Integer, nullable=False, server_default="10")

    # Derived / class stats
    proficiency_bonus: Mapped[int] = mapped_column(Integer, nullable=False, server_default="2")
    speed: Mapped[int] = mapped_column(Integer, nullable=False, server_default="30")

    # Proficiency and spell tracking (JSON)
    saving_throw_proficiencies: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    skill_proficiencies: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    spell_slots: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    created_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now(), onupdate=func.now()
    )

    campaign: Mapped["Campaign"] = relationship(back_populates="player_characters")

    __table_args__ = (
        CheckConstraint("level >= 1 AND level <= 20", name="ck_pc_level"),
        CheckConstraint("hp_max >= 1", name="ck_hp_max"),
        CheckConstraint("armor_class >= 0", name="ck_armor_class"),
    )
