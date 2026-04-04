"use client";

import type { CampaignIdea, IdeaTag } from "@/types";

const TAG_ORDER: IdeaTag[] = ["story", "location", "character"];

const TAG_STYLES: Record<IdeaTag, string> = {
  story: "bg-purple-500/15 text-purple-400",
  location: "bg-emerald-500/15 text-emerald-400",
  character: "bg-blue-500/15 text-blue-400",
};

function nextTag(current: IdeaTag): IdeaTag {
  const idx = TAG_ORDER.indexOf(current);
  return TAG_ORDER[(idx + 1) % TAG_ORDER.length];
}

interface IdeaRowProps {
  idea: CampaignIdea;
  onToggleDone: (id: string, isDone: boolean) => void;
  onChangeTag?: (id: string, tag: IdeaTag) => void;
  onDelete?: (id: string) => void;
  compact?: boolean;
}

export default function IdeaRow({
  idea,
  onToggleDone,
  onChangeTag,
  onDelete,
  compact = false,
}: IdeaRowProps) {
  return (
    <div
      className={`flex items-center gap-2 py-1.5 ${idea.is_done ? "opacity-50" : ""}`}
    >
      <input
        type="checkbox"
        checked={idea.is_done}
        onChange={(e) => onToggleDone(idea.id, e.target.checked)}
        className="w-4 h-4 rounded border-border bg-muted accent-primary cursor-pointer flex-shrink-0"
      />
      <span
        className={`flex-1 text-sm text-foreground ${idea.is_done ? "line-through text-muted-foreground" : ""}`}
      >
        {idea.text}
      </span>
      {!compact && (
        <>
          <button
            onClick={() => onChangeTag?.(idea.id, nextTag(idea.tag))}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-opacity ${TAG_STYLES[idea.tag]} hover:opacity-80`}
            title="Click to change tag"
          >
            {idea.tag}
          </button>
          {onDelete && (
            <button
              onClick={() => onDelete(idea.id)}
              className="text-muted-foreground/60 hover:text-red-400 transition-colors text-sm leading-none px-1"
              title="Delete idea"
              aria-label="Delete idea"
            >
              &times;
            </button>
          )}
        </>
      )}
    </div>
  );
}
