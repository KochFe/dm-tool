import type { JSONContent } from "@tiptap/react";
import type { PhasePrepResult } from "@/lib/api";

/**
 * Convert a PhasePrepResult into a TipTap JSONContent document with
 * heading-level-3 titles and bullet lists. Section order is preserved
 * from the input — the model decides ordering, the frontend does not re-sort.
 *
 * Pure function, no side effects, no TipTap editor instance required.
 */
export function phasePrepToTiptap(result: PhasePrepResult): JSONContent {
  const content: JSONContent[] = [];
  for (const section of result.sections) {
    content.push({
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: section.heading }],
    });
    content.push({
      type: "bulletList",
      content: section.bullets.map((bullet) => ({
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: bullet }],
          },
        ],
      })),
    });
  }
  return { type: "doc", content };
}

/**
 * Serialize a PhasePrepResult to compact markdown for the regenerate-with-feedback
 * round trip. Only used as the `previous_output` value sent back to the model —
 * never stored or rendered as-is.
 */
export function phasePrepToMarkdown(result: PhasePrepResult): string {
  return result.sections
    .map(
      (s) =>
        `## ${s.heading}\n${s.bullets.map((b) => `- ${b}`).join("\n")}`,
    )
    .join("\n\n");
}
