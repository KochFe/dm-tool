"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Npc, NpcCreate, Location } from "@/types";
import ConfirmButton from "@/components/ConfirmButton";
import { CardListSkeleton } from "@/components/skeletons/CardSkeleton";
import LocationHoverCard from "@/components/LocationHoverCard";

const EMPTY_FORM = {
  name: "",
  race: "",
  npc_class: "",
  description: "",
  personality: "",
  motivation: "",
  secrets: "",
  location_id: "",
  is_alive: true,
  statsJson: "",
};

type FormState = typeof EMPTY_FORM;

function parseStats(raw: string): Record<string, number> | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const parsed = JSON.parse(trimmed) as unknown;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Stats must be a JSON object, e.g. {\"str\": 10, \"dex\": 14}");
  }
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof v !== "number") {
      throw new Error(`Stats value for "${k}" must be a number`);
    }
    result[k] = v;
  }
  return result;
}

function npcToForm(npc: Npc): FormState {
  return {
    name: npc.name,
    race: npc.race,
    npc_class: npc.npc_class ?? "",
    description: npc.description ?? "",
    personality: npc.personality ?? "",
    motivation: npc.motivation ?? "",
    secrets: npc.secrets ?? "",
    location_id: npc.location_id ?? "",
    is_alive: npc.is_alive,
    statsJson: npc.stats ? JSON.stringify(npc.stats, null, 2) : "",
  };
}

const INPUT_CLS =
  "bg-muted border border-border text-foreground rounded-lg px-3 py-2 w-full focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/50 placeholder:text-muted-foreground transition-colors";

const TEXTAREA_CLS =
  "bg-muted border border-border text-foreground rounded-lg px-3 py-2 w-full focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/50 placeholder:text-muted-foreground transition-colors resize-none";

