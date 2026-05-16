"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("entitySheet");
  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {npc.race}
          {npc.npc_class ? ` · ${npc.npc_class}` : ""}
        </span>
        <Badge variant={npc.is_alive ? "secondary" : "destructive"} className="text-xs">
          {npc.is_alive ? t("alive") : t("dead")}
        </Badge>
      </div>
      {npc.description && <Field label={t("description")} value={npc.description} />}
      {npc.personality && <Field label={t("personality")} value={npc.personality} />}
      {npc.motivation && <Field label={t("motivation")} value={npc.motivation} />}
      {npc.secrets && <Field label={t("secrets")} value={npc.secrets} />}
    </>
  );
}

function LocationDetail({ location }: { location: Location }) {
  const t = useTranslations("entitySheet");
  return (
    <>
      <Badge variant="secondary" className="text-xs capitalize">{location.biome}</Badge>
      {location.description && <Field label={t("description")} value={location.description} />}
    </>
  );
}

function QuestDetail({ quest }: { quest: Quest }) {
  const t = useTranslations("entitySheet");
  return (
    <>
      <Badge variant="secondary" className="text-xs capitalize">
        {quest.status.replace("_", " ")}
      </Badge>
      {quest.description && <Field label={t("description")} value={quest.description} />}
      {quest.reward && <Field label={t("reward")} value={quest.reward} />}
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
