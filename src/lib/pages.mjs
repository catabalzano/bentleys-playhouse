import {
  ctx, esc, href, asset, md, mdInline, sections, tag, previewNote, needsConfirm, show, ext, button,
  breadcrumb, sourcesList, icon, paw, pawTrail, fmtDate, strip, slugify, isEmptyBody, logo,
} from './core.mjs';
import { mdasBlock } from './pages2.mjs';
import { pawsomeHome, img } from './pages3.mjs';
import { heroDoorway, photoSlot } from './art.mjs';

const CHOICES = [
  { k: 'found', title: 'I found a dog', sub: 'Stay safe, check for a chip, report it and find the family.', to: 'get-help/found-a-dog/', tone: 'blue' },
  { k: 'lost', title: 'I lost my dog', sub: 'What to do in the first hours, and how to keep searching.', to: 'get-help/lost-my-dog/', tone: 'orange' },
  { k: 'rescued', title: 'I rescued a dog', sub: 'Vet visit, a calm space and the first few weeks.', to: 'get-help/rescued-a-dog/', tone: 'violet' },
  { k: 'adopt', title: 'I want to adopt or foster', sub: 'How to choose well, prepare, and settle in.', to: 'adopt-foster/', tone: 'gold' },
];

function choiceCards(headingLevel = 'h3') {
  return `<ul class="choices" role="list">${CHOICES.map((c) => `
    <li><a class="choice choice--${c.tone}" href="${href(c.to)}">
      <span class="choice__icon">${icon(c.k, { size: 34 })}</span>
      <${headingLevel} class="choice__title">${c.title}</${headingLevel}>
      <span class="choice__sub">${c.sub}</span>
      <span class="choice__go" aria-hidden="true">${icon('arrow', { size: 22 })}</span>
    </a></li>`).join('')}</ul>`;
}

function card(item, { headingLevel = 'h3', showCat = true } = {}) {
  const cats = ctx.categories;
  const cat = cats.find((c) => c.id === item.category);
  const isExt = item.type === 'link';
  const target = isExt ? item.url : href(item.route);
  return `<article class="rcard rcard--${item.type}" data-type="${item.type}" data-cat="${item.category}" data-area="${item.area || 'general'}" data-search="${esc(item.searchText)}">
    <div class="rcard__top">
      ${showCat && cat ? `<span class="rcard__cat">${icon(cat.icon, { size: 16 })} ${esc(cat.label)}</span>` : ''}
      <span class="rcard__type">${ctx.t('type.' + item.type)}</span>
    </div>
    <${headingLevel} class="rcard__title"><a href="${esc(target)}"${isExt ? ' target="_blank" rel="noopener"' : ''}>${esc(item.title)}${isExt ? `<span class="visually-hidden"> (${ctx.t('externalLink')})</span>${icon('external', { size: 16, cls: 'icon-ext' })}` : ''}</a></${headingLevel}>
    <p class="rcard__sum">${esc(item.summary)}</p>
    <div class="rcard__meta">${item.area ? `<span class="area area--${item.area}">${ctx.t('area.' + item.area)}</span>` : ''}${item.phone ? `<span class="rcard__phone">${icon('phone', { size: 15 })} ${esc(item.phone)}</span>` : ''}</div>
  </article>`;
}

