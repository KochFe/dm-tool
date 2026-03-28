"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useCampaign } from "@/contexts/CampaignContext";
import EntitySheet from "@/components/EntitySheet";
import type { Npc, Location, Quest } from "@/types";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

type Entity =
  | { type: "npc"; data: Npc }
  | { type: "location"; data: Location }
  | { type: "quest"; data: Quest };

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [sheetEntity, setSheetEntity] = useState<Entity | null>(null);
  const router = useRouter();
  const { campaign, characters, locations, npcs, quests } = useCampaign();
  const base = `/campaigns/${campaign.id}`;

  const [diceResult, setDiceResult] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");

  const isDiceNotation = /^\d+d\d+([+-]\d+)?$/.test(inputValue.trim());

  const rollDice = async (notation: string) => {
    try {
      const result = await api.rollDice(notation);
      setDiceResult(`${notation}: ${result.total} [${result.rolls.join(", ")}]`);
    } catch {
      setDiceResult(`Invalid dice notation: ${notation}`);
    }
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const navigate = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  const viewEntity = (entity: Entity) => {
    setOpen(false);
    setSheetEntity(entity);
  };

  return (
    <>
      <CommandDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setDiceResult(null); setInputValue(""); } }}>
        <CommandInput
          placeholder="Search campaigns, NPCs, locations... or type dice like 2d6+3"
          onValueChange={setInputValue}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Navigation">
            {[
              { label: "Overview", path: `${base}/overview` },
              { label: "Characters", path: `${base}/characters` },
              { label: "Locations", path: `${base}/locations` },
              { label: "NPCs", path: `${base}/npcs` },
              { label: "Quests", path: `${base}/quests` },
              { label: "Session", path: `${base}/session` },
              { label: "Settings", path: `${base}/settings` },
            ].map((item) => (
              <CommandItem key={item.path} onSelect={() => navigate(item.path)}>
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>

          {diceResult && (
            <div className="px-3 py-2 text-sm text-amber-400 border-b border-gray-800">
              {diceResult}
            </div>
          )}

          <CommandGroup heading="Actions">
            {isDiceNotation && (
              <CommandItem onSelect={() => rollDice(inputValue.trim())}>
                Roll {inputValue.trim()}
              </CommandItem>
            )}
            <CommandItem onSelect={() => navigate(`${base}/session`)}>
              Go to Session
            </CommandItem>
          </CommandGroup>

          {characters.length > 0 && (
            <CommandGroup heading="Characters">
              {characters.map((c) => (
                <CommandItem
                  key={c.id}
                  onSelect={() => navigate(`${base}/characters`)}
                >
                  {c.name}
                  <span className="ml-2 text-xs text-gray-500">
                    {c.race} {c.character_class}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {npcs.length > 0 && (
            <CommandGroup heading="NPCs">
              {npcs.map((n) => (
                <CommandItem
                  key={n.id}
                  onSelect={() => viewEntity({ type: "npc", data: n })}
                >
                  {n.name}
                  <span className="ml-2 text-xs text-gray-500">{n.race}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {locations.length > 0 && (
            <CommandGroup heading="Locations">
              {locations.map((l) => (
                <CommandItem
                  key={l.id}
                  onSelect={() => viewEntity({ type: "location", data: l })}
                >
                  {l.name}
                  <span className="ml-2 text-xs text-gray-500 capitalize">
                    {l.biome}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {quests.length > 0 && (
            <CommandGroup heading="Quests">
              {quests.map((q) => (
                <CommandItem
                  key={q.id}
                  onSelect={() => viewEntity({ type: "quest", data: q })}
                >
                  {q.title}
                  <span className="ml-2 text-xs text-gray-500 capitalize">
                    {q.status.replace("_", " ")}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>

      <EntitySheet entity={sheetEntity} onClose={() => setSheetEntity(null)} />
    </>
  );
}
