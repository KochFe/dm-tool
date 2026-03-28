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

interface NewIdeaDraft {
  text: string;
  tag: IdeaTag;
}

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
  const [draft, setDraft] = useState<NewIdeaDraft | null>(null);
  const [savingIdea, setSavingIdea] = useState(false);
  const draftInputRef = useRef<HTMLInputElement>(null);

  // Keep local state in sync if campaign prop changes externally
  useEffect(() => {
    setName(campaign.name);
  }, [campaign.name]);

  useEffect(() => {
    setPartyLevel(String(campaign.party_level));
  }, [campaign.party_level]);

  useEffect(() => {
    if (draft !== null) {
      draftInputRef.current?.focus();
    }
  }, [draft]);

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

  async function commitDraft() {
    if (!draft) return;
    const text = draft.text.trim();
    if (!text) {
      setDraft(null);
      return;
    }
    setSavingIdea(true);
    try {
      await api.createIdea(campaign.id, { text, tag: draft.tag });
      await reloadIdeas();
      setDraft(null);
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

  function handleDraftKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitDraft();
    } else if (e.key === "Escape") {
      setDraft(null);
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      {/* Campaign Name */}
      <section className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-400 uppercase tracking-wide">
          Campaign Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-amber-500 transition-colors"
          placeholder="Enter campaign name"
        />
      </section>

      {/* Campaign Length */}
      <section className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-400 uppercase tracking-wide">
          Campaign Length
        </label>
        <div className="flex gap-2 flex-wrap">
          {CAMPAIGN_LENGTHS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => saveCampaignLength(value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                campaign.campaign_length === value
                  ? "bg-amber-600 border-amber-500 text-gray-950"
                  : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Party Level */}
      <section className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-400 uppercase tracking-wide">
          Party Level
        </label>
        <input
          type="number"
          min={1}
          max={20}
          value={partyLevel}
          onChange={(e) => setPartyLevel(e.target.value)}
          onBlur={savePartyLevel}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm w-24 focus:outline-none focus:border-amber-500 transition-colors"
        />
      </section>

      {/* Ideas & Notes */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-400 uppercase tracking-wide">
            Ideas &amp; Notes
          </label>
          {!draft && (
            <button
              onClick={() => setDraft({ text: "", tag: "story" })}
              className="text-sm text-amber-500 hover:text-amber-400 transition-colors"
            >
              + Add Idea
            </button>
          )}
        </div>

        <div className="flex flex-col divide-y divide-gray-800 rounded-lg border border-gray-800 bg-gray-900 px-3">
          {ideas.map((idea) => (
            <IdeaRow
              key={idea.id}
              idea={idea}
              onToggleDone={handleToggleDone}
              onChangeTag={handleChangeTag}
              onDelete={handleDelete}
            />
          ))}

          {/* Draft row */}
          {draft !== null && (
            <div className="flex items-center gap-2 py-1.5">
              <input
                type="checkbox"
                disabled
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 flex-shrink-0 opacity-30"
              />
              <input
                ref={draftInputRef}
                type="text"
                value={draft.text}
                onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                onBlur={commitDraft}
                onKeyDown={handleDraftKeyDown}
                placeholder="New idea..."
                className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 focus:outline-none"
              />
              <select
                value={draft.tag}
                onChange={(e) => setDraft({ ...draft, tag: e.target.value as IdeaTag })}
                className="bg-gray-800 border border-gray-700 rounded text-xs text-gray-300 px-1.5 py-0.5 focus:outline-none focus:border-amber-500"
              >
                {TAG_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <button
                onMouseDown={(e) => {
                  // Prevent blur from firing before click
                  e.preventDefault();
                  commitDraft();
                }}
                disabled={savingIdea}
                className="text-amber-500 hover:text-amber-400 text-sm disabled:opacity-50"
              >
                {savingIdea ? "..." : "Save"}
              </button>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  setDraft(null);
                }}
                className="text-gray-600 hover:text-gray-400 text-sm"
              >
                &times;
              </button>
            </div>
          )}

          {ideas.length === 0 && !draft && (
            <p className="py-4 text-center text-sm text-gray-600">
              No ideas yet. Click &ldquo;+ Add Idea&rdquo; to start brainstorming.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
