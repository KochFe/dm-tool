"use client";

import { useState, useRef } from "react";
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
  onSelect: (location: Location) => void;
  onAddChild: (parentId: string) => void;
  onReparent: (draggedId: string, newParentId: string | null) => void;
  draggedId: string | null;
  setDraggedId: (id: string | null) => void;
}

function LocationNode({
  node,
  depth,
  selectedId,
  onSelect,
  onAddChild,
  onReparent,
  draggedId,
  setDraggedId,
}: LocationNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.location.id;

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
    if (draggedId && draggedId !== node.location.id) {
      onReparent(draggedId, node.location.id);
    }
  }

  return (
    <div>
      <div
        className={`group flex items-center gap-1 rounded-md px-2 py-1 cursor-pointer transition-colors select-none ${
          isSelected
            ? "bg-amber-600/20 border border-amber-600/40"
            : isDragOver
            ? "bg-gray-700 border border-gray-500"
            : "hover:bg-gray-800 border border-transparent"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => onSelect(node.location)}
      >
        {/* Expand/collapse arrow */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) setExpanded((v) => !v);
          }}
          className={`w-4 h-4 flex items-center justify-center text-gray-500 flex-shrink-0 ${
            hasChildren ? "hover:text-gray-300" : "opacity-0 pointer-events-none"
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

        {/* Location name */}
        <span
          className={`flex-1 text-sm truncate ${
            isSelected ? "text-amber-300 font-medium" : "text-gray-200"
          }`}
        >
          {node.location.name}
        </span>

        {/* Biome badge */}
        <span className="hidden group-hover:inline text-xs text-gray-600 mr-1">
          {node.location.biome}
        </span>

        {/* Add child button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddChild(node.location.id);
          }}
          className="hidden group-hover:flex items-center justify-center w-5 h-5 text-gray-500 hover:text-amber-400 rounded transition-colors flex-shrink-0"
          title="Add sublocation"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
        </button>
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
              onSelect={onSelect}
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
  onAddRoot: () => void;
  onAddChild: (parentId: string) => void;
  onReparent: (draggedId: string, newParentId: string | null) => void;
}

export default function LocationTree({
  locations,
  selectedId,
  onSelect,
  onAddRoot,
  onAddChild,
  onReparent,
}: LocationTreeProps) {
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
    if (draggedId) {
      onReparent(draggedId, null);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Locations
        </span>
        <button
          onClick={onAddRoot}
          className="text-xs text-amber-500 hover:text-amber-400 transition-colors"
        >
          + Add Location
        </button>
      </div>

      {/* Root drop zone */}
      {draggedId && (
        <div
          onDragOver={handleRootDragOver}
          onDragLeave={handleRootDragLeave}
          onDrop={handleRootDrop}
          className={`mb-2 rounded-md border-2 border-dashed px-3 py-1.5 text-xs text-center transition-colors ${
            rootDropOver
              ? "border-amber-500 text-amber-400 bg-amber-900/10"
              : "border-gray-700 text-gray-600"
          }`}
        >
          Drop here to make top-level
        </div>
      )}

      {/* Tree */}
      <div className="flex-1 overflow-y-auto">
        {tree.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-4">
            No locations yet. Click &ldquo;+ Add Location&rdquo; to start.
          </p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {tree.map((node) => (
              <LocationNode
                key={node.location.id}
                node={node}
                depth={0}
                selectedId={selectedId}
                onSelect={onSelect}
                onAddChild={onAddChild}
                onReparent={onReparent}
                draggedId={draggedId}
                setDraggedId={setDraggedId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Hint */}
      {locations.length > 0 && (
        <p className="mt-3 text-xs text-gray-700 text-center">
          Drag locations to rearrange hierarchy
        </p>
      )}
    </div>
  );
}