// ============ HOME ============
export function home(data) {
  const s = ctx.site;
  const heroImg = s.hero.image
    ? `<img class="hero__img" src="${asset('img/' + s.hero.image)}" alt="${esc(s.hero.imageAlt)}" width="1600" height="700" fetchpriority="high">`
    : heroDoorway();
  const featured = data.items.filter((i) => i.featured).slice(0, 6);
  const stories = data.stories.slice(0, 3);
  const dogs = data.dogs.filter((d) => d.status !== 'adopted' && d.source === 'bentleys').slice(0, 3);
  return `
<section class="hero" aria-labelledby="hero-h">
  <div class="wrap">
    <div class="hero__frame">${heroImg}</div>
    <div class="hero__card">
      <p class="eyebrow">${tag('Miami-based Dog Rescue &amp; Advocacy Organization', 'gold')}</p>
      <h1 id="hero-h" class="hero__h">Here for the dogs, and for <span class="hl">the people who help them.</span></h1>
      <p class="hero__lede">${esc(s.name)} rescues, rehabilitates and rehomes dogs in South Florida. We also work to support other animal rescues in the country through volunteer work and donations, as well as sharing clear, practical help for anyone who has just found, lost or rescued a dog and isn't sure what to do next.</p>
      <div class="hero__ctas">
        ${button('Find help', 'get-help/', { ic: 'search' })}
        ${button('Get involved', 'get-involved/', { variant: 'ghost', ic: 'hands' })}
      </div>
    </div>
    ${s.hero.image ? '' : previewNote('The doorway illustration (built around Bentley from your logo) stands in for a hero photo. Add a joyful photo you own in <code>content/site.json → hero</code>.')}
  </div>
</section>

<div class="stack">
<section class="brings" aria-labelledby="brings-h">
  <div class="wrap">
    <h2 id="brings-h" class="section-h section-h--center">What brings you here?</h2>
    ${choiceCards('h3')}
    <p class="brings__urgent">${icon('alert', { size: 20 })} <span>Is a dog hurt or in danger right now? <a href="${href('get-help/emergency/')}">Go to emergency steps</a>.</span></p>
  </div>
</section>

<section class="rrr" aria-labelledby="rrr-h" data-reveal="panel">
  <div class="wrap rrr__in">
    <div class="rrr__intro" data-reveal style="--d:.35s">
      <span class="logo rrr__wordmark"><img class="logo__l" src="${asset('img/logo-wordmark.png')}" alt="" width="900" height="322" loading="lazy"><img class="logo__d" src="${asset('img/logo-wordmark-dark.png')}" alt="" width="900" height="322" loading="lazy"></span>
      <p class="eyebrow">${tag('Who we are')}</p>
      <h2 id="rrr-h" class="section-h">A playhouse with a purpose</h2>
      <p>Since August 2022, Cata Balzano has been taking dogs out of abuse, neglect and backyard breeding into her Miami home, and helping them heal. The rescue is named for Bentley, her French Bulldog, who welcomed every one of them.</p>
      <p><a class="arrow-link" href="${href('our-story/')}">Read our story ${icon('arrow', { size: 18 })}</a></p>
    </div>
    <ol class="rrr__steps">
      <li data-reveal style="--d:.5s"><span class="rrr__word">Rescue.</span><p>Getting dogs out of situations that are hurting them, and into safety.</p></li>
      <li data-reveal style="--d:.65s"><span class="rrr__word">Rehab.</span><p>Vet care, patience, routine and time, until a dog is ready to trust again.</p></li>
      <li data-reveal style="--d:.8s"><span class="rrr__word">Rehome.</span><p>Matching each dog with a family that fits, so the next home is the last one.</p></li>
      <li class="rrr__repeat" data-reveal style="--d:.95s"><span class="rrr__word">Repeat.</span><p>Then we make room for the next dog who needs us.</p></li>
    </ol>
  </div>
</section>
</div>

<section class="guides" aria-labelledby="guides-h">
  <div class="wrap">
    <div class="section-head">
      <div><p class="eyebrow">${tag('Resource Library')}</p><h2 id="guides-h" class="section-h">Guides people use most</h2></div>
      <a class="arrow-link" href="${href('resources/')}">See all resources ${icon('arrow', { size: 18 })}</a>
    </div>
    <div class="rgrid rgrid--home">${featured.map((i) => card(i, { headingLevel: 'h3' })).join('')}</div>
  </div>
</section>

<div class="stack stack--pawsome">
${dogs.length || stories.length ? `
<section class="dogs-home" aria-labelledby="dogs-h"><div class="wrap">
  <h2 id="dogs-h" class="section-h">Meet the dogs</h2>
  <div class="dog-grid">${dogs.map(dogCard).join('')}${stories.map(storyCard).join('')}</div>
</div></section>` : `
<section class="dogs-home" aria-labelledby="dogs-h"><div class="wrap">
  <div class="empty empty--wide">
    <img src="${asset('img/bentley-head.png')}" alt="" width="120" height="139" loading="lazy" class="empty__bentley">
    <div>
      <h2 id="dogs-h" class="section-h">Looking for a dog to adopt?</h2>
      <p>Profiles of our current dogs will live here. For now, our adoptable dogs are listed on RescueMe, and our day-to-day rescue work is on Instagram.</p>
      <div class="btn-row">${button('See our RescueMe listings', s.social.rescueme.url, { variant: 'primary', externalLink: true })}${button('Dogs at Miami-Dade Animal Services', 'adopt-foster/#mdas', { variant: 'ghost' })}${button('Dogs at Broward County Animal Care', 'https://24petconnect.com/BrowardAllAnimals?at=DOG', { variant: 'ghost', externalLink: true })}</div>
    </div>
  </div>
  ${previewNote('Add real dogs in <code>content/dogs/</code> and rescue stories in <code>content/stories/</code>. They appear here automatically.')}
</div></section>`}

${pawsomeHome(data.pooches)}
</div>

<section class="help-ways" aria-labelledby="ways-h">
  <div class="wrap">
    <p class="eyebrow">${tag('Get involved', 'violet')}</p>
    <h2 id="ways-h" class="section-h">Small things that make a big difference</h2>
    <ul class="ways" role="list">
      <li class="way"><span class="way__icon">${icon('share')}</span><h3>Share what helps</h3><p>Pass a guide to a neighbor, or share a lost or found post in your area.</p><a href="${href('get-involved/#share')}">How to share well</a></li>
      <li class="way"><span class="way__icon">${icon('hands')}</span><h3>Lend a hand</h3><p>Tell us about your time and skills, from transport to photography.</p><a href="${href('get-involved/#volunteer')}">Volunteer interest</a></li>
      <li class="way"><span class="way__icon">${icon('home')}</span><h3>Open your home</h3><p>Fostering gives a dog a quiet place to heal while they wait for family.</p><a href="${href('adopt-foster/#fostering')}">What fostering involves</a></li>
      <li class="way"><span class="way__icon">${icon('gift')}</span><h3>Send supplies</h3><p>Food, bedding and enrichment toys keep rehab going.</p><a href="${href('get-involved/#supplies')}">Supply donations</a></li>
    </ul>
  </div>
</section>

<section class="community" aria-labelledby="ig-h">
  <div class="wrap community__in">
    <div class="community__text">
      <p class="eyebrow">${tag('Community')}</p>
      <h2 id="ig-h" class="section-h">Follow the playhouse</h2>
      <p>Rescue updates, vet bills and receipts, happy endings, and the everyday business of dogs being dogs. Come say hi.</p>
      ${button('@bentleysplayhouse on Instagram', s.social.instagram.url, { variant: 'primary', externalLink: true, ic: 'instagram' })}
    </div>
    <div class="community__grid"${ctx.instagram.length ? '' : ' aria-hidden="true"'}${s.social.instagram.feedUrl ? ` data-ig-feed="${esc(s.social.instagram.feedUrl)}"` : ''}>
      ${ctx.instagram.length
        ? ctx.instagram.slice(0, 5).map((p, i) => `<a class="ig-tile ig-tile--${i}" href="${esc(p.url)}" target="_blank" rel="noopener"><img src="${asset('img/' + p.image)}" alt="${esc(p.alt)}" loading="lazy"></a>`).join('')
        : ['blue', 'orange', 'violet', 'gold', 'peach'].map((c, i) => `<div class="ig-tile ig-tile--${i} ig-tile--${c}">${i === 2 ? `<img src="${asset('img/bentley-head.png')}" alt="" loading="lazy">` : paw()}</div>`).join('')}
    </div>
  </div>
  <div class="wrap">${ctx.instagram.length ? '' : previewNote(s.social.instagram.feedUrl ? 'Your live Instagram feed loads here on the real site. The preview window blocks it, so you see the placeholder tiles.' : 'To show your latest Instagram posts here automatically, connect a free Behold feed (see <code>content/site.json → social.instagram.feedUrl</code>). Or add 5 of your photos in <code>content/instagram.json</code>.')}</div>
</section>`;
}

// ============ GET HELP HUB ============
export function helpHub(data) {
  const guides = data.guides;
  const local = data.directory.filter((d) => ['local'].includes(d.area) && d.helpHub);
  return `
<section class="page-head page-head--help">
  <div class="wrap">
    ${breadcrumb([['Home', ''], ['Get Help', '']])}
    <h1 class="page-h">Get help</h1>
    <p class="page-lede">Take a breath. Pick the situation that fits, and we'll walk you through the next steps in order.</p>
  </div>
</section>
<section class="wrap">
  <a class="urgent-card" href="${href('get-help/emergency/')}">
    <span class="urgent-card__icon">${icon('alert', { size: 30 })}</span>
    <span><strong>Is a dog injured, sick or in immediate danger?</strong><br>Start with the emergency steps.</span>
    ${icon('arrow', { size: 24 })}
  </a>
  ${choiceCards('h2')}
</section>
<section class="wrap section-pad">
  <div class="two-col">
    <div>
      <h2 class="section-h">Printable checklists</h2>
      <p>Each guide has a matching one-page checklist you can tick off on your phone or print.</p>
      <ul class="link-list">${data.checklists.map((c) => `<li><a href="${href('resources/checklists/' + c.slug + '/')}">${icon('list', { size: 20 })} ${esc(c.title)}</a></li>`).join('')}</ul>
    </div>
    <div>
      <h2 class="section-h">Make a lost or found flyer</h2>
      <p>Add a photo and the key details, choose what contact information to show, then print or save it. Your photo stays on your device.</p>
      ${button('Open the flyer builder', 'resources/flyer-builder/', { ic: 'image' })}
    </div>
  </div>
</section>
<section class="wrap section-pad">
  <a class="cta-tile cta-tile--wide" href="${href('resources/vet-clinics/')}">${icon('med', { size: 30 })}<span><strong>Vet clinic directory</strong><br>Emergency hospitals and everyday clinics in Miami-Dade, with hours, walk-in policies and phone numbers.</span>${icon('arrow', { size: 22 })}</a>
</section>
<section class="wrap section-pad">
  <h2 class="section-h">Local agencies in South Florida</h2>
  <p class="muted">These are public agencies, not partners of ${esc(ctx.site.name)}. Check hours before you go.</p>
  <div class="rgrid">${local.map((i) => card(i)).join('')}</div>
</section>`;
}

