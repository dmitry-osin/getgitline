import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
const config = JSON.parse(await readFile(path.join(root,'site-config.json'),'utf8'));
const { features } = JSON.parse(await readFile(path.join(root,'src/features.json'),'utf8'));
const manifest = JSON.parse(await readFile(path.join(root,'src/assets-manifest.json'),'utf8'));
const decode = s => s.replace(/&amp;/g,'&');
const pages = ['index.html','en/index.html'];
let links = 0;
for (const [index, page] of pages.entries()) {
  const locale = index === 0 ? 'ru' : 'en';
  const html = await readFile(path.join(dist,page),'utf8');
  assert(html.includes(`<html lang="${locale}">`));
  assert.equal((html.match(/<h1\b/g)||[]).length,1,`${page}: one h1`);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size,`${page}: duplicate IDs`);
  assert(html.includes(`rel="canonical" href="${config.siteUrl}${index ? 'en/' : ''}"`));
  for (const lang of ['ru','en','x-default']) assert(html.includes(`hreflang="${lang}"`));
  for (const feature of features) assert(html.includes(`data-feature="${feature.id}"`),`${page}: missing ${feature.id}`);
  assert(!/D:[/\\]|website-kit|capture[/\\]|FACTS\.md|PROMPT\.md|localhost|v0\.5\.7/.test(html),'Private or development content in output');
  assert.equal(html.includes('data-marketplace'),Boolean(config.marketplaceUrl),'Marketplace CTA follows config');
  if (!config.currentVersion) assert(!html.includes('softwareVersion'));
  for (const match of html.matchAll(/<(?:a|link)\b[^>]*href="([^"]+)"/g)) {
    const href = decode(match[1]);
    if (href.startsWith('#')) assert(ids.includes(href.slice(1)),`${page}: missing anchor ${href}`);
    if (href.startsWith('/')) {
      assert(href.startsWith(config.siteBase),`${page}: base path missing: ${href}`);
      const pathname = href.slice(config.siteBase.length).split('#')[0];
      let file = path.join(dist,pathname);
      if (href.split('#')[0].endsWith('/')) file = path.join(file,'index.html');
      await stat(file);
    }
    links++;
  }
  for (const match of html.matchAll(/<img\b[^>]*>/g)) {
    const tag = match[0];
    assert(/\balt="[^"]*"/.test(tag),'Missing alt');
    assert(/\bwidth="\d+"/.test(tag) && /\bheight="\d+"/.test(tag),'Missing image dimensions');
    const src = tag.match(/\bsrc="([^"]+)"/)?.[1];
    if (src) { assert(src.startsWith(config.siteBase)); await stat(path.join(dist,src.slice(config.siteBase.length))); }
    if (src?.includes('/ui/')) assert(/loading="lazy"|fetchpriority="high"/.test(tag));
  }
  const jsonScripts = [...html.matchAll(/<script (?:type="application\/ld\+json"|type="application\/json" id="page-data")>(.*?)<\/script>/gs)];
  assert.equal(jsonScripts.length,2);
  jsonScripts.forEach(m=>JSON.parse(m[1]));
}
for (const asset of manifest.assets) {
  const bytes = await readFile(path.join(dist,asset.file));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256,`Changed UI material: ${asset.file}`);
  assert.equal(bytes.readUInt32BE(16),asset.width);
  assert.equal(bytes.readUInt32BE(20),asset.height);
}
const sitemap = await readFile(path.join(dist,'sitemap.xml'),'utf8');
assert.equal((sitemap.match(/<loc>/g)||[]).length,2);
assert((await readFile(path.join(dist,'robots.txt'),'utf8')).includes(`${config.siteUrl}sitemap.xml`));
const allowed = new Set(['index.html','en','assets','styles.css','app.js','theme.js','robots.txt','sitemap.xml','.nojekyll']);
for (const entry of await readdir(dist)) assert(allowed.has(entry),`Unexpected public file: ${entry}`);
console.log(`PASS: 2 locales, 14 features each, ${links} links, metadata/anchors, ${manifest.assets.length} original PNG hashes and dimensions, publication allowlist.`);
