"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Campaign, CampaignIdea, CampaignPhase, Quest, Location } from "@/types";
import PhaseCard from "./PhaseCard";
import IdeasHelper from "./IdeasHelper";

interface StoryTabProps {
  campaign: Campaign;
  onCampaignUpdate: (campaign: Campaign) => void;
  ideas: CampaignIdea[];
  onToggleIdea: (id: string, isDone: boolean) => void;
}

export default function StoryTab({
  campaign,
  onCampaignUpdate,
  ideas,
  onToggleIdea,
}: StoryTabProps) {
  const [worldDescription, setWorldDescription] = useState(
    campaign.world_description ?? ""
  );
  const [phases, setPhases] = useState<CampaignPhase[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [addingPhase, setAddingPhase] = useState(false);
  // Centralized editing lock — only one phase can be in edit mode at a time
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  // Track whether the editing phase was just created (show empty title)
  const [isNewPhase, setIsNewPhase] = useState(false);
  const editingPhaseRef = useRef<HTMLDivElement>(null);

  // Keep world description in sync if campaign prop changes externally
  useEffect(() => {
    setWorldDescription(campaign.world_description ?? "");
  }, [campaign.world_description]);

  const loadPhases = useCallback(async () => {
    try {
      const loaded = await api.getPhases(campaign.id);
      setPhases(loaded.slice().sort((a, b) => a.sort_order - b.sort_order));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load phases");
    }
  }, [campaign.id]);

  const loadQuestsAndLocations = useCallback(async () => {
    try {
      const [loadedQuests, loadedLocations] = await Promise.all([
        api.getQuests(campaign.id),
        api.getLocations(campaign.id),
      ]);
      setQuests(loadedQuests);
      setLocations(loadedLocations);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load quests/locations"
      );
    }
  }, [campaign.id]);

  useEffect(() => {
    loadPhases();
    loadQuestsAndLocations();
  }, [loadPhases, loadQuestsAndLocations]);

  // Scroll editing phase into view when it opens
  useEffect(() => {
    if (editingPhaseId && editingPhaseRef.current) {
      editingPhaseRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [editingPhaseId]);

  async function saveWorldDescription() {
    const trimmed = worldDescription.trim();
    if (trimmed === (campaign.world_description ?? "")) return;
    try {
      const updated = await api.updateCampaign(campaign.id, {
        world_description: trimmed || null,
      });
      onCampaignUpdate(updated);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save world description"
      );
      setWorldDescription(campaign.world_description ?? "");
    }
  }

  async function handleAddPhase() {
    if (editingPhaseId) {
      toast.warning("Finish editing the current phase before adding a new one");
      editingPhaseRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    setAddingPhase(true);
    try {
      const created = await api.createPhase(campaign.id, {
        title: "New Phase",
        sort_order: phases.length,
      });
      await loadPhases();
      setEditingPhaseId(created.id);
      setIsNewPhase(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add phase");
    } finally {
      setAddingPhase(false);
    }
  }

  async function handleMoveUp(phaseId: string) {
    const idx = phases.findIndex((p) => p.id === phaseId);
    if (idx <= 0) return;
    const prev = phases[idx - 1];
    const curr = phases[idx];
    try {
      await Promise.all([
        api.updatePhase(curr.id, { sort_order: prev.sort_order }),
        api.updatePhase(prev.id, { sort_order: curr.sort_order }),
      ]);
      await loadPhases();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reorder phases");
    }
  }

  async function handleMoveDown(phaseId: string) {
    const idx = phases.findIndex((p) => p.id === phaseId);
    if (idx < 0 || idx >= phases.length - 1) return;
    const next = phases[idx + 1];
    const curr = phases[idx];
    try {
      await Promise.all([
        api.updatePhase(curr.id, { sort_order: next.sort_order }),
        api.updatePhase(next.id, { sort_order: curr.sort_order }),
      ]);
      await loadPhases();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reorder phases");
    }
  }

  return (
    <div className="flex gap-6">
      {/* Main content */}
      <div className="flex-1 flex flex-col gap-8 min-w-0">
        {/* World Description */}
        <section className="flex flex-col gap-2">
          <div>
            <label className="text-sm font-medium text-gray-400 uppercase tracking-wide">
              World Description
            </label>
            <p className="text-xs text-gray-600 mt-0.5">
              (the setting — region, politics, lore)
            </p>
          </div>
          <textarea
            value={worldDescription}
            onChange={(e) => setWorldDescription(e.target.value)}
            onBlur={saveWorldDescription}
            rows={5}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-amber-500 transition-colors resize-none"
            placeholder="Describe the world your campaign takes place in..."
          />
        </section>

        {/* Campaign Phases */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-400 uppercase tracking-wide">
              Campaign Phases
            </label>
            <button
              onClick={handleAddPhase}
              disabled={addingPhase}
              className="text-sm text-amber-500 hover:text-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {addingPhase ? "Adding..." : "+ Add Phase"}
            </button>
          </div>

          {phases.length === 0 ? (
            <div className="text-sm text-gray-600 border border-gray-800 rounded-xl px-4 py-6 text-center">
              No phases yet. Phases help you plan your campaign arc — add one to get started.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {phases.map((phase, idx) => {
                const isThisEditing = phase.id === editingPhaseId;
                return (
                  <div
                    key={phase.id}
                    ref={isThisEditing ? editingPhaseRef : undefined}
                  >
                    <PhaseCard
                      phase={phase}
                      index={idx}
                      totalPhases={phases.length}
                      isEditing={isThisEditing}
                      isNew={isThisEditing && isNewPhase}
                      campaignId={campaign.id}
                      allPhases={phases}
                      onRequestEdit={() => {
                        if (editingPhaseId) {
                          toast.warning("Finish editing the current phase first");
                          editingPhaseRef.current?.scrollIntoView({
                            behavior: "smooth",
                            block: "nearest",
                          });
                          return false;
                        }
                        setEditingPhaseId(phase.id);
                        setIsNewPhase(false);
                        return true;
                      }}
                      onEditDone={() => {
                        setEditingPhaseId(null);
                        setIsNewPhase(false);
                      }}
                      onUpdate={() => {
                        loadPhases();
                        loadQuestsAndLocations();
                      }}
                      onDelete={() => {
                        if (editingPhaseId === phase.id) {
                          setEditingPhaseId(null);
                          setIsNewPhase(false);
                        }
                        loadPhases();
                      }}
                      onMoveUp={() => handleMoveUp(phase.id)}
                      onMoveDown={() => handleMoveDown(phase.id)}
                      quests={quests}
                      locations={locations}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Ideas sidebar */}
      <div className="w-56 flex-shrink-0">
        <div className="sticky top-0 bg-gray-900/80 backdrop-blur-sm rounded-xl border border-gray-800 p-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Story Ideas
          </p>
          <IdeasHelper
            campaignId={campaign.id}
            tag="story"
            ideas={ideas}
            onToggleDone={onToggleIdea}
          />
        </div>
      </div>
    </div>
  );
}