// ============ GUIDE (Get Help) ============
export function guide(g, data) {
  const { intro, sections: secs } = sections(g.body);
  const checklist = g.checklist && data.checklists.find((c) => c.slug === g.checklist);
  const related = (g.related || []).map((slug) => data.items.find((i) => i.slug === slug)).filter(Boolean);
  return `
<article class="guide">
  <header class="page-head page-head--guide">
    <div class="wrap wrap--text">
      ${breadcrumb([['Home', ''], ['Get Help', 'get-help/'], [g.title, '']])}
      <p class="eyebrow">${tag(g.eyebrow || 'Guide', g.tone || '')}</p>
      <h1 class="page-h">${esc(g.title)}</h1>
      <p class="page-lede">${esc(g.summary)}</p>
      <div class="guide__meta">
        <span>${icon('clock', { size: 18 })} ${ctx.t('lastReviewed')} <time datetime="${g.lastReviewed}">${fmtDate(g.lastReviewed)}</time></span>
        <span>${icon('map', { size: 18 })} ${esc(g.scope || 'General guidance, with Miami-Dade specifics')}</span>
      </div>
      <div class="tool-row">
        <button class="btn btn--small btn--ghost" type="button" data-copy-link>${icon('link', { size: 18 })}<span>${ctx.t('copyLink')}</span></button>
        <button class="btn btn--small btn--ghost" type="button" data-print>${icon('print', { size: 18 })}<span>${ctx.t('print')}</span></button>
        ${checklist ? `<a class="btn btn--small btn--ghost" href="${href('resources/checklists/' + checklist.slug + '/')}">${icon('list', { size: 18 })}<span>Checklist</span></a>` : ''}
      </div>
      <p class="copy-status" role="status" aria-live="polite"></p>
    </div>
  </header>
  <div class="wrap wrap--text">
    ${intro ? `<div class="prose guide__intro">${md(intro)}</div>` : ''}
    <section class="steps" aria-labelledby="steps-h">
      <h2 id="steps-h" class="steps__h">${ctx.t('quickSteps')}</h2>
      <ol class="steps__list">${g.steps.map((s) => `<li class="step"><h3 class="step__t">${mdInline(s.title)}</h3><div class="step__b">${md(s.body)}</div></li>`).join('')}</ol>
    </section>
    ${g.local ? `<aside class="note note--local local-box"><span class="tag tag--local">${icon('map', { size: 16 })} ${esc(g.local.label || 'In Miami-Dade')}</span>${md(g.local.body)}</aside>` : ''}
    <section class="details-block" aria-labelledby="more-h">
      <h2 id="more-h" class="details-block__h">${ctx.t('moreDetail')}</h2>
      ${secs.map((s) => `<details class="acc" id="${s.id}"><summary><span>${esc(s.title)}</span>${icon('arrow', { size: 20, cls: 'acc__chev' })}</summary><div class="acc__body prose">${md(s.body)}</div></details>`).join('')}
    </section>
    <div class="cta-pair">
      ${checklist ? `<a class="cta-tile" href="${href('resources/checklists/' + checklist.slug + '/')}">${icon('list', { size: 28 })}<span><strong>${esc(checklist.title)}</strong><br>Tick it off on your phone, or print it.</span></a>` : ''}
      ${g.flyer ? `<a class="cta-tile" href="${href('resources/flyer-builder/')}">${icon('image', { size: 28 })}<span><strong>Make a ${g.flyer} flyer</strong><br>Add a photo and details, then print or save.</span></a>` : ''}
    </div>
    ${sourcesList(g.sources, g.lastReviewed)}
    ${related.length ? `<section class="related"><h2 class="section-h section-h--sm">${ctx.t('related')}</h2><div class="rgrid rgrid--2">${related.map((i) => card(i, { headingLevel: 'h3' })).join('')}</div></section>` : ''}
  </div>
</article>`;
}

// ============ LIBRARY ============
export function library(data) {
  const cats = ctx.categories;
  const tools = data.items.filter((i) => i.type === 'tool' || i.type === 'checklist');
  const browse = data.items;
  const counts = Object.fromEntries(cats.map((c) => [c.id, browse.filter((i) => i.category === c.id).length]));
  return `
<section class="page-head page-head--lib">
  <div class="wrap">
    ${breadcrumb([['Home', ''], ['Resources', '']])}
    <h1 class="page-h">Resource library</h1>
    <p class="page-lede">Practical guides, printable tools and trusted outside resources, with Miami and South Florida first. Search, or browse by topic.</p>
  </div>
</section>
<section class="wrap" id="checklists" aria-labelledby="tools-h">
  <h2 id="tools-h" class="section-h section-h--sm">Tools you can use right now</h2>
  <ul class="tools" role="list">${tools.map((t) => `<li><a class="tool" href="${href(t.route)}">${icon(t.type === 'tool' ? 'image' : 'list', { size: 26 })}<span><strong>${esc(t.title)}</strong><span class="tool__sub">${esc(t.short || t.summary)}</span></span></a></li>`).join('')}</ul>
</section>
<section class="wrap section-pad library" aria-labelledby="browse-h" data-library>
  <h2 id="browse-h" class="visually-hidden">Browse and search</h2>
  <form class="lib-controls" role="search" onsubmit="return false">
    <div class="search">
      <label for="lib-q" class="search__label">${ctx.t('search.label')}</label>
      <div class="search__box">${icon('search', { size: 22 })}<input id="lib-q" name="q" type="search" autocomplete="off" placeholder="${esc(ctx.t('search.placeholder'))}"><button type="button" class="search__clear" hidden>${ctx.t('search.clear')}</button></div>
    </div>
    <div class="filters">
      <fieldset class="chips"><legend class="visually-hidden">Topic</legend>
        <button type="button" class="chip" data-topic="" aria-pressed="true">${ctx.t('search.all')}</button>
        ${cats.map((c) => `<button type="button" class="chip" data-topic="${c.id}" aria-pressed="false">${icon(c.icon, { size: 16 })} ${esc(c.label)} <span class="chip__n">${counts[c.id]}</span></button>`).join('')}
      </fieldset>
      <div class="area-filter"><label for="lib-area">Where</label>
        <select id="lib-area"><option value="">Everywhere</option><option value="local">Miami-Dade &amp; South Florida</option><option value="florida">Florida</option><option value="national">National</option><option value="general">Applies anywhere</option></select>
      </div>
    </div>
  </form>
  <p class="lib-count" role="status" aria-live="polite"><span data-count>${browse.length}</span> <span data-count-label>results</span></p>
  ${cats.map((c) => `<div class="cat-block" data-cat-block="${c.id}" id="topic-${c.id}">
    <div class="cat-block__head"><span class="cat-block__icon">${icon(c.icon, { size: 24 })}</span><div><h3 class="cat-block__h">${esc(c.label)}</h3><p class="muted">${esc(c.description)}</p></div></div>
    <div class="rgrid">${browse.filter((i) => i.category === c.id).map((i) => card(i, { headingLevel: 'h4', showCat: false })).join('')}</div>
  </div>`).join('')}
  <div class="empty lib-empty" hidden>
    <img src="${asset('img/bentley-head.png')}" alt="" width="90" height="104">
    <div><p><strong>${ctx.t('search.none')}</strong></p><p class="muted">Still stuck? <a href="${href('get-help/')}">Start from Get Help</a> or <a href="${href('contact/')}">ask us</a>.</p></div>
  </div>
</section>`;
}

