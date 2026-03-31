import { Node, mergeAttributes } from "@tiptap/react";
import { ReactNodeViewRenderer } from "@tiptap/react";
import LocationMentionView from "./location-mention-view";

export interface LocationMentionAttrs {
  name: string;
  locationId: string | null;
}

export const LocationMention = Node.create({
  name: "locationMention",
  group: "inline",
  inline: true,
  atom: true,
  selectable: false,
  draggable: false,

  addAttributes() {
    return {
      name: { default: "" },
      locationId: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="location-mention"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-type": "location-mention" }),
      HTMLAttributes.name || "",
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(LocationMentionView);
  },
});
