import random
import uuid
from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.combat_session import CombatSession
from app.models.encounter_template import EncounterTemplate
from app.models.player_character import PlayerCharacter
from app.schemas.combat_session import CombatantData, CombatSessionCreate
from app.schemas.encounter_template import (
    EncounterTemplateCreate,
    EncounterTemplateUpdate,
    StartEncounterRequest,
    TemplateCombatant,
)
from app.services import combat_session_service


async def create_encounter_template(
    db: AsyncSession,
    campaign_id: uuid.UUID,
    body: EncounterTemplateCreate,
) -> EncounterTemplate:
    template = EncounterTemplate(
        campaign_id=campaign_id,
        name=body.name,
        location_id=body.location_id,
        notes=body.notes,
        combatants=[c.model_dump() for c in body.combatants],
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template


async def list_encounter_templates(
    db: AsyncSession,
    campaign_id: uuid.UUID,
    location_id: uuid.UUID | None = None,
) -> Sequence[EncounterTemplate]:
    stmt = select(EncounterTemplate).where(
        EncounterTemplate.campaign_id == campaign_id
    )
    if location_id is not None:
        stmt = stmt.where(EncounterTemplate.location_id == location_id)
    stmt = stmt.order_by(EncounterTemplate.name)
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_encounter_template(
    db: AsyncSession,
    template_id: uuid.UUID,
) -> EncounterTemplate | None:
    result = await db.execute(
        select(EncounterTemplate).where(EncounterTemplate.id == template_id)
    )
    return result.scalar_one_or_none()


async def update_encounter_template(
    db: AsyncSession,
    template: EncounterTemplate,
    body: EncounterTemplateUpdate,
) -> EncounterTemplate:
    data = body.model_dump(exclude_unset=True)
    if "combatants" in data and data["combatants"] is not None:
        data["combatants"] = [
            TemplateCombatant(**c).model_dump() for c in data["combatants"]
        ]
    for field, value in data.items():
        setattr(template, field, value)
    await db.commit()
    await db.refresh(template)
    return template


async def delete_encounter_template(
    db: AsyncSession,
    template: EncounterTemplate,
) -> None:
    await db.delete(template)
    await db.commit()


async def start_encounter(
    db: AsyncSession,
    template: EncounterTemplate,
    body: StartEncounterRequest,
) -> CombatSession:
    """Instantiate a template into a live CombatSession.

    - Expand each TemplateCombatant by count, naming "{name} {n}" when count > 1.
    - Roll 1d20 + initiative_bonus per spawned row.
    - Add each PresentPC by looking up the player_character row.
    - Validate every present_pc belongs to this campaign (raises ValueError).
    """
    pcs_by_id: dict[uuid.UUID, PlayerCharacter] = {}
    if body.present_pcs:
        pc_ids = [pc.player_character_id for pc in body.present_pcs]
        result = await db.execute(
            select(PlayerCharacter).where(PlayerCharacter.id.in_(pc_ids))
        )
        pcs_by_id = {pc.id: pc for pc in result.scalars().all()}
        for present in body.present_pcs:
            pc = pcs_by_id.get(present.player_character_id)
            if pc is None or pc.campaign_id != template.campaign_id:
                raise ValueError(
                    f"player_character {present.player_character_id} not in this campaign"
                )

    combatants: list[CombatantData] = []

    for raw in template.combatants:
        tc = TemplateCombatant(**raw)
        for n in range(1, tc.count + 1):
            display_name = tc.name if tc.count == 1 else f"{tc.name} {n}"
            roll = random.randint(1, 20) + tc.initiative_bonus
            combatants.append(
                CombatantData(
                    name=display_name,
                    initiative=roll,
                    hp_current=tc.hp_max,
                    hp_max=tc.hp_max,
                    armor_class=tc.armor_class,
                    type="monster",
                    side=tc.side,
                    notes=tc.notes,
                )
            )

    for present in body.present_pcs:
        pc = pcs_by_id[present.player_character_id]
        combatants.append(
            CombatantData(
                name=pc.name,
                initiative=present.initiative,
                hp_current=pc.hp_current,
                hp_max=pc.hp_max,
                armor_class=pc.armor_class,
                type="pc",
                side="pc",
                player_character_id=pc.id,
            )
        )

    session_create = CombatSessionCreate(
        name=body.name or template.name,
        notes=template.notes,
        combatants=combatants,
    )
    return await combat_session_service.create_combat_session(
        db=db,
        campaign_id=template.campaign_id,
        data=session_create,
    )
