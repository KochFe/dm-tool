"use client";

import type { CampaignIdea, IdeaTag } from "@/types";
import IdeaRow from "./IdeaRow";

const TAG_DOT_COLORS: Record<IdeaTag, string> = {
  story: "bg-purple-400",
  location: "bg-emerald-400",
  character: "bg-blue-400",
};

const TAG_LABELS: Record<IdeaTag, string> = {
  story: "Story Ideas",
  location: "Location Ideas",
  character: "Character Ideas",
};

interface IdeasHelperProps {
  campaignId: string;
  tag: IdeaTag;
  ideas: CampaignIdea[];
  onToggleDone: (id: string, isDone: boolean) => void;
}

export default function IdeasHelper({
  tag,
  ideas,
  onToggleDone,
}: IdeasHelperProps) {
  const filtered = ideas.filter((idea) => idea.tag === tag);
  const sorted = [
    ...filtered.filter((i) => !i.is_done),
    ...filtered.filter((i) => i.is_done),
  ];
  const doneCount = filtered.filter((i) => i.is_done).length;
  const totalCount = filtered.length;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${TAG_DOT_COLORS[tag]}`} />
        <span className="text-sm font-medium text-foreground/80">{TAG_LABELS[tag]}</span>
      </div>
      {sorted.length === 0 ? (
        <p className="text-xs text-muted-foreground/60 pl-4">No ideas yet.</p>
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
          {doneCount} of {totalCount} done
        </p>
      )}
    </div>
  );
}
