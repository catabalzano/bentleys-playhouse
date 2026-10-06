import { ctx, esc, href, asset, isCurrent, icon, show, paw, logo } from './core.mjs';

const NAV = [
  ['nav.help', 'get-help/'],
  ['nav.adopt', 'adopt-foster/'],
  ['nav.resources', 'resources/'],
  ['nav.story', 'our-story/'],
  ['nav.involved', 'get-involved/'],
];

function navLinks() {
  const t = ctx.t;
  return NAV.map(([k, r]) =>
    `<li><a class="nav__link" href="${href(r)}"${isCurrent(r) ? ' aria-current="page"' : ''}>${t(k)}</a></li>`).join('');
}

function donateLink(cls = 'btn btn--donate') {
  const d = ctx.site.donate;
  if (d.verified && d.url) return `<a class="${cls}" href="${href('donate/')}">${icon('heart', { size: 18 })}<span>${ctx.t('nav.donate')}</span></a>`;
  return '';
}

function langSwitch() {
  const langs = ctx.site.languages.filter((l) => l.enabled);
  if (langs.length < 2) return '';
  return `<div class="lang" role="group" aria-label="Language">${langs.map((l) => `<a href="#" lang="${l.code}">${l.label}</a>`).join('')}</div>`;
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
    <a class="utility__urgent" href="${href('get-help/emergency/')}">${icon('alert', { size: 18 })}<span>${t('urgent.bar')}</span> <strong>${t('urgent.link')}</strong></a>
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
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="site-nav">
      <span class="menu-btn__open">${icon('menu')}<span>${t('menu')}</span></span>
      <span class="menu-btn__close">${icon('x')}<span>${t('close')}</span></span>
    </button>
    <nav class="nav" id="site-nav" aria-label="Main">
      <ul class="nav__list">${navLinks()}</ul>
      <div class="nav__extra">
        <a class="nav__link nav__contact" href="${href('transparency/')}">Transparency</a>
        <a class="nav__link nav__contact" href="${href('contact/')}">${t('nav.contact')}</a>
        ${donateLink()}
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
    .map(([k, v]) => `<li><a href="${esc(v.url)}" target="_blank" rel="noopener">${icon(k, { size: 18 })} ${esc(v.handle)}<span class="visually-hidden"> (${t('externalLink')})</span></a></li>`).join('');
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
    ${col('Learn', [['Adopt & Foster', 'adopt-foster/'], ['Resource Library', 'resources/'], ['Flyer builder', 'resources/flyer-builder/'], ['Printable checklists', 'resources/#checklists']])}
    ${col(esc(s.name), [['Our Story', 'our-story/'], ['Where the money goes', 'transparency/'], ['Get Involved', 'get-involved/'], ['Contact & FAQ', 'contact/'], ...(s.donate.verified ? [['Donate', 'donate/']] : []), ['Privacy', 'privacy/']])}
    <div class="footer__col"><h2 class="footer__h">Follow along</h2><ul class="footer__social">${social}</ul></div>
  </div>
  <div class="wrap footer__notice">
    <p>${icon('alert', { size: 18 })} <span>${t('footer.notEmergency')} ${t('footer.emergency')}</span></p>
  </div>
  <div class="wrap footer__base">
    <p>© ${new Date('2026-10-05').getFullYear()} ${esc(s.name)}. Guidance last reviewed <time datetime="${s.lastReviewed}">${new Date(s.lastReviewed + 'T12:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</time>.</p>
    <p class="footer__paws" aria-hidden="true">${paw()}${paw()}${paw()}</p>
  </div>
</footer>`;
}

export function page({ title, description, body, home = false, bodyClass = '', noindex = false, scripts = [], ogImage = 'img/og-image.png' }) {
  const s = ctx.site;
  const full = home ? `${s.name} | Dog Rescue in Miami` : `${title} | ${s.name}`;
  const canonical = s.siteUrl + '/' + ctx.route;
  const robots = noindex || ctx.mode === 'preview' ? '<meta name="robots" content="noindex">' : '';
  const headInner = `
<title>${esc(full)}</title>
<meta name="description" content="${esc(description)}">
${robots}
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:site_name" content="${esc(s.name)}">
<meta property="og:title" content="${esc(home ? s.name : title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(s.siteUrl + '/assets/' + ogImage)}">
<meta property="og:image:alt" content="${esc(s.name)} logo">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#F9F5F2" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#17162A" media="(prefers-color-scheme: dark)">
<link rel="icon" href="${asset('img/favicon.png')}" type="image/png">
<link rel="apple-touch-icon" href="${asset('img/logo-badge.png')}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,400..800;1,400..600&family=Fredoka:wght@400..700&display=swap">
<link rel="stylesheet" href="${asset('css/site.css')}">`;
  const bodyInner = `
${header({ home })}
<main id="main" tabindex="-1">
${body}
</main>
${footer()}
<script>window.BP_CONFIG=${JSON.stringify({ forms: s.forms, route: ctx.route, mode: ctx.mode, preferredRoute: s.contact.preferredRoute, email: s.contact.emailVerified ? s.contact.email : '', strings: pick(ctx.t.all, /^(form|search|copied|copyFailed)/) })};</script>
<script src="${asset('js/site.js')}" defer></script>
${scripts.map((src) => `<script src="${asset(src)}" defer></script>`).join('\n')}`;
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">${headInner}
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
