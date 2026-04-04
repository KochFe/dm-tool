"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import type { Npc, Location, Quest } from "@/types";

type Entity =
  | { type: "npc"; data: Npc }
  | { type: "location"; data: Location }
  | { type: "quest"; data: Quest };

interface EntitySheetProps {
  entity: Entity | null;
  onClose: () => void;
}

export default function EntitySheet({ entity, onClose }: EntitySheetProps) {
  if (!entity) return null;

  return (
    <Sheet open={!!entity} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="bg-card border-border text-foreground">
        <SheetHeader>
          <SheetTitle className="text-foreground">
            {entity.type === "npc" && entity.data.name}
            {entity.type === "location" && entity.data.name}
            {entity.type === "quest" && entity.data.title}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4 px-4">
          {entity.type === "npc" && <NpcDetail npc={entity.data} />}
          {entity.type === "location" && <LocationDetail location={entity.data} />}
          {entity.type === "quest" && <QuestDetail quest={entity.data} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function NpcDetail({ npc }: { npc: Npc }) {
  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {npc.race}
          {npc.npc_class ? ` · ${npc.npc_class}` : ""}
        </span>
        <Badge variant={npc.is_alive ? "secondary" : "destructive"} className="text-xs">
          {npc.is_alive ? "Alive" : "Dead"}
        </Badge>
      </div>
      {npc.description && <Field label="Description" value={npc.description} />}
      {npc.personality && <Field label="Personality" value={npc.personality} />}
      {npc.motivation && <Field label="Motivation" value={npc.motivation} />}
      {npc.secrets && <Field label="Secrets" value={npc.secrets} />}
    </>
  );
}

function LocationDetail({ location }: { location: Location }) {
  return (
    <>
      <Badge variant="secondary" className="text-xs capitalize">{location.biome}</Badge>
      {location.description && <Field label="Description" value={location.description} />}
    </>
  );
}

function QuestDetail({ quest }: { quest: Quest }) {
  return (
    <>
      <Badge variant="secondary" className="text-xs capitalize">
        {quest.status.replace("_", " ")}
      </Badge>
      {quest.description && <Field label="Description" value={quest.description} />}
      {quest.reward && <Field label="Reward" value={quest.reward} />}
      {quest.level && (
        <p className="text-sm text-muted-foreground">Recommended Level: {quest.level}</p>
      )}
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  );
}
