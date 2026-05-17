"use client";

import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import type { EncounterTemplate, Location } from "@/types";

type Props = {
  templates: EncounterTemplate[];
  locations: Location[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  loading: boolean;
};

const NONE_KEY = "__none__";

export default function EncounterList({
  templates,
  locations,
  selectedId,
  onSelect,
  onCreate,
  loading,
}: Props) {
  const t = useTranslations("encounters.list");

  const locationName = (id: string | null) =>
    id === null
      ? t("noLocationGroup")
      : locations.find((l) => l.id === id)?.name ?? t("noLocationGroup");

  const grouped: Record<string, EncounterTemplate[]> = {};
  for (const tpl of templates) {
    const key = tpl.location_id ?? NONE_KEY;
    (grouped[key] ??= []).push(tpl);
  }
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => a.name.localeCompare(b.name));
  }

  const orderedKeys = [
    ...(grouped[NONE_KEY] ? [NONE_KEY] : []),
    ...locations.map((l) => l.id).filter((id) => grouped[id]),
  ];

  const summarize = (tpl: EncounterTemplate) =>
    tpl.combatants
      .map((c) => (c.count > 1 ? `${c.name} ×${c.count}` : c.name))
      .join(", ");

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={onCreate}
        className="flex items-center gap-2 text-primary hover:text-primary/80 text-sm"
      >
        <Plus size={16} /> {t("addButton")}
      </button>

      {loading && (
        <div className="text-muted-foreground text-sm">{t("loading")}</div>
      )}
      {!loading && templates.length === 0 && (
        <div className="text-muted-foreground text-sm">{t("empty")}</div>
      )}

      {orderedKeys.map((key) => (
        <div key={key} className="flex flex-col gap-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {locationName(key === NONE_KEY ? null : key)}
          </div>
          {grouped[key].map((tpl) => {
            const active = tpl.id === selectedId;
            const summary = summarize(tpl);
            return (
              <button
                type="button"
                key={tpl.id}
                onClick={() => onSelect(tpl.id)}
                className={`text-left rounded px-2 py-1.5 hover:bg-accent ${
                  active ? "bg-accent border border-primary/50" : ""
                }`}
              >
                <div className="text-sm font-medium">{tpl.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {summary ||
                    t("combatantsSummary", { count: tpl.combatants.length })}
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