// ============ ARTICLE ============
export function article(a, data) {
  const cat = ctx.categories.find((c) => c.id === a.category);
  const related = (a.related || []).map((slug) => data.items.find((i) => i.slug === slug)).filter(Boolean);
  const { intro, sections: secs } = sections(a.body);
  return `
<article>
  <header class="page-head page-head--article">
    <div class="wrap wrap--text">
      ${breadcrumb([['Home', ''], ['Resources', 'resources/'], [a.title, '']])}
      <p class="eyebrow">${tag(cat ? esc(cat.label) : 'Article')} ${a.area ? `<span class="area area--${a.area}">${ctx.t('area.' + a.area)}</span>` : ''}</p>
      <h1 class="page-h">${esc(a.title)}</h1>
      <p class="page-lede">${esc(a.summary)}</p>
      <div class="tool-row">
        <button class="btn btn--small btn--ghost" type="button" data-copy-link>${icon('link', { size: 18 })}<span>${ctx.t('copyLink')}</span></button>
        <button class="btn btn--small btn--ghost" type="button" data-print>${icon('print', { size: 18 })}<span>${ctx.t('print')}</span></button>
      </div>
      <p class="copy-status" role="status" aria-live="polite"></p>
    </div>
  </header>
  <div class="wrap wrap--text">
    ${secs.length > 2 ? `<nav class="toc" aria-label="${ctx.t('onThisPage')}"><h2 class="toc__h">${ctx.t('onThisPage')}</h2><ul>${secs.map((s) => `<li><a href="#${s.id}">${esc(s.title)}</a></li>`).join('')}</ul></nav>` : ''}
    <div class="prose">${md(intro)}${secs.map((s) => `<h2 id="${s.id}">${esc(s.title)}</h2>${md(s.body)}`).join('')}</div>
    ${a.preview ? previewNote(a.preview) : ''}
    ${sourcesList(a.sources || [], a.lastReviewed)}
    ${related.length ? `<section class="related"><h2 class="section-h section-h--sm">${ctx.t('related')}</h2><div class="rgrid rgrid--2">${related.map((i) => card(i)).join('')}</div></section>` : ''}
  </div>
</article>`;
}

// ============ CHECKLIST ============
export function checklist(c) {
  let n = 0;
  return `
<section class="page-head page-head--check no-print">
  <div class="wrap wrap--text">
    ${breadcrumb([['Home', ''], ['Resources', 'resources/'], [c.title, '']])}
    <h1 class="page-h">${esc(c.title)}</h1>
    <p class="page-lede">${esc(c.intro)}</p>
  </div>
</section>
<div class="wrap wrap--text">
  <div class="checklist" data-checklist="${c.slug}">
    <div class="checklist__bar no-print">
      <p class="checklist__progress" role="status" aria-live="polite"><span data-done>0</span> of <span data-total>0</span> done</p>
      <div class="tool-row">
        <button class="btn btn--small btn--primary" type="button" data-print>${icon('print', { size: 18 })}<span>${ctx.t('printChecklist')}</span></button>
        <button class="btn btn--small btn--ghost" type="button" data-reset>Clear ticks</button>
      </div>
    </div>
    <p class="muted small no-print">Your ticks are saved only in this browser, on this device.</p>
    <div class="print-only print-head"><img src="${asset('img/logo-main.png')}" alt="${esc(ctx.site.name)}" width="110"><p class="print-head__h">${esc(c.title)}</p><p>${esc(c.intro)}</p></div>
    ${c.groups.map((g) => `<fieldset class="check-group"><legend>${esc(g.title)}</legend><ul>${g.items.map((it) => {
      const id = `${c.slug}-${++n}`;
      return `<li><input type="checkbox" id="${id}" data-key="${id}"><label for="${id}">${mdInline(it)}</label></li>`;
    }).join('')}</ul></fieldset>`).join('')}
    ${c.notes ? `<div class="check-notes"><h2>Notes</h2><div class="check-notes__lines" aria-hidden="true"></div></div>` : ''}
    <p class="print-only small">From ${esc(ctx.site.name)} · General information, not veterinary or legal advice. Last reviewed ${fmtDate(c.lastReviewed || ctx.site.lastReviewed)}.</p>
    ${c.guide ? `<p class="no-print">Need the reasoning behind each step? <a href="${href(c.guide)}">Read the full guide</a>.</p>` : ''}
  </div>
</div>`;
}

// ============ FLYER BUILDER ============
export function flyer() {
  return `
<section class="page-head no-print">
  <div class="wrap">
    ${breadcrumb([['Home', ''], ['Resources', 'resources/'], ['Flyer builder', '']])}
    <h1 class="page-h">Lost &amp; found flyer builder</h1>
    <p class="page-lede">Make a clear, printable flyer in a few minutes. Your photo is processed in your browser and never uploaded or stored by us.</p>
  </div>
</section>
<div class="wrap flyer-tool" data-flyer>
  <form class="flyer-form no-print" id="flyer-form" novalidate>
    <fieldset class="fgroup">
      <legend>1. Lost or found?</legend>
      <div class="seg">
        <input type="radio" name="kind" id="kind-lost" value="lost" checked><label for="kind-lost">${icon('lost', { size: 20 })} Lost dog</label>
        <input type="radio" name="kind" id="kind-found" value="found"><label for="kind-found">${icon('found', { size: 20 })} Found dog</label>
      </div>
    </fieldset>
    <fieldset class="fgroup">
      <legend>2. Photo</legend>
      <label class="file-drop" for="f-photo">${icon('image', { size: 26 })}<span><strong>Choose a clear, recent photo</strong><br><span class="muted">Full body or face, good light. JPG or PNG.</span></span></label>
      <input id="f-photo" type="file" accept="image/*" class="visually-hidden-file">
      <p class="hint">Stays on your device. Removing it or closing the page clears it.</p>
      <button type="button" class="btn btn--small btn--ghost" data-remove-photo hidden>Remove photo</button>
    </fieldset>
    <fieldset class="fgroup">
      <legend>3. About the dog</legend>
      <div class="field" data-only="lost"><label for="f-name">Dog's name <span class="opt">(${ctx.t('form.optional')})</span></label><input id="f-name" type="text" maxlength="30" autocomplete="off"></div>
      <div class="field"><label for="f-desc">Description</label><input id="f-desc" type="text" maxlength="90" value="Medium black-and-white dog, short coat, blue collar"><p class="hint">Size, color, coat, collar. Keep it short.</p></div>
      <div class="field" data-only="found"><p class="hint hint--tip">${icon('shield', { size: 18 })} Leave out one identifying detail (a marking, a tag color) so you can check that anyone who calls is the real family.</p></div>
      <div class="field" data-only="lost"><label for="f-temper">Approach advice</label>
        <select id="f-temper"><option value="">No note</option><option value="shy" selected>Shy: please don't chase. Call with location.</option><option value="friendly">Friendly, may come to you</option><option value="meds">Needs daily medication</option></select></div>
    </fieldset>
    <fieldset class="fgroup">
      <legend>4. Where and when</legend>
      <div class="field"><label for="f-where">General area</label><input id="f-where" type="text" maxlength="70" value="Near NW 7th St &amp; 42nd Ave"><p class="hint">Use cross streets, a park or a neighborhood. Never your home address.</p><p class="warn" data-address-warn hidden>${icon('alert', { size: 16 })} That looks like a street address. For your safety, use nearby cross streets instead.</p></div>
      <div class="field"><label for="f-when">Date</label><input id="f-when" type="date"></div>
    </fieldset>
    <fieldset class="fgroup">
      <legend>5. How people can reach you</legend>
      <p class="hint">Choose only what you're comfortable sharing publicly. A separate email or a text-only number is a good idea.</p>
      <div class="check-line"><input type="checkbox" id="c-phone" checked><label for="c-phone">Phone</label></div>
      <div class="field field--indent"><label for="f-phone" class="visually-hidden">Phone number</label><input id="f-phone" type="tel" inputmode="tel" value="(305) 555-0134" maxlength="20"></div>
      <div class="check-line"><input type="checkbox" id="c-text"><label for="c-text">Say "Text only"</label></div>
      <div class="check-line"><input type="checkbox" id="c-email"><label for="c-email">Email</label></div>
      <div class="field field--indent"><label for="f-email" class="visually-hidden">Email address</label><input id="f-email" type="email" maxlength="50" placeholder="a separate address is safest"></div>
      <div class="check-line"><input type="checkbox" id="c-other"><label for="c-other">Other (social handle, group name)</label></div>
      <div class="field field--indent"><label for="f-other" class="visually-hidden">Other contact</label><input id="f-other" type="text" maxlength="40"></div>
    </fieldset>
    <p class="muted small">The example details above are placeholders. Replace them with your own.</p>
  </form>

  <div class="flyer-out">
    <div class="flyer-actions no-print">
      <button class="btn btn--primary" type="button" data-flyer-print>${icon('print', { size: 20 })}<span>Print flyer</span></button>
      <button class="btn btn--ghost" type="button" data-flyer-download>${icon('download', { size: 20 })}<span>Save as image</span></button>
    </div>
    <p class="flyer-status no-print" role="status" aria-live="polite"></p>
    ${previewNote('Printing and saving are blocked inside this preview window. Both work on the live site. In this preview you can still fill in the flyer and see it update.')}
    <div class="flyer-sheet" id="flyer-sheet" aria-label="Flyer preview">
      <div class="flyer__band"><span class="flyer__kind">LOST DOG</span></div>
      <div class="flyer__photo"><div class="flyer__nophoto">${icon('image', { size: 44 })}<span>Your photo here</span></div><img alt="" hidden></div>
      <p class="flyer__name"></p>
      <p class="flyer__desc"></p>
      <p class="flyer__temper"></p>
      <dl class="flyer__facts"><div><dt>Area</dt><dd class="flyer__where"></dd></div><div><dt class="flyer__when-l">Last seen</dt><dd class="flyer__when"></dd></div></dl>
      <div class="flyer__contact"></div>
      <p class="flyer__foot">Also check Miami-Dade Animal Services, fenixanimalproject.org and Petco Love Lost.</p>
    </div>
  </div>
</div>`;
}

