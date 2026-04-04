"use client";

import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useState } from "react";
import { suppressedNames } from "./rich-text-editor";

export default function LocationMentionView({ node, getPos, editor }: NodeViewProps) {
  const [hovered, setHovered] = useState(false);
  const name = node.attrs.name as string;

  function handleUnlink() {
    // Suppress this name from auto-tagging for the rest of this edit session
    suppressedNames.add(name.toLowerCase());

    // Find ALL mention nodes with the same name (case-insensitive) and replace with plain text
    const tr = editor.state.tr;
    const replacements: { from: number; to: number }[] = [];

    editor.state.doc.descendants((n, pos) => {
      if (
        n.type.name === "locationMention" &&
        (n.attrs.name as string).toLowerCase() === name.toLowerCase()
      ) {
        replacements.push({ from: pos, to: pos + n.nodeSize });
      }
    });

    // Apply in reverse order to preserve positions
    replacements
      .sort((a, b) => b.from - a.from)
      .forEach(({ from, to }) => {
        tr.replaceWith(from, to, editor.state.schema.text(name));
      });

    editor.view.dispatch(tr);
  }

  return (
    <NodeViewWrapper
      as="span"
      className="bg-primary/20 text-primary rounded px-1 cursor-default inline-block relative"
      data-location-name={name}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {name}
      {hovered && (
        <button
          type="button"
          onClick={handleUnlink}
          className="ml-1 text-primary/60 hover:text-red-400 text-xs leading-none transition-colors"
          title="Remove location tag"
        >
          &times;
        </button>
      )}
    </NodeViewWrapper>
  );
}
