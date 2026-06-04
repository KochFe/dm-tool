"use client";

import { motion } from "framer-motion";
import { hpColor, hpBarColor } from "@/lib/utils";
import type { PlayerCharacter } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import CharacterStatDisplay from "@/components/character/CharacterStatDisplay";

/** Wide read-only detail for a selected party member, rendered to the right of
 *  the PartyPanel in the session view (exploration mode). */
export default function PartyMemberDetail({ pc }: { pc: PlayerCharacter }) {
  const pct = Math.min(100, Math.max(0, (pc.hp_current / pc.hp_max) * 100));

  return (
    <ScrollArea className="h-full">
      {/* keyed on pc.id so a single slide-in plays when the selection changes */}
      <motion.div
        key={pc.id}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="p-4 space-y-4"
      >
        {/* Header */}
        <div>
          <p className="text-lg font-semibold text-foreground">{pc.name}</p>
          <p className="text-sm text-muted-foreground">
            {pc.race} {pc.character_class}
          </p>
        </div>

        {/* Quick stats */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-mono tabular-nums font-semibold ${hpColor(pc.hp_current, pc.hp_max)}`}
            >
              {pc.hp_current}/{pc.hp_max}
            </span>
            <div className="flex-1 h-1.5 bg-accent/60 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${hpBarColor(pc.hp_current, pc.hp_max)}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground/90 tabular-nums">
            <span>Lvl {pc.level}</span>
            <span>AC {pc.armor_class}</span>
            <span>PP {pc.passive_perception}</span>
            <span>Speed {pc.speed} ft</span>
            <span>Prof +{pc.proficiency_bonus}</span>
          </div>
        </div>

        {/* Full stat block + notes */}
        <div className="pt-3 border-t border-border/60">
          <CharacterStatDisplay pc={pc} />
        </div>
      </motion.div>
    </ScrollArea>
  );
}
