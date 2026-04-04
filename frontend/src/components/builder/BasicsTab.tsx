"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Campaign, CampaignIdea, IdeaTag } from "@/types";
import IdeaRow from "./IdeaRow";

const CAMPAIGN_LENGTHS: { label: string; value: NonNullable<Campaign["campaign_length"]> }[] = [
  { label: "One-Shot", value: "one_shot" },
  { label: "Short", value: "short" },
  { label: "Medium", value: "medium" },
  { label: "Long", value: "long" },
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
  const [name, setName] = useState(campaign.name);
  const [partyLevel, setPartyLevel] = useState(String(campaign.party_level));
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
      toast.error(err instanceof Error ? err.message : "Failed to save name");
      setName(campaign.name);
    }
  }

  async function saveCampaignLength(value: Campaign["campaign_length"]) {
    try {
      const updated = await api.updateCampaign(campaign.id, { campaign_length: value });
      onCampaignUpdate(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save campaign length");
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
      toast.error(err instanceof Error ? err.message : "Failed to save party level");
      setPartyLevel(String(campaign.party_level));
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
      toast.error(err instanceof Error ? err.message : "Failed to add idea");
    } finally {
      setSavingIdea(false);
    }
  }

  async function handleToggleDone(id: string, isDone: boolean) {
    try {
      await api.updateIdea(id, { is_done: isDone });
      await reloadIdeas();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update idea");
    }
  }

  async function handleChangeTag(id: string, tag: IdeaTag) {
    try {
      await api.updateIdea(id, { tag });
      await reloadIdeas();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update tag");
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteIdea(id);
      await reloadIdeas();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete idea");
    }
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
          Campaign Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          className="bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-ring transition-colors"
          placeholder="Enter campaign name"
        />
      </section>

      {/* Campaign Length */}
      <section className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Campaign Length
        </label>
        <div className="flex gap-2 flex-wrap">
          {CAMPAIGN_LENGTHS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => saveCampaignLength(value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                campaign.campaign_length === value
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-muted border-border text-foreground/80 hover:border-border"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Party Level */}
      <section className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Party Level
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

      {/* Ideas & Notes */}
      <section className="flex flex-col gap-3">
        <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Ideas &amp; Notes
        </label>

        {/* Persistent input row — always visible */}
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2">
          <input
            ref={newIdeaInputRef}
            type="text"
            value={newIdeaText}
            onChange={(e) => setNewIdeaText(e.target.value)}
            onKeyDown={handleNewIdeaKeyDown}
            placeholder="Type an idea and press Enter..."
            disabled={savingIdea}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            onClick={() => {
              const idx = TAG_OPTIONS.indexOf(newIdeaTag);
              setNewIdeaTag(TAG_OPTIONS[(idx + 1) % TAG_OPTIONS.length]);
            }}
            className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 transition-opacity hover:opacity-80 ${TAG_PILL_STYLES[newIdeaTag]}`}
            title="Click to change tag"
          >
            {newIdeaTag}
          </button>
          <button
            onClick={saveNewIdea}
            disabled={savingIdea || !newIdeaText.trim()}
            className="text-primary hover:text-primary text-sm font-medium disabled:opacity-30 disabled:cursor-default transition-opacity flex-shrink-0"
          >
            {savingIdea ? "..." : "Save"}
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
    </div>
  );
}
