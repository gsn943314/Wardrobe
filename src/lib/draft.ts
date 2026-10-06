import type { ParsedProduct } from './productParser';

/**
 * Hand-off from the in-app browser to the "new item" screen. Product data (many image URLs,
 * long descriptions) is too bulky for route params, so it is parked here for one read.
 */
let pending: ParsedProduct | null = null;

export function setDraft(p: ParsedProduct) {
  pending = p;
}

export function takeDraft(): ParsedProduct | null {
  const p = pending;
  pending = null;
  return p;
}
