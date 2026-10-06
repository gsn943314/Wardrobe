import { guessCategory, guessSeason } from './categories';
import { dedupeImages, parseProductHtml, type ParsedProduct } from './productParser';

/**
 * Runs inside the in-app browser (WebView) on the fully rendered page, so it also works on
 * single-page stores (UNIQLO, GU, ZARA...) whose server HTML contains no product data.
 * It posts back the page HTML head (for JSON-LD / meta parsing) plus what is visible:
 * the main heading and the largest images on screen.
 */
export const EXTRACT_SCRIPT = `
(function () {
  try {
    var seen = {};
    var imgs = [];
    function add(src, w, h) {
      if (!src || src.indexOf('data:') === 0 || seen[src]) return;
      if (w < 200 || h < 200) return;
      seen[src] = 1;
      imgs.push({ src: src, area: w * h });
    }
    document.querySelectorAll('img').forEach(function (img) {
      var src = img.currentSrc || img.src;
      var best = img.getAttribute('data-src') || img.getAttribute('data-zoom-image');
      add(best || src, img.naturalWidth || img.width, img.naturalHeight || img.height);
    });
    document.querySelectorAll('[style*="background-image"]').forEach(function (el) {
      var m = /url\\(["']?([^"')]+)["']?\\)/.exec(el.style.backgroundImage || '');
      var r = el.getBoundingClientRect();
      if (m) add(new URL(m[1], location.href).href, r.width * 2, r.height * 2);
    });
    imgs.sort(function (a, b) { return b.area - a.area; });
    var h1 = document.querySelector('h1');
    var ld = [];
    document.querySelectorAll('script[type="application/ld+json"]').forEach(function (s) { ld.push(s.outerHTML); });
    var metas = [];
    document.querySelectorAll('meta').forEach(function (m) { metas.push(m.outerHTML); });
    var price = document.querySelector('[itemprop="price"], [class*="price" i] [class*="value" i], [class*="Price"], [class*="price"]');
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'wardrobe-extract',
      url: location.href,
      title: document.title,
      heading: h1 ? h1.innerText.trim() : '',
      priceText: price ? price.innerText.trim().slice(0, 40) : '',
      head: '<title>' + document.title + '</title>' + metas.join('') + ld.join(''),
      images: imgs.slice(0, 16).map(function (i) { return i.src; })
    }));
  } catch (e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'wardrobe-extract-error', message: String(e) }));
  }
})();
true;
`;

export type ExtractMessage = {
  type: 'wardrobe-extract';
  url: string;
  title: string;
  heading: string;
  priceText: string;
  head: string;
  images: string[];
};

/** Combine the rendered-page snapshot with the structured data parsed from its head. */
export function productFromExtract(msg: ExtractMessage): ParsedProduct {
  const parsed = parseProductHtml(msg.head, msg.url);
  // SPA stores often leave a generic <title> ("商品詳情 - GU台灣"); the visible heading is better then.
  const genericTitle = !parsed.title || parsed.title === msg.title.trim();
  const title = genericTitle && msg.heading ? msg.heading : parsed.title;
  const images = dedupeImages([...parsed.images, ...msg.images]).slice(0, 16);
  return {
    ...parsed,
    title,
    images,
    priceText: parsed.priceText || msg.priceText || undefined,
    category: parsed.category === 'other' ? guessCategory(title, msg.url) : parsed.category,
    season: parsed.season ?? guessSeason(title),
  };
}
