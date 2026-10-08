import { ctx, esc, href, asset, isCurrent, icon, show, paw, logo } from './core.mjs';
import { donateVisible, donateDialog } from './donate.mjs';

const NAV = [
  ['nav.help', 'get-help/'],
  ['nav.adopt', 'adopt-foster/'],
  ['nav.resources', 'resources/'],
  ['nav.events', 'events/'],
  ['nav.story', 'our-story/'],
  ['nav.involved', 'get-involved/'],
];

function navLinks() {
  const t = ctx.t;
  return NAV.map(([k, r]) =>
    `<li><a class="nav__link" href="${href(r)}"${isCurrent(r) ? ' aria-current="page"' : ''}>${t(k)}</a></li>`).join('');
}

function donateLink(cls = 'btn btn--donate') {
  if (!donateVisible()) return '';
  return `<a class="${cls}" href="${href('donate/')}" data-donate-open>${icon('heart', { size: 18 })}<span>${ctx.t('nav.donate')}</span></a>`;
}

function langSwitch() {
  const es = ctx.site.languages.find((l) => l.code === 'es' && l.enabled);
  if (!es || ctx.route.endsWith('.html')) return '';
  return `<a class="lang-switch" data-lang-switch href="${href('es/' + ctx.route)}" hreflang="es" lang="es">${icon('globe', { size: 16 })}<span class="lang-switch__long">Español</span><span class="lang-switch__short" aria-hidden="true">ES</span></a>`;
}

export function header({ home = false } = {}) {
  const t = ctx.t;
  const s = ctx.site;
  const logoHtml = logo('brand__logo', { alt: `${s.name} Animal Rescue, home`, eager: true });
  return `
<a class="skip" href="#main">${t('skip')}</a>
${ctx.mode === 'preview' ? `<aside class="preview-ribbon" aria-label="Preview notice">Preview build. Items tagged “Needs confirmation” stay hidden on the live site until verified. Print and download buttons work on the live site, not in this preview window.</aside>` : ''}
<nav class="utility" aria-label="Quick links">
  <div class="wrap utility__in">
    <a class="utility__urgent" href="${href('get-help/emergency/')}"><b class="utility__sos" aria-hidden="true">SOS</b><span>${t('urgent.bar')}</span> <strong>${t('urgent.link')}</strong></a>
    <div class="utility__right">
      ${langSwitch()}
      <a href="${href('transparency/')}"${isCurrent('transparency/') ? ' aria-current="page"' : ''}>Transparency</a>
      <a href="${href('contact/')}"${isCurrent('contact/') ? ' aria-current="page"' : ''}>${t('nav.contact')}</a>
      <a href="${esc(s.social.instagram.url)}" target="_blank" rel="noopener" class="utility__ig">${icon('instagram', { size: 18 })}<span class="visually-hidden">Instagram (${t('externalLink')})</span></a>
    </div>
  </div>
</nav>
<header class="site-header${home ? ' site-header--home' : ''}">
  <div class="wrap site-header__in">
    <a class="brand" href="${href('')}"${home ? ' aria-current="page"' : ''}>${logoHtml}</a>
    ${donateVisible() ? donateLink('btn btn--donate header__donate') : ''}
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="site-nav">
      <span class="menu-btn__open">${icon('menu')}<span>${t('menu')}</span></span>
      <span class="menu-btn__close">${icon('x')}<span>${t('close')}</span></span>
    </button>
    <nav class="nav" id="site-nav" aria-label="Main">
      <ul class="nav__list">${navLinks()}${donateVisible() ? `<li class="nav__donate">${donateLink()}</li>` : ''}</ul>
      <div class="nav__extra">
        <a class="nav__link nav__contact" href="${href('transparency/')}">Transparency</a>
        <a class="nav__link nav__contact" href="${href('contact/')}">${t('nav.contact')}</a>${langSwitch().replace('class="lang-switch"', 'class="lang-switch nav__link nav__contact"')}
      </div>
    </nav>
  </div>
</header>`;
}

