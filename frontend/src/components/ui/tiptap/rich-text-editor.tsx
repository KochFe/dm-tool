"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useCallback, useRef } from "react";
import { LocationMention } from "./location-mention";
import type { JSONContent } from "@tiptap/react";

export interface RichTextEditorProps {
  /** TipTap JSON document to initialize from (takes priority over plainText) */
  initialContent?: JSONContent | null;
  /** Plain text fallback for legacy phases with no rich content */
  plainText?: string;
  /** Called on every content change with the current TipTap JSON */
  onChange?: (json: JSONContent) => void;
  /** Known location names for auto-tagging (case-insensitive) */
  knownLocationNames?: string[];
  placeholder?: string;
  className?: string;
}

/**
 * Global set of location names that were explicitly unlinked by the user
 * in this editing session. The auto-tagger skips these to prevent re-tagging.
 * Cleared when the editor mounts (new edit session).
 */
export const suppressedNames = new Set<string>();

/** Extract all LocationMention nodes from a TipTap JSON document. */
export function extractLocationMentions(
  doc: JSONContent
): { name: string; locationId: string | null }[] {
  const mentions: { name: string; locationId: string | null }[] = [];
  function walk(node: JSONContent) {
    if (node.type === "locationMention" && node.attrs) {
      mentions.push({
        name: node.attrs.name as string,
        locationId: (node.attrs.locationId as string) || null,
      });
    }
    if (node.content) {
      node.content.forEach(walk);
    }
  }
  walk(doc);
  return mentions;
}

/** Extract plain text from a TipTap JSON document. */
export function extractPlainText(doc: JSONContent): string {
  const lines: string[] = [];
  function walkBlock(node: JSONContent) {
    if (node.type === "paragraph" || node.type === "doc") {
      if (node.type === "paragraph") {
        const parts: string[] = [];
        if (node.content) {
          for (const child of node.content) {
            if (child.type === "text") {
              parts.push(child.text || "");
            } else if (child.type === "locationMention" && child.attrs) {
              parts.push(child.attrs.name as string);
            }
          }
        }
        lines.push(parts.join(""));
      }
      if (node.content) {
        for (const child of node.content) {
          if (child.type !== "text" && child.type !== "locationMention") {
            walkBlock(child);
          }
        }
      }
    }
  }
  walkBlock(doc);
  return lines.join("\n");
}

function buildInitialContent(
  initialContent?: JSONContent | null,
  plainText?: string
): JSONContent {
  if (initialContent) return initialContent;
  if (plainText) {
    return {
      type: "doc",
      content: plainText.split("\n").map((line) => ({
        type: "paragraph",
        content: line ? [{ type: "text", text: line }] : [],
      })),
    };
  }
  return { type: "doc", content: [{ type: "paragraph" }] };
}

