"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { TextResult } from "@/lib/api";
import type { Campaign, CampaignIdea, IdeaTag } from "@/types";
import IdeaRow from "./IdeaRow";
import { AIAssistModal } from "@/components/ai/AIAssistModal";

const CAMPAIGN_LENGTHS: { labelKey: string; value: NonNullable<Campaign["campaign_length"]> }[] = [
  { labelKey: "lengthOneShot", value: "one_shot" },
  { labelKey: "lengthShort", value: "short" },
  { labelKey: "lengthMedium", value: "medium" },
  { labelKey: "lengthLong", value: "long" },
];

const TAG_OPTIONS: IdeaTag[] = ["story", "location", "character"];

const TAG_PILL_STYLES: Record<IdeaTag, string> = {
  story: "bg-purple-500/15 text-purple-400",
  location: "bg-emerald-500/15 text-emerald-400",
  character: "bg-blue-500/15 text-blue-400",
};

interface BasicsTabProps {
  campaign: Campaign;
  onCampaignUpdate: (campaign: Campaign) => void;
  ideas: CampaignIdea[];
  reloadIdeas: () => Promise<void>;
}

export default function BasicsTab({
  campaign,
  onCampaignUpdate,
  ideas,
  reloadIdeas,
}: BasicsTabProps) {
  const t = useTranslations("builder.basics");
  const [name, setName] = useState(campaign.name);
  const [partyLevel, setPartyLevel] = useState(String(campaign.party_level));
  const [description, setDescription] = useState(campaign.description ?? "");
  const [descriptionAiOpen, setDescriptionAiOpen] = useState(false);
  const [newIdeaText, setNewIdeaText] = useState("");
  const [newIdeaTag, setNewIdeaTag] = useState<IdeaTag>("story");
  const [savingIdea, setSavingIdea] = useState(false);
  const newIdeaInputRef = useRef<HTMLInputElement>(null);
  const refocusAfterSave = useRef(false);

  // Keep local state in sync if campaign prop changes externally
  useEffect(() => {
    setName(campaign.name);
  }, [campaign.name]);

  useEffect(() => {
    setPartyLevel(String(campaign.party_level));
  }, [campaign.party_level]);

  useEffect(() => {
    setDescription(campaign.description ?? "");
  }, [campaign.description]);

  // Refocus input after save completes (disabled→enabled transition drops focus)
  useEffect(() => {
    if (!savingIdea && refocusAfterSave.current) {
      refocusAfterSave.current = false;
      newIdeaInputRef.current?.focus();
    }
  }, [savingIdea]);

  // --- Campaign field saves ---

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === campaign.name) return;
    try {
      const updated = await api.updateCampaign(campaign.id, { name: trimmed });
      onCampaignUpdate(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("saveNameError"));
      setName(campaign.name);
    }
  }

  async function saveCampaignLength(value: Campaign["campaign_length"]) {
    try {
      const updated = await api.updateCampaign(campaign.id, { campaign_length: value });
      onCampaignUpdate(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("saveCampaignLengthError"));
    }
  }

  async function savePartyLevel() {
    const level = parseInt(partyLevel, 10);
    if (isNaN(level) || level < 1 || level > 20) {
      setPartyLevel(String(campaign.party_level));
      return;
    }
    if (level === campaign.party_level) return;
    try {
      const updated = await api.updateCampaign(campaign.id, { party_level: level });
      onCampaignUpdate(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("savePartyLevelError"));
      setPartyLevel(String(campaign.party_level));
    }
  }

  async function saveDescription() {
    const trimmed = description.trim();
    const current = campaign.description ?? "";
    if (trimmed === current) return;
    try {
      const updated = await api.updateCampaign(campaign.id, { description: trimmed || null });
      onCampaignUpdate(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("saveDescriptionError"));
      setDescription(campaign.description ?? "");
    }
  }

  // --- Ideas ---

  async function saveNewIdea() {
    const text = newIdeaText.trim();
    if (!text) return;
    setSavingIdea(true);
    try {
      await api.createIdea(campaign.id, { text, tag: newIdeaTag });
      await reloadIdeas();
      setNewIdeaText("");
      refocusAfterSave.current = true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("addIdeaError"));
    } finally {
      setSavingIdea(false);
    }
  }

  async function handleToggleDone(id: string, isDone: boolean) {
    try {
      await api.updateIdea(id, { is_done: isDone });
      await reloadIdeas();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("saveDescriptionError"));
    }
  }

  async function handleChangeTag(id: string, tag: IdeaTag) {
    try {
      await api.updateIdea(id, { tag });
      await reloadIdeas();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("updateTagError"));
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteIdea(id);
      await reloadIdeas();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("deleteIdeaError"));
    }
  }

  function cycleTag() {
    setNewIdeaTag((current) => {
      const idx = TAG_OPTIONS.indexOf(current);
      return TAG_OPTIONS[(idx + 1) % TAG_OPTIONS.length];
    });
  }

  function handleNewIdeaKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveNewIdea();
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      {/* Campaign Name */}
      <section className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {t("campaignName")}
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          className="bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-ring transition-colors"
          placeholder={t("campaignNamePlaceholder")}
        />
      </section>

      {/* Campaign Length */}
      <section className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {t("campaignLength")}
        </label>
        <div className="flex gap-2 flex-wrap">
          {CAMPAIGN_LENGTHS.map(({ labelKey, value }) => (
            <button
              key={value}
              onClick={() => saveCampaignLength(value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                campaign.campaign_length === value
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-muted border-border text-foreground/80 hover:border-border"
              }`}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      </section>

      {/* Party Level */}
      <section className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {t("partyLevel")}
        </label>
        <input
          type="number"
          min={1}
          max={20}
          value={partyLevel}
          onChange={(e) => setPartyLevel(e.target.value)}
          onBlur={savePartyLevel}
          className="bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm w-24 focus:outline-none focus:border-ring transition-colors"
        />
      </section>

      {/* Campaign Description */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t("campaignDescription")}
          </label>
          <button
            type="button"
            onClick={() => setDescriptionAiOpen(true)}
            aria-label={t("aiAriaDescription")}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 px-2 py-0.5 rounded-md transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
            {t("aiButton")}
          </button>
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={saveDescription}
          rows={4}
          placeholder={t("descriptionPlaceholder")}
          className="bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-ring transition-colors resize-none"
        />
      </section>

      {/* Ideas & Notes */}
      <section className="flex flex-col gap-3">
        <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {t("ideasNotes")}
        </label>

        {/* Persistent input row — always visible */}
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2">
          <input
            ref={newIdeaInputRef}
            type="text"
            value={newIdeaText}
            onChange={(e) => setNewIdeaText(e.target.value)}
            onKeyDown={handleNewIdeaKeyDown}
            placeholder={t("ideaPlaceholder")}
            disabled={savingIdea}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            onClick={cycleTag}
            className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 transition-opacity hover:opacity-80 ${TAG_PILL_STYLES[newIdeaTag]}`}
            title={t("clickToChangeTag")}
          >
            {t(`tag${newIdeaTag.charAt(0).toUpperCase()}${newIdeaTag.slice(1)}` as "tagStory" | "tagLocation" | "tagCharacter")}
          </button>
          <button
            onClick={saveNewIdea}
            disabled={savingIdea || !newIdeaText.trim()}
            className="text-primary hover:text-primary text-sm font-medium disabled:opacity-30 disabled:cursor-default transition-opacity flex-shrink-0"
          >
            {savingIdea ? t("saving") : t("save")}
          </button>
        </div>

        {/* Ideas list */}
        {ideas.length > 0 && (
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card px-3">
            {ideas.map((idea) => (
              <IdeaRow
                key={idea.id}
                idea={idea}
                onToggleDone={handleToggleDone}
                onChangeTag={handleChangeTag}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </section>
      <AIAssistModal<TextResult>
        open={descriptionAiOpen}
        onClose={() => setDescriptionAiOpen(false)}
        title={t("aiModalTitle")}
        existingContent={description || undefined}
        placeholder={t("aiModalPlaceholder")}
        onGenerate={(req) => api.ai.generateCampaignDescription(campaign.id, req)}
        onAccept={(result) => {
          setDescription(result.text);
          api.updateCampaign(campaign.id, { description: result.text }).then(onCampaignUpdate).catch((err) => {
            toast.error(err instanceof Error ? err.message : t("saveDescriptionError"));
          });
        }}
        renderResult={(r) => <p className="whitespace-pre-wrap">{r.text}</p>}
        extractPrev={(r) => r.text}
      />
    </div>
  );
}
