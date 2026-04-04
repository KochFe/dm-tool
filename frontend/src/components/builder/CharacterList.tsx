"use client";

import { useState } from "react";
import type { Npc, PlayerCharacter, Location } from "@/types";

interface CharacterListProps {
  npcs: Npc[];
  pcs: PlayerCharacter[];
  locations: Location[];
  selectedType: "npc" | "pc" | null;
  selectedId: string | null;
  onSelectNpc: (npc: Npc) => void;
  onSelectPc: (pc: PlayerCharacter) => void;
  onAddNpc: () => void;
  onAddPc: () => void;
}

interface LocationGroupProps {
  label: string;
  npcs: Npc[];
  selectedId: string | null;
  selectedType: "npc" | "pc" | null;
  onSelectNpc: (npc: Npc) => void;
  defaultExpanded?: boolean;
}

function LocationGroup({
  label,
  npcs,
  selectedId,
  selectedType,
  onSelectNpc,
  defaultExpanded = true,
}: LocationGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="mb-1">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-1.5 px-2 py-1 rounded hover:bg-muted transition-colors text-left"
      >
        <svg
          className={`w-3 h-3 text-muted-foreground flex-shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex-1 truncate">
          {label}
        </span>
        <span className="text-xs text-muted-foreground/60 flex-shrink-0">{npcs.length}</span>
      </button>

      {expanded && (
        <div className="ml-4 flex flex-col gap-0.5 mt-0.5">
          {npcs.map((npc) => {
            const isSelected = selectedType === "npc" && selectedId === npc.id;
            return (
              <button
                key={npc.id}
                onClick={() => onSelectNpc(npc)}
                className={`w-full text-left px-2 py-1 rounded text-sm truncate transition-colors ${
                  isSelected
                    ? "bg-primary/20 border border-primary/40 text-primary font-medium"
                    : "text-foreground/80 hover:bg-muted border border-transparent"
                }`}
              >
                {npc.name}
                {!npc.is_alive && (
                  <span className="ml-1 text-xs text-muted-foreground/60">(deceased)</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CharacterList({
  npcs,
  pcs,
  locations,
  selectedType,
  selectedId,
  onSelectNpc,
  onSelectPc,
  onAddNpc,
  onAddPc,
}: CharacterListProps) {
  const locationMap = new Map(locations.map((l) => [l.id, l]));

  // Group NPCs by location_id
  const byLocation = new Map<string | null, Npc[]>();
  for (const npc of npcs) {
    const key = npc.location_id ?? null;
    if (!byLocation.has(key)) byLocation.set(key, []);
    byLocation.get(key)!.push(npc);
  }

  // Ordered: locations that have NPCs first (in location order), then "No Location"
  const locationGroups: Array<{ id: string | null; name: string; npcs: Npc[] }> = [];
  for (const loc of locations) {
    const group = byLocation.get(loc.id);
    if (group && group.length > 0) {
      locationGroups.push({ id: loc.id, name: loc.name, npcs: group });
    }
  }
  const unassigned = byLocation.get(null) ?? [];

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* NPC section header */}
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          NPCs
        </span>
        <button
          onClick={onAddNpc}
          className="text-xs text-primary hover:text-primary transition-colors"
        >
          + Add NPC
        </button>
      </div>

      {/* NPC groups */}
      {locationGroups.length === 0 && unassigned.length === 0 ? (
        <p className="text-xs text-muted-foreground/60 text-center py-3">No NPCs yet.</p>
      ) : (
        <>
          {locationGroups.map((group) => (
            <LocationGroup
              key={group.id}
              label={group.name}
              npcs={group.npcs}
              selectedId={selectedId}
              selectedType={selectedType}
              onSelectNpc={onSelectNpc}
            />
          ))}
          {unassigned.length > 0 && (
            <LocationGroup
              label="No Location"
              npcs={unassigned}
              selectedId={selectedId}
              selectedType={selectedType}
              onSelectNpc={onSelectNpc}
              defaultExpanded={true}
            />
          )}
        </>
      )}

      {/* Divider */}
      <div className="my-3 border-t border-border" />

      {/* PC section header */}
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Player Characters
        </span>
        <button
          onClick={onAddPc}
          className="text-xs text-primary hover:text-primary transition-colors"
        >
          + Add PC
        </button>
      </div>

      {/* PC list */}
      {pcs.length === 0 ? (
        <p className="text-xs text-muted-foreground/60 text-center py-3">No PCs yet.</p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {pcs.map((pc) => {
            const isSelected = selectedType === "pc" && selectedId === pc.id;
            return (
              <button
                key={pc.id}
                onClick={() => onSelectPc(pc)}
                className={`w-full text-left px-2 py-1 rounded text-sm truncate transition-colors ${
                  isSelected
                    ? "bg-primary/20 border border-primary/40 text-primary font-medium"
                    : "text-foreground/80 hover:bg-muted border border-transparent"
                }`}
              >
                {pc.name}
                <span className="ml-1 text-xs text-muted-foreground/60">
                  Lv{pc.level} {pc.character_class}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
