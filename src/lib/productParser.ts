import { guessCategory, guessSeason, type CategoryId } from './categories';

export type ParsedProduct = {
  url: string;
  title: string;
  brand: string;
  description: string;
  images: string[];
  priceText?: string;
  category: CategoryId;
  season?: string;
  tags: string[];
};

const USER_AGENT = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';

/**
 * Fetch a product page and pull out what we can. React Native's fetch is not subject to
 * browser CORS, so the app can read store pages directly without a backend.
 */
export async function fetchProduct(url: string, fetchImpl: typeof fetch = fetch): Promise<ParsedProduct> {
  const res = await fetchImpl(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8' },
  });
  if (!res.ok) throw new Error(`讀取商品頁失敗（HTTP ${res.status}）`);
  const html = await res.text();
  const finalUrl = res.url || url;
  const parsed = parseProductHtml(html, finalUrl);

  // Shopify stores expose a public product JSON next to every product page.
  if (isShopify(html, finalUrl)) {
    try {
      const js = await fetchImpl(shopifyJsonUrl(finalUrl), { headers: { 'User-Agent': USER_AGENT } });
      if (js.ok) return mergeShopify(parsed, await js.json());
    } catch {
      // Fall back to what the HTML gave us.
    }
  }
  return parsed;
}

export function parseProductHtml(html: string, pageUrl: string): ParsedProduct {
  const meta = readMetaTags(html);
  const ld = findJsonLdProduct(html);
  const breadcrumbs = findJsonLdBreadcrumbs(html);

  const title = clean(
    str(ld?.name) || meta['og:title'] || meta['twitter:title'] || matchText(html, /<title[^>]*>([\s\S]*?)<\/title>/i) || '',
  );
  const brand = clean(brandName(ld?.brand) || meta['product:brand'] || meta['og:brand'] || meta['og:site_name'] || brandFromHost(pageUrl));
  const description = clean(stripTags(str(ld?.description) || meta['og:description'] || meta['description'] || ''));

  const images = dedupeImages(
    [...imageList(ld?.image), ...metaAll(html, 'og:image'), meta['twitter:image']]
      .filter((u): u is string => !!u)
      .map((u) => absolutize(decodeEntities(u), pageUrl)),
  ).slice(0, 12);

  const offer = firstOffer(ld?.offers);
  const price = str(offer?.price) || meta['product:price:amount'] || meta['og:price:amount'];
  const currency = str(offer?.priceCurrency) || meta['product:price:currency'] || meta['og:price:currency'];
  const priceText = price ? `${currency ? currency + ' ' : ''}${price}` : undefined;

  const path = safePath(pageUrl);
  return {
    url: pageUrl,
    title,
    brand,
    description,
    images,
    priceText,
    category: guessCategory(title, str(ld?.category), breadcrumbs.join(' '), path),
    season: guessSeason(title, description, path),
    tags: [],
  };
}

// ---------- Shopify ----------

function isShopify(html: string, url: string): boolean {
  return /\/products\/[^/?#]+/.test(url) && /cdn\.shopify\.com|Shopify\.theme|shopify-section/i.test(html);
}

function shopifyJsonUrl(url: string): string {
  const base = url.split(/[?#]/)[0].replace(/\/$/, '');
  return `${base}.js`;
}

type ShopifyProduct = {
  title?: string;
  vendor?: string;
  type?: string;
  description?: string;
  tags?: string[] | string;
  images?: string[];
};

export function mergeShopify(parsed: ParsedProduct, product: ShopifyProduct): ParsedProduct {
  const images = (product.images ?? []).map((u) => absolutize(u, parsed.url));
  const tags = Array.isArray(product.tags) ? product.tags : (product.tags ?? '').split(',');
  const category = guessCategory(product.title, product.type, parsed.title);
  return {
    ...parsed,
    title: clean(product.title || parsed.title),
    brand: clean(product.vendor || parsed.brand),
    description: clean(stripTags(product.description || '')) || parsed.description,
    images: images.length ? dedupeImages(images).slice(0, 12) : parsed.images,
    category: category === 'other' ? parsed.category : category,
    // Stores use tags for internal plumbing ("allbirds::hue => grey"); keep only human-looking ones.
    tags: tags
      .map((t) => t.trim())
      .filter((t) => t && t.length <= 20 && !/[:=>_]/.test(t))
      .slice(0, 8),
  };
}

// ---------- JSON-LD ----------

type Json = Record<string, any>;

function jsonLdBlocks(html: string): Json[] {
  const blocks: Json[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const data = JSON.parse(m[1].trim());
      blocks.push(...flattenLd(data));
    } catch {
      // Some sites ship invalid JSON-LD; skip it.
    }
  }
  return blocks;
}

function flattenLd(data: unknown): Json[] {
  if (Array.isArray(data)) return data.flatMap(flattenLd);
  if (data && typeof data === 'object') {
    const obj = data as Json;
    return [obj, ...(obj['@graph'] ? flattenLd(obj['@graph']) : [])];
  }
  return [];
}

function hasType(obj: Json, type: string): boolean {
  const t = obj['@type'];
  return Array.isArray(t) ? t.includes(type) : t === type;
}

function findJsonLdProduct(html: string): Json | undefined {
  const blocks = jsonLdBlocks(html);
  const product = blocks.find((b) => hasType(b, 'Product'));
  if (product) return product;
  // ProductGroup (variants) carries the shared fields on the group itself.
  return blocks.find((b) => hasType(b, 'ProductGroup'));
}

function findJsonLdBreadcrumbs(html: string): string[] {
  const list = jsonLdBlocks(html).find((b) => hasType(b, 'BreadcrumbList'));
  const items: Json[] = list?.itemListElement ?? [];
  return items.map((i) => str(i.name) || str(i.item?.name)).filter(Boolean);
}

function brandName(brand: unknown): string {
  if (!brand) return '';
  if (typeof brand === 'string') return brand;
  if (Array.isArray(brand)) return brandName(brand[0]);
  return str((brand as Json).name);
}

function imageList(image: unknown): string[] {
  if (!image) return [];
  if (typeof image === 'string') return [image];
  if (Array.isArray(image)) return image.flatMap(imageList);
  const obj = image as Json;
  return [str(obj.url) || str(obj.contentUrl)].filter(Boolean);
}

function firstOffer(offers: unknown): Json | undefined {
  if (!offers) return undefined;
  if (Array.isArray(offers)) return firstOffer(offers[0]);
  const obj = offers as Json;
  if (hasType(obj, 'AggregateOffer') && obj.lowPrice) return { price: obj.lowPrice, priceCurrency: obj.priceCurrency };
  return obj;
}

// ---------- meta tags ----------

function readMetaTags(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const tag of html.match(/<meta\s[^>]*>/gi) ?? []) {
    const key = attr(tag, 'property') || attr(tag, 'name') || attr(tag, 'itemprop');
    const content = attr(tag, 'content');
    if (key && content && !(key.toLowerCase() in out)) out[key.toLowerCase()] = decodeEntities(content);
  }
  return out;
}

function metaAll(html: string, key: string): string[] {
  return (html.match(/<meta\s[^>]*>/gi) ?? [])
    .filter((tag) => (attr(tag, 'property') || attr(tag, 'name') || '').toLowerCase() === key)
    .map((tag) => attr(tag, 'content'))
    .filter(Boolean);
}

function attr(tag: string, name: string): string {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return m ? (m[2] ?? m[3] ?? m[4] ?? '') : '';
}

// ---------- string helpers ----------

function str(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return '';
}

function matchText(html: string, re: RegExp): string {
  return html.match(re)?.[1] ?? '';
}

function stripTags(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '');
}

