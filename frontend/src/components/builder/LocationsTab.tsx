"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Campaign, CampaignIdea, Location } from "@/types";
import LocationTree from "./LocationTree";
import LocationDetail from "./LocationDetail";
import IdeasHelper from "./IdeasHelper";

interface LocationsTabProps {
  campaign: Campaign;
  ideas: CampaignIdea[];
  onToggleIdea: (id: string, isDone: boolean) => void;
  reloadIdeas: () => Promise<void>;
}

export default function LocationsTab({
  campaign,
  ideas,
  onToggleIdea,
  reloadIdeas,
}: LocationsTabProps) {
  const t = useTranslations("builder.locationsTab");
  const tTree = useTranslations("builder.locationTree");
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadLocations = useCallback(async () => {
    try {
      const loaded = await api.getLocations(campaign.id);
      setLocations(loaded);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [campaign.id, t]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  async function handleAddRoot() {
    try {
      const created = await api.createLocation(campaign.id, {
        name: tTree("newLocation"),
        biome: "Urban",
        parent_id: null,
      });
      setLocations((prev) => [...prev, created]);
      setSelectedId(created.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("createError"));
    }
  }

  async function handleAddChild(parentId: string) {
    try {
      const created = await api.createLocation(campaign.id, {
        name: tTree("newLocation"),
        biome: "Urban",
        parent_id: parentId,
      });
      setLocations((prev) => [...prev, created]);
      setSelectedId(created.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("createSubError"));
    }
  }

  async function handleSave(id: string, data: Record<string, unknown>) {
    try {
      const updated = await api.updateLocation(id, data);
      setLocations((prev) =>
        prev.map((loc) => (loc.id === id ? updated : loc))
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("saveError"));
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteLocation(id);
      setLocations((prev) => prev.filter((loc) => loc.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("deleteError"));
    }
  }

  async function handleReparent(draggedId: string, newParentId: string | null) {
    // Prevent reparenting to itself
    if (draggedId === newParentId) return;
    try {
      const updated = await api.updateLocation(draggedId, {
        parent_id: newParentId,
      });
      setLocations((prev) =>
        prev.map((loc) => (loc.id === draggedId ? updated : loc))
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("reparentError"));
    }
  }

  const selectedLocation = locations.find((loc) => loc.id === selectedId) ?? null;

  return (
    <div className="flex gap-4 h-full">
      {/* Left panel: tree */}
      <div className="w-72 flex-shrink-0 bg-card/60 border border-border rounded-xl p-3 flex flex-col">
        {loading ? (
          <p className="text-xs text-muted-foreground/60 text-center py-4">{t("loading")}</p>
        ) : (
          <LocationTree
            locations={locations}
            selectedId={selectedId}
            onSelect={(loc) => setSelectedId(loc.id)}
            onAddRoot={handleAddRoot}
            onAddChild={handleAddChild}
            onReparent={handleReparent}
          />
        )}
      </div>

      {/* Center panel: detail editor */}
      <div className="flex-1 min-w-0 bg-card/60 border border-border rounded-xl p-5 overflow-y-auto">
        {selectedLocation ? (
          <>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">
              {t("locationDetails")}
            </p>
            <LocationDetail
              location={selectedLocation}
              allLocations={locations}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <svg
              className="w-10 h-10 text-muted-foreground/40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <p className="text-sm text-muted-foreground/60">
              {t("selectToEdit")}
            </p>
            {locations.length === 0 && !loading && (
              <button
                onClick={handleAddRoot}
                className="text-sm text-primary hover:text-primary transition-colors"
              >
                {t("addFirst")}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right panel: ideas */}
      <div className="w-56 flex-shrink-0">
        <div className="sticky top-0 bg-card/80 backdrop-blur-sm rounded-xl border border-border p-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            {t("locationIdeas")}
          </p>
          <IdeasHelper
            campaignId={campaign.id}
            tag="location"
            ideas={ideas}
            onToggleDone={onToggleIdea}
            onIdeaCreated={reloadIdeas}
          />
        </div>
      </div>
    </div>
  );
}
