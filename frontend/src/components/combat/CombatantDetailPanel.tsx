"use client";

import { useTranslations } from "next-intl";
import { hpColor } from "@/lib/utils";
import type { Combatant, PlayerCharacter } from "@/types";

type Props = {
  combatant: Combatant | null;
  characters: PlayerCharacter[];
};

function sideLabel(t: ReturnType<typeof useTranslations>, side: Combatant["side"]) {
  switch (side) {
    case "pc":
      return t("sidePc");
    case "ally":
      return t("sideAlly");
    case "enemy":
      return t("sideEnemy");
    default:
      return null;
  }
}

export default function CombatantDetailPanel({ combatant, characters }: Props) {
  const t = useTranslations("combatantDetail");

  if (!combatant) {
    return (
      <div className="h-full p-4 text-sm text-muted-foreground">
        {t("empty")}
      </div>
    );
  }

  const pc =
    combatant.player_character_id
      ? characters.find((c) => c.id === combatant.player_character_id) ?? null
      : null;

  const side = sideLabel(t, combatant.side);

  return (
    <div className="h-full p-4 overflow-y-auto space-y-4">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-base font-semibold text-foreground">
            {combatant.name}
          </h3>
          {combatant.type === "pc" ? (
            <span className="text-[11px] font-semibold bg-blue-600 text-white px-2 py-0.5 rounded">
              {t("typePc")}
            </span>
          ) : (
            <span className="text-[11px] font-semibold bg-red-700 text-white px-2 py-0.5 rounded">
              {t("typeMonster")}
            </span>
          )}
          {side && (
            <span className="text-[11px] font-medium bg-muted text-foreground/90 px-2 py-0.5 rounded">
              {side}
            </span>
          )}
        </div>
        {pc && (
          <div className="text-sm text-muted-foreground/90 mt-0.5">
            {t("pcSummary", {
              race: pc.race,
              cls: pc.character_class,
              level: pc.level,
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-muted/40 border border-border rounded p-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90">
            {t("hpLabel")}
          </div>
          <div className={`font-mono text-sm font-semibold ${hpColor(combatant.hp_current, combatant.hp_max)}`}>
            {combatant.hp_current}/{combatant.hp_max}
          </div>
        </div>
        <div className="bg-muted/40 border border-border rounded p-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90">
            {t("acLabel")}
          </div>
          <div className="font-mono text-sm font-semibold text-foreground">
            {combatant.armor_class}
          </div>
        </div>
        <div className="bg-muted/40 border border-border rounded p-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90">
            {t("initLabel")}
          </div>
          <div className="font-mono text-sm font-semibold text-foreground">
            {combatant.initiative}
          </div>
        </div>
      </div>

      {pc && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/30 border border-border rounded p-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90">
              {t("ppLabel")}
            </div>
            <div className="font-mono tabular-nums text-sm text-foreground">
              {pc.passive_perception}
            </div>
          </div>
          <div className="bg-muted/30 border border-border rounded p-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90">
              {t("speedLabel")}
            </div>
            <div className="font-mono tabular-nums text-sm text-foreground">{pc.speed}</div>
          </div>
          <div className="bg-muted/30 border border-border rounded p-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90">
              {t("pbLabel")}
            </div>
            <div className="font-mono tabular-nums text-sm text-foreground">
              +{pc.proficiency_bonus}
            </div>
          </div>
        </div>
      )}

      {combatant.conditions.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90 mb-1">
            {t("conditionsLabel")}
          </div>
          <div className="flex flex-wrap gap-1">
            {combatant.conditions.map((c) => (
              <span
                key={c}
                className="text-[11px] font-medium bg-accent text-foreground rounded px-2 py-0.5"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {combatant.notes && (
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90 mb-1">
            {t("notesLabel")}
          </div>
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">
            {combatant.notes}
          </p>
        </div>
      )}
    </div>
  );
}