export default function NPCSection({
  campaignId,
  locations,
  refreshKey = 0,
}: {
  campaignId: string;
  locations: Location[];
  refreshKey?: number;
}) {
  const [npcs, setNpcs] = useState<Npc[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const loadNpcs = async () => {
    try {
      setFetchError(null);
      const data = await api.getNpcs(campaignId);
      setNpcs(data);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load NPCs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNpcs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, refreshKey]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setSubmitError(null);
    setShowForm(true);
  };

  const openEdit = (npc: Npc) => {
    setForm(npcToForm(npc));
    setEditId(npc.id);
    setSubmitError(null);
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm(EMPTY_FORM);
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    let stats: Record<string, number> | undefined;
    try {
      stats = parseStats(form.statsJson);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Invalid stats JSON");
      return;
    }

    const payload: NpcCreate = {
      name: form.name,
      race: form.race,
      ...(form.npc_class.trim() && { npc_class: form.npc_class.trim() }),
      ...(form.description.trim() && { description: form.description.trim() }),
      ...(form.personality.trim() && { personality: form.personality.trim() }),
      ...(form.motivation.trim() && { motivation: form.motivation.trim() }),
      ...(form.secrets.trim() && { secrets: form.secrets.trim() }),
      ...(form.location_id && { location_id: form.location_id }),
      is_alive: form.is_alive,
      ...(stats !== undefined && { stats }),
    };

    setSubmitting(true);
    try {
      if (editId) {
        await api.updateNpc(editId, payload);
        toast.success("NPC updated");
      } else {
        await api.createNpc(campaignId, payload);
        toast.success("NPC created");
      }
      cancelForm();
      await loadNpcs();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setSubmitError(msg.startsWith("[object") ? "Validation error — check all required fields" : msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (npc: Npc) => {
    try {
      await api.deleteNpc(npc.id);
      toast.success("NPC deleted");
      await loadNpcs();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      toast.error(`Failed to delete ${npc.name}: ${msg}`);
      setFetchError(msg);
    }
  };

  const locationName = (id: string | null) =>
    id ? (locations.find((l) => l.id === id)?.name ?? null) : null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">NPCs</h2>
        <button
          onClick={showForm ? cancelForm : openCreate}
          className="text-sm bg-accent hover:bg-muted text-foreground px-3 py-1.5 rounded-lg transition-colors"
        >
          {showForm ? "Cancel" : "+ Add"}
        </button>
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-muted/50 border border-border rounded-xl p-4 mb-4 space-y-3"
        >
          {/* Name */}
          <input
            placeholder="Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={INPUT_CLS}
            required
          />

          {/* Race + Class */}
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Race *"
              value={form.race}
              onChange={(e) => setForm({ ...form, race: e.target.value })}
              className={INPUT_CLS}
              required
            />
            <input
              placeholder="Class (optional)"
              value={form.npc_class}
              onChange={(e) => setForm({ ...form, npc_class: e.target.value })}
              className={INPUT_CLS}
            />
          </div>

          {/* Description */}
          <textarea
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={TEXTAREA_CLS}
            rows={2}
          />

          {/* Personality */}
          <textarea
            placeholder="Personality (optional)"
            value={form.personality}
            onChange={(e) => setForm({ ...form, personality: e.target.value })}
            className={TEXTAREA_CLS}
            rows={2}
          />

          {/* Motivation */}
          <textarea
            placeholder="Motivation (optional)"
            value={form.motivation}
            onChange={(e) => setForm({ ...form, motivation: e.target.value })}
            className={TEXTAREA_CLS}
            rows={2}
          />

          {/* Secrets */}
          <textarea
            placeholder="Secrets (optional)"
            value={form.secrets}
            onChange={(e) => setForm({ ...form, secrets: e.target.value })}
            className={TEXTAREA_CLS}
            rows={2}
          />

          {/* Stats JSON */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Stats — JSON format, e.g.{" "}
              <span className="font-mono text-muted-foreground">
                {"{"}
                &quot;str&quot;: 10, &quot;dex&quot;: 14
                {"}"}
              </span>
            </label>
            <textarea
              placeholder='{"str": 10, "dex": 14, "con": 12}'
              value={form.statsJson}
              onChange={(e) => setForm({ ...form, statsJson: e.target.value })}
              className={`${TEXTAREA_CLS} font-mono text-sm`}
              rows={2}
            />
          </div>

          {/* Location + Alive */}
          <div className="grid grid-cols-2 gap-2 items-end">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Location</label>
              <select
                value={form.location_id}
                onChange={(e) => setForm({ ...form, location_id: e.target.value })}
                className="bg-muted border border-border text-foreground rounded-lg px-3 py-2 w-full focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/50 transition-colors"
              >
                <option value="">— None —</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-foreground/80 cursor-pointer pb-2">
              <input
                type="checkbox"
                checked={form.is_alive}
                onChange={(e) => setForm({ ...form, is_alive: e.target.checked })}
                className="w-4 h-4 rounded accent-primary"
              />
              Alive
            </label>
          </div>

          {/* Error */}
          {submitError && (
            <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">
              {submitError}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {submitting ? "Saving…" : editId ? "Update" : "Create"}
          </button>
        </form>
      )}

      {/* Fetch error banner */}
      {fetchError && (
        <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2 mb-3">
          {fetchError}
        </p>
      )}

      {/* List */}
      {loading ? (
        <CardListSkeleton count={3} />
      ) : npcs.length === 0 ? (
        <p className="text-muted-foreground text-sm">No NPCs yet.</p>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
          {npcs.map((npc) => {
            return (
              <motion.div
                key={npc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="bg-muted/50 border border-border rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Name + status badge */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground">{npc.name}</p>
                      {npc.is_alive ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-900/50 text-green-400 border border-green-800/60">
                          Alive
                        </span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-900/50 text-red-400 border border-red-800/60">
                          Dead
                        </span>
                      )}
                    </div>

                    {/* Race / class */}
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {npc.race}
                      {npc.npc_class && (
                        <span className="text-muted-foreground"> &middot; {npc.npc_class}</span>
                      )}
                    </p>

                    {/* Location tag */}
                    {npc.location_id && (() => {
                      const location = locations.find((l) => l.id === npc.location_id);
                      if (!location) return null;
                      return (
                        <p className="text-xs text-muted-foreground mt-1">
                          <LocationHoverCard location={location}>
                            <span className="inline-block bg-accent/60 rounded px-1.5 py-0.5 cursor-pointer hover:bg-muted/60 transition-colors">
                              {location.name}
                            </span>
                          </LocationHoverCard>
                        </p>
                      );
                    })()}

                    {/* Description snippet */}
                    {npc.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {npc.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 shrink-0">
                    {confirmingId !== npc.id && (
                      <button
                        onClick={() => openEdit(npc)}
                        className="text-sm bg-accent hover:bg-muted text-foreground px-3 py-1 rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                    )}
                    <ConfirmButton
                      onConfirm={() => handleDelete(npc)}
                      label="Delete"
                      confirmLabel="Are you sure?"
                      className="text-sm bg-red-700/50 hover:bg-red-700 text-red-200 px-3 py-1 rounded-lg transition-colors"
                      onConfirmingChange={(c) => setConfirmingId(c ? npc.id : null)}
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
