/** Where an item goes on the body when building an outfit. */
export type SlotId = 'top' | 'outer' | 'bottom' | 'onepiece' | 'shoes' | 'hat' | 'accessory';

export type CategoryId =
  | 'tee'
  | 'longsleeve'
  | 'shirt'
  | 'knit'
  | 'hoodie'
  | 'jacket'
  | 'coat'
  | 'pants'
  | 'shorts'
  | 'skirt'
  | 'dress'
  | 'shoes'
  | 'hat'
  | 'bag'
  | 'accessory'
  | 'other';

export type Category = {
  id: CategoryId;
  label: string;
  slot: SlotId;
  /** Lower-case keywords (zh / en / ja) used to guess the category from a product title. */
  keywords: string[];
};

/**
 * Ordered by guessing priority: more specific words come first so that
 * "連帽外套" becomes a jacket and "短袖襯衫" becomes a shirt rather than a tee.
 */
export const CATEGORIES: Category[] = [
  { id: 'dress', label: '洋裝／連身', slot: 'onepiece', keywords: ['洋裝', '連身', '连衣裙', 'dress', 'jumpsuit', 'romper', 'ワンピース'] },
  {
    id: 'coat',
    label: '大衣',
    slot: 'outer',
    keywords: ['大衣', '風衣', '羽絨', 'coat', 'trench', 'parka', 'down jacket', 'puffer', 'コート', 'ダウン'],
  },
  {
    id: 'jacket',
    label: '外套',
    slot: 'outer',
    keywords: [
      '外套',
      '夾克',
      '西裝外套',
      '開襟',
      '背心外套',
      'jacket',
      'blazer',
      'cardigan',
      'bomber',
      'windbreaker',
      'ジャケット',
      'ブルゾン',
      'カーディガン',
    ],
  },
  {
    id: 'hoodie',
    label: '帽T／大學T',
    slot: 'top',
    keywords: ['帽t', '連帽', '大學t', '衛衣', 'hoodie', 'sweatshirt', 'パーカー', 'スウェット'],
  },
  { id: 'knit', label: '針織／毛衣', slot: 'top', keywords: ['毛衣', '針織', 'knit', 'sweater', 'jumper', 'ニット', 'セーター'] },
  { id: 'shirt', label: '襯衫', slot: 'top', keywords: ['襯衫', '衬衫', 'shirt', 'blouse', 'polo', 'シャツ', 'ブラウス'] },
  { id: 'longsleeve', label: '長袖上衣', slot: 'top', keywords: ['長袖', '长袖', 'long sleeve', 'long-sleeve', '長袖t', 'ロングスリーブ'] },
  {
    id: 'tee',
    label: '短袖上衣',
    slot: 'top',
    keywords: ['短袖', 't恤', 'tee', 't-shirt', 'tshirt', 'tank', '背心', '上衣', 'top', 'tシャツ'],
  },
  { id: 'shorts', label: '短褲', slot: 'bottom', keywords: ['短褲', 'shorts', 'ショーツ', 'ショートパンツ'] },
  { id: 'skirt', label: '裙子', slot: 'bottom', keywords: ['裙', 'skirt', 'スカート'] },
  {
    id: 'pants',
    label: '長褲',
    slot: 'bottom',
    keywords: ['長褲', '褲', '牛仔褲', 'pants', 'trousers', 'jeans', 'denim', 'chino', 'leggings', 'パンツ', 'ジーンズ'],
  },
  {
    id: 'shoes',
    label: '鞋子',
    slot: 'shoes',
    keywords: [
      '鞋',
      '靴',
      'sneaker',
      'shoe',
      'boot',
      'loafer',
      'sandal',
      'runner',
      'trainer',
      'slipper',
      'mule',
      'スニーカー',
      'シューズ',
      'ブーツ',
    ],
  },
  { id: 'hat', label: '帽子', slot: 'hat', keywords: ['帽', 'cap', 'hat', 'beanie', 'bucket', 'キャップ', 'ハット'] },
  { id: 'bag', label: '包包', slot: 'accessory', keywords: ['包', 'bag', 'tote', 'backpack', 'clutch', 'バッグ'] },
  {
    id: 'accessory',
    label: '飾品配件',
    slot: 'accessory',
    keywords: [
      '項鍊',
      '耳環',
      '戒指',
      '手鍊',
      '手環',
      '皮帶',
      '圍巾',
      '眼鏡',
      '墨鏡',
      '襪',
      'necklace',
      'earring',
      'ring',
      'bracelet',
      'belt',
      'scarf',
      'sunglasses',
      'glasses',
      'socks',
      'watch',
    ],
  },
  { id: 'other', label: '其他', slot: 'accessory', keywords: [] },
];

export const CATEGORY_BY_ID: Record<CategoryId, Category> = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<
  CategoryId,
  Category
>;

export const SLOTS: { id: SlotId; label: string }[] = [
  { id: 'top', label: '上衣' },
  { id: 'outer', label: '外套' },
  { id: 'bottom', label: '下身' },
  { id: 'onepiece', label: '連身' },
  { id: 'shoes', label: '鞋子' },
  { id: 'hat', label: '帽子' },
  { id: 'accessory', label: '配件' },
];

export function slotOf(category: CategoryId): SlotId {
  return CATEGORY_BY_ID[category]?.slot ?? 'accessory';
}

/** Guess a category from free text (title, breadcrumbs, product type, URL path). */
export function guessCategory(...texts: (string | undefined)[]): CategoryId {
  const haystack = texts.filter(Boolean).join(' ').toLowerCase();
  if (!haystack) return 'other';
  for (const c of CATEGORIES) {
    if (c.keywords.some((k) => matchesKeyword(haystack, k))) return c.id;
  }
  return 'other';
}

/** ASCII keywords must match on word boundaries ("ring" should not match "spring"); CJK keywords match anywhere. */
function matchesKeyword(haystack: string, keyword: string): boolean {
  if (!/^[a-z0-9 \-]+$/.test(keyword)) return haystack.includes(keyword);
  const escaped = keyword.replace(/[-]/g, '\\-');
  return new RegExp(`(^|[^a-z])${escaped}s?([^a-z]|$)`).test(haystack);
}

const SEASON_WORDS: [RegExp, string][] = [
  [/(ss|spring|summer|春夏|春|夏)/i, '春夏'],
  [/(aw|fw|fall|autumn|winter|秋冬|秋|冬)/i, '秋冬'],
];

/** Pull a "2026 秋冬" style label out of text such as "2026FW" or "26 Spring/Summer". */
export function guessSeason(...texts: (string | undefined)[]): string | undefined {
  const text = texts.filter(Boolean).join(' ');
  const m = text.match(
    /(20\d{2}|\b\d{2})\s*[\/\-]?\s*(ss|aw|fw|spring(?:\s*\/?\s*summer)?|summer|fall(?:\s*\/?\s*winter)?|autumn(?:\s*\/?\s*winter)?|winter|春夏|秋冬)/i,
  );
  if (!m) return undefined;
  const year = m[1].length === 2 ? `20${m[1]}` : m[1];
  const season = SEASON_WORDS.find(([re]) => re.test(m[2]))?.[1];
  return season ? `${year} ${season}` : undefined;
}

/** Season chips offered in the editor: this year and next, both halves. */
export function seasonSuggestions(now = new Date()): string[] {
  const y = now.getFullYear();
  return [`${y} 春夏`, `${y} 秋冬`, `${y + 1} 春夏`, `${y - 1} 秋冬`];
}
