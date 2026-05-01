"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCampaign } from "@/contexts/CampaignContext";
import EntitySheet from "@/components/EntitySheet";
import KeyboardShortcutsDialog from "@/components/KeyboardShortcutsDialog";
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

  const t = useTranslations("commandPalette");
  const tSidebar = useTranslations("sidebar");

  const [diceResult, setDiceResult] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

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
          placeholder={t("placeholder")}
          onValueChange={setInputValue}
        />
        <CommandList>
          <CommandEmpty>{t("noResults")}</CommandEmpty>

          <CommandGroup heading={t("headingNavigation")}>
            {[
              { label: tSidebar("overview"), path: `${base}/overview` },
              { label: tSidebar("characters"), path: `${base}/characters` },
              { label: tSidebar("locations"), path: `${base}/locations` },
              { label: tSidebar("npcs"), path: `${base}/npcs` },
              { label: tSidebar("quests"), path: `${base}/quests` },
              { label: tSidebar("session"), path: `${base}/session` },
              { label: tSidebar("settings"), path: `${base}/settings` },
            ].map((item) => (
              <CommandItem key={item.path} onSelect={() => navigate(item.path)}>
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>

          {diceResult && (
            <div className="px-3 py-2 text-sm text-primary border-b border-border">
              {diceResult}
            </div>
          )}

          <CommandGroup heading={t("headingActions")}>
            {isDiceNotation && (
              <CommandItem onSelect={() => rollDice(inputValue.trim())}>
                {t("rollDice", { notation: inputValue.trim() })}
              </CommandItem>
            )}
            <CommandItem onSelect={() => { setOpen(false); setShortcutsOpen(true); }}>
              {t("keyboardShortcuts")}
            </CommandItem>
          </CommandGroup>

          {characters.length > 0 && (
            <CommandGroup heading={t("headingCharacters")}>
              {characters.map((c) => (
                <CommandItem
                  key={c.id}
                  onSelect={() => navigate(`${base}/characters`)}
                >
                  {c.name}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {c.race} {c.character_class}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {npcs.length > 0 && (
            <CommandGroup heading={t("headingNpcs")}>
              {npcs.map((n) => (
                <CommandItem
                  key={n.id}
                  onSelect={() => viewEntity({ type: "npc", data: n })}
                >
                  {n.name}
                  <span className="ml-2 text-xs text-muted-foreground">{n.race}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {locations.length > 0 && (
            <CommandGroup heading={t("headingLocations")}>
              {locations.map((l) => (
                <CommandItem
                  key={l.id}
                  onSelect={() => viewEntity({ type: "location", data: l })}
                >
                  {l.name}
                  <span className="ml-2 text-xs text-muted-foreground capitalize">
                    {l.biome}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {quests.length > 0 && (
            <CommandGroup heading={t("headingQuests")}>
              {quests.map((q) => (
                <CommandItem
                  key={q.id}
                  onSelect={() => viewEntity({ type: "quest", data: q })}
                >
                  {q.title}
                  <span className="ml-2 text-xs text-muted-foreground capitalize">
                    {q.status.replace("_", " ")}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>

      <EntitySheet entity={sheetEntity} onClose={() => setSheetEntity(null)} />
      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </>
  );
}