export function decodeEntities(s: string): string {
  const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (all, code: string) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : all;
    }
    return named[code.toLowerCase()] ?? all;
  });
}

function clean(s: string): string {
  return decodeEntities(s)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const SIZE_PARAMS = /^(w|h|width|height|size|wid|hei|imwidth|quality|q|fit|crop|fmt|format|auto|dpr)$/i;

/** Identity of an image ignoring CDN resize hints, so "x.png?width=300" and "x.png?width=1200" collapse. */
function imageKey(u: string): string {
  const [base, query = ''] = u.split('?');
  const kept = query
    .split('&')
    .filter((kv) => kv && !SIZE_PARAMS.test(kv.split('=')[0]))
    .join('&');
  return base.replace(/_(\d+x\d*|\d*x\d+)(?=\.[a-z]+$)/i, '') + (kept ? `?${kept}` : '');
}

function widthHint(u: string): number {
  const m = u.match(/[?&](?:w|width|wid|imwidth)=(\d+)/i) ?? u.match(/_(\d+)x\d*\.[a-z]+(?:\?|$)/i);
  return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER; // no hint usually means the original
}

/** Drop non-http entries and size variants of the same picture, keeping the largest variant. */
export function dedupeImages(urls: string[]): string[] {
  const best = new Map<string, string>();
  for (const u of urls) {
    if (!/^https?:\/\//i.test(u)) continue;
    const key = imageKey(u);
    const prev = best.get(key);
    if (!prev || widthHint(u) > widthHint(prev)) best.set(key, u);
  }
  return [...best.values()];
}

function safePath(url: string): string {
  const m = url.match(/^https?:\/\/[^/]+(\/[^?#]*)?/i);
  return decodeURIComponentSafe((m?.[1] ?? '').replace(/[-_/]+/g, ' '));
}

function decodeURIComponentSafe(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export function hostOf(url: string): string {
  return url.match(/^https?:\/\/([^/?#:]+)/i)?.[1]?.toLowerCase() ?? '';
}

/** "www.uniqlo.com" -> "Uniqlo"; used only when the page names no brand. */
export function brandFromHost(url: string): string {
  const parts = hostOf(url)
    .replace(/^(www|m|shop|store)\./, '')
    .split('.');
  const name = parts.length > 2 && parts[parts.length - 2].length <= 3 ? parts[parts.length - 3] : parts[0];
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : '';
}

/** Resolve protocol-relative and relative image URLs against the page URL. */
export function absolutize(u: string, base: string): string {
  const s = u.trim();
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('//')) return `https:${s}`;
  const origin = base.match(/^https?:\/\/[^/?#]+/i)?.[0] ?? '';
  if (s.startsWith('/')) return origin + s;
  const dir = base.split(/[?#]/)[0].replace(/[^/]*$/, '');
  return dir + s;
}

/** First http(s) URL inside a block of shared/copied text. */
export function extractUrl(text: string | null | undefined): string | undefined {
  return text?.match(/https?:\/\/[^\s"'<>]+/i)?.[0];
}

/**
 * Best-effort upgrade of a product captured from the in-app browser: Shopify stores serve a
 * public JSON with clean images, vendor and product type next to every /products/ page.
 */
export async function enrichProduct(p: ParsedProduct, fetchImpl: typeof fetch = fetch): Promise<ParsedProduct> {
  if (!/\/products\/[^/?#]+/.test(p.url)) return p;
  try {
    const res = await fetchImpl(shopifyJsonUrl(p.url), { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('json')) return p;
    const json = await res.json();
    return json && typeof json === 'object' && json.title ? mergeShopify(p, json) : p;
  } catch {
    return p;
  }
}
