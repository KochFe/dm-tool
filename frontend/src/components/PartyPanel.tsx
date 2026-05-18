"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { hpColor, hpBarColor } from "@/lib/utils";
import type { PlayerCharacter } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function PartyPanel({ characters }: { characters: PlayerCharacter[] }) {
  const t = useTranslations("partyPanel");

  if (characters.length === 0) {
    return (
      <div className="p-3 text-xs text-muted-foreground">{t("empty")}</div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-2">
        <h3 className="font-display italic text-[11px] tracking-[0.22em] uppercase text-muted-foreground mb-3">
          {t("heading")}
        </h3>
        {characters.map((pc) => {
          const pct = Math.min(100, Math.max(0, (pc.hp_current / pc.hp_max) * 100));
          return (
            <motion.div
              key={pc.id}
              layout
              className="bg-card/70 border border-border rounded-xl p-3 shadow-elev-1 hover:shadow-elev-2 hover:border-primary/30 transition-all duration-300"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-foreground truncate">{pc.name}</p>
                <span className="font-mono tabular-nums text-[11px] text-muted-foreground shrink-0">AC {pc.armor_class}</span>
              </div>
              <p className="text-[11px] text-muted-foreground italic">{pc.race} {pc.character_class}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs font-mono tabular-nums font-semibold ${hpColor(pc.hp_current, pc.hp_max)}`}>
                  {pc.hp_current}/{pc.hp_max}
                </span>
                <div className="flex-1 h-1.5 bg-accent/60 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${hpBarColor(pc.hp_current, pc.hp_max)}`}
                    initial={false}
                    animate={{ width: `${pct}%` }}
                    transition={{ type: "spring", stiffness: 200, damping: 24 }}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-1.5 text-[11px] text-muted-foreground tabular-nums">
                <span>PP {pc.passive_perception}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
