from app.schemas.combat_session import CombatantData


def test_side_defaults_to_pc_when_type_is_pc():
    c = CombatantData(
        name="Aragorn",
        initiative=15,
        hp_current=40,
        hp_max=40,
        armor_class=17,
        type="pc",
    )
    assert c.side == "pc"


def test_side_defaults_to_enemy_when_type_is_monster():
    c = CombatantData(
        name="Goblin",
        initiative=10,
        hp_current=7,
        hp_max=7,
        armor_class=13,
        type="monster",
    )
    assert c.side == "enemy"


def test_side_is_preserved_when_provided_explicitly():
    c = CombatantData(
        name="Allied Guard",
        initiative=12,
        hp_current=20,
        hp_max=20,
        armor_class=15,
        type="monster",
        side="ally",
    )
    assert c.side == "ally"
