"use client";

import { useState, useEffect } from "react";
import type { Location } from "@/types";

const BIOMES = [
  "Urban",
  "Forest",
  "Mountain",
  "Desert",
  "Coastal",
  "Underground",
];

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
  return parts.join(" \u2190 ");
}

interface LocationDetailProps {
  location: Location;
  allLocations: Location[];
  onSave: (id: string, data: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}

export default function LocationDetail({
  location,
  allLocations,
  onSave,
  onDelete,
}: LocationDetailProps) {
  const [name, setName] = useState(location.name);
  const [description, setDescription] = useState(location.description ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Sync local state when the selected location changes
  useEffect(() => {
    setName(location.name);
    setDescription(location.description ?? "");
    setConfirmDelete(false);
  }, [location.id, location.name, location.description]);

  function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === location.name) {
      setName(location.name);
      return;
    }
    onSave(location.id, { name: trimmed });
  }

  function saveDescription() {
    const trimmed = description.trim();
    const current = location.description ?? "";
    if (trimmed === current) return;
    onSave(location.id, { description: trimmed || null });
  }

  function selectBiome(biome: string) {
    if (biome === location.biome) return;
    onSave(location.id, { biome });
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

      {/* Name */}
      <section className="flex flex-col gap-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          className="bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-ring transition-colors"
          placeholder="Location name"
        />
      </section>

      {/* Description */}
      <section className="flex flex-col gap-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={saveDescription}
          rows={5}
          className="bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-ring transition-colors resize-none"
          placeholder="Describe this location..."
        />
      </section>

      {/* Biome */}
      <section className="flex flex-col gap-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Biome
        </label>
        <div className="flex flex-wrap gap-2">
          {BIOMES.map((biome) => (
            <button
              key={biome}
              onClick={() => selectBiome(biome)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                location.biome === biome
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-muted border-border text-foreground/80 hover:border-border"
              }`}
            >
              {biome}
            </button>
          ))}
        </div>
      </section>

      {/* Delete */}
      <section className="pt-2 border-t border-border">
        {confirmDelete ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Delete &ldquo;{location.name}&rdquo;?</span>
            <button
              onClick={() => onDelete(location.id)}
              className="text-sm bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-800 dark:hover:bg-red-700 dark:text-white px-3 py-1 rounded transition-colors"
            >
              Yes, delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-sm text-muted-foreground hover:text-foreground/80 px-2 py-1 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-sm text-red-500 hover:text-red-400 transition-colors"
          >
            Delete location
          </button>
        )}
      </section>
    </div>
  );
}
