"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslations } from "next-intl";
import type { CampaignIdea, IdeaReorderItem, IdeaTag } from "@/types";
import { GROUP_ORDER, buildPayload, splitGroups, type IdeasByTag } from "@/lib/ideaOrdering";
import IdeaRow from "./IdeaRow";

const GROUP_LABEL_KEYS: Record<IdeaTag, "ideaGroupStory" | "ideaGroupCharacter" | "ideaGroupLocation"> = {
  story: "ideaGroupStory",
  character: "ideaGroupCharacter",
  location: "ideaGroupLocation",
};

const HEADER_DOT: Record<IdeaTag, string> = {
  story: "bg-purple-400",
  character: "bg-blue-400",
  location: "bg-emerald-400",
};

interface IdeaBoardProps {
  ideas: CampaignIdea[];
  onReorder: (items: IdeaReorderItem[]) => Promise<void>;
  onToggleDone: (id: string, isDone: boolean) => void;
  onChangeTag: (id: string, tag: IdeaTag) => void;
  onDelete: (id: string) => void;
}

function SortableIdeaRow({
  idea,
  onToggleDone,
  onChangeTag,
  onDelete,
}: {
  idea: CampaignIdea;
  onToggleDone: (id: string, isDone: boolean) => void;
  onChangeTag: (id: string, tag: IdeaTag) => void;
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
        onChangeTag={onChangeTag}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

function GroupColumn({
  tag,
  activeItems,
  doneItems,
  onToggleDone,
  onChangeTag,
  onDelete,
}: {
  tag: IdeaTag;
  activeItems: CampaignIdea[];
  doneItems: CampaignIdea[];
  onToggleDone: (id: string, isDone: boolean) => void;
  onChangeTag: (id: string, tag: IdeaTag) => void;
  onDelete: (id: string) => void;
}) {
  const t = useTranslations("builder.ideaBoard");
  const { setNodeRef } = useDroppable({ id: tag });
  const isEmpty = activeItems.length === 0 && doneItems.length === 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 pt-1">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${HEADER_DOT[tag]}`} />
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90">
          {t(GROUP_LABEL_KEYS[tag])}
        </span>
        <span className="flex-1 h-px bg-border" />
      </div>
      <div ref={setNodeRef} className="flex flex-col min-h-[2.25rem] rounded-md">
        <SortableContext
          items={activeItems.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {activeItems.map((idea) => (
            <SortableIdeaRow
              key={idea.id}
              idea={idea}
              onToggleDone={onToggleDone}
              onChangeTag={onChangeTag}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>
        {doneItems.map((idea) => (
          <IdeaRow
            key={idea.id}
            idea={idea}
            onToggleDone={onToggleDone}
            onChangeTag={onChangeTag}
            onDelete={onDelete}
          />
        ))}
        {isEmpty && (
          <p className="text-xs text-muted-foreground/40 italic py-2 pl-1">
            {t("emptyGroup")}
          </p>
        )}
      </div>
    </div>
  );
}

export default function IdeaBoard({
  ideas,
  onReorder,
  onToggleDone,
  onChangeTag,
  onDelete,
}: IdeaBoardProps) {
  const { active: activeFromProps, done } = splitGroups(ideas);
  const [active, setActive] = useState<IdeasByTag>(activeFromProps);
  const [prevIdeas, setPrevIdeas] = useState(ideas);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  // Resync local arrangement when the ideas prop changes (e.g. after a reload).
  if (ideas !== prevIdeas) {
    setPrevIdeas(ideas);
    setActive(activeFromProps);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function findContainer(id: UniqueIdentifier): IdeaTag | null {
    if (GROUP_ORDER.includes(id as IdeaTag)) return id as IdeaTag;
    for (const tag of GROUP_ORDER) {
      if (active[tag].some((i) => i.id === id)) return tag;
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active: dragged, over } = event;
    if (!over) return;
    const from = findContainer(dragged.id);
    const to = findContainer(over.id);
    if (!from || !to || from === to) return;
    setActive((prev) => {
      const moving = prev[from].find((i) => i.id === dragged.id);
      if (!moving) return prev;
      const overIndex = prev[to].findIndex((i) => i.id === over.id);
      const insertAt = overIndex >= 0 ? overIndex : prev[to].length;
      return {
        ...prev,
        [from]: prev[from].filter((i) => i.id !== dragged.id),
        [to]: [
          ...prev[to].slice(0, insertAt),
          { ...moving, tag: to },
          ...prev[to].slice(insertAt),
        ],
      };
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active: dragged, over } = event;
    setActiveId(null);
    if (!over) return;
    const from = findContainer(dragged.id);
    const to = findContainer(over.id);
    if (!from || !to) return;

    let next = active;
    if (from === to) {
      const items = active[to];
      const oldIndex = items.findIndex((i) => i.id === dragged.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        next = { ...active, [to]: arrayMove(items, oldIndex, newIndex) };
        setActive(next);
      }
    }

    const payload = buildPayload(next, done);
    try {
      await onReorder(payload);
    } catch {
      setActive(splitGroups(ideas).active);
    }
  }

  const draggedIdea = activeId
    ? GROUP_ORDER.flatMap((tag) => active[tag]).find((i) => i.id === activeId) ?? null
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card px-3 py-2">
        {GROUP_ORDER.map((tag) => (
          <GroupColumn
            key={tag}
            tag={tag}
            activeItems={active[tag]}
            doneItems={done[tag]}
            onToggleDone={onToggleDone}
            onChangeTag={onChangeTag}
            onDelete={onDelete}
          />
        ))}
      </div>
      <DragOverlay>
        {draggedIdea ? (
          <div className="rounded-md border border-border bg-card px-2 shadow-lg">
            <IdeaRow
              idea={draggedIdea}
              onToggleDone={() => {}}
              dragHandleProps={{}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
