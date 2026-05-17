"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import type { Location } from "@/types";

interface TreeNode {
  location: Location;
  children: TreeNode[];
}

function buildTree(locations: Location[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  for (const loc of locations) {
    byId.set(loc.id, { location: loc, children: [] });
  }
  const roots: TreeNode[] = [];
  for (const loc of locations) {
    const node = byId.get(loc.id)!;
    if (loc.parent_id && byId.has(loc.parent_id)) {
      byId.get(loc.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

interface LocationNodeProps {
  node: TreeNode;
  depth: number;
  selectedId: string | null;
  currentLocationId: string | null | undefined;
  onSelect: (location: Location) => void;
  onActivate?: (location: Location) => void;
  onAddChild?: (parentId: string) => void;
  onReparent?: (draggedId: string, newParentId: string | null) => void;
  draggedId: string | null;
  setDraggedId: (id: string | null) => void;
}

function LocationNode({
  node,
  depth,
  selectedId,
  currentLocationId,
  onSelect,
  onActivate,
  onAddChild,
  onReparent,
  draggedId,
  setDraggedId,
}: LocationNodeProps) {
  const t = useTranslations("builder.locationTree");
  const [expanded, setExpanded] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.location.id;
  const isCurrent = currentLocationId === node.location.id;
  const canDrag = Boolean(onReparent);

  function handleDragStart(e: React.DragEvent) {
    setDraggedId(node.location.id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnd() {
    setDraggedId(null);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (draggedId && draggedId !== node.location.id) {
      setIsDragOver(true);
      e.dataTransfer.dropEffect = "move";
    }
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (draggedId && draggedId !== node.location.id && onReparent) {
      onReparent(draggedId, node.location.id);
    }
  }

  return (
    <div>
      <div
        className={`group flex items-center gap-1 rounded-md px-2 py-1 cursor-pointer transition-colors select-none ${
          isSelected
            ? "bg-primary/20 border border-primary/40"
            : isDragOver
            ? "bg-accent border border-border"
            : "hover:bg-muted border border-transparent"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        draggable={canDrag}
        onDragStart={canDrag ? handleDragStart : undefined}
        onDragEnd={canDrag ? handleDragEnd : undefined}
        onDragOver={canDrag ? handleDragOver : undefined}
        onDragLeave={canDrag ? handleDragLeave : undefined}
        onDrop={canDrag ? handleDrop : undefined}
        onClick={() => onSelect(node.location)}
        onDoubleClick={
          onActivate ? () => onActivate(node.location) : undefined
        }
      >
        {/* Expand/collapse arrow */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) setExpanded((v) => !v);
          }}
          className={`w-4 h-4 flex items-center justify-center text-muted-foreground flex-shrink-0 ${
            hasChildren ? "hover:text-foreground/80" : "opacity-0 pointer-events-none"
          }`}
        >
          <svg
            className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* Current location pin badge */}
        {isCurrent && (
          <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" aria-hidden="true" />
        )}

        {/* Location name */}
        <span
          className={`flex-1 text-sm truncate ${
            isSelected ? "text-primary font-medium" : "text-foreground"
          }`}
        >
          {node.location.name}
        </span>

        {/* Biome badge */}
        <span className="hidden group-hover:inline text-xs text-muted-foreground/60 mr-1">
          {node.location.biome}
        </span>

        {/* Add child button */}
        {onAddChild && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(node.location.id);
            }}
            className="hidden group-hover:flex items-center justify-center w-5 h-5 text-muted-foreground hover:text-primary rounded transition-colors flex-shrink-0"
            title={t("addSublocation")}
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <LocationNode
              key={child.location.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              currentLocationId={currentLocationId}
              onSelect={onSelect}
              onActivate={onActivate}
              onAddChild={onAddChild}
              onReparent={onReparent}
              draggedId={draggedId}
              setDraggedId={setDraggedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface LocationTreeProps {
  locations: Location[];
  selectedId: string | null;
  onSelect: (location: Location) => void;
  onActivate?: (location: Location) => void;
  currentLocationId?: string | null;
  onAddRoot?: () => void;
  onAddChild?: (parentId: string) => void;
  onReparent?: (draggedId: string, newParentId: string | null) => void;
}

export default function LocationTree({
  locations,
  selectedId,
  onSelect,
  onActivate,
  currentLocationId,
  onAddRoot,
  onAddChild,
  onReparent,
}: LocationTreeProps) {
  const t = useTranslations("builder.locationTree");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [rootDropOver, setRootDropOver] = useState(false);

  const tree = buildTree(locations);

  function handleRootDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (draggedId) {
      setRootDropOver(true);
      e.dataTransfer.dropEffect = "move";
    }
  }

  function handleRootDragLeave() {
    setRootDropOver(false);
  }

  function handleRootDrop(e: React.DragEvent) {
    e.preventDefault();
    setRootDropOver(false);
    if (draggedId && onReparent) {
      onReparent(draggedId, null);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t("heading")}
        </span>
        {onAddRoot && (
          <button
            onClick={onAddRoot}
            className="text-xs text-primary hover:text-primary transition-colors"
          >
            {t("addLocation")}
          </button>
        )}
      </div>

      {/* Root drop zone — only shown when reparenting is enabled and a drag is in progress */}
      {onReparent && draggedId && (
        <div
          onDragOver={handleRootDragOver}
          onDragLeave={handleRootDragLeave}
          onDrop={handleRootDrop}
          className={`mb-2 rounded-md border-2 border-dashed px-3 py-1.5 text-xs text-center transition-colors ${
            rootDropOver
              ? "border-primary text-primary bg-primary/10"
              : "border-border text-muted-foreground/60"
          }`}
        >
          {t("dropToTopLevel")}
        </div>
      )}

      {/* Tree */}
      <div className="flex-1 overflow-y-auto">
        {tree.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 text-center py-4">
            {t("empty")}
          </p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {tree.map((node) => (
              <LocationNode
                key={node.location.id}
                node={node}
                depth={0}
                selectedId={selectedId}
                currentLocationId={currentLocationId}
                onSelect={onSelect}
                onActivate={onActivate}
                onAddChild={onAddChild}
                onReparent={onReparent}
                draggedId={draggedId}
                setDraggedId={setDraggedId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Drag hint — only when reparenting is enabled */}
      {onReparent && locations.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground/40 text-center">
          {t("dragHint")}
        </p>
      )}
    </div>
  );
}
