/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { absolutize, brandFromHost, dedupeImages, extractUrl, mergeShopify, parseProductHtml } from '../productParser';
import { guessCategory, guessSeason } from '../categories';

const JSON_LD_PAGE = `<html><head><title>Store</title>
<meta property="og:image" content="//cdn.example.com/a.jpg?width=300">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[
 {"@type":"BreadcrumbList","itemListElement":[{"name":"Men"},{"name":"Outerwear"}]},
 {"@type":"Product","name":"Utility Jacket &amp; Hood","brand":{"@type":"Brand","name":"ACME"},
  "description":"<p>Water&#39;repellent</p>","image":["https://cdn.example.com/a.jpg?width=1200","/img/b.jpg"],
  "offers":{"@type":"Offer","price":"1990","priceCurrency":"TWD"}}]}</script></head><body></body></html>`;

test('reads JSON-LD product inside @graph', () => {
  const p = parseProductHtml(JSON_LD_PAGE, 'https://shop.example.com/p/123');
  assert.equal(p.title, 'Utility Jacket & Hood');
  assert.equal(p.brand, 'ACME');
  assert.equal(p.description, "Water'repellent");
  assert.equal(p.priceText, 'TWD 1990');
  assert.equal(p.category, 'jacket');
  // The og:image width variant collapses into the larger JSON-LD one; relative URLs resolve.
  assert.deepEqual(p.images, ['https://cdn.example.com/a.jpg?width=1200', 'https://shop.example.com/img/b.jpg']);
});

test('falls back to Open Graph tags', () => {
  const html = `<meta property="og:title" content="寬版短袖T恤"><meta property="og:site_name" content="GU">
    <meta property="og:image" content="https://img.example.com/t.jpg"><meta name="description" content="棉質">`;
  const p = parseProductHtml(html, 'https://www.example.com/tw/item');
  assert.equal(p.title, '寬版短袖T恤');
  assert.equal(p.brand, 'GU');
  assert.equal(p.category, 'tee');
  assert.deepEqual(p.images, ['https://img.example.com/t.jpg']);
});

test('merges Shopify product JSON and drops plumbing tags', () => {
  const base = parseProductHtml('<title>x</title>', 'https://brand.com/products/runner');
  const p = mergeShopify(base, {
    title: "Men's Wool Runner",
    vendor: 'Allbirds',
    type: 'Shoes',
    images: ['//cdn.shopify.com/a.png', '//cdn.shopify.com/a_600x.png'],
    tags: ['allbirds::hue => grey', 'wool'],
  });
  assert.equal(p.brand, 'Allbirds');
  assert.equal(p.category, 'shoes');
  assert.deepEqual(p.images, ['https://cdn.shopify.com/a.png']);
  assert.deepEqual(p.tags, ['wool']);
});

test('category guessing prefers specific words', () => {
  assert.equal(guessCategory('連帽外套'), 'jacket');
  assert.equal(guessCategory('短袖襯衫'), 'shirt');
  assert.equal(guessCategory('Spring knit cardigan'), 'jacket');
  assert.equal(guessCategory('Spring collection'), 'other'); // "ring" must not match inside "spring"
  assert.equal(guessCategory('寬版褲裙'), 'skirt');
  assert.equal(guessCategory('棒球帽'), 'hat');
  assert.equal(guessCategory('Relaxed fit jeans'), 'pants');
});

test('season guessing', () => {
  assert.equal(guessSeason('UNIQLO 2026FW 新品'), '2026 秋冬');
  assert.equal(guessSeason('26 Spring/Summer drop'), '2026 春夏');
  assert.equal(guessSeason('basic tee'), undefined);
});

test('url helpers', () => {
  assert.equal(absolutize('//a.com/x.jpg', 'https://b.com/p'), 'https://a.com/x.jpg');
  assert.equal(absolutize('img/x.jpg', 'https://b.com/p/q?x=1'), 'https://b.com/p/img/x.jpg');
  assert.equal(brandFromHost('https://www.uniqlo.com/tw/'), 'Uniqlo');
  assert.equal(brandFromHost('https://shop.example.co.uk/x'), 'Example');
  assert.equal(extractUrl('看看這件 https://gu.com/p/1?c=2 好看'), 'https://gu.com/p/1?c=2');
  assert.deepEqual(dedupeImages(['https://x.com/a.jpg?w=100', 'https://x.com/a.jpg?w=900', 'data:abc']), ['https://x.com/a.jpg?w=900']);
});
