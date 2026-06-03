"use client";

import { useTranslations } from "next-intl";
import type { PlayerCharacter } from "@/types";

export const ABILITY_KEYS = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
] as const;

export const ABILITY_LABELS: Record<(typeof ABILITY_KEYS)[number], string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
};

export function abilityModifier(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

function Tag({ label }: { label: string }) {
  return (
    <span className="inline-block bg-accent text-foreground/80 text-xs px-2 py-0.5 rounded">
      {label}
    </span>
  );
}

/** Read-only full stat block for a player character: ability scores,
 *  saving-throw / skill proficiencies, spell slots, and DM notes. */
export default function CharacterStatDisplay({ pc }: { pc: PlayerCharacter }) {
  const t = useTranslations("characterSection");
  const hasSpellSlots =
    pc.spell_slots && Object.keys(pc.spell_slots).length > 0;
  const notes = (pc.notes ?? "").trim();

  return (
    <div className="space-y-3">
      {/* Ability scores */}
      <div className="grid grid-cols-6 gap-1.5">
        {ABILITY_KEYS.map((key) => (
          <div
            key={key}
            className="bg-card/60 border border-border rounded-lg py-1.5 text-center"
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {ABILITY_LABELS[key]}
            </p>
            <p className="text-sm font-semibold text-foreground">{pc[key]}</p>
            <p className="text-xs text-primary">{abilityModifier(pc[key])}</p>
          </div>
        ))}
      </div>

      {/* Saving throws */}
      {pc.saving_throw_proficiencies &&
        pc.saving_throw_proficiencies.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              {t("displaySavingThrows")}
            </p>
            <div className="flex flex-wrap gap-1">
              {pc.saving_throw_proficiencies.map((s) => (
                <Tag key={s} label={s} />
              ))}
            </div>
          </div>
        )}

      {/* Skills */}
      {pc.skill_proficiencies && pc.skill_proficiencies.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">
            {t("displaySkills")}
          </p>
          <div className="flex flex-wrap gap-1">
            {pc.skill_proficiencies.map((s) => (
              <Tag key={s} label={s} />
            ))}
          </div>
        </div>
      )}

      {/* Spell slots */}
      {hasSpellSlots && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">
            {t("displaySpellSlots")}
          </p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(pc.spell_slots).map(([level, slots]) => (
              <Tag key={level} label={`Lv${level}: ${slots}`} />
            ))}
          </div>
        </div>
      )}

      {/* DM notes */}
      {notes && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">{t("notes")}</p>
          <p className="text-sm text-foreground/80 whitespace-pre-wrap break-words">
            {notes}
          </p>
        </div>
      )}
    </div>
  );
}
