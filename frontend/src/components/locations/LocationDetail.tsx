"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import type { Location } from "@/types";

// Biome values are stored canonically in English on the backend; only the
// display label is localized via the `biomeXxx` keys below.
const BIOMES = [
  { value: "Urban", labelKey: "biomeUrban" },
  { value: "Forest", labelKey: "biomeForest" },
  { value: "Mountain", labelKey: "biomeMountain" },
  { value: "Desert", labelKey: "biomeDesert" },
  { value: "Coastal", labelKey: "biomeCoastal" },
  { value: "Underground", labelKey: "biomeUnderground" },
] as const;

function buildBreadcrumb(location: Location, allLocations: Location[]): string {
  const parts: string[] = [location.name];
  const byId = new Map<string, Location>();
  for (const loc of allLocations) {
    byId.set(loc.id, loc);
  }

  let current = location;
  // Walk up max 20 levels to avoid infinite loops in malformed data
  for (let i = 0; i < 20; i++) {
    if (!current.parent_id) break;
    const parent = byId.get(current.parent_id);
    if (!parent) break;
    parts.push(parent.name);
    current = parent;
  }

  // Reverse so topmost ancestor is on the right, matching "Cellar ← Inn ← Town"
  return parts.join(" ← ");
}

interface LocationDetailProps {
  location: Location;
  allLocations: Location[];
  onSave: (id: string, data: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => void;
  onClose: () => void;
  isCurrent?: boolean;
  onSetCurrent?: () => void;
}

export default function LocationDetail({
  location,
  allLocations,
  onSave,
  onDelete,
  onClose,
  isCurrent,
  onSetCurrent,
}: LocationDetailProps) {
  const t = useTranslations("builder.locationDetail");
  const [name, setName] = useState(location.name);
  const [description, setDescription] = useState(location.description ?? "");
  const [biome, setBiome] = useState(location.biome);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync local state when the selected location changes
  useEffect(() => {
    setName(location.name);
    setDescription(location.description ?? "");
    setBiome(location.biome);
    setConfirmDelete(false);
    setSaveError(null);
  }, [location.id, location.name, location.description, location.biome]);

  const patch = useMemo<Record<string, unknown>>(() => {
    const p: Record<string, unknown> = {};
    const trimmedName = name.trim();
    if (trimmedName && trimmedName !== location.name) p.name = trimmedName;
    const trimmedDesc = description.trim();
    if (trimmedDesc !== (location.description ?? "")) {
      p.description = trimmedDesc || null;
    }
    if (biome !== location.biome) p.biome = biome;
    return p;
  }, [name, description, biome, location]);

  const isDirty = Object.keys(patch).length > 0;
  const canSave = isDirty && name.trim().length > 0;

  async function handleSave() {
    if (!canSave || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(location.id, patch);
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  const breadcrumb = buildBreadcrumb(location, allLocations);

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      {allLocations.length > 1 && location.parent_id && (
        <p className="text-xs text-muted-foreground/60">
          {breadcrumb}
        </p>
      )}

      {/* Current-location indicator / action */}
      {isCurrent ? (
        <div className="flex items-center gap-2 text-xs text-primary font-medium">
          <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{t("currentLocationBadge")}</span>
        </div>
      ) : onSetCurrent ? (
        <button
          onClick={onSetCurrent}
          className="self-start flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{t("setAsCurrent")}</span>
        </button>
      ) : null}

      {/* Name */}
      <section className="flex flex-col gap-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t("name")}
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-ring transition-colors"
          placeholder={t("namePlaceholder")}
        />
      </section>

      {/* Description */}
      <section className="flex flex-col gap-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t("description")}
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          className="bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-ring transition-colors resize-none"
          placeholder={t("descriptionPlaceholder")}
        />
      </section>

      {/* Biome */}
      <section className="flex flex-col gap-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t("biome")}
        </label>
        <div className="flex flex-wrap gap-2">
          {BIOMES.map(({ value, labelKey }) => (
            <button
              key={value}
              onClick={() => setBiome(value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                biome === value
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-muted border-border text-foreground/80 hover:border-border"
              }`}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      </section>

      {saveError && (
        <div className="text-destructive text-sm">{saveError}</div>
      )}

      {/* Save / Discard */}
      <section className="flex items-center gap-2 pt-2 border-t border-border">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!canSave || saving}
          className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? t("saving") : t("saveButton")}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-muted-foreground hover:text-foreground px-3 py-2"
        >
          {isDirty ? t("discardButton") : t("closeButton")}
        </button>

        {/* Delete on the right */}
        <div className="ml-auto">
          {confirmDelete ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{t("deletePrompt", { name: location.name })}</span>
              <button
                onClick={() => onDelete(location.id)}
                className="text-sm bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-800 dark:hover:bg-red-700 dark:text-white px-3 py-1 rounded transition-colors"
              >
                {t("yesDelete")}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-sm text-muted-foreground hover:text-foreground/80 px-2 py-1 transition-colors"
              >
                {t("cancel")}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-sm text-red-500 hover:text-red-400 transition-colors"
            >
              {t("deleteLocation")}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
