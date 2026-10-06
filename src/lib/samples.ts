import type { CategoryId } from './categories';
import type { Item } from './types';

/** Simple flat-lay drawings so a fresh install has something to filter, combine and try on. */
const svg = (body: string, bg = '#EFEBE5') =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><rect width="400" height="500" fill="${bg}"/>${body}</svg>`,
  );

const tee = (c: string) =>
  svg(
    `<path d="M140 90 L95 110 L45 175 L95 210 L120 180 L120 420 L280 420 L280 180 L305 210 L355 175 L305 110 L260 90 Q200 135 140 90Z" fill="${c}" stroke="#0002" stroke-width="3"/>`,
  );
const longsleeve = (c: string) =>
  svg(
    `<path d="M140 90 L95 110 L40 330 L85 340 L120 200 L120 420 L280 420 L280 200 L315 340 L360 330 L305 110 L260 90 Q200 135 140 90Z" fill="${c}" stroke="#0002" stroke-width="3"/>`,
  );
const jacket = (c: string) =>
  svg(
    `<path d="M140 80 L90 105 L40 340 L88 352 L120 210 L118 430 L282 430 L280 210 L312 352 L360 340 L310 105 L260 80 L230 80 L200 120 L170 80Z" fill="${c}" stroke="#0003" stroke-width="3"/><line x1="200" y1="120" x2="200" y2="430" stroke="#0004" stroke-width="4"/><rect x="118" y="410" width="164" height="22" fill="#0002"/>`,
  );
const pants = (c: string) =>
  svg(
    `<path d="M125 60 L275 60 L300 450 L215 450 L200 170 L185 450 L100 450Z" fill="${c}" stroke="#0002" stroke-width="3"/><rect x="125" y="60" width="150" height="22" fill="#0002"/>`,
  );
const shorts = (c: string) =>
  svg(
    `<path d="M120 120 L280 120 L310 330 L215 340 L200 230 L185 340 L90 330Z" fill="${c}" stroke="#0002" stroke-width="3"/><rect x="120" y="120" width="160" height="20" fill="#0002"/>`,
  );
const dress = (c: string) =>
  svg(
    `<path d="M160 60 L240 60 L250 170 L320 450 L80 450 L150 170Z" fill="${c}" stroke="#0002" stroke-width="3"/><path d="M160 60 L150 30 M240 60 L250 30" stroke="${c}" stroke-width="10"/>`,
  );
const shoes = (c: string) =>
  svg(
    `<path d="M60 300 L60 230 Q90 210 130 230 L190 260 Q240 270 260 300 L260 320 L60 320Z" fill="${c}" stroke="#0003" stroke-width="3"/><path d="M150 330 L150 260 Q180 240 220 260 L280 290 Q330 300 350 330 L350 350 L150 350Z" fill="${c}" stroke="#0003" stroke-width="3"/><rect x="60" y="316" width="200" height="10" fill="#0003"/><rect x="150" y="346" width="200" height="10" fill="#0003"/>`,
  );
const cap = (c: string) =>
  svg(
    `<path d="M110 280 Q110 160 210 160 Q310 160 310 280Z" fill="${c}" stroke="#0003" stroke-width="3"/><path d="M290 270 Q360 270 370 300 L280 300Z" fill="${c}" stroke="#0003" stroke-width="3"/><circle cx="210" cy="160" r="8" fill="#0003"/>`,
  );
const bag = (c: string) =>
  svg(
    `<path d="M150 190 Q150 110 200 110 Q250 110 250 190" fill="none" stroke="${c}" stroke-width="12"/><rect x="100" y="185" width="200" height="200" rx="16" fill="${c}" stroke="#0003" stroke-width="3"/>`,
  );
const necklace = (c: string) =>
  svg(`<path d="M110 120 Q200 360 290 120" fill="none" stroke="${c}" stroke-width="6"/><circle cx="200" cy="280" r="18" fill="${c}"/>`);

type Sample = [title: string, brand: string, category: CategoryId, image: string, season?: string, tags?: string[]];

const SAMPLES: Sample[] = [
  ['圓領短袖T恤（白）', 'UNIQLO', 'tee', tee('#FAFAF7'), '2026 春夏', ['基本款']],
  ['寬版短袖T恤（黑）', 'GU', 'tee', tee('#2B2B2B'), '2026 春夏'],
  ['條紋長袖上衣', 'UNIQLO', 'longsleeve', longsleeve('#3B5B8C'), '2026 秋冬'],
  ['MA-1 飛行外套', 'GU', 'jacket', jacket('#3E4A2E'), '2026 秋冬', ['約會']],
  ['羊毛大衣（駝色）', 'UNIQLO', 'coat', jacket('#B08A5B'), '2026 秋冬', ['上班']],
  ['寬版直筒牛仔褲', 'UNIQLO', 'pants', pants('#4A6A9A'), '2026 秋冬', ['基本款']],
  ['西裝寬褲（灰）', 'ZARA', 'pants', pants('#8A8580'), '2026 秋冬', ['上班']],
  ['卡其短褲', 'GU', 'shorts', shorts('#C9B48A'), '2026 春夏'],
  ['亞麻長洋裝', 'ZARA', 'dress', dress('#D9C9A8'), '2026 春夏', ['約會']],
  ['白色休閒鞋', 'Allbirds', 'shoes', shoes('#F4F4F0')],
  ['棒球帽（海軍藍）', 'UNIQLO', 'hat', cap('#24324F')],
  ['皮革托特包', 'ZARA', 'bag', bag('#6B4430')],
  ['銀色項鍊', 'COS', 'accessory', necklace('#9AA0A6')],
];

export function sampleItems(now = Date.now()): Omit<Item, 'id'>[] {
  return SAMPLES.map(([title, brand, category, image, season, tags = []], i) => ({
    title,
    brand,
    category,
    season,
    tags: ['範例', ...tags],
    images: [image],
    sourceImages: [],
    coverIndex: 0,
    tryOnImageIndex: 0,
    description: '範例單品，可以隨時刪除。',
    createdAt: now - i,
    updatedAt: now - i,
  }));
}
