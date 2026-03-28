"use client";

import { hpColor, hpBarColor } from "@/lib/utils";
import type { PlayerCharacter } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function PartyPanel({ characters }: { characters: PlayerCharacter[] }) {
  if (characters.length === 0) {
    return (
      <div className="p-3 text-xs text-gray-500">No characters in this campaign.</div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Party</h3>
        {characters.map((pc) => (
          <div key={pc.id} className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-2.5">
            <p className="text-sm font-medium text-gray-100 truncate">{pc.name}</p>
            <p className="text-xs text-gray-500">{pc.race} {pc.character_class}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-xs font-mono font-semibold ${hpColor(pc.hp_current, pc.hp_max)}`}>
                {pc.hp_current}/{pc.hp_max}
              </span>
              <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${hpBarColor(pc.hp_current, pc.hp_max)}`}
                  style={{ width: `${Math.min(100, Math.max(0, (pc.hp_current / pc.hp_max) * 100))}%` }}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-1.5 text-xs text-gray-400">
              <span>AC {pc.armor_class}</span>
              <span>PP {pc.passive_perception}</span>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
