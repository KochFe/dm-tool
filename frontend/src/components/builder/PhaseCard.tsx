"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { CampaignPhase, Quest, Location } from "@/types";

interface PhaseCardProps {
  phase: CampaignPhase;
  index: number;
  totalPhases: number;
  onUpdate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  quests: Quest[];
  locations: Location[];
}

export default function PhaseCard({
  phase,
  index,
  totalPhases,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  quests,
  locations,
}: PhaseCardProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(phase.title);
  const [description, setDescription] = useState(phase.description ?? "");
  const [selectedQuestIds, setSelectedQuestIds] = useState<Set<string>>(
    new Set(phase.quest_ids)
  );
  const [selectedLocationIds, setSelectedLocationIds] = useState<Set<string>>(
    new Set(phase.location_ids)
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function enterEdit() {
    setTitle(phase.title);
    setDescription(phase.description ?? "");
    setSelectedQuestIds(new Set(phase.quest_ids));
    setSelectedLocationIds(new Set(phase.location_ids));
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function handleSave() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error("Phase title cannot be empty");
      return;
    }
    setSaving(true);
    try {
      await api.updatePhase(phase.id, {
        title: trimmedTitle,
        description: description.trim() || undefined,
      });
      await api.setPhaseQuests(phase.id, Array.from(selectedQuestIds));
      await api.setPhaseLocations(phase.id, Array.from(selectedLocationIds));
      setEditing(false);
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save phase");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.deletePhase(phase.id);
      onDelete();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete phase");
      setDeleting(false);
    }
  }

  function toggleQuestId(id: string) {
    setSelectedQuestIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleLocationId(id: string) {
    setSelectedLocationIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const linkedQuestTitles = quests
    .filter((q) => phase.quest_ids.includes(q.id))
    .map((q) => q.title);

  const linkedLocationNames = locations
    .filter((l) => phase.location_ids.includes(l.id))
    .map((l) => l.name);

  if (editing) {
    return (
      <div className="bg-gray-800 border border-amber-600/30 rounded-xl p-4 flex flex-col gap-4">
        {/* Title row */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            Phase Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-amber-500 transition-colors"
            placeholder="Phase title"
            autoFocus
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-amber-500 transition-colors resize-none"
            placeholder="Describe what happens in this phase..."
          />
        </div>

        {/* Quest linking */}
        {quests.length > 0 && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Linked Quests
            </label>
            <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
              {quests.map((q) => (
                <label
                  key={q.id}
                  className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-gray-100"
                >
                  <input
                    type="checkbox"
                    checked={selectedQuestIds.has(q.id)}
                    onChange={() => toggleQuestId(q.id)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-800 accent-amber-500"
                  />
                  {q.title}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Location linking */}
        {locations.length > 0 && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Linked Locations
            </label>
            <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
              {locations.map((loc) => (
                <label
                  key={loc.id}
                  className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-gray-100"
                >
                  <input
                    type="checkbox"
                    checked={selectedLocationIds.has(loc.id)}
                    onChange={() => toggleLocationId(loc.id)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-800 accent-amber-500"
                  />
                  {loc.name}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-gray-950 text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={cancelEdit}
            disabled={saving}
            className="text-sm text-gray-400 hover:text-gray-200 px-3 py-1.5 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700/50 rounded-xl p-4 flex flex-col gap-2">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-amber-600/15 text-amber-500 text-xs font-semibold px-2 py-0.5 rounded whitespace-nowrap">
            PHASE {index + 1}
          </span>
          <span className="text-gray-100 font-medium">{phase.title}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Reorder buttons */}
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            title="Move up"
            className="text-gray-600 hover:text-gray-300 disabled:opacity-20 disabled:cursor-not-allowed p-1 rounded transition-colors"
          >
            &#8593;
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === totalPhases - 1}
            title="Move down"
            className="text-gray-600 hover:text-gray-300 disabled:opacity-20 disabled:cursor-not-allowed p-1 rounded transition-colors"
          >
            &#8595;
          </button>
          <button
            onClick={enterEdit}
            className="text-sm text-amber-500 hover:text-amber-400 px-2 py-0.5 rounded transition-colors"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            title="Delete phase"
            className="text-gray-600 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed px-1.5 py-0.5 rounded transition-colors text-base leading-none"
          >
            &times;
          </button>
        </div>
      </div>

      {/* Description */}
      {phase.description && (
        <p className="text-sm text-gray-400 line-clamp-3">{phase.description}</p>
      )}

      {/* Links summary */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
        <span>
          Linked:{" "}
          <span className="text-gray-400">
            {linkedQuestTitles.length > 0
              ? `${linkedQuestTitles.length} quest${linkedQuestTitles.length !== 1 ? "s" : ""}`
              : "none yet"}
          </span>
        </span>
        <span>
          Locations:{" "}
          <span className="text-gray-400">
            {linkedLocationNames.length > 0
              ? linkedLocationNames.join(", ")
              : "none yet"}
          </span>
        </span>
      </div>
    </div>
  );
}
