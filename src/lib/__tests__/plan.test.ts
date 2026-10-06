/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateCostUsd, planOutfit, promptFor } from '../tryon/plan';
import type { Item, Outfit } from '../types';

const item = (id: string, category: Item['category'], title: string, extra: Partial<Item> = {}): Item => ({
  id,
  category,
  title,
  brand: 'UNIQLO',
  tags: [],
  images: ['file:///x.jpg'],
  sourceImages: [],
  coverIndex: 0,
  tryOnImageIndex: 0,
  createdAt: 0,
  updatedAt: 0,
  ...extra,
});

const items = [
  item('t', 'tee', 'White crew neck tee'),
  item('p', 'pants', 'Wide straight jeans'),
  item('j', 'jacket', 'Black bomber jacket'),
  item('s', 'shoes', 'White sneakers'),
  item('h', 'hat', 'Navy cap'),
  item('n', 'accessory', 'Silver necklace'),
  item('d', 'dress', 'Linen midi dress'),
];
const get = (id?: string) => items.find((i) => i.id === id);
const outfit = (slots: Outfit['slots'], accessories: string[] = []): Outfit => ({
  id: 'o',
  name: 'x',
  slots,
  accessories,
  results: [],
  createdAt: 0,
  updatedAt: 0,
});

test('layers passes bottom → top → outer → shoes → hat → accessories', () => {
  const passes = planOutfit(outfit({ top: 't', bottom: 'p', outer: 'j', shoes: 's', hat: 'h' }, ['n']), get);
  assert.deepEqual(
    passes.map((p) => p.item.id),
    ['p', 't', 'j', 's', 'h', 'n'],
  );
  assert.match(passes[0].prompt, /^Substitute the lower body garment with Wide straight jeans by UNIQLO\.$/);
  assert.match(passes[2].prompt, /worn open on top of White crew neck tee by UNIQLO/);
  assert.match(passes[5].prompt, /^Add Silver necklace by UNIQLO to the outfit\.$/);
});

test('a one-piece replaces top and bottom passes', () => {
  const passes = planOutfit(outfit({ onepiece: 'd', top: 't', bottom: 'p' }), get);
  assert.deepEqual(
    passes.map((p) => p.item.id),
    ['d'],
  );
  assert.match(passes[0].prompt, /^Substitute the outfit with/);
});

test('a hand-written prompt wins and is length-capped', () => {
  assert.equal(promptFor(item('x', 'tee', 'x', { tryOnPrompt: '  custom  ' })), 'custom');
  assert.equal(promptFor(item('x', 'tee', 'x', { tryOnPrompt: 'a'.repeat(900) })).length, 700);
});

test('cost estimate', () => {
  assert.equal(estimateCostUsd(3, 8), 0.96);
});
