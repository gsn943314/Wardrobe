// Packs `expo export --platform web` output into one self-contained HTML file (JS inlined,
// assets as data URIs) so the preview can be opened from anywhere without a server.
// Usage: node scripts/build-web-preview.mjs <export-dir> <out.html>
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const [exportDir, outFile] = process.argv.slice(2);
if (!exportDir || !outFile) {
  console.error('usage: node scripts/build-web-preview.mjs <export-dir> <out.html>');
  process.exit(1);
}

const jsDir = join(exportDir, '_expo/static/js/web');
const bundleName = readdirSync(jsDir).find((f) => f.startsWith('entry-') && f.endsWith('.js'));
let js = readFileSync(join(jsDir, bundleName), 'utf8');

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml',
};
js = js.replace(/"(\/assets\/[^"]+)"/g, (all, path) => {
  const mime = MIME[extname(path)];
  if (!mime) return all;
  try {
    return `"data:${mime};base64,${readFileSync(join(exportDir, path)).toString('base64')}"`;
  } catch {
    return all;
  }
});
if (js.includes('</script')) js = js.replaceAll('</script', '<\\/script');

const html = `<title>Wardrobe 試衣間</title>
<style>
  html, body { height: 100%; }
  body { overflow: hidden; background: #F6F4F1; color: #1F1D1A; }
  #root { display: flex; height: 100%; flex: 1; }
</style>
<div id="root"></div>
<script>
  // Expo Router reads the URL path; the preview may be served from a sub-path, so start at "/".
  try { if (location.pathname !== '/') history.replaceState(null, '', '/'); } catch (e) {}
</script>
<script>${js}</script>
`;
writeFileSync(outFile, html);
console.log(`wrote ${outFile} (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