export function footer() {
  const s = ctx.site;
  const t = ctx.t;
  const col = (title, links) => `<div class="footer__col"><h2 class="footer__h">${title}</h2><ul>${links.map(([l, r]) => `<li><a href="${href(r)}">${l}</a></li>`).join('')}</ul></div>`;
  const social = [['instagram', s.social.instagram], ['facebook', s.social.facebook], ['youtube', s.social.youtube]]
    .filter(([, v]) => v && show(v.verified))
    .map(([k, v]) => `<li><a href="${esc(v.url)}" target="_blank" rel="noopener">${icon(k, { size: 18 })} ${{ instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube' }[k]}<span class="visually-hidden"> (${t('externalLink')})</span></a></li>`).join('');
  return `
<footer class="site-footer">
  <div class="footer__wave" aria-hidden="true"></div>
  <div class="wrap footer__in">
    <div class="footer__brand">
      ${logo('footer__badge', { alt: '' })}
      <p class="footer__mission">${esc(s.tagline || s.mission)}</p>
      <p class="footer__line">A Miami-based animal rescue helping dogs, and the people who show up for them.</p>
    </div>
    ${col('Get Help', [['I found a dog', 'get-help/found-a-dog/'], ['I lost my dog', 'get-help/lost-my-dog/'], ['I rescued a dog', 'get-help/rescued-a-dog/'], ['Hurt or in danger', 'get-help/emergency/'], ['Vet clinic directory', 'resources/vet-clinics/']])}
    ${col('Learn', [['Pawsome Pooches', 'pawsome-pooches/'], ['Adopt & Foster', 'adopt-foster/'], ['Resource Library', 'resources/'], ['Flyer builder', 'resources/flyer-builder/'], ['Printable checklists', 'resources/#checklists'], ['Rehoming a dog safely', 'resources/rehoming-a-dog-safely/']])}
    ${col(esc(s.name), [['Our Story', 'our-story/'], ['Where the money goes', 'transparency/'], ['Get Involved', 'get-involved/'], ['Rescues you can help', 'rescues-you-can-help/'], ['Contact & FAQ', 'contact/'], ...(s.donate.verified ? [['Donate', 'donate/']] : [])])}
    <div class="footer__col"><h2 class="footer__h">Follow along</h2><ul class="footer__social">${social}</ul></div>
  </div>
  <div class="wrap footer__notice">
    <p>${icon('alert', { size: 18 })} <span>${t('footer.notEmergency')} ${t('footer.emergency')}</span></p>
  </div>
  <div class="wrap footer__base">
    <p>© ${new Date('2026-10-05').getFullYear()} ${esc(s.name)}. Guidance last reviewed <time datetime="${s.lastReviewed}">${new Date(s.lastReviewed + 'T12:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</time>.</p>
    <p class="footer__legal"><a href="${href('privacy/')}">Privacy</a><a href="${href('terms/')}">Terms</a><a href="${href('cookies/')}">Cookies</a></p>
    <p class="footer__credit">Design by <a href="https://byposhpixel.com/" target="_blank" rel="noopener">Posh Pixel<span class="visually-hidden"> (${t('externalLink')})</span></a></p>
    <p class="footer__paws" aria-hidden="true">${paw()}${paw()}${paw()}</p>
  </div>
</footer>`;
}

function langAlternates() {
  const es = ctx.site.languages.find((l) => l.code === 'es' && l.enabled);
  if (!es || ctx.route.endsWith('.html')) return '';
  const b = ctx.site.siteUrl;
  return `\n<link rel="alternate" hreflang="en" href="${esc(b + '/' + ctx.route)}">\n<link rel="alternate" hreflang="es" href="${esc(b + '/es/' + ctx.route)}">\n<link rel="alternate" hreflang="x-default" href="${esc(b + '/' + ctx.route)}">`;
}
export function page({ title, seoTitle, description, body, home = false, bodyClass = '', noindex = false, scripts = [], ogImage = 'img/og-image.png', ogType = 'website', modified }) {
  const s = ctx.site;
  // Search results show about 60 characters: drop the site-name suffix when it would push the title past that.
  const baseTitle = seoTitle || title;
  const full = home ? `${s.name} | Dog Rescue in Miami` : (`${baseTitle} | ${s.name}`.length <= 60 ? `${baseTitle} | ${s.name}` : baseTitle);
  description = clip(description, 160);
  const canonical = s.siteUrl + '/' + ctx.route;
  const robots = noindex || ctx.mode === 'preview' ? '<meta name="robots" content="noindex">' : '';
  const headInner = `
<title>${esc(full)}</title>
<meta name="description" content="${esc(description)}">
${robots}
<link rel="canonical" href="${esc(canonical)}">${langAlternates()}
<meta property="og:site_name" content="${esc(s.name)}">
<meta property="og:title" content="${esc(home ? s.name : title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="${ogType}">
<meta property="og:locale" content="en_US">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(s.siteUrl + '/assets/' + ogImage)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(home ? s.name : title)}">
<meta name="twitter:image" content="${esc(s.siteUrl + '/assets/' + ogImage)}">
<meta name="twitter:title" content="${esc(home ? s.name : title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="color-scheme" content="light">
<meta name="theme-color" content="#2F45C8">
<link rel="icon" href="${asset('img/favicon.png')}" type="image/png">
<link rel="apple-touch-icon" href="${asset('img/logo-badge.png')}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,400..800;1,400..600&family=Fredoka:wght@400..700&family=Caveat:wght@600;700&display=swap">
<link rel="stylesheet" href="${asset('css/site.css')}">${structuredData({ home, title, description, canonical, ogType, modified, noindex })}${analyticsTag()}`;
  const bodyInner = `
${header({ home })}
<main id="main" tabindex="-1">
${body}
</main>
${footer()}
${donateDialog()}
<script>window.BP_LANG="en";window.BP_CONFIG=${JSON.stringify({ forms: s.forms, route: ctx.route, mode: ctx.mode, preferredRoute: s.contact.preferredRoute, email: s.contact.emailVerified ? s.contact.email : '', strings: pick(ctx.t.all, /^(form|search|copied|copyFailed)/) })};</script>
<script src="${asset('js/site.js')}" defer></script>
${scripts.map((src) => `<script src="${asset(src)}" defer></script>`).join('\n')}`;
  const html = `<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><script>/* temporary: ?qm=1-5 previews phone sticky-note styles */try{var k=location.search.match(/[?&]qm=([1-5])/);if(k)document.documentElement.dataset.qm=k[1]}catch(e){}</script>${headInner}
</head>
<body class="${bodyClass}">${bodyInner}
</body>
</html>
`;
  return { html, fragment: headInner.replace(/<title>.*?<\/title>/, `<title>${esc(s.name)}</title>`) + '\n' + `<div class="body-wrap ${bodyClass}">` + bodyInner + '</div>' };
}

