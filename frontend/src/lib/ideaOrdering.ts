import type { CampaignIdea, IdeaReorderItem, IdeaTag } from "@/types";

/** Display order for idea groups. Distinct from IdeaRow's tag-cycle order. */
export const GROUP_ORDER: IdeaTag[] = ["story", "character", "location"];

export type IdeasByTag = Record<IdeaTag, CampaignIdea[]>;

function emptyByTag(): IdeasByTag {
  return { story: [], character: [], location: [] };
}

/**
 * Split ideas into active and done buckets per tag, each sorted by sort_order.
 * Active items are draggable; done items are pinned below their group.
 */
export function splitGroups(ideas: CampaignIdea[]): {
  active: IdeasByTag;
  done: IdeasByTag;
} {
  const active = emptyByTag();
  const done = emptyByTag();
  for (const tag of GROUP_ORDER) {
    const inTag = ideas
      .filter((i) => i.tag === tag)
      .sort((a, b) => a.sort_order - b.sort_order);
    active[tag] = inTag.filter((i) => !i.is_done);
    done[tag] = inTag.filter((i) => i.is_done);
  }
  return { active, done };
}

/**
 * Flatten an active/done arrangement into a reorder payload. Walks groups in
 * GROUP_ORDER; within each group, active items first then done items. The
 * assigned sort_order is the global running index, so a plain ORDER BY
 * sort_order returns ideas already grouped.
 */
export function buildPayload(active: IdeasByTag, done: IdeasByTag): IdeaReorderItem[] {
  const payload: IdeaReorderItem[] = [];
  let index = 0;
  for (const tag of GROUP_ORDER) {
    for (const idea of active[tag]) payload.push({ id: idea.id, sort_order: index++, tag });
    for (const idea of done[tag]) payload.push({ id: idea.id, sort_order: index++, tag });
  }
  return payload;
}
