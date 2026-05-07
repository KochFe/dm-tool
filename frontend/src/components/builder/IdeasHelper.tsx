"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { CampaignIdea, IdeaTag } from "@/types";
import IdeaRow from "./IdeaRow";

const TAG_DOT_COLORS: Record<IdeaTag, string> = {
  story: "bg-purple-400",
  location: "bg-emerald-400",
  character: "bg-blue-400",
};

const TAG_LABEL_KEYS: Record<IdeaTag, "storyIdeas" | "locationIdeas" | "characterIdeas"> = {
  story: "storyIdeas",
  location: "locationIdeas",
  character: "characterIdeas",
};

interface IdeasHelperProps {
  campaignId: string;
  tag: IdeaTag;
  ideas: CampaignIdea[];
  onToggleDone: (id: string, isDone: boolean) => void;
  onIdeaCreated: () => Promise<void>;
}

export default function IdeasHelper({
  campaignId,
  tag,
  ideas,
  onToggleDone,
  onIdeaCreated,
}: IdeasHelperProps) {
  const t = useTranslations("builder.ideasHelper");
  const filtered = ideas.filter((idea) => idea.tag === tag);
  const sorted = [
    ...filtered.filter((i) => !i.is_done),
    ...filtered.filter((i) => i.is_done),
  ];
  const doneCount = filtered.filter((i) => i.is_done).length;
  const totalCount = filtered.length;

  const [newIdeaText, setNewIdeaText] = useState("");
  const [savingIdea, setSavingIdea] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const refocusAfterSave = useRef(false);

  useEffect(() => {
    if (!savingIdea && refocusAfterSave.current) {
      refocusAfterSave.current = false;
      inputRef.current?.focus();
    }
  }, [savingIdea]);

  async function saveNewIdea() {
    const text = newIdeaText.trim();
    if (!text) return;
    setSavingIdea(true);
    try {
      await api.createIdea(campaignId, { text, tag });
      setNewIdeaText("");
      refocusAfterSave.current = true;
      await onIdeaCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("addIdeaError"));
    } finally {
      setSavingIdea(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveNewIdea();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${TAG_DOT_COLORS[tag]}`} />
        <span className="text-sm font-medium text-foreground/80">{t(TAG_LABEL_KEYS[tag])}</span>
      </div>

      <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-2 py-1">
        <input
          ref={inputRef}
          type="text"
          value={newIdeaText}
          onChange={(e) => setNewIdeaText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("addIdeaPlaceholder")}
          disabled={savingIdea}
          className="flex-1 min-w-0 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <button
          onClick={saveNewIdea}
          disabled={savingIdea || !newIdeaText.trim()}
          className="text-primary text-xs font-medium disabled:opacity-30 disabled:cursor-default transition-opacity flex-shrink-0"
        >
          {savingIdea ? t("saving") : t("save")}
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="text-xs text-muted-foreground/60 pl-4">{t("noIdeas")}</p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {sorted.map((idea) => (
            <IdeaRow
              key={idea.id}
              idea={idea}
              onToggleDone={onToggleDone}
              compact
            />
          ))}
        </div>
      )}
      {totalCount > 0 && (
        <p className="text-xs text-muted-foreground/60 mt-1 pl-4">
          {t("doneOf", { done: doneCount, total: totalCount })}
        </p>
      )}
    </div>
  );
}