export default function RichTextEditor({
  initialContent,
  plainText,
  onChange,
  knownLocationNames = [],
  placeholder,
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
      }),
      LocationMention,
    ],
    content: buildInitialContent(initialContent, plainText),
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: [
          "bg-card border border-border rounded-lg px-3 py-2",
          "text-foreground text-sm min-h-[6rem] max-h-[16rem] overflow-y-auto",
          "focus:outline-none focus:border-ring transition-colors",
          "prose prose-invert prose-sm max-w-none",
          className ?? "",
        ].join(" "),
      },
    },
  });

  // Handle placeholder via CSS since TipTap Placeholder extension would be another dep
  useEffect(() => {
    if (!editor || !placeholder) return;
    const el = editor.view.dom;
    el.setAttribute("data-placeholder", placeholder);
  }, [editor, placeholder]);

  // Auto-tag known location names (from DB + already tagged in this doc) as user types.
  // The timer ref lives outside the effect so re-renders don't cancel it.
  const isAutoTagging = useRef(false);
  const autoTagTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const knownNamesRef = useRef(knownLocationNames);
  knownNamesRef.current = knownLocationNames;

  useEffect(() => {
    if (!editor) return;

    function scanAndTag() {
      if (!editor || isAutoTagging.current) return;

      // Collect all names: known from DB + already tagged in this doc
      const docMentionNames = extractLocationMentions(editor.getJSON()).map(
        (m) => m.name
      );
      const allNames = [
        ...new Map(
          [...knownNamesRef.current, ...docMentionNames]
            .filter((n) => !suppressedNames.has(n.toLowerCase()))
            .map((n) => [n.toLowerCase(), n])
        ).values(),
      ];
      if (allNames.length === 0) return;

      // Sort by length desc to match longest first
      const sorted = allNames.sort((a, b) => b.length - a.length);

      const doc = editor.state.doc;
      const replacements: { from: number; to: number; name: string }[] = [];

      doc.descendants((node, pos) => {
        if (node.type.name !== "text") return;
        const text = node.text || "";
        for (const locName of sorted) {
          const regex = new RegExp(
            `\\b${locName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
            "gi"
          );
          let match;
          while ((match = regex.exec(text)) !== null) {
            const from = pos + match.index;
            const to = from + match[0].length;
            const overlaps = replacements.some(
              (r) => from < r.to && to > r.from
            );
            if (!overlaps) {
              replacements.push({ from, to, name: match[0] });
            }
          }
        }
      });

      if (replacements.length === 0) return;

      isAutoTagging.current = true;
      const tr = editor.state.tr;
      replacements
        .sort((a, b) => b.from - a.from)
        .forEach(({ from, to, name }) => {
          const mentionNode =
            editor.state.schema.nodes.locationMention.create({
              name,
              locationId: null,
            });
          tr.replaceWith(from, to, mentionNode);
        });
      editor.view.dispatch(tr);
      isAutoTagging.current = false;
    }

    // Clear suppressed names on mount (new edit session)
    suppressedNames.clear();

    // Run on mount
    scanAndTag();

    // Debounced scan after each content change — uses the editor's
    // native event so the timer survives React re-renders.
    const onUpdate = () => {
      if (isAutoTagging.current) return;
      if (autoTagTimer.current) clearTimeout(autoTagTimer.current);
      autoTagTimer.current = setTimeout(scanAndTag, 600);
    };

    editor.on("update", onUpdate);
    return () => {
      editor.off("update", onUpdate);
    };
    // Only re-attach when the editor instance changes, not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  const handleMarkLocation = useCallback(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) return; // no selection
    const selectedText = editor.state.doc.textBetween(from, to).trim();
    if (!selectedText) return;

    editor
      .chain()
      .focus()
      .deleteRange({ from, to })
      .insertContentAt(from, {
        type: "locationMention",
        attrs: { name: selectedText, locationId: null },
      })
      .run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="relative">
      <BubbleMenu
        editor={editor}
        options={{ placement: "top" }}
        shouldShow={({ state }) => {
          const { from, to } = state.selection;
          if (from === to) return false;
          // Don't show if selection is inside a locationMention
          const $from = state.doc.resolve(from);
          if ($from.parent.type.name === "locationMention") return false;
          // Don't show if selection spans across mention nodes
          let hasMention = false;
          state.doc.nodesBetween(from, to, (node) => {
            if (node.type.name === "locationMention") hasMention = true;
          });
          if (hasMention) return false;
          return true;
        }}
      >
        <button
          type="button"
          onClick={handleMarkLocation}
          className="bg-muted border border-ring text-primary text-xs font-medium px-2.5 py-1 rounded-lg shadow-lg hover:bg-accent hover:text-primary transition-colors whitespace-nowrap"
        >
          Mark as Location
        </button>
      </BubbleMenu>

      <EditorContent editor={editor} />

      {/* Placeholder styling */}
      <style jsx global>{`
        .ProseMirror:has(> p:only-child:empty)::before,
        .ProseMirror > p:first-child:empty::before {
          content: attr(data-placeholder);
          color: #4b5563;
          pointer-events: none;
          position: absolute;
          opacity: 0.6;
        }
        .ProseMirror [data-type="location-mention"] {
          user-select: none;
        }
        .ProseMirror:focus {
          outline: none;
        }
      `}</style>
    </div>
  );
}