// ============ ADOPT & FOSTER ============
export function dogCard(d) {
  const theirs = d.source === 'bentleys';
  return `<article class="dog">
    <a class="dog__photo" href="${href('adopt-foster/dogs/' + d.slug + '/')}">${d.photo ? `<img src="${img(d.photo, 'img/dogs/')}" alt="${esc(d.photoAlt || d.name)}" loading="lazy">` : photoSlot('Photo coming soon', 'violet')}</a>
    <div class="dog__body">
      <p class="dog__badges">${theirs ? tag("Bentley's Playhouse dog", 'blue') : (d.source === 'mdas' ? tag('Miami-Dade Animal Services' + (d.animalId ? ' · ' + esc(d.animalId) : ''), 'gold') : tag('Partner listing: ' + esc(d.partnerName || ''), 'gold'))} ${d.status === 'pending' ? '<span class="pill">Adoption pending</span>' : ''}</p>
      <h3 class="dog__name"><a href="${href('adopt-foster/dogs/' + d.slug + '/')}">${esc(d.name)}</a></h3>
      <p class="dog__facts">${[d.age, d.sex, d.size].filter(Boolean).map(esc).join(' · ')}</p>
      <p>${esc(d.summary || '')}</p>
    </div>
  </article>`;
}
export function storyCard(st) {
  return `<article class="dog dog--story">
    <div class="dog__photo">${st.photo ? `<img src="${img(st.photo, 'img/stories/')}" alt="${esc(st.photoAlt || '')}" loading="lazy">` : photoSlot('Photo coming soon', 'gold')}</div>
    <div class="dog__body"><p>${tag('Rescue story', 'orange')}</p><h3 class="dog__name">${esc(st.title)}</h3><p>${esc(st.summary)}</p></div>
  </article>`;
}
export function dogPage(d) {
  const s = ctx.site;
  return `
<section class="page-head"><div class="wrap wrap--text">
  ${breadcrumb([['Home', ''], ['Adopt & Foster', 'adopt-foster/'], [d.name, '']])}
  <p>${d.source === 'bentleys' ? tag("Bentley's Playhouse dog", 'blue') : (d.source === 'mdas' ? tag('Miami-Dade Animal Services' + (d.animalId ? ' · ' + esc(d.animalId) : ''), 'gold') : tag('Partner listing: ' + esc(d.partnerName || ''), 'gold'))}</p>
  <h1 class="page-h">${esc(d.name)}</h1>
  <p class="page-lede">${[d.age, d.sex, d.size].filter(Boolean).map(esc).join(' · ')}</p>
</div></section>
<div class="wrap wrap--text">
  <div class="dog-hero">${d.photo ? `<img src="${img(d.photo, 'img/dogs/')}" alt="${esc(d.photoAlt || d.name)}">` : photoSlot('Photo coming soon', 'violet')}</div>
  <dl class="dog-facts">${[['Good with', d.goodWith], ['Energy', d.energy], ['Medical notes', d.medical], ['Listed', d.date && fmtDate(d.date)]].filter(([, v]) => v).map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
  <div class="prose">${md(d.body)}</div>
  <div class="btn-row">
    ${d.inquiryUrl ? button(`Ask about ${esc(d.name)}`, d.inquiryUrl, { externalLink: true }) : (show(s.adoption.applicationVerified) ? button('Start an adoption application', s.adoption.applicationUrl, { externalLink: true }) : button('Ask about this dog', 'contact/'))}
  </div>
</div>`;
}

