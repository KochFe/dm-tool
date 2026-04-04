"use client";

import { useState, useEffect, useCallback } from "react";
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
}

export default function LocationsTab({
  campaign,
  ideas,
  onToggleIdea,
}: LocationsTabProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadLocations = useCallback(async () => {
    try {
      const loaded = await api.getLocations(campaign.id);
      setLocations(loaded);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load locations");
    } finally {
      setLoading(false);
    }
  }, [campaign.id]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  async function handleAddRoot() {
    try {
      const created = await api.createLocation(campaign.id, {
        name: "New Location",
        biome: "Urban",
        parent_id: null,
      });
      setLocations((prev) => [...prev, created]);
      setSelectedId(created.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create location");
    }
  }

  async function handleAddChild(parentId: string) {
    try {
      const created = await api.createLocation(campaign.id, {
        name: "New Location",
        biome: "Urban",
        parent_id: parentId,
      });
      setLocations((prev) => [...prev, created]);
      setSelectedId(created.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create sublocation");
    }
  }

  async function handleSave(id: string, data: Record<string, unknown>) {
    try {
      const updated = await api.updateLocation(id, data);
      setLocations((prev) =>
        prev.map((loc) => (loc.id === id ? updated : loc))
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save location");
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteLocation(id);
      setLocations((prev) => prev.filter((loc) => loc.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete location");
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
      toast.error(err instanceof Error ? err.message : "Failed to reparent location");
    }
  }

  const selectedLocation = locations.find((loc) => loc.id === selectedId) ?? null;

  return (
    <div className="flex gap-4 h-full">
      {/* Left panel: tree */}
      <div className="w-72 flex-shrink-0 bg-card/60 border border-border rounded-xl p-3 flex flex-col">
        {loading ? (
          <p className="text-xs text-muted-foreground/60 text-center py-4">Loading...</p>
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
              Location Details
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
              Select a location to edit its details
            </p>
            {locations.length === 0 && !loading && (
              <button
                onClick={handleAddRoot}
                className="text-sm text-primary hover:text-primary transition-colors"
              >
                + Add your first location
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right panel: ideas */}
      <div className="w-56 flex-shrink-0">
        <div className="sticky top-0 bg-card/80 backdrop-blur-sm rounded-xl border border-border p-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Location Ideas
          </p>
          <IdeasHelper
            campaignId={campaign.id}
            tag="location"
            ideas={ideas}
            onToggleDone={onToggleIdea}
          />
        </div>
      </div>
    </div>
  );
}
