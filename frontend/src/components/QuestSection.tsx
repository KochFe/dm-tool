"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Quest, QuestCreate, QuestStatus, Location } from "@/types";
import ConfirmButton from "@/components/ConfirmButton";
import { CardListSkeleton } from "@/components/skeletons/CardSkeleton";
import LocationHoverCard from "@/components/LocationHoverCard";

const STATUS_LABELS: Record<QuestStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
  failed: "Failed",
};

const STATUS_BADGE: Record<QuestStatus, string> = {
  not_started: "bg-gray-700 text-gray-300",
  in_progress: "bg-amber-900 text-amber-400",
  completed: "bg-green-900 text-green-400",
  failed: "bg-red-900 text-red-400",
};

const EMPTY_FORM: QuestCreate = {
  title: "",
  description: "",
  status: "not_started",
  reward: "",
  level: undefined,
  location_id: undefined,
};

function levelIndicatorClass(questLevel: number, partyLevel: number): string {
  if (questLevel === partyLevel) return "text-gray-400";
  if (questLevel > partyLevel + 2) return "text-red-400";
  if (questLevel > partyLevel) return "text-amber-400";
  return "text-gray-500";
}

export default function QuestSection({
  campaignId,
  locations,
  partyLevel,
}: {
  campaignId: string;
  locations: Location[];
  partyLevel: number;
}) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<QuestCreate>(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const loadQuests = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getQuests(campaignId);
      setQuests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load quests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Strip empty optional strings to avoid sending "" to backend
    const payload: QuestCreate = {
      title: form.title,
      status: form.status,
      ...(form.description?.trim() ? { description: form.description.trim() } : {}),
      ...(form.reward?.trim() ? { reward: form.reward.trim() } : {}),
      ...(form.level !== undefined && form.level !== null ? { level: form.level } : {}),
      ...(form.location_id ? { location_id: form.location_id } : {}),
    };

    try {
      if (editId) {
        await api.updateQuest(editId, payload);
        toast.success("Quest updated");
      } else {
        await api.createQuest(campaignId, payload);
        toast.success("Quest created");
      }
      setForm(EMPTY_FORM);
      setShowForm(false);
      setEditId(null);
      await loadQuests();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed.";
      setSubmitError(msg.startsWith("[object") ? "Validation error — check all fields." : msg);
    }
  };

  const startEdit = (quest: Quest) => {
    setForm({
      title: quest.title,
      description: quest.description ?? "",
      status: quest.status,
      reward: quest.reward ?? "",
      level: quest.level ?? undefined,
      location_id: quest.location_id ?? undefined,
    });
    setEditId(quest.id);
    setShowForm(true);
    setSubmitError(null);
  };

  const handleDelete = async (id: string) => {
    setDeleteError(null);
    try {
      await api.deleteQuest(id);
      toast.success("Quest deleted");
      await loadQuests();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed.";
      toast.error(`Failed to delete quest: ${msg}`);
      setDeleteError(msg);
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm(EMPTY_FORM);
    setSubmitError(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-100">Quests</h2>
        <button
          onClick={() => {
            if (showForm) {
              cancelForm();
            } else {
              setShowForm(true);
              setEditId(null);
              setForm(EMPTY_FORM);
              setSubmitError(null);
            }
          }}
          className="text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded-lg transition-colors"
        >
          {showForm ? "Cancel" : "+ Add"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 mb-4 space-y-3"
        >
          <input
            placeholder="Quest title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="bg-gray-800 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 w-full focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 placeholder-gray-500 transition-colors"
            required
          />
          <textarea
            placeholder="Description (optional)"
            value={form.description ?? ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="bg-gray-800 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 w-full focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 placeholder-gray-500 transition-colors resize-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Status</label>
              <select
                value={form.status ?? "not_started"}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as QuestStatus })
                }
                className="bg-gray-800 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 w-full focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-colors"
              >
                {(Object.keys(STATUS_LABELS) as QuestStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Location (optional)</label>
              <select
                value={form.location_id ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    location_id: e.target.value || undefined,
                  })
                }
                className="bg-gray-800 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 w-full focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-colors"
              >
                <option value="">— None —</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Reward (optional)</label>
              <input
                placeholder="e.g. 500 gp, Magic Sword"
                value={form.reward ?? ""}
                onChange={(e) => setForm({ ...form, reward: e.target.value })}
                className="bg-gray-800 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 w-full focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 placeholder-gray-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">
                Recommended Level (optional)
              </label>
              <input
                type="number"
                min={1}
                max={20}
                placeholder="1–20"
                value={form.level ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    level: e.target.value === "" ? undefined : +e.target.value,
                  })
                }
                className="bg-gray-800 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 w-full focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 placeholder-gray-500 transition-colors"
              />
            </div>
          </div>
          {submitError && (
            <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">
              {submitError}
            </p>
          )}
          <button
            type="submit"
            className="bg-amber-600 hover:bg-amber-500 text-gray-950 font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {editId ? "Update Quest" : "Create Quest"}
          </button>
        </form>
      )}

      {deleteError && (
        <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2 mb-3">
          {deleteError}
        </p>
      )}

      {loading ? (
        <CardListSkeleton count={3} />
      ) : error ? (
        <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">
          {error}
        </p>
      ) : quests.length === 0 ? (
        <p className="text-gray-400 text-sm">No quests yet.</p>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
          {quests.map((quest) => {
            return (
              <motion.div
                key={quest.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-100">{quest.title}</p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[quest.status]}`}
                      >
                        {STATUS_LABELS[quest.status]}
                      </span>
                      {quest.level !== null && quest.level !== undefined && (
                        <span
                          className={`text-xs font-medium ${levelIndicatorClass(quest.level, partyLevel)}`}
                          title={
                            quest.level > partyLevel
                              ? `Quest Level ${quest.level} - Above party level (${partyLevel}), may be dangerous`
                              : quest.level === partyLevel
                              ? `Quest Level ${quest.level} - Appropriate for party level`
                              : `Quest Level ${quest.level} - Below party level (${partyLevel})`
                          }
                        >
                          Lv.{quest.level}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                      {quest.location_id && (() => {
                        const location = locations.find((l) => l.id === quest.location_id);
                        if (!location) return null;
                        return (
                          <LocationHoverCard location={location}>
                            <span className="text-xs text-gray-400 cursor-pointer hover:text-gray-300 transition-colors">
                              {location.name}
                            </span>
                          </LocationHoverCard>
                        );
                      })()}
                      {quest.reward && (
                        <span className="text-xs text-amber-500/80">
                          Reward: {quest.reward}
                        </span>
                      )}
                    </div>
                    {quest.description && (
                      <p className="text-sm text-gray-400 mt-1.5 leading-snug line-clamp-2">
                        {quest.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {confirmingId !== quest.id && (
                      <button
                        onClick={() => startEdit(quest)}
                        className="text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1 rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                    )}
                    <ConfirmButton
                      onConfirm={() => handleDelete(quest.id)}
                      label="Delete"
                      confirmLabel="Are you sure?"
                      className="text-sm bg-red-700/50 hover:bg-red-700 text-red-200 px-3 py-1 rounded-lg transition-colors"
                      onConfirmingChange={(c) => setConfirmingId(c ? quest.id : null)}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
