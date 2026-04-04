"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { CampaignPhase, Quest, Location } from "@/types";
import type { JSONContent } from "@tiptap/react";
import RichTextEditor, {
  extractLocationMentions,
  extractPlainText,
} from "@/components/ui/tiptap/rich-text-editor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PhaseCardProps {
  phase: CampaignPhase;
  index: number;
  totalPhases: number;
  isEditing: boolean;
  isNew: boolean;
  campaignId: string;
  allPhases: CampaignPhase[];
  onRequestEdit: () => boolean;
  onEditDone: () => void;
  onUpdate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  quests: Quest[];
  locations: Location[];
}

export default function PhaseCard({
  phase,
  index,
  totalPhases,
  isEditing,
  isNew,
  campaignId,
  allPhases,
  onRequestEdit,
  onEditDone,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  quests,
  locations,
}: PhaseCardProps) {
  const [title, setTitle] = useState(isNew ? "" : phase.title);
  const [richContent, setRichContent] = useState<JSONContent | null>(
    (phase.description_rich as JSONContent) ?? null
  );
  const [selectedQuestIds, setSelectedQuestIds] = useState<Set<string>>(
    new Set(phase.quest_ids)
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Promise-based dialog for nested location deletion
  const [nestedDialog, setNestedDialog] = useState<{
    locationName: string;
    childCount: number;
  } | null>(null);
  const nestedDialogResolveRef = useRef<((action: "delete" | "unlink") => void) | null>(null);

  const confirmNestedLocationAction = useCallback(
    (locationName: string, childCount: number): Promise<"delete" | "unlink"> => {
      return new Promise((resolve) => {
        nestedDialogResolveRef.current = resolve;
        setNestedDialog({ locationName, childCount });
      });
    },
    []
  );

  function handleNestedDialogChoice(action: "delete" | "unlink") {
    nestedDialogResolveRef.current?.(action);
    nestedDialogResolveRef.current = null;
    setNestedDialog(null);
  }

  function enterEdit() {
    const allowed = onRequestEdit();
    if (!allowed) return;
    setTitle(phase.title);
    setRichContent((phase.description_rich as JSONContent) ?? null);
    setSelectedQuestIds(new Set(phase.quest_ids));
  }

  function cancelEdit() {
    setTitle(phase.title);
    setRichContent((phase.description_rich as JSONContent) ?? null);
    setSelectedQuestIds(new Set(phase.quest_ids));
    onEditDone();
  }

  async function handleSave() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error("Phase title cannot be empty");
      titleInputRef.current?.focus();
      return;
    }
    setSaving(true);
    try {
      const doc = richContent ?? { type: "doc", content: [] };
      const mentions = extractLocationMentions(doc);
      const plainDescription = extractPlainText(doc).trim() || undefined;

      const resolvedLocationIds: string[] = [];
      const createdThisSave = new Map<string, string>(); // lowercase name → id
      for (const mention of mentions) {
        const key = mention.name.toLowerCase();
        const existing = locations.find(
          (l) => l.name.toLowerCase() === key
        );
        if (existing) {
          resolvedLocationIds.push(existing.id);
        } else if (createdThisSave.has(key)) {
          resolvedLocationIds.push(createdThisSave.get(key)!);
        } else {
          const created = await api.createLocation(campaignId, {
            name: mention.name,
          });
          createdThisSave.set(key, created.id);
          resolvedLocationIds.push(created.id);
        }
      }

      const uniqueLocationIds = [...new Set(resolvedLocationIds)];

      await api.updatePhase(phase.id, {
        title: trimmedTitle,
        description: plainDescription,
        description_rich: doc,
      });
      await api.setPhaseQuests(phase.id, Array.from(selectedQuestIds));
      await api.setPhaseLocations(phase.id, uniqueLocationIds);

      // Detect locations that were previously linked but are now removed
      const previousLocationIds = new Set(phase.location_ids);
      const newLocationIds = new Set(uniqueLocationIds);
      const removedLocationIds = [...previousLocationIds].filter(
        (id) => !newLocationIds.has(id)
      );

      // Delete removed locations if no other phase references them
      for (const removedId of removedLocationIds) {
        const referencedByOtherPhase = allPhases.some(
          (p) =>
            p.id !== phase.id && p.location_ids.includes(removedId)
        );
        if (referencedByOtherPhase) continue;

        const loc = locations.find((l) => l.id === removedId);
        const children = locations.filter((l) => l.parent_id === removedId);

        if (children.length > 0 && loc) {
          const action = await confirmNestedLocationAction(loc.name, children.length);
          if (action === "unlink") continue;
          // "delete" — recursively delete children first, then parent
          for (const child of children) {
            try { await api.deleteLocation(child.id); } catch { /* already gone */ }
          }
        }

        try {
          await api.deleteLocation(removedId);
        } catch {
          // Location may have been deleted already or have other references
        }
      }

      onEditDone();
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save phase");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.deletePhase(phase.id);
      onDelete();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete phase");
      setDeleting(false);
    }
  }

  function toggleQuestId(id: string) {
    setSelectedQuestIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const linkedQuestTitles = quests
    .filter((q) => phase.quest_ids.includes(q.id))
    .map((q) => q.title);

  const linkedLocationNames = locations
    .filter((l) => phase.location_ids.includes(l.id))
    .map((l) => l.name);

  function renderRichDescription() {
    const rich = phase.description_rich as JSONContent | null;
    if (!rich?.content) {
      return phase.description ? (
        <p className="text-sm text-muted-foreground line-clamp-3">{phase.description}</p>
      ) : null;
    }
    return (
      <div className="text-sm text-muted-foreground line-clamp-3">
        {rich.content.map((block, blockIdx) => {
          if (block.type !== "paragraph") return null;
          return (
            <p key={blockIdx}>
              {(block.content ?? []).map((node, nodeIdx) => {
                if (node.type === "locationMention" && node.attrs) {
                  return (
                    <span key={nodeIdx} className="text-primary">
                      {node.attrs.name as string}
                    </span>
                  );
                }
                return <span key={nodeIdx}>{node.text}</span>;
              })}
            </p>
          );
        })}
      </div>
    );
  }

  const nestedLocationDialog = (
    <Dialog
      open={nestedDialog !== null}
      onOpenChange={(open) => {
        if (!open) handleNestedDialogChoice("unlink");
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Location has nested children</DialogTitle>
          <DialogDescription>
            <strong>&ldquo;{nestedDialog?.locationName}&rdquo;</strong> has{" "}
            {nestedDialog?.childCount} nested location
            {nestedDialog?.childCount !== 1 ? "s" : ""}. What would you like to do?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleNestedDialogChoice("unlink")}
          >
            Just Unlink
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleNestedDialogChoice("delete")}
          >
            Delete All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (isEditing) {
    return (
      <div className="bg-muted border border-primary/30 rounded-xl p-4 flex flex-col gap-4">
        {/* Title row */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Phase Title
          </label>
          <input
            ref={titleInputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-card border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-ring transition-colors"
            placeholder="Phase title"
            autoFocus
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Description
          </label>
          <RichTextEditor
            initialContent={richContent}
            plainText={phase.description ?? ""}
            onChange={setRichContent}
            knownLocationNames={locations.map((l) => l.name)}
            placeholder="Describe what happens in this phase... Select text and click 'Mark as Location' to tag locations."
          />
        </div>

        {/* Tagged Locations (from editor mentions, deduplicated) */}
        {richContent && extractLocationMentions(richContent).length > 0 && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Tagged Locations
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[...new Map(
                extractLocationMentions(richContent).map((m) => [m.name.toLowerCase(), m])
              ).values()].map((mention) => (
                <span
                  key={mention.name}
                  className="inline-flex items-center gap-1 bg-primary/15 text-primary text-xs px-2 py-0.5 rounded-full"
                >
                  {mention.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Quest linking */}
        {quests.length > 0 && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Linked Quests
            </label>
            <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
              {quests.map((q) => (
                <label
                  key={q.id}
                  className="flex items-center gap-2 text-sm text-foreground/80 cursor-pointer hover:text-foreground"
                >
                  <input
                    type="checkbox"
                    checked={selectedQuestIds.has(q.id)}
                    onChange={() => toggleQuestId(q.id)}
                    className="w-4 h-4 rounded border-border bg-muted accent-primary"
                  />
                  {q.title}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={cancelEdit}
            disabled={saving}
            className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border hover:border-border transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
        {nestedLocationDialog}
      </div>
    );
  }

  return (
    <div className="bg-muted border border-border rounded-xl p-4 flex flex-col gap-2">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-primary/15 text-primary text-xs font-semibold px-2 py-0.5 rounded whitespace-nowrap">
            PHASE {index + 1}
          </span>
          <span className="text-foreground font-medium">{phase.title}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Reorder buttons */}
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            title="Move up"
            className="text-muted-foreground/60 hover:text-foreground/80 disabled:opacity-20 disabled:cursor-not-allowed p-1 rounded transition-colors"
          >
            &#8593;
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === totalPhases - 1}
            title="Move down"
            className="text-muted-foreground/60 hover:text-foreground/80 disabled:opacity-20 disabled:cursor-not-allowed p-1 rounded transition-colors"
          >
            &#8595;
          </button>
          <button
            onClick={enterEdit}
            className="text-sm text-primary hover:text-primary px-2 py-0.5 rounded transition-colors"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            title="Delete phase"
            className="text-muted-foreground/60 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed px-1.5 py-0.5 rounded transition-colors text-base leading-none"
          >
            &times;
          </button>
        </div>
      </div>

      {/* Description */}
      {renderRichDescription()}

      {/* Links summary */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
        <span>
          Linked:{" "}
          <span className="text-muted-foreground">
            {linkedQuestTitles.length > 0
              ? `${linkedQuestTitles.length} quest${linkedQuestTitles.length !== 1 ? "s" : ""}`
              : "none yet"}
          </span>
        </span>
        <span>
          Locations:{" "}
          <span className="text-muted-foreground">
            {linkedLocationNames.length > 0
              ? linkedLocationNames.join(", ")
              : "none yet"}
          </span>
        </span>
      </div>
      {nestedLocationDialog}
    </div>
  );
}
