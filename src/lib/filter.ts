import { CATEGORY_BY_ID, type CategoryId, type SlotId } from './categories';
import type { Item } from './types';

export type ItemFilter = {
  query: string;
  categories: CategoryId[];
  brands: string[];
  seasons: string[];
  tags: string[];
  slot?: SlotId;
};

export const EMPTY_FILTER: ItemFilter = { query: '', categories: [], brands: [], seasons: [], tags: [] };

const norm = (s: string) => s.trim().toLowerCase();

/** Within one facet any selected value matches (OR); across facets all must match (AND). */
export function filterItems(items: Item[], f: ItemFilter): Item[] {
  const q = norm(f.query);
  const brands = f.brands.map(norm);
  return items.filter((i) => {
    if (f.slot && CATEGORY_BY_ID[i.category]?.slot !== f.slot) return false;
    if (f.categories.length && !f.categories.includes(i.category)) return false;
    if (brands.length && !brands.includes(norm(i.brand))) return false;
    if (f.seasons.length && !(i.season && f.seasons.includes(i.season))) return false;
    if (f.tags.length && !f.tags.some((t) => i.tags.includes(t))) return false;
    if (q) {
      const hay = norm([i.title, i.brand, i.season, i.description, ...i.tags, CATEGORY_BY_ID[i.category]?.label].join(' '));
      if (!q.split(/\s+/).every((word) => hay.includes(word))) return false;
    }
    return true;
  });
}

export type Facet = { value: string; count: number };

/** Distinct values with counts, most common first. Brands are grouped case-insensitively. */
export function facets(items: Item[]) {
  const count = (values: (string | undefined)[], key: (v: string) => string = (v) => v) => {
    const map = new Map<string, Facet>();
    for (const v of values) {
      if (!v?.trim()) continue;
      const k = key(v);
      const f = map.get(k);
      if (f) f.count++;
      else map.set(k, { value: v.trim(), count: 1 });
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  };
  return {
    brands: count(
      items.map((i) => i.brand),
      norm,
    ),
    seasons: count(items.map((i) => i.season)),
    tags: count(items.flatMap((i) => i.tags)),
    categories: count(items.map((i) => i.category)) as { value: CategoryId; count: number }[],
  };
}

export function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function isFilterActive(f: ItemFilter): boolean {
  return !!(f.query || f.categories.length || f.brands.length || f.seasons.length || f.tags.length);
}
