import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { content } from '../src/content.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const readJSON = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const config = await readJSON('site-config.json');
const { features } = await readJSON('src/features.json');
const manifest = await readJSON('src/assets-manifest.json');
const base = config.siteBase;
if (!/^\/[a-z0-9/-]*\/$/i.test(base) || !config.siteUrl.endsWith(base)) throw new Error('Invalid siteBase/siteUrl');
for (const key of ['marketplaceUrl', 'publicDownloadUrl']) {
  if (config[key] !== null && (!config[key]?.startsWith('https://') || /github\.com\/[^/]+\/gitline\/releases/.test(config[key]))) throw new Error(`Set ${key} to a verified public HTTPS URL or null`);
}
const e = (s) => String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url = (locale) => `${config.siteUrl}${locale === 'en' ? 'en/' : ''}`;
const local = (locale) => `${base}${locale === 'en' ? 'en/' : ''}`;
const arrow = '<span aria-hidden="true">↗</span>';
const assets = new Map(manifest.assets.map((a) => [a.id, a]));
const galleryIds = ['templates','preview','variables','gitconfig-identity','gitconfig-eol','gitconfig-sync','inline-editor','hover-actions','general','appearance','filters','blame','aliases','integrations','project','gitconfig-repository','gitconfig-context'];

