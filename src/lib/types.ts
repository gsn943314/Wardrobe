import type { CategoryId, SlotId } from './categories';

/** A garment or accessory the user saved into their fitting room. */
export type Item = {
  id: string;
  /** Product page the item was saved from (if any). */
  url?: string;
  title: string;
  brand: string;
  category: CategoryId;
  /** Free text such as "2026 秋冬" so collections can be filtered. */
  season?: string;
  tags: string[];
  priceText?: string;
  description?: string;
  /** Image URIs. Local file:// copies when the download succeeded, otherwise remote URLs. */
  images: string[];
  /** Original remote image URLs from the product page, kept for re-download. */
  sourceImages: string[];
  /** Index into `images` used as the card cover. */
  coverIndex: number;
  /** Index into `images` sent to the try-on model (a clean garment shot works best). */
  tryOnImageIndex: number;
  /** Optional hand-written try-on prompt; generated from the item when empty. */
  tryOnPrompt?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
};

export type OutfitSlots = Partial<Record<Exclude<SlotId, 'accessory'>, string>>;

export type Outfit = {
  id: string;
  name: string;
  slots: OutfitSlots;
  /** Accessories and bags can be stacked, so they are a list. */
  accessories: string[];
  results: TryOnResult[];
  createdAt: number;
  updatedAt: number;
};

export type TryOnResult = {
  id: string;
  createdAt: number;
  /** Local mp4 produced by the try-on run. */
  videoUri: string;
  /** Base video the result was generated from, for before/after comparison. */
  baseVideoUri: string;
  provider: 'decart' | 'demo';
  /** Human-readable list of the passes that ran, e.g. "下身：寬褲". */
  steps: string[];
};

export type Profile = {
  /** The user's own turnaround video stored in the app's document directory. */
  baseVideoUri?: string;
  baseVideoDurationSec?: number;
  heightCm?: number;
  weightKg?: number;
  /** 1 or -1: flips which swipe direction turns the body clockwise in the viewer. */
  turnDirection: 1 | -1;
};