export function adopt(data) {
  const s = ctx.site;
  const ours = data.dogs.filter((d) => d.source === 'bentleys' && d.status !== 'adopted');
  const partner = data.dogs.filter((d) => !['bentleys', 'mdas'].includes(d.source) && d.status !== 'adopted');
  const shelters = data.directory.filter((d) => d.adoptList);
  const { sections: secs } = sections(data.pages.adopt.body);
  const sec = (id) => secs.find((x) => x.id === id);
  const block = (id, extra = '') => { const x = sec(id); return x ? `<section class="adopt-sec" id="${x.id}"><h2 class="section-h">${esc(x.title)}</h2><div class="prose">${md(x.body)}</div>${extra}</section>` : ''; };
  return `
<section class="page-head page-head--adopt">
  <div class="wrap">
    ${breadcrumb([['Home', ''], ['Adopt & Foster', '']])}
    <h1 class="page-h">Adopt &amp; foster</h1>
    <p class="page-lede">${esc(data.pages.adopt.summary)}</p>
    <nav class="jump" aria-label="${ctx.t('onThisPage')}"><ul>
      <li><a href="#our-dogs">Our dogs</a></li><li><a href="#mdas">County shelter dogs</a></li><li><a href="#why-adoption-matters">Why adopt</a></li><li><a href="#is-it-the-right-time">Right time?</a></li><li><a href="#questions-to-ask-a-rescue">Questions to ask</a></li><li><a href="#preparing-your-home">Preparing</a></li><li><a href="#the-first-three-months">First months</a></li><li><a href="#fostering">Fostering</a></li><li><a href="#other-ways-to-help">Other ways</a></li>
    </ul></nav>
  </div>
</section>
<div class="wrap">
  <aside class="pp-xlink pp-xlink--adopt"><p class="pawsome__kicker">${paw()} Updated weekly</p><h2 class="section-h">Pawsome Pooches</h2><p>Dogs from Miami-Dade Animal Services, the Broward shelter, local rescues and families rehoming safely, all in one place.</p><p><a class="arrow-link" href="${href('pawsome-pooches/')}">Meet this week's pups ${icon('arrow', { size: 18 })}</a></p></aside>
  <section class="adopt-sec" id="our-dogs" aria-labelledby="our-dogs-h">
    <h2 id="our-dogs-h" class="section-h">Our dogs</h2>
    ${ours.length ? `<div class="dog-grid">${ours.map(dogCard).join('')}</div>` : `
    <div class="empty empty--wide">
      <img src="${asset('img/bentley-head.png')}" alt="" width="110" height="127" class="empty__bentley">
      <div>
        <h3>No profiles here yet</h3>
        <p>We're moving our dog profiles onto this site. Until then, you'll find our current adoptable dogs on RescueMe, and updates on Instagram.</p>
        <div class="btn-row">${button('RescueMe listings', s.social.rescueme.url, { externalLink: true })}${button('Instagram', s.social.instagram.url, { variant: 'ghost', externalLink: true, ic: 'instagram' })}</div>
      </div>
    </div>`}
    <div class="adopt-process">
      <h3 class="section-h section-h--sm">How adopting from us works</h3>
      <ol class="process">${s.adoption.process.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
      ${show(s.adoption.applicationVerified) ? `<div class="btn-row">${button('Start an adoption application', s.adoption.applicationUrl, { externalLink: true, ic: 'adopt' })}</div>` : ''}
    </div>
    ${partner.length ? `<h3 class="section-h section-h--sm">Partner listings</h3><p class="muted">Dogs listed by other rescues we know. Their adoption process is their own.</p><div class="dog-grid">${partner.map(dogCard).join('')}</div>` : ''}
    ${mdasBlock(data.mdas, data.dogs.filter((d) => d.source === 'mdas' && d.status !== 'adopted'), dogCard)}
    <p class="muted">In Broward? <a href="https://www.broward.org/Animal/Pages/default.aspx" target="_blank" rel="noopener">Broward County Animal Care<span class="visually-hidden"> (opens in a new tab)</span></a> has dogs waiting too.</p>
  </section>
  <div class="wrap--text adopt-flow">
    ${block('why-adoption-matters')}
    ${block('is-it-the-right-time')}
    ${block('questions-to-ask-a-rescue')}
    ${block('preparing-your-home', `<p>${button('New-adopter checklist', 'resources/checklists/new-adopter/', { variant: 'ghost', ic: 'list' })}</p>`)}
    ${block('the-first-three-months')}
    ${block('fostering', `<div class="btn-row">${button('Foster-home checklist', 'resources/checklists/foster-home/', { variant: 'ghost', ic: 'list' })}${button('Tell us you\'re interested', 'get-involved/#foster', { ic: 'home' })}</div>`)}
    ${block('other-ways-to-help', `<p>${button('See ways to get involved', 'get-involved/', { ic: 'hands' })}</p>`)}
    ${sourcesList(data.pages.adopt.sources, data.pages.adopt.lastReviewed)}
  </div>
</div>`;
}

