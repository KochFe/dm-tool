"use client";

import { useState, useRef, useEffect } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { CampaignIdea, IdeaReorderItem, IdeaTag } from "@/types";
import { buildPayload, splitGroups } from "@/lib/ideaOrdering";
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
  onReorder: (items: IdeaReorderItem[]) => Promise<void>;
  onDelete: (id: string) => void;
}

function SortableHelperRow({
  idea,
  onToggleDone,
  onDelete,
}: {
  idea: CampaignIdea;
  onToggleDone: (id: string, isDone: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const { setNodeRef, transform, transition, attributes, listeners, isDragging } =
    useSortable({ id: idea.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <IdeaRow
        idea={idea}
        onToggleDone={onToggleDone}
        onDelete={onDelete}
        compact
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export default function IdeasHelper({
  campaignId,
  tag,
  ideas,
  onToggleDone,
  onIdeaCreated,
  onReorder,
  onDelete,
}: IdeasHelperProps) {
  const t = useTranslations("builder.ideasHelper");
  const { active, done } = splitGroups(ideas);
  const doneItems = done[tag];

  const [order, setOrder] = useState<CampaignIdea[]>(active[tag]);
  const [prevSync, setPrevSync] = useState({ ideas, tag });

  // Resync local arrangement when the ideas prop or tag changes.
  if (prevSync.ideas !== ideas || prevSync.tag !== tag) {
    setPrevSync({ ideas, tag });
    setOrder(active[tag]);
  }

  const totalCount = active[tag].length + doneItems.length;
  const doneCount = doneItems.length;

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active: dragged, over } = event;
    if (!over || dragged.id === over.id) return;
    const oldIndex = order.findIndex((i) => i.id === dragged.id);
    const newIndex = order.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(order, oldIndex, newIndex);
    setOrder(next);
    const payload = buildPayload({ ...active, [tag]: next }, done);
    try {
      await onReorder(payload);
    } catch {
      setOrder(splitGroups(ideas).active[tag]);
    }
  }

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

  const isEmpty = order.length === 0 && doneItems.length === 0;

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

      {isEmpty ? (
        <p className="text-xs text-muted-foreground/60 pl-4">{t("noIdeas")}</p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={order.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              {order.map((idea) => (
                <SortableHelperRow
                  key={idea.id}
                  idea={idea}
                  onToggleDone={onToggleDone}
                  onDelete={onDelete}
                />
              ))}
            </SortableContext>
          </DndContext>
          {doneItems.map((idea) => (
            <IdeaRow
              key={idea.id}
              idea={idea}
              onToggleDone={onToggleDone}
              onDelete={onDelete}
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