function render(locale) {
  const t = content[locale];
  const keyboardImage = assets.get('alt-enter-gitline-menu');
  const other = locale === 'ru' ? 'en' : 'ru';
  function picture(id, hero = false) {
    const light = assets.get(`${id}-light`), dark = assets.get(`${id}-dark`);
    if (!light || !dark) throw new Error(`Missing images for ${id}`);
    return `<picture data-themed-picture><source media="(prefers-color-scheme: dark)" srcset="${base}${dark.file}" data-light="${base}${light.file}" data-dark="${base}${dark.file}"><img src="${base}${light.file}" data-light="${base}${light.file}" data-dark="${base}${dark.file}" alt="${e(light.alt[locale].replace(locale === 'ru' ? ', светлая тема' : ', light theme', ''))}" width="${light.width}" height="${light.height}" ${hero ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></picture>`;
  }
  function figure(id, cls = '', hero = false) {
    const asset = assets.get(`${id}-light`);
    return `<figure class="ui-figure ${cls}"><a class="image-link" data-gallery="${id}" href="${base}${asset.file}" aria-label="${e(t.zoom)}: ${e(asset.alt[locale].replace(locale === 'ru' ? ', светлая тема' : ', light theme', ''))}">${picture(id, hero)}<span class="zoom-mark" aria-hidden="true">↗</span></a><figcaption>${e(asset.caption[locale].replace(locale === 'ru' ? ' Светлая тема.' : ' Light theme.', ''))}</figcaption></figure>`;
  }
  const feature = (id, tag = 'div') => {
    const f = features.find((f) => f.id === id)[locale];
    return `<${tag} class="feature" data-feature="${id}"><h3>${e(f.title)}</h3><p>${e(f.description)}</p></${tag}>`;
  };
  const sectionHead = (kicker, title, extra = '') => `<div class="section-head"><p class="eyebrow">${kicker}</p><h2>${title}</h2>${extra}</div>`;
  const installLink = config.marketplaceUrl ?? '#install';
  const schema = {
    '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: config.product,
    applicationCategory: 'DeveloperApplication', operatingSystem: 'IntelliJ Platform',
    description: t.description, url: url(locale), inLanguage: locale,
    license: 'https://www.apache.org/licenses/LICENSE-2.0',
    author: { '@type': 'Person', name: config.author.name, url: config.author.website },
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    ...(config.currentVersion ? { softwareVersion: config.currentVersion } : {})
  };
  return `<!doctype html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${e(t.title)}</title>
  <meta name="description" content="${e(t.description)}">
  <meta name="color-scheme" content="light dark">
  <meta name="theme-color" content="#0d1719">
  <link rel="canonical" href="${url(locale)}">
  <link rel="alternate" hreflang="ru" href="${url('ru')}">
  <link rel="alternate" hreflang="en" href="${url('en')}">
  <link rel="alternate" hreflang="x-default" href="${url('ru')}">
  <link rel="icon" type="image/svg+xml" href="${base}assets/brand/plugin-icon.svg">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="GitLine">
  <meta property="og:title" content="${e(t.title)}">
  <meta property="og:description" content="${e(t.description)}">
  <meta property="og:url" content="${url(locale)}">
  <meta property="og:locale" content="${locale === 'ru' ? 'ru_RU' : 'en_US'}">
  <meta property="og:locale:alternate" content="${locale === 'ru' ? 'en_US' : 'ru_RU'}">
  <meta property="og:image" content="${config.siteUrl}assets/ui/inline-editor-dark.png">
  <meta property="og:image:alt" content="${e(assets.get('inline-editor-dark').caption[locale])}">
  <meta property="og:image:width" content="2560">
  <meta property="og:image:height" content="640">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="stylesheet" href="${base}styles.css">
  <script src="${base}theme.js"></script>
  <script type="module" src="${base}app.js"></script>
  <script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>
</head>
<body id="top">
<a class="skip-link" href="#main">${t.skip}</a>
<header class="site-header"><div class="header-inner container">
  <a class="brand" href="${local(locale)}" aria-label="GitLine"><img src="${base}assets/brand/plugin-icon.svg" alt="" width="36" height="36">GitLine<span class="brand-dot" aria-hidden="true">/</span></a>
  <nav aria-label="${t.navLabel}">${['features','templates','gitconfig','install','faq'].map((id,i)=>`<a href="#${id}">${t.nav[i]}</a>`).join('')}</nav>
  <div class="header-tools"><a class="language" data-language href="${local(other)}" lang="${other}" hreflang="${other}" aria-label="${t.language}"><span ${locale === 'ru' ? 'class="current"' : ''}>RU</span><span aria-hidden="true">/</span><span ${locale === 'en' ? 'class="current"' : ''}>EN</span></a><button class="theme-button" type="button" data-theme-toggle aria-label="${t.theme}" data-light-label="${t.light}" data-dark-label="${t.dark}" hidden><svg class="sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg><svg class="moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M20 14A8.5 8.5 0 0 1 10 4 8.5 8.5 0 1 0 20 14Z"/></svg></button></div>
</div></header>
<main id="main" tabindex="-1">
  <section class="hero container" aria-labelledby="hero-title">
    <p class="eyebrow"><span class="live-dot" aria-hidden="true"></span>${t.eyebrow}</p>
    <h1 id="hero-title">${t.hero}</h1>
    <p class="hero-intro">${t.intro}</p>
    <div class="hero-actions"><a class="button primary" href="${e(installLink)}" ${config.marketplaceUrl ? 'data-marketplace' : ''}>${config.marketplaceUrl ? t.marketplace : t.install}<span aria-hidden="true">↗</span></a><a class="button secondary" href="#features">${t.explore}<span aria-hidden="true">↓</span></a></div>
    <p class="hero-meta">${t.free}<span aria-hidden="true"> · </span><span>RU / EN</span>${config.currentVersion ? `<span> · ${e(t.version)}: ${e(config.currentVersion)}</span>` : ''}</p>
    <div class="editor-window"><div class="editor-toolbar"><span><span class="file-icon" aria-hidden="true">K</span>Profile.kt</span><span class="editor-label">GitLine / ${t.editor}</span></div>${figure('inline-editor','hero-figure',true)}<div class="editor-bottom"><span class="branch" aria-hidden="true">⑂ main</span><span>${t.editorNote}</span><span aria-hidden="true">Kotlin</span></div></div>
    <p class="image-disclaimer">${t.imageNote}</p>
  </section>
  <section class="section container flow" id="workflow" aria-labelledby="flow-title">
    <div><p class="eyebrow">${t.flowKicker}</p><h2 id="flow-title">${t.flowTitle}</h2><ol class="workflow-list">${t.steps.map(([title,desc],i)=>`<li><span class="step-number" aria-hidden="true">0${i+1}</span><div><h3>${title}</h3><p>${desc}</p></div></li>`).join('')}</ol></div>
    <div class="popup-column">${figure('hover-actions','popup-figure')}<p class="small-note">${t.actionsNote}</p><div class="shortcut"><kbd>Alt</kbd><span>+</span><kbd>Enter</kbd><span>GitLine ${arrow}</span></div><div class="feature-pair">${feature('hover')}${feature('actions')}</div></div>
  </section>
  <section class="container keyboard-section" id="keyboard-actions" aria-labelledby="keyboard-title">
    <div class="keyboard-layout"><div><p class="eyebrow">ALT + ENTER</p><h2 id="keyboard-title">${t.keyboardTitle}</h2><p class="keyboard-intro">${t.keyboardIntro}</p><figure class="keyboard-figure"><img src="${base}${keyboardImage.file}" alt="${e(keyboardImage.alt[locale])}" width="${keyboardImage.width}" height="${keyboardImage.height}" loading="lazy" decoding="async"></figure></div>
    <div class="keyboard-details"><dl class="config-list keyboard-action-list">${t.keyboardActions.map(([action,description])=>`<div><dt>${e(action)}</dt><dd>${e(description)}</dd></div>`).join('')}</dl><p class="keyboard-availability">${t.keyboardAvailability}</p><p class="small-note keyboard-browser-note">${t.keyboardBrowserNote}</p></div></div>
  </section>
  <section class="section feature-section" id="features"><div class="container">
    ${sectionHead(t.featuresKicker,t.featuresTitle)}
    <div class="feature-columns">${t.groups.map((g,i)=>`<div class="feature-group"><div class="group-number" aria-hidden="true">0${i+1}<span> / </span></div><h3 class="group-title">${g.title}</h3>${g.ids.map(id=>feature(id)).join('')}</div>`).join('')}</div>
  </div></section>
  <section class="section container" id="templates">
    <div class="split template-split"><div>${sectionHead(t.templatesKicker,t.templatesTitle)}<div class="template-types">${t.templateTypes.map(s=>`<span>${s}</span>`).join('')}</div>${feature('templates')}${feature('presets')}<p class="small-note">${t.templateNote}</p></div><div>${figure('templates','settings-figure')}</div></div>
    <div class="code-examples">${['${author.name} • ${author.ago} • ${commit.summary}','${alias(author.email)} • ${author.ago} • ${commit.summary}'].map((sample,i)=>`<div class="code-example"><div class="code-header"><span>${t.sampleTitles[i]}</span><button type="button" class="copy-button" data-copy="example-${i}" aria-label="${t.copyLabel}: ${t.sampleTitles[i]}" hidden>${t.copy}</button></div><pre><code id="example-${i}">${e(sample)}</code></pre></div>`).join('')}</div>
    <p class="small-note">${t.aliasNote}</p>
  </section>
  <section class="section config-section" id="gitconfig"><div class="container">
    <div class="split"><div>${sectionHead(t.configKicker,t.configTitle,`<p class="section-intro">${t.configIntro}</p>`)}<dl class="config-list">${t.configItems.map(([title,desc])=>`<div><dt>${title}</dt><dd>${desc}</dd></div>`).join('')}</dl></div><div>${figure('gitconfig-identity','settings-figure')}${figure('gitconfig-context','context-figure')}</div></div>
    <aside class="apply-note"><span class="apply-symbol" aria-hidden="true">↳</span><div><h3>${t.applyTitle}</h3><p>${t.applyNote}</p></div></aside>
    <details class="config-details"><summary>${features.find(f=>f.id==='gitconfig')[locale].title}</summary>${feature('gitconfig')}<div class="gallery-grid">${figure('gitconfig-eol')}${figure('gitconfig-sync')}</div></details>
  </div></section>
  <section class="section container" id="gallery">
    ${sectionHead(t.galleryKicker,t.galleryTitle,`<p class="section-intro">${t.galleryIntro}</p>`)}
    <div class="gallery-grid">${galleryIds.slice(0,6).map(id=>figure(id,'gallery-figure')).join('')}</div>
    <details class="more-gallery"><summary>${t.galleryMore}<span aria-hidden="true"> + 11</span></summary><div class="gallery-grid">${galleryIds.slice(6).map(id=>figure(id,'gallery-figure')).join('')}</div></details>
    <p class="image-disclaimer">${t.imageNote}</p>
  </section>
  <section class="section install-section" id="install"><div class="container">
    ${sectionHead(t.installKicker,t.installTitle)}
    <div class="install-layout"><div>
      <div class="availability">${config.marketplaceUrl || config.publicDownloadUrl ? `${config.marketplaceUrl ? `<a class="button primary" href="${e(config.marketplaceUrl)}" data-marketplace>${t.marketplace} ${arrow}</a>` : ''}${config.publicDownloadUrl ? `<a class="button secondary" href="${e(config.publicDownloadUrl)}">${t.download} ${arrow}</a>` : ''}` : `<span class="availability-dot" aria-hidden="true"></span><div><h3>${t.unavailable}</h3><p>${t.unavailableNote}</p></div>`}</div>
      <ol class="workflow-list install-steps">${t.installSteps.map(([title,desc],i)=>`<li><span class="step-number" aria-hidden="true">0${i+1}</span><div><h3>${title}</h3><p>${desc}</p></div></li>`).join('')}</ol>
    </div><aside class="compatibility"><p class="eyebrow">${t.compatible}</p><h3>${t.minimum}</h3><p class="build-label">${t.build}</p><p>${t.compatibility}</p><p>${t.authorTest}</p><p class="plugin-languages">${t.languages}</p></aside></div>
  </div></section>
  <section class="section container faq-section" id="faq"><div><p class="eyebrow">FAQ</p><h2>${t.faqTitle}</h2></div><div class="faq-list">${t.faq.map(([q,a])=>`<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div></section>
  <section class="container feedback-strip" id="feedback" aria-labelledby="feedback-title">
    <img class="feedback-icon" src="${base}assets/brand/plugin-icon.svg" alt="" width="44" height="44" loading="lazy">
    <div class="feedback-copy"><h2 id="feedback-title">${t.feedbackTitle}</h2><p>${t.feedbackDescription}</p></div>
    <div class="feedback-links"><a href="${e(config.issuesRepositoryUrl)}" aria-label="${t.feedbackRepositoryLabel}">GitHub ${arrow}</a><a href="${e(config.issuesRepositoryUrl)}/issues" aria-label="${t.feedbackIssuesLabel}">GitHub Issues ${arrow}</a></div>
  </section>
</main>
<footer class="container site-footer"><div class="footer-top"><div><a class="brand" href="${local(locale)}"><img src="${base}assets/brand/plugin-icon.svg" alt="" width="32" height="32">GitLine</a><p>${t.footerLine}</p></div><a class="contact-link" href="mailto:${e(config.author.email)}">${t.contact} ${arrow}</a></div><div class="footer-bottom"><span>${t.license}</span><span>${t.author} <a href="${e(config.author.website)}">${e(config.author.name)}</a></span><a href="${e(config.author.github)}">GitHub ${arrow}</a><a href="#top">${t.backTop} ↑</a></div></footer>
<dialog class="gallery-dialog" aria-label="${t.dialog}" data-gallery-dialog><div class="dialog-toolbar"><span data-gallery-counter></span><button class="dialog-close" type="button" data-gallery-close aria-label="${t.close}">${t.close} <span aria-hidden="true">×</span></button></div><div class="dialog-image"><img data-gallery-image alt="" width="1920" height="1240"></div><div class="dialog-footer"><button type="button" data-gallery-prev aria-label="${t.previous}">←</button><p data-gallery-caption></p><button type="button" data-gallery-next aria-label="${t.next}">→</button></div><p class="dialog-help">${t.galleryKeys}</p></dialog>
<p class="sr-only" role="status" data-copy-status></p>
<script type="application/json" id="page-data">${JSON.stringify({locale,copy:t.copy,copied:t.copied,copyError:t.copyError,imageCount:t.imageCount,assets:manifest.assets.map(({id,file,width,height,caption,alt})=>({id,src:base+file,width,height,caption:caption[locale],alt:alt[locale]}))}).replace(/</g,'\\u003c')}</script>
</body>
</html>\n`;
}

// Only this generated directory is ever uploaded to GitHub Pages.
const out = path.join(root, 'dist');
await rm(out, { recursive: true, force: true });
await mkdir(path.join(out, 'en'), { recursive: true });
await cp(path.join(root, 'public'), out, { recursive: true });
for (const locale of ['ru','en']) await writeFile(path.join(out, locale === 'ru' ? 'index.html' : 'en/index.html'), render(locale));
await writeFile(path.join(out, '.nojekyll'), '');
await writeFile(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${config.siteUrl}sitemap.xml\n`);
await writeFile(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${['ru','en'].map(locale=>`<url><loc>${url(locale)}</loc><xhtml:link rel="alternate" hreflang="ru" href="${url('ru')}"/><xhtml:link rel="alternate" hreflang="en" href="${url('en')}"/><xhtml:link rel="alternate" hreflang="x-default" href="${url('ru')}"/></url>`).join('')}</urlset>\n`);
console.log('Built dist/ — Russian /getgitline/ and English /getgitline/en/');
