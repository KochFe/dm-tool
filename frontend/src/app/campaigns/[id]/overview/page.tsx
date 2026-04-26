"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useCampaign } from "@/contexts/CampaignContext";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import IdeaRow from "@/components/builder/IdeaRow";
import type { CampaignPhase, CampaignIdea, IdeaTag } from "@/types";

// ── helpers ──────────────────────────────────────────────────────────────────

function formatCampaignLength(value: string): string {
  const map: Record<string, string> = {
    one_shot: "One-Shot",
    short: "Short",
    medium: "Medium",
    long: "Long",
  };
  return map[value] ?? value;
}

// ── sub-components ────────────────────────────────────────────────────────────

interface PhaseCardProps {
  phase: CampaignPhase;
  onSave: (id: string, title: string, description: string) => Promise<void>;
  onDelete: (id: string) => void;
}

function PhaseCard({ phase, onSave, onDelete }: PhaseCardProps) {
  const t = useTranslations("campaignDetail");
  const [expanded, setExpanded] = useState(false);
  const [editTitle, setEditTitle] = useState(phase.title);
  const [editDesc, setEditDesc] = useState(phase.description ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleTitleBlur = useCallback(async () => {
    const trimmed = editTitle.trim();
    if (!trimmed || trimmed === phase.title) return;
    setSaving(true);
    try {
      await onSave(phase.id, trimmed, editDesc);
    } finally {
      setSaving(false);
    }
  }, [editTitle, editDesc, phase.id, phase.title, onSave]);

  const handleDescBlur = useCallback(async () => {
    if (editDesc === (phase.description ?? "")) return;
    setSaving(true);
    try {
      await onSave(phase.id, editTitle, editDesc);
    } finally {
      setSaving(false);
    }
  }, [editDesc, editTitle, phase.id, phase.description, onSave]);

  return (
    <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-3 p-4 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-muted-foreground text-sm w-4 flex-shrink-0">
          {expanded ? "▾" : "▸"}
        </span>
        <div className="flex-1 min-w-0">
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onClick={(e) => e.stopPropagation()}
            className="bg-transparent text-sm font-medium text-foreground w-full outline-none focus:text-primary transition-colors"
            aria-label="Phase title"
          />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {phase.quest_ids.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {t("phaseQuests", { count: phase.quest_ids.length })}
            </span>
          )}
          {phase.location_ids.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {t("phaseLocs", { count: phase.location_ids.length })}
            </span>
          )}
          {saving && <span className="text-xs text-muted-foreground/60">{t("phaseSaving")}</span>}
          {!confirmDelete ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete(true);
              }}
              className="text-muted-foreground/60 hover:text-red-400 transition-colors text-sm px-1"
              title="Delete phase"
              aria-label="Delete phase"
            >
              &times;
            </button>
          ) : (
            <span className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onDelete(phase.id)}
                className="text-xs text-red-400 hover:text-red-300 px-1"
              >
                {t("phaseConfirm")}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-muted-foreground hover:text-foreground/80 px-1"
              >
                {t("phaseCancel")}
              </button>
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border/50 pt-3">
          <textarea
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            onBlur={handleDescBlur}
            placeholder={t("phaseDescPlaceholder")}
            rows={3}
            className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring resize-none transition-colors"
          />
        </div>
      )}
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const t = useTranslations("campaignDetail");
  const { campaign, characters, locations, npcs, quests, currentLocation, reload } =
    useCampaign();

  const activeQuests = quests.filter((q) => q.status === "in_progress");
  const base = `/campaigns/${campaign.id}`;

  // ── description ──────────────────────────────────────────────────────────────
  const [description, setDescription] = useState(campaign.description ?? "");
  const descriptionSavedRef = useRef(campaign.description ?? "");

  // Keep in sync if campaign reloads
  useEffect(() => {
    setDescription(campaign.description ?? "");
    descriptionSavedRef.current = campaign.description ?? "";
  }, [campaign.description]);

  const saveDescription = useCallback(async () => {
    if (description === descriptionSavedRef.current) return;
    try {
      await api.updateCampaign(campaign.id, { description: description || null });
      descriptionSavedRef.current = description;
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("saveDescriptionError"));
    }
  }, [description, campaign.id, reload, t]);

  // ── phases ───────────────────────────────────────────────────────────────────
  const [phases, setPhases] = useState<CampaignPhase[]>([]);
  const [phasesLoading, setPhasesLoading] = useState(true);
  const [phasesOpen, setPhasesOpen] = useState(true);
  const [newPhaseTitle, setNewPhaseTitle] = useState("");
  const [addingPhase, setAddingPhase] = useState(false);

  const loadPhases = useCallback(async () => {
    try {
      const data = await api.getPhases(campaign.id);
      setPhases(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("loadPhasesError"));
    } finally {
      setPhasesLoading(false);
    }
  }, [campaign.id, t]);

  useEffect(() => {
    loadPhases();
  }, [loadPhases]);

  const handleSavePhase = useCallback(
    async (id: string, title: string, description: string) => {
      try {
        const updated = await api.updatePhase(id, { title, description: description || undefined });
        setPhases((prev) => prev.map((p) => (p.id === id ? updated : p)));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("savePhaseError"));
      }
    },
    [t]
  );

  const handleDeletePhase = useCallback(async (id: string) => {
    try {
      await api.deletePhase(id);
      setPhases((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("deletePhaseError"));
    }
  }, [t]);

  const handleAddPhase = useCallback(async () => {
    const title = newPhaseTitle.trim();
    if (!title) return;
    setAddingPhase(true);
    try {
      const created = await api.createPhase(campaign.id, {
        title,
        sort_order: phases.length,
      });
      setPhases((prev) => [...prev, created]);
      setNewPhaseTitle("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("addPhaseError"));
    } finally {
      setAddingPhase(false);
    }
  }, [campaign.id, newPhaseTitle, phases.length, t]);

  // ── ideas ────────────────────────────────────────────────────────────────────
  const [ideas, setIdeas] = useState<CampaignIdea[]>([]);
  const [ideasLoading, setIdeasLoading] = useState(true);
  const [ideasOpen, setIdeasOpen] = useState(true);
  const [newIdeaText, setNewIdeaText] = useState("");
  const [newIdeaTag, setNewIdeaTag] = useState<IdeaTag>("story");
  const [addingIdea, setAddingIdea] = useState(false);

  const loadIdeas = useCallback(async () => {
    try {
      const data = await api.getIdeas(campaign.id);
      setIdeas(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("loadIdeasError"));
    } finally {
      setIdeasLoading(false);
    }
  }, [campaign.id, t]);

  useEffect(() => {
    loadIdeas();
  }, [loadIdeas]);

  const handleToggleIdeaDone = useCallback(async (id: string, isDone: boolean) => {
    setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, is_done: isDone } : i)));
    try {
      await api.updateIdea(id, { is_done: isDone });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("updateIdeaError"));
      setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, is_done: !isDone } : i)));
    }
  }, [t]);

  const handleChangeIdeaTag = useCallback(async (id: string, tag: IdeaTag) => {
    setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, tag } : i)));
    try {
      await api.updateIdea(id, { tag });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("updateIdeaTagError"));
      await loadIdeas();
    }
  }, [loadIdeas, t]);

  const handleDeleteIdea = useCallback(async (id: string) => {
    setIdeas((prev) => prev.filter((i) => i.id !== id));
    try {
      await api.deleteIdea(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("deleteIdeaError"));
      await loadIdeas();
    }
  }, [loadIdeas, t]);

  const handleAddIdea = useCallback(async () => {
    const text = newIdeaText.trim();
    if (!text) return;
    setAddingIdea(true);
    try {
      const created = await api.createIdea(campaign.id, {
        text,
        tag: newIdeaTag,
        sort_order: ideas.length,
      });
      setIdeas((prev) => [...prev, created]);
      setNewIdeaText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("addIdeaError"));
    } finally {
      setAddingIdea(false);
    }
  }, [campaign.id, newIdeaText, newIdeaTag, ideas.length, t]);

  // ── render ────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl space-y-6">
      {/* 1. Title + campaign length badge */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-xl font-semibold text-foreground">{t("overview")}</h2>
          {campaign.campaign_length && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/20">
              {formatCampaignLength(campaign.campaign_length)}
            </span>
          )}
        </div>

        {/* 2. Description */}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={saveDescription}
          placeholder={t("descriptionPlaceholder")}
          rows={3}
          className="w-full bg-transparent text-sm text-muted-foreground leading-relaxed placeholder:text-muted-foreground/60 outline-none resize-none"
        />
      </div>

      {/* 4. Current Location */}
      {currentLocation && (
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{t("currentLocation")}</p>
          <p className="text-foreground font-medium">{currentLocation.name}</p>
          <p className="text-sm text-muted-foreground capitalize">{currentLocation.biome}</p>
          {currentLocation.description && (
            <p className="text-sm text-muted-foreground mt-1">{currentLocation.description}</p>
          )}
        </div>
      )}

      {/* 5. Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: t("statsCharacters"), count: characters.length, href: `${base}/characters` },
          { label: t("statsLocations"), count: locations.length, href: `${base}/locations` },
          { label: t("statsNpcs"), count: npcs.length, href: `${base}/npcs` },
          { label: t("statsQuests"), count: quests.length, href: `${base}/quests` },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="bg-card border border-border/50 rounded-xl p-4 hover:border-border transition-colors group"
          >
            <p className="text-2xl font-bold text-foreground">{item.count}</p>
            <p className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
              {item.label} →
            </p>
          </Link>
        ))}
      </div>

      {/* 6. Phases */}
      <div>
        <button
          onClick={() => setPhasesOpen((v) => !v)}
          className="flex items-center gap-2 mb-3 group"
        >
          <span className="text-muted-foreground text-sm">{phasesOpen ? "▾" : "▸"}</span>
          <h3 className="text-sm font-semibold text-foreground/80 group-hover:text-foreground transition-colors">
            {t("phasesHeading")}
          </h3>
          {phases.length > 0 && (
            <span className="text-xs text-muted-foreground/60">({phases.length})</span>
          )}
        </button>

        {phasesOpen && (
          <div className="space-y-2">
            {phasesLoading ? (
              <p className="text-xs text-muted-foreground/60 px-1">{t("phasesLoading")}</p>
            ) : phases.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 italic px-1">
                {t("phasesEmpty")}
              </p>
            ) : (
              phases.map((phase) => (
                <PhaseCard
                  key={phase.id}
                  phase={phase}
                  onSave={handleSavePhase}
                  onDelete={handleDeletePhase}
                />
              ))
            )}

            {/* Add Phase */}
            <div className="flex items-center gap-2 pt-1">
              <input
                value={newPhaseTitle}
                onChange={(e) => setNewPhaseTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddPhase();
                }}
                placeholder={t("newPhasePlaceholder")}
                className="flex-1 bg-card border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring transition-colors"
              />
              <button
                onClick={handleAddPhase}
                disabled={!newPhaseTitle.trim() || addingPhase}
                className="px-3 py-2 rounded-lg text-sm bg-muted border border-border/50 text-foreground/80 hover:text-primary hover:border-primary/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {t("addPhase")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 7. Active Quests */}
      {activeQuests.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground/80 mb-3">{t("activeQuestsHeading")}</h3>
          <div className="space-y-2">
            {activeQuests.map((q) => (
              <div
                key={q.id}
                className="bg-card border border-border/50 rounded-lg p-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{q.title}</p>
                  {q.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{q.description}</p>
                  )}
                </div>
                <Badge variant="secondary" className="text-xs">
                  {t("questInProgress")}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. Ideas */}
      <div>
        <button
          onClick={() => setIdeasOpen((v) => !v)}
          className="flex items-center gap-2 mb-3 group"
        >
          <span className="text-muted-foreground text-sm">{ideasOpen ? "▾" : "▸"}</span>
          <h3 className="text-sm font-semibold text-foreground/80 group-hover:text-foreground transition-colors">
            {t("ideasHeading")}
          </h3>
          {ideas.length > 0 && (
            <span className="text-xs text-muted-foreground/60">({ideas.length})</span>
          )}
        </button>

        {ideasOpen && (
          <div className="bg-card border border-border/50 rounded-xl p-4 space-y-1">
            {ideasLoading ? (
              <p className="text-xs text-muted-foreground/60">{t("ideasLoading")}</p>
            ) : ideas.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 italic">
                {t("ideasEmpty")}
              </p>
            ) : (
              ideas.map((idea) => (
                <IdeaRow
                  key={idea.id}
                  idea={idea}
                  onToggleDone={handleToggleIdeaDone}
                  onChangeTag={handleChangeIdeaTag}
                  onDelete={handleDeleteIdea}
                />
              ))
            )}

            {/* Add Idea */}
            <div className="flex items-center gap-2 pt-2 border-t border-muted mt-2">
              <input
                value={newIdeaText}
                onChange={(e) => setNewIdeaText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddIdea();
                }}
                placeholder={t("newIdeaPlaceholder")}
                className="flex-1 bg-muted border border-border/50 rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring transition-colors"
              />
              <select
                value={newIdeaTag}
                onChange={(e) => setNewIdeaTag(e.target.value as IdeaTag)}
                className="bg-muted border border-border/50 rounded-lg px-2 py-1.5 text-xs text-muted-foreground outline-none focus:border-ring transition-colors"
              >
                <option value="story">story</option>
                <option value="location">location</option>
                <option value="character">character</option>
              </select>
              <button
                onClick={handleAddIdea}
                disabled={!newIdeaText.trim() || addingIdea}
                className="px-3 py-1.5 rounded-lg text-sm bg-muted border border-border/50 text-foreground/80 hover:text-primary hover:border-primary/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {t("addIdea")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