function pick(obj, re) {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => re.test(k)));
}

// Trim a meta description to `max` characters at a word boundary.
function clip(text = '', max = 160) {
  const t = String(text).replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).replace(/\s+\S*$/, '').replace(/[,;:.\s]+$/, '') + '…';
}

// Google Analytics 4. Only added to the live build, and only when content/site.json → analytics.ga4 is set.
function analyticsTag() {
  const id = ctx.site.analytics && ctx.site.analytics.ga4;
  if (ctx.mode !== 'live' || !id || !/^G-[A-Z0-9]+$/.test(id)) return '';
  // Loads only after the visitor accepts analytics cookies (choice kept in localStorage 'bp.cookies'; banner in site.js)
  return `
<script>(function(){var id='${id}';window.bpLoadGA=function(){if(window.__bpGA)return;window.__bpGA=1;var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id='+id;document.head.appendChild(s);window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments);};gtag('js',new Date());gtag('config',id);};var c;try{c=localStorage.getItem('bp.cookies');}catch(e){}if(c==='yes')window.bpLoadGA();})();</script>`;
}

// schema.org structured data (JSON-LD): the organization and website on the homepage,
// breadcrumbs on every inner page, and Article details on guides and resource articles.
function structuredData({ home, title, description, canonical, ogType, modified, noindex }) {
  if (noindex) return '';
  const s = ctx.site;
  const orgId = s.siteUrl + '/#organization';
  const graph = [];
  if (home) {
    const sameAs = Object.values(s.social || {}).filter((x) => x && x.url && x.verified !== false).map((x) => x.url);
    graph.push({
      '@type': 'Organization', '@id': orgId, name: s.name, url: s.siteUrl + '/',
      logo: { '@type': 'ImageObject', url: s.siteUrl + '/assets/img/logo-main.png' },
      description,
      slogan: s.tagline || undefined,
      founder: s.founder ? { '@type': 'Person', name: s.founder } : undefined,
      email: s.contact && s.contact.emailVerified ? s.contact.email : undefined,
      areaServed: { '@type': 'AdministrativeArea', name: 'Miami-Dade County, Florida' },
      address: { '@type': 'PostalAddress', addressLocality: 'Miami', addressRegion: 'FL', addressCountry: 'US' },
      sameAs,
    });
    graph.push({ '@type': 'WebSite', '@id': s.siteUrl + '/#website', url: s.siteUrl + '/', name: s.name, inLanguage: 'en-US', publisher: { '@id': orgId } });
  }
  if (ctx.crumbs && ctx.crumbs.length > 1) {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: ctx.crumbs.map((c, i) => ({
        '@type': 'ListItem', position: i + 1, name: c[0],
        item: i === ctx.crumbs.length - 1 ? canonical : s.siteUrl + '/' + c[1],
      })),
    });
  }
  if (ogType === 'article') {
    graph.push({
      '@type': 'Article', headline: String(title).slice(0, 110), description, url: canonical, mainEntityOfPage: canonical,
      image: s.siteUrl + '/assets/' + 'og/' + (ctx.route.replace(/\/$/, '').replace(/\//g, '--') || 'home') + '.png', inLanguage: 'en-US',
      dateModified: modified || undefined,
      author: { '@type': 'Organization', '@id': orgId, name: s.name },
      publisher: { '@type': 'Organization', '@id': orgId, name: s.name, logo: { '@type': 'ImageObject', url: s.siteUrl + '/assets/img/logo-main.png' } },
    });
  }
  if (!graph.length) return '';
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
  return `\n<script type="application/ld+json">${json}</script>`;
}
