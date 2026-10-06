import { CATEGORY_BY_ID, slotOf } from '../categories';
import type { Item, Outfit } from '../types';

export type TryOnPass = {
  item: Item;
  /** Short label shown in progress, e.g. "下身：寬褲". */
  label: string;
  prompt: string;
};

/** Lucy VTON 3.5 rejects prompts over roughly 750 English characters. */
const MAX_PROMPT = 700;

function describe(item: Item): string {
  const parts = [item.title.trim()];
  if (item.brand && !item.title.toLowerCase().includes(item.brand.toLowerCase())) parts.push(`by ${item.brand}`);
  return parts.join(' ');
}

/**
 * Prompt patterns follow Decart's VTON 3.5 guide: one action per prompt, name the body region,
 * "substitute" for garments that replace something, "add" for items worn on top.
 */
export function promptFor(item: Item, context: { topUnderneath?: Item } = {}): string {
  if (item.tryOnPrompt?.trim()) return item.tryOnPrompt.trim().slice(0, MAX_PROMPT);
  const d = describe(item);
  let prompt: string;
  switch (slotOf(item.category)) {
    case 'top':
      prompt = `Substitute the upper body garment with ${d}.`;
      break;
    case 'outer': {
      const under = context.topUnderneath ? describe(context.topUnderneath) : 'the current top';
      prompt = `Substitute the upper body garment with ${d}, worn open on top of ${under}.`;
      break;
    }
    case 'bottom':
      prompt = `Substitute the lower body garment with ${d}.`;
      break;
    case 'onepiece':
      prompt = `Substitute the outfit with ${d}.`;
      break;
    case 'shoes':
      prompt = `Substitute the footwear with ${d}.`;
      break;
    default:
      prompt = `Add ${d} to the outfit.`;
  }
  return prompt.slice(0, MAX_PROMPT);
}

/**
 * Order the passes so later layers sit on top of earlier ones:
 * one-piece (or bottom then top) → outerwear → shoes → hat → accessories.
 */
export function planOutfit(outfit: Outfit, getItem: (id?: string) => Item | undefined): TryOnPass[] {
  const s = outfit.slots;
  const onepiece = getItem(s.onepiece);
  const top = getItem(s.top);
  const ordered: (Item | undefined)[] = onepiece ? [onepiece] : [getItem(s.bottom), top];
  ordered.push(getItem(s.outer), getItem(s.shoes), getItem(s.hat), ...outfit.accessories.map((id) => getItem(id)));

  return ordered
    .filter((i): i is Item => !!i)
    .map((item) => ({
      item,
      label: `${CATEGORY_BY_ID[item.category]?.label ?? '單品'}：${item.title}`,
      prompt: promptFor(item, { topUnderneath: onepiece ? undefined : top }),
    }));
}

/** Decart batch pricing for lucy-vton-3.5 at 720p (USD per generated second), checked 2026-10. */
export const DECART_USD_PER_SECOND = 0.04;

export function estimateCostUsd(passes: number, videoSeconds: number): number {
  return Math.round(passes * videoSeconds * DECART_USD_PER_SECOND * 100) / 100;
}
