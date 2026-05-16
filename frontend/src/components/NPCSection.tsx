"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { api, type PersonalityResult } from "@/lib/api";
import type { Npc, NpcCreate, NpcStats, Location } from "@/types";
import ConfirmButton from "@/components/ConfirmButton";
import { CardListSkeleton } from "@/components/skeletons/CardSkeleton";
import LocationHoverCard from "@/components/LocationHoverCard";
import { AIAssistModal } from "@/components/ai/AIAssistModal";

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
  statsEnabled: false,
  statsStr: "10",
  statsDex: "10",
  statsCon: "10",
  statsInt: "10",
  statsWis: "10",
  statsCha: "10",
};

type FormState = typeof EMPTY_FORM;


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
    statsEnabled: npc.stats != null,
    statsStr: npc.stats?.str != null ? String(npc.stats.str) : "10",
    statsDex: npc.stats?.dex != null ? String(npc.stats.dex) : "10",
    statsCon: npc.stats?.con != null ? String(npc.stats.con) : "10",
    statsInt: npc.stats?.int != null ? String(npc.stats.int) : "10",
    statsWis: npc.stats?.wis != null ? String(npc.stats.wis) : "10",
    statsCha: npc.stats?.cha != null ? String(npc.stats.cha) : "10",
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
  const t = useTranslations("npcSection");
  const [npcs, setNpcs] = useState<Npc[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  const loadNpcs = async () => {
    try {
      setFetchError(null);
      const data = await api.getNpcs(campaignId);
      setNpcs(data);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : t("loadError"));
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

    let stats: NpcStats | undefined;
    if (form.statsEnabled) {
      const fields: Array<[keyof NpcStats, string]> = [
        ["str", form.statsStr],
        ["dex", form.statsDex],
        ["con", form.statsCon],
        ["int", form.statsInt],
        ["wis", form.statsWis],
        ["cha", form.statsCha],
      ];
      const parsed: Partial<NpcStats> = {};
      for (const [key, raw] of fields) {
        const trimmed = raw.trim();
        const n = Number.parseInt(trimmed, 10);
        if (!Number.isFinite(n) || n < 1 || n > 30 || String(n) !== trimmed) {
          setSubmitError(t("statsOutOfRange"));
          return;
        }
        parsed[key] = n;
      }
      stats = parsed as NpcStats;
    }

    const editingNpc = editId ? npcs.find((n) => n.id === editId) ?? null : null;

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
      ...(form.statsEnabled && stats
        ? { stats }
        : editingNpc?.stats != null
          ? { stats: null }
          : {}),
    };

    setSubmitting(true);
    try {
      if (editId) {
        await api.updateNpc(editId, payload);
        toast.success(t("toastUpdated"));
      } else {
        await api.createNpc(campaignId, payload);
        toast.success(t("toastCreated"));
      }
      cancelForm();
      await loadNpcs();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("unknownError");
      setSubmitError(msg.startsWith("[object") ? t("validationError") : msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (npc: Npc) => {
    try {
      await api.deleteNpc(npc.id);
      toast.success(t("toastDeleted"));
      await loadNpcs();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("deleteFailed");
      toast.error(t("toastDeleteFailed", { name: npc.name, message: msg }));
      setFetchError(msg);
    }
  };

  const locationName = (id: string | null) =>
    id ? (locations.find((l) => l.id === id)?.name ?? null) : null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">{t("heading")}</h2>
        <button
          onClick={showForm ? cancelForm : openCreate}
          className="text-sm bg-accent hover:bg-muted text-foreground px-3 py-1.5 rounded-lg transition-colors"
        >
          {showForm ? t("cancel") : t("addButton")}
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
            placeholder={t("namePlaceholder")}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={INPUT_CLS}
            required
          />

          {/* Race + Class */}
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder={t("racePlaceholder")}
              value={form.race}
              onChange={(e) => setForm({ ...form, race: e.target.value })}
              className={INPUT_CLS}
              required
            />
            <input
              placeholder={t("classPlaceholder")}
              value={form.npc_class}
              onChange={(e) => setForm({ ...form, npc_class: e.target.value })}
              className={INPUT_CLS}
            />
          </div>

          {/* Description */}
          <textarea
            placeholder={t("descriptionPlaceholder")}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={TEXTAREA_CLS}
            rows={2}
          />

          {/* Personality */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-muted-foreground">{t("personalityLabel")}</label>
              {editId && (
                <button
                  type="button"
                  onClick={() => setAiOpen(true)}
                  aria-label={t("aiPersonalityAriaLabel")}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 px-2 py-0.5 rounded-md transition-colors"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                  </svg>
                  {t("aiPersonalityButton")}
                </button>
              )}
            </div>
            <textarea
              placeholder={t("personalityPlaceholder")}
              value={form.personality}
              onChange={(e) => setForm({ ...form, personality: e.target.value })}
              className={TEXTAREA_CLS}
              rows={2}
            />
          </div>

          {/* Motivation */}
          <textarea
            placeholder={t("motivationPlaceholder")}
            value={form.motivation}
            onChange={(e) => setForm({ ...form, motivation: e.target.value })}
            className={TEXTAREA_CLS}
            rows={2}
          />

          {/* Secrets */}
          <textarea
            placeholder={t("secretsPlaceholder")}
            value={form.secrets}
            onChange={(e) => setForm({ ...form, secrets: e.target.value })}
            className={TEXTAREA_CLS}
            rows={2}
          />

          {/* Combat stats */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-muted-foreground">
                {t("statsSectionLabel")}
              </label>
              {form.statsEnabled ? (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, statsEnabled: false })}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  × {t("statsRemoveButton")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, statsEnabled: true })}
                  className="text-xs text-primary hover:underline"
                >
                  + {t("statsAddButton")}
                </button>
              )}
            </div>
            {form.statsEnabled && (
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["statsStr", "statsStr"],
                    ["statsDex", "statsDex"],
                    ["statsCon", "statsCon"],
                    ["statsInt", "statsInt"],
                    ["statsWis", "statsWis"],
                    ["statsCha", "statsCha"],
                  ] as const
                ).map(([fieldKey, labelKey]) => (
                  <label key={fieldKey} className="flex items-center gap-2">
                    <span className="text-xs font-mono w-8">{t(labelKey)}</span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      step={1}
                      value={form[fieldKey]}
                      onChange={(e) => setForm({ ...form, [fieldKey]: e.target.value })}
                      className="bg-muted border border-border text-foreground rounded-lg px-2 py-1 w-16 text-center focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/50 transition-colors"
                    />
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Location + Alive */}
          <div className="grid grid-cols-2 gap-2 items-end">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">{t("locationLabel")}</label>
              <select
                value={form.location_id}
                onChange={(e) => setForm({ ...form, location_id: e.target.value })}
                className="bg-muted border border-border text-foreground rounded-lg px-3 py-2 w-full focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/50 transition-colors"
              >
                <option value="">{t("locationNone")}</option>
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

          {/* AI personality modal — only mounted when editing an existing NPC */}
          {editId && (
            <AIAssistModal<PersonalityResult>
              open={aiOpen}
              onClose={() => setAiOpen(false)}
              title="Generate NPC personality + motivation"
              existingContent={
                [
                  form.personality.trim() && `Personality: ${form.personality.trim()}`,
                  form.motivation.trim() && `Motivation: ${form.motivation.trim()}`,
                ]
                  .filter(Boolean)
                  .join("\n\n") || undefined
              }
              placeholder="e.g. 'Haunted by his past, secretly hopes for redemption.'"
              onGenerate={(req) => api.ai.generateNpcPersonality(editId, req)}
              onAccept={(result) => {
                setForm((prev) => ({
                  ...prev,
                  personality: result.personality,
                  motivation: result.motivation,
                }));
                setAiOpen(false);
              }}
              renderResult={(r) => (
                <div className="space-y-2 text-sm">
                  <p><strong>Personality:</strong> {r.personality}</p>
                  <p><strong>Motivation:</strong> {r.motivation}</p>
                </div>
              )}
              extractPrev={(r) => `${r.personality}\n\n${r.motivation}`}
            />
          )}
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

                    {/* Stats one-liner */}
                    {npc.stats && (
                      <p className="text-xs font-mono text-muted-foreground mt-1">
                        STR {npc.stats.str} · DEX {npc.stats.dex} · CON {npc.stats.con}
                        {" · "}INT {npc.stats.int} · WIS {npc.stats.wis} · CHA {npc.stats.cha}
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
                      className="text-sm bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-700/50 dark:hover:bg-red-700 dark:text-red-200 px-3 py-1 rounded-lg transition-colors"
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