// ============ OUR STORY ============
export function story(data) {
  const p = data.pages.story;
  const { intro, sections: secs } = sections(p.body);
  return `
<section class="story-hero">
  <div class="wrap story-hero__in">
    <div>
      ${breadcrumb([['Home', ''], ['Our Story', '']])}
      <h1 class="page-h">${esc(p.title)}</h1>
      <div class="page-lede prose">${md(intro)}</div>
    </div>
    <div class="story-hero__art">
      <div class="arch arch--blue arch--photo"><img src="${asset('img/cata-romeo-bentley.jpg')}" alt="Cata laughing between Romeo, a merle French Bulldog, and Bentley, a black brindle French Bulldog" width="1000" height="1250"></div>
    </div>
  </div>
</section>
<div class="wrap wrap--text story">
  ${secs.filter((s) => !isEmptyBody(s.body)).map((s, i) => `<section class="story-sec" id="${s.id}"><h2 class="section-h">${esc(s.title)}</h2><div class="prose">${md(s.body)}</div></section>${i === 0 ? `<div class="photo-row"><figure class="photo-slot photo-slot--blue photo-slot--img"><img src="${asset('img/bentley-colosseum.jpg')}" alt="Bentley, a black brindle French Bulldog, smiling in front of the Colosseum in Rome" width="1000" height="1250" loading="lazy"><figcaption>Bentley</figcaption></figure><figure class="photo-slot photo-slot--orange photo-slot--img"><img src="${asset('img/romeo-stick.jpg')}" alt="Romeo, a merle French Bulldog puppy, sitting in the grass with a big stick in his mouth" width="1000" height="1250" loading="lazy"><figcaption>Romeo</figcaption></figure><figure class="photo-slot photo-slot--violet photo-slot--img"><img src="${asset('img/cata-and-pups.jpg')}" alt="Cata with Kiara and Fénix, two French Bulldogs, in the back seat of her car" width="1000" height="1250" loading="lazy"><figcaption>Kiara &amp; Fénix</figcaption></figure></div>` : ''}`).join('')}
  ${data.stories.length ? `<section class="story-sec"><h2 class="section-h">Rescue stories</h2><div class="dog-grid">${data.stories.map(storyCard).join('')}</div></section>` : `<section class="story-sec"><h2 class="section-h">Rescue stories</h2><div class="empty"><div><p>Stories of the dogs who have come through the playhouse will be shared here, with their families' permission.</p>${previewNote('Add stories as files in <code>content/stories/</code>. There is a template in <code>_template.md</code>.')}</div></div></section>`}
</div>`;
}

// ============ GET INVOLVED ============
export function involved(data) {
  const s = ctx.site;
  const ways = data.involved;
  const status = (w) => w.status === 'open' ? '<span class="pill pill--open">Open now</span>' : w.status === 'interest' ? '<span class="pill pill--interest">Interest list</span>' : '<span class="pill pill--soon">Coming soon</span>';
  return `
<section class="page-head page-head--involved">
  <div class="wrap">
    ${breadcrumb([['Home', ''], ['Get Involved', '']])}
    <h1 class="page-h">Get involved</h1>
    <p class="page-lede">Rescue runs on ordinary people doing one helpful thing. Here's what's open now, and where you can raise your hand for what's next.</p>
    <p class="legend"><span class="pill pill--open">Open now</span> you can do this today · <span class="pill pill--interest">Interest list</span> tell us, and we'll reach out when there's a fit · <span class="pill pill--soon">Coming soon</span> not set up yet</p>
  </div>
</section>
<div class="wrap">
  <ul class="ways ways--big" role="list">
    ${ways.filter((w) => w.status !== 'hidden').map((w) => `
    <li class="way way--big" id="${w.id}">
      <div class="way__head"><span class="way__icon">${icon(w.icon)}</span>${status(w)}</div>
      <h2 class="way__h">${esc(w.title)}</h2>
      <div class="prose">${md(w.body)}</div>
      ${w.action ? `<p>${w.action.external ? button(w.action.label, w.action.url, { externalLink: true, variant: 'ghost' }) : `<a class="arrow-link" href="${w.action.url.startsWith('#') ? w.action.url : href(w.action.url)}">${esc(w.action.label)} ${icon('arrow', { size: 18 })}</a>`}</p>` : ''}
      ${w.id === 'foster' && show(s.foster.verified) ? `<p>${ext(s.foster.applicationUrl, 'Open the foster application form')} ${s.foster.verified ? '' : needsConfirm()}</p>` : ''}
      ${w.preview ? previewNote(w.preview) : ''}
    </li>`).join('')}
  </ul>
  <aside class="pp-xlink"><p class="pawsome__kicker">${paw()} Help beyond our own dogs</p><h2 class="section-h">Rescues you can help</h2><p>Local rescues and shelters doing the hard work every day, and how you can support them.</p><p><a class="arrow-link" href="${href('rescues-you-can-help/')}">See rescues you can help ${icon('arrow', { size: 18 })}</a> <a class="arrow-link" href="${href('pawsome-pooches/')}">Meet this week's Pawsome Pooches ${icon('arrow', { size: 18 })}</a></p></aside>
  <section class="form-wrap" id="interest-form" aria-labelledby="int-h">
    <h2 id="int-h" class="section-h">Raise your hand</h2>
    <p>Tell us how you'd like to help. This doesn't sign you up for anything or guarantee a placement. It lets us reach out when there's a good fit.</p>
    ${form('involved')}
  </section>
</div>`;
}

// ============ FORMS ============
export function form(kind) {
  const s = ctx.site;
  const endpoint = kind === 'contact' ? s.forms.contactEndpoint : s.forms.involvedEndpoint;
  const connected = Boolean(endpoint);
  const id = (x) => `${kind}-${x}`;
  const interests = ['Volunteering', 'Fostering', 'Transport', 'Photography or video', 'Professional skills', 'Community partnership', 'Spanish translation', 'Something else'];
  return `<form class="form" data-form="${kind}" ${connected ? `data-endpoint="${esc(endpoint)}"` : 'data-disconnected'} novalidate>
    ${connected ? '' : `<div class="form__notice" role="note">${icon('alert', { size: 20 })}<p>${ctx.t('form.notConnected').replace('{email}', `<strong class="copyable">${esc(s.contact.email)}</strong>`).replace('{route}', `<a href="${esc(s.social.instagram.url)}" target="_blank" rel="noopener">${esc(s.contact.preferredRoute)}</a>`)}</p></div>`}
    <div class="form__grid">
      <div class="field"><label for="${id('name')}">Your name <span class="req">(${ctx.t('form.required')})</span></label><input id="${id('name')}" name="name" type="text" autocomplete="name" required maxlength="80"></div>
      <div class="field"><label for="${id('email')}">Email <span class="req">(${ctx.t('form.required')})</span></label><input id="${id('email')}" name="email" type="email" autocomplete="email" required maxlength="120"></div>
      <div class="field"><label for="${id('phone')}">Phone <span class="opt">(${ctx.t('form.optional')})</span></label><input id="${id('phone')}" name="phone" type="tel" autocomplete="tel" maxlength="30"></div>
      <div class="field"><label for="${id('area')}">Neighborhood or ZIP <span class="opt">(${ctx.t('form.optional')})</span></label><input id="${id('area')}" name="area" type="text" maxlength="60"></div>
    </div>
    ${kind === 'involved' ? `<fieldset class="field"><legend>I'm interested in <span class="opt">(choose any)</span></legend><div class="check-grid">${interests.map((x, i) => `<div class="check-line"><input type="checkbox" id="${id('i' + i)}" name="interests" value="${x}"><label for="${id('i' + i)}">${x}</label></div>`).join('')}</div></fieldset>`
    : `<div class="field"><label for="${id('topic')}">What's this about?</label><select id="${id('topic')}" name="topic"><option>Adopting one of our dogs</option><option>Fostering or volunteering</option><option>I found or rescued a dog</option><option>Partnership or media</option><option>Something else</option></select></div>`}
    <div class="field"><label for="${id('msg')}">${kind === 'involved' ? 'Anything we should know? Skills, availability, experience' : 'Your message'} ${kind === 'contact' ? `<span class="req">(${ctx.t('form.required')})</span>` : `<span class="opt">(${ctx.t('form.optional')})</span>`}</label><textarea id="${id('msg')}" name="message" rows="5" maxlength="2000"${kind === 'contact' ? ' required' : ''}></textarea>
      ${kind === 'contact' ? `<p class="hint">Please don't include a home address or financial details. If an animal is hurt or in danger, don't wait for us: <a href="${href('get-help/emergency/')}">use the emergency steps</a>.</p>` : ''}</div>
    <div class="hp" aria-hidden="true"><label for="${id('website')}">Leave this empty</label><input id="${id('website')}" name="website" type="text" tabindex="-1" autocomplete="off"></div>
    <input type="hidden" name="_started" value="">
    <div class="check-line"><input type="checkbox" id="${id('consent')}" name="consent" required><label for="${id('consent')}">I'm OK with ${esc(s.name)} using these details only to reply to me. <a href="${href('privacy/')}">Privacy</a></label></div>
    <div class="form__actions"><button class="btn btn--primary" type="submit"${connected ? '' : ' disabled aria-disabled="true"'}>${icon('mail', { size: 20 })}<span>${connected ? 'Send' : 'Send (not connected yet)'}</span></button></div>
    <p class="form__status" role="status" aria-live="polite"></p>
  </form>`;
}

// ============ DONATE ============
export function donate() {
  const d = ctx.site.donate;
  const ready = d.verified && d.url;
  return `
<section class="page-head page-head--donate"><div class="wrap wrap--text">
  ${breadcrumb([['Home', ''], ['Donate', '']])}
  <h1 class="page-h">Support the playhouse</h1>
  <p class="page-lede">Every dog we help needs vet care, food, a safe place to land and time. Donations keep that going.</p>
</div></section>
<div class="wrap wrap--text">
  ${ready ? `
    <div class="donate-box">
      ${button('Donate securely', d.url, { externalLink: true, ic: 'heart' })}
      ${d.uses.length ? `<h2 class="section-h section-h--sm">Where donations go</h2><ul>${d.uses.map((u) => `<li>${esc(u)}</li>`).join('')}</ul>` : ''}
      ${d.legal.verified ? `<div class="legal"><h2 class="section-h section-h--sm">Our details</h2><p>${esc(d.legal.legalName)}${d.legal.status ? ` · ${esc(d.legal.status)}` : ''}${d.legal.ein ? ` · EIN ${esc(d.legal.ein)}` : ''}</p>${d.legal.taxStatement ? `<p>${esc(d.legal.taxStatement)}</p>` : ''}</div>` : ''}
    </div>` : `
    <div class="empty empty--wide">
      <img src="${asset('img/bentley-head.png')}" alt="" width="110" height="127" class="empty__bentley">
      <div>
        <h2>Online donations are coming soon</h2>
        <p>We'll add a secure donation link here once it's ready. We won't ask you to send money anywhere that isn't listed on this page or our official Instagram.</p>
        <p>When donations open, you'll be able to see exactly how every dollar is spent on our <a href="${href('transparency/')}">transparency page</a>, receipts included.</p>
        <p>In the meantime, there are lots of ways to help that don't involve money.</p>
        ${button('Other ways to help', 'get-involved/', { ic: 'hands' })}
      </div>
    </div>
    ${previewNote('To switch this page on, add your verified payment link to <code>content/site.json → donate.url</code> and set <code>verified: true</code>. Add confirmed uses of funds and legal/tax details only after they\'re verified. The Donate button appears in the header automatically.')}`}
</div>`;
}

// ============ CONTACT & FAQ ============
export function contact(data) {
  const s = ctx.site;
  const sv = s.services;
  const emailOk = s.contact.email && show(s.contact.emailVerified);
  return `
<section class="page-head page-head--contact"><div class="wrap">
  ${breadcrumb([['Home', ''], ['Contact & FAQ', '']])}
  <h1 class="page-h">Contact &amp; FAQ</h1>
  <p class="page-lede">How to reach us, what we can help with, and what to do when something can't wait.</p>
</div></section>
<div class="wrap">
  <div class="contact-grid">
    <section class="urgent-panel" aria-labelledby="urg-h">
      <h2 id="urg-h">${icon('alert', { size: 24 })} If an animal needs help right now</h2>
      <p>${esc(ctx.t('footer.notEmergency'))} Please don't wait on a message to us.</p>
      <ul class="urgent-list">
        <li><strong>Animal cruelty happening now, or danger to people:</strong> call <span class="num">911</span>.</li>
        <li><strong>Stray, injured or loose dog in Miami-Dade:</strong> Animal Services, <span class="num">311</span> or <span class="num">305-468-5900</span>.</li>
        <li><strong>Dog on an expressway:</strong> Florida Highway Patrol, <span class="num">*347</span> from a mobile phone.</li>
        <li><strong>Possible poisoning:</strong> ASPCA Animal Poison Control, <span class="num">(888) 426-4435</span> (a fee may apply).</li>
        <li><strong>Injured or very sick:</strong> call the nearest emergency veterinary hospital before you go.</li>
      </ul>
      <p><a class="arrow-link" href="${href('get-help/emergency/')}">Full emergency steps ${icon('arrow', { size: 18 })}</a></p>
    </section>
    <section aria-labelledby="reach-h" class="reach">
      <h2 id="reach-h" class="section-h section-h--sm">Reach us</h2>
      <ul class="reach__list">
        <li>${icon('instagram')}<div><strong>Instagram direct message</strong><br>${ext(s.social.instagram.url, esc(s.social.instagram.handle))}</div></li>
        ${emailOk ? `<li>${icon('mail')}<div><strong>Email</strong> ${needsConfirm()}<br><span class="copyable">${esc(s.contact.email)}</span> <button type="button" class="btn-link" data-copy="${esc(s.contact.email)}">Copy</button></div></li>` : ctx.mode === 'preview' ? `<li>${icon('mail')}<div><strong>Email</strong> ${needsConfirm()}<br><span class="muted">Add your public contact email in <code>content/site.json</code>.</span></div></li>` : ''}
      </ul>
      <p class="muted">${esc(s.contact.responseNote)}</p>
      ${show(sv.canHelpWithVerified) ? `<h3 class="h-sm">What we can usually help with ${sv.canHelpWithVerified ? '' : needsConfirm()}</h3><ul>${sv.canHelpWith.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      <h3 class="h-sm">Intake</h3>
      <p>${esc(sv.intakeVerified && sv.intakeStatus ? sv.intakeStatus : sv.defaultIntakeText)} ${!sv.intakeVerified ? needsConfirm() : ''}</p>
      <p class="copy-status" role="status" aria-live="polite"></p>
    </section>
  </div>
  <section class="form-wrap" aria-labelledby="msg-h">
    <h2 id="msg-h" class="section-h">Send a message</h2>
    ${form('contact')}
  </section>
  <section class="faq" aria-labelledby="faq-h">
    <h2 id="faq-h" class="section-h">Frequently asked questions</h2>
    ${data.faq.filter((f) => show(f.verified !== false)).map((f) => `<details class="acc" id="${slugify(f.q)}"><summary><span>${esc(f.q)}</span>${icon('arrow', { size: 20, cls: 'acc__chev' })}</summary><div class="acc__body prose">${md(f.a)}${f.verified === false ? needsConfirm() : ''}</div></details>`).join('')}
  </section>
</div>`;
}

export function privacy() {
  return `
<section class="page-head"><div class="wrap wrap--text">
  ${breadcrumb([['Home', ''], ['Privacy', '']])}
  <h1 class="page-h">Privacy</h1>
  <p class="page-lede">The short version: we collect as little as we can, and we use it only to help.</p>
</div></section>
<div class="wrap wrap--text prose">
  <h2>Forms</h2>
  <p>When you send a message or interest form, we receive what you type in it. We use it only to reply to you and to coordinate the help you asked about. We don't sell or share it for marketing.</p>
  <h2>The flyer builder</h2>
  <p>The flyer builder runs entirely in your browser. Your photo and details are never uploaded to us, and they're gone when you remove the photo or close the page.</p>
  <h2>Checklists</h2>
  <p>Ticks on our checklists are saved only in your own browser so you don't lose your place. Use “Clear ticks” to remove them.</p>
  ${ctx.site.analytics && ctx.site.analytics.ga4 ? `<h2>Website analytics</h2>
  <p>We use Google Analytics to understand how people find and use this site, such as which guides are read most and which pages people arrive from. It uses cookies and collects information like pages visited, approximate location (city or region), device and browser type, and how you reached the site. It doesn't tell us who you are, and we never send it anything you type into our forms or the flyer builder.</p>
  <p>Google processes this data under its own <a href="https://policies.google.com/privacy" rel="noopener">privacy policy</a>. You can opt out with your browser's cookie settings, a content blocker, or the <a href="https://tools.google.com/dlpage/gaoptout" rel="noopener">Google Analytics opt-out add-on</a>.</p>
  ` : ''}<h2>Protecting yourself</h2>
  <p>When you post about a lost or found dog, share general areas rather than your home address, and consider a separate email or text-only number. Never send money to someone you haven't verified.</p>
  ${previewNote('Have this page reviewed once your form provider is chosen, so it describes exactly what is collected.')}
</div>`;
}

export function notFound() {
  return `<section class="wrap nf">
  <img src="${asset('img/bentley-head.png')}" alt="" width="160" height="185">
  <h1 class="page-h">This page wandered off</h1>
  <p class="page-lede">We couldn't find that page. These might help:</p>
  <div class="btn-row">${button('Get Help', 'get-help/', { ic: 'search' })}${button('Resource library', 'resources/', { variant: 'ghost' })}${button('Home', '', { variant: 'ghost', ic: 'home' })}</div>
</section>`;
}
