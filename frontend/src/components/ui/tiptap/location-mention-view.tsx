"use client";

import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useState } from "react";

export default function LocationMentionView({ node, deleteNode, editor }: NodeViewProps) {
  const [hovered, setHovered] = useState(false);
  const name = node.attrs.name as string;

  function handleUnlink() {
    // Delete the mention node and insert plain text in its place
    deleteNode();
    editor.commands.insertContent(name);
  }

  return (
    <NodeViewWrapper
      as="span"
      className="bg-amber-500/20 text-amber-300 rounded px-1 cursor-default inline-block relative"
      data-location-name={name}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {name}
      {hovered && (
        <button
          type="button"
          onClick={handleUnlink}
          className="ml-1 text-amber-500/60 hover:text-red-400 text-xs leading-none transition-colors"
          title="Remove location tag"
        >
          &times;
        </button>
      )}
    </NodeViewWrapper>
  );
}
