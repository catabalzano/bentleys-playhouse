// Pawsome Pooches (weekly spotlight of adoptable dogs in the community) and "Rescues you can help".
import { ctx, esc, href, asset, md, tag, previewNote, button, breadcrumb, icon, fmtDate, paw } from './core.mjs';

// Where a dog is. Keys are what the admin stores in location.type.
export const LOCATIONS = {
  rescue: { label: 'Rescue', long: 'A local rescue', tone: 'violet' },
  'mdas-doral': { label: 'MDAS · Doral', long: 'Miami-Dade Animal Services, Pet Adoption and Protection Center (Doral)', tone: 'blue' },
  'mdas-medley': { label: 'MDAS · Medley', long: "Miami-Dade Animal Services' Medley facility (medium and large dogs)", tone: 'blue' },
  broward: { label: 'Broward shelter', long: 'Broward County Animal Care and Adoption Center', tone: 'orange' },
  family: { label: 'Family rehoming', long: 'With their family, who are looking for a safe new home', tone: 'gold' },
  foster: { label: 'In foster', long: 'In a foster home', tone: 'peach' },
  other: { label: 'Other', long: '', tone: 'gold' },
};
const FILTER_GROUPS = [['all', 'Everywhere'], ['rescue', 'Rescues'], ['mdas', 'MDAS (Doral & Medley)'], ['broward', 'Broward shelter'], ['family', 'Families rehoming'], ['foster', 'In foster']];
const locGroup = (t = 'other') => (t.startsWith('mdas') ? 'mdas' : t);

// Image paths from the admin look like "/assets/img/pawsome/x.webp"; older ones may be bare filenames.
export const img = (p, folder = 'img/pawsome/') => (!p ? '' : /^https?:/.test(p) ? p : asset(p.replace(/^\/?assets\//, '').replace(/^(?!img\/|uploads\/)/, folder)));

const yn = (v) => (v === true || v === 'yes' ? 'yes' : v === false || v === 'no' ? 'no' : v === 'some' || v === 'partial' ? 'some' : 'unknown');
const STATE_LABEL = { yes: 'Yes', no: 'No', some: 'Some', unknown: 'Ask' };

export function prepPooches(list) {
  const latest = list.map((d) => d.featuredWeek || '').sort().pop() || '';
  return list.map((d) => {
    const loc = d.location || {};
    const type = LOCATIONS[loc.type] ? loc.type : 'other';
    const photos = (d.photos || []).map((p) => (typeof p === 'string' ? p : p && p.image)).filter(Boolean);
    return { ...d, loc: { ...loc, type, group: locGroup(type), meta: LOCATIONS[type] }, photos, contact: d.contact || {},
      isNew: d.status !== 'adopted' && d.featuredWeek && d.featuredWeek === latest,
      good: { dogs: yn(d.goodWithDogs), cats: yn(d.goodWithCats), kids: yn(d.goodWithKids) } };
  }).sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || String(b.featuredWeek || '').localeCompare(String(a.featuredWeek || '')) || String(a.name).localeCompare(b.name));
}

const route = (d) => `pawsome-pooches/${d.slug}/`;
const facts = (d) => [d.breed, d.age, d.sex].filter(Boolean).map(esc).join(' · ');
const locBadge = (d) => `<span class="pp-loc pp-loc--${d.loc.meta.tone}">${icon('found', { size: 15 })}${esc(d.loc.type === 'rescue' && d.loc.name ? d.loc.name : d.loc.meta.label)}</span>`;
const sparkles = () => `<svg class="pp-sparkles" viewBox="0 0 400 120" aria-hidden="true" focusable="false"><g fill="currentColor"><path d="M30 20l3 9 9 3-9 3-3 9-3-9-9-3 9-3z"/><path d="M372 14l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/><path d="M340 92l2.5 7.5 7.5 2.5-7.5 2.5-2.5 7.5-2.5-7.5-7.5-2.5 7.5-2.5z"/><circle cx="80" cy="96" r="4"/><circle cx="300" cy="30" r="3"/></g></svg>`;

export function ppCard(d, { headingLevel = 'h3' } = {}) {
  const H = headingLevel;
  const photo = d.photos[0];
  const ribbon = d.status === 'adopted' ? `<span class="pp-stamp">Adopted!</span>` : d.status === 'pending' ? `<span class="pp-ribbon pp-ribbon--pending">Adoption pending</span>` : d.urgent ? `<span class="pp-ribbon pp-ribbon--urgent">Urgent</span>` : d.isNew ? `<span class="pp-ribbon">New this week</span>` : '';
  return `<article class="pp-card${d.status === 'adopted' ? ' pp-card--adopted' : ''}" data-pp-card data-loc="${d.loc.group}" data-needs="${esc(d.needs || 'adoption')}" data-size="${esc((d.size || '').toLowerCase())}" data-good="${Object.entries(d.good).filter(([, v]) => v === 'yes').map(([k]) => k).join(' ')}">
    <a class="pp-card__link" href="${href(route(d))}" data-pp-open="${esc(d.slug)}">
      <span class="pp-card__photo">${photo ? `<img src="${img(photo)}" alt="${esc(d.photoAlt || d.name)}" loading="lazy">` : `<span class="pp-card__nophoto">${paw()}</span>`}${ribbon}</span>
      <span class="pp-card__body">
        <${H} class="pp-card__name">${esc(d.name)}</${H}>
        <span class="pp-card__facts">${facts(d)}</span>
        <span class="pp-card__chips">${locBadge(d)}${d.needs === 'foster' ? '<span class="pp-chip">Needs a foster</span>' : d.needs === 'both' ? '<span class="pp-chip">Adopt or foster</span>' : ''}</span>
        <span class="pp-card__cta">${d.status === 'adopted' ? `Home since ${esc(fmtDate(d.adoptedDate || d.featuredWeek))}` : `Meet ${esc(d.name)}`} ${icon('arrow', { size: 18 })}</span>
      </span>
    </a>
  </article>`;
}

function contactButtons(d) {
  const c = d.contact; const out = [];
  if (c.applyUrl) out.push(button('Apply to adopt', c.applyUrl, { externalLink: true }));
  if (c.instagram) out.push(button(`Message @${esc(c.instagram.replace(/^@/, ''))}`, `https://www.instagram.com/${c.instagram.replace(/^@/, '')}/`, { variant: out.length ? 'ghost' : 'primary', ic: 'instagram', externalLink: true }));
  if (c.website) out.push(button('Website', c.website, { variant: 'ghost', ic: 'globe', externalLink: true }));
  if (c.phone) out.push(`<a class="btn btn--ghost" href="tel:${esc(c.phone.replace(/[^\d+]/g, ''))}">${icon('phone', { size: 20 })}<span>${esc(c.phone)}</span></a>`);
  if (c.email) out.push(`<a class="btn btn--ghost" href="mailto:${esc(c.email)}">${icon('mail', { size: 20 })}<span>Email</span></a>`);
  if (!out.length) {
    const t = d.loc.type;
    if (t.startsWith('mdas')) out.push(button('MDAS adoptions', ctx.mdas?.adoptionPage || 'https://www.miamidade.gov/global/animals/home.page', { externalLink: true }));
    else if (t === 'broward') out.push(button('Broward adoptable dogs', 'https://24petconnect.com/BrowardAllAnimals?at=DOG', { externalLink: true }));
    else out.push(button('Message us on Instagram', ctx.site.social.instagram.url, { ic: 'instagram', externalLink: true }));
  }
  return out.join('');
}

function howTo(d) {
  if (d.contact.instructions) return md(d.contact.instructions);
  const t = d.loc.type; const id = d.loc.animalId ? ` Bring ${esc(d.name)}'s animal ID (<strong>${esc(d.loc.animalId)}</strong>).` : '';
  if (t.startsWith('mdas')) return `<p>Visit Miami-Dade Animal Services or start on their adoption page.${id} Check MDAS for current hours before you go.</p>`;
  if (t === 'broward') return `<p>Visit Broward County Animal Care or browse their adoptable dogs online.${id}</p>`;
  if (t === 'family') return `<p>Send us a message on Instagram. We'll connect you with the family and help make sure it's a safe match.</p>`;
  return `<p>Reach out to the rescue directly using the buttons below.${id}</p>`;
}

const HEALTH = [['fixed', 'Spayed or neutered'], ['vaccinated', 'Vaccines up to date'], ['microchipped', 'Microchipped'], ['heartworm', 'Heartworm negative']];

export function ppDetail(d, { headingLevel = 'h2', standalone = false } = {}) {
  const H = headingLevel;
  const HB = H === 'h1' ? 'h2' : 'h3', HC = H === 'h1' ? 'h3' : 'h4';
  const hs = HEALTH.map(([k, label]) => [label, yn(d[k])]);
  const qf = [['Age', d.age], ['Sex', d.sex], ['Breed', d.breed], ['Size', d.size], ['Weight', d.weight], ['Energy', d.energy], ['Adoption fee', d.fee]].filter(([, v]) => v);
  const statusPill = d.status === 'adopted' ? `<span class="pp-status pp-status--adopted">Adopted${d.adoptedDate ? ' ' + esc(fmtDate(d.adoptedDate)) : ''}</span>` : d.status === 'pending' ? '<span class="pp-status">Adoption pending</span>' : `<span class="pp-status pp-status--open">${d.needs === 'foster' ? 'Needs a foster' : d.needs === 'both' ? 'Ready to adopt or foster' : 'Ready for adoption'}</span>`;
  return `<div class="pp-detail">
  <div class="pp-detail__media" data-pp-gallery>
    <div class="pp-detail__main">${d.photos[0] ? `<img src="${img(d.photos[0])}" alt="${esc(d.photoAlt || d.name)}" data-pp-main>` : `<span class="pp-card__nophoto">${paw()}</span>`}</div>
    ${d.photos.length > 1 ? `<div class="pp-thumbs" role="group" aria-label="More photos of ${esc(d.name)}">${d.photos.map((p, i) => `<button type="button" class="pp-thumb" data-src="${img(p)}" aria-pressed="${i === 0}"><img src="${img(p)}" alt="Photo ${i + 1} of ${esc(d.name)}" loading="lazy"></button>`).join('')}</div>` : ''}
  </div>
  <div class="pp-detail__info">
    <p class="pp-detail__top">${statusPill}${locBadge(d)}</p>
    <${H} class="pp-detail__name"${standalone ? '' : ` id="pp-title-${esc(d.slug)}"`}>${esc(d.name)}</${H}>
    ${d.tagline ? `<p class="pp-detail__tagline">${esc(d.tagline)}</p>` : ''}
    ${qf.length ? `<dl class="pp-facts">${qf.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
    ${(d.personality || []).length ? `<ul class="pp-tags" role="list">${d.personality.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
    <div class="pp-grid2">
      <div class="pp-box"><${HB} class="pp-box__h">Health</${HB}><ul class="pp-checks" role="list">${hs.map(([l, v]) => `<li class="is-${v}"><span class="pp-dot" aria-hidden="true">${v === 'yes' ? icon('check', { size: 14 }) : v === 'no' ? icon('x', { size: 14 }) : v === 'some' ? '½' : '?'}</span>${esc(l)}<span class="visually-hidden">: ${v === 'unknown' ? 'not known yet' : STATE_LABEL[v]}</span></li>`).join('')}</ul>${d.fixedNote ? `<p class="pp-note">${esc(d.fixedNote)}</p>` : ''}${d.medical ? `<p class="pp-note">${esc(d.medical)}</p>` : ''}</div>
      <div class="pp-box"><${HB} class="pp-box__h">Gets along with</${HB}><ul class="pp-good" role="list">${[['dogs', 'Dogs'], ['cats', 'Cats'], ['kids', 'Kids']].map(([k, l]) => `<li class="is-${d.good[k]}"><span>${l}</span><strong>${STATE_LABEL[d.good[k]]}</strong></li>`).join('')}</ul>${d.goodNote ? `<p class="pp-note">${esc(d.goodNote)}</p>` : ''}</div>
    </div>
    ${d.body && d.body.trim() ? `<div class="prose pp-story"><${HB} class="pp-box__h">${esc(d.name)}'s story</${HB}>${md(d.body)}</div>` : ''}
    <div class="pp-where pp-where--${d.loc.meta.tone}">
      <${HB} class="pp-box__h">${icon('found', { size: 18 })} Where ${d.pair ? 'they are' : esc(d.name) + ' is'}</${HB}>
      <p class="pp-where__name">${esc(d.loc.name || d.loc.meta.long || d.loc.meta.label)}</p>
      ${d.loc.name && d.loc.meta.long && d.loc.type !== 'rescue' ? `<p class="pp-where__sub">${esc(d.loc.meta.long)}</p>` : ''}
      ${[d.loc.city, d.loc.animalId && 'Animal ID ' + d.loc.animalId].filter(Boolean).length ? `<p class="pp-where__sub">${[d.loc.city, d.loc.animalId && 'Animal ID ' + d.loc.animalId].filter(Boolean).map(esc).join(' · ')}</p>` : ''}
      ${d.status !== 'adopted' ? `<div class="pp-howto"><${HC}>How to ${d.needs === 'foster' ? 'foster' : 'adopt'} ${d.pair ? 'them' : esc(d.name)}</${HC}>${howTo(d)}</div><div class="btn-row">${contactButtons(d)}</div>` : `<p class="pp-where__sub">${esc(d.name)} found a home. Thank you to everyone who shared!</p>`}
    </div>
    <div class="pp-share">
      <button type="button" class="btn btn--ghost btn--small" data-pp-share="${esc(d.slug)}" data-title="${esc(d.name)}">${icon('share', { size: 18 })}<span>Share ${esc(d.name)}</span></button>
      <span class="pp-share__status" role="status"></span>
    </div>
    <p class="pp-disclaimer">${ctx.site.name} shares community dogs to help them get seen. ${d.loc.type === 'family' ? 'We help screen and connect adopters with the family.' : `Adoptions are handled by ${esc(d.loc.name || d.loc.meta.label)}.`} Always meet the dog first and ask for vet records. Listed ${esc(fmtDate(d.featuredWeek || d.date || '2026-10-06'))}.</p>
  </div>
</div>`;
}

// ---------- homepage section ----------
export function pawsomeHome(pooches) {
  const live = pooches.filter((d) => d.status !== 'adopted');
  const adopted = pooches.filter((d) => d.status === 'adopted').length;
  const week = live.map((d) => d.featuredWeek).filter(Boolean).sort().pop();
  return `
<section class="pawsome" aria-labelledby="pawsome-h">
  ${sparkles()}
  <div class="wrap">
    <div class="pawsome__head">
      <div>
        <p class="pawsome__kicker">${paw()} Community spotlight ${week ? `· week of ${esc(fmtDate(week))}` : ''}</p>
        <h2 id="pawsome-h" class="pawsome__title">Pawsome <span>Pooches</span></h2>
        <p class="pawsome__lede">Every week we spotlight dogs in our community who need a home: at Miami-Dade Animal Services, the Broward shelter, local rescues, and families who need to rehome safely. Tap a pup to meet them.</p>
      </div>
      <div class="pawsome__stats" aria-label="This week at a glance">
        <p><strong>${live.length}</strong><span>${live.length === 1 ? 'listing' : 'listings'} this week</span></p>
        <p><strong>${adopted}</strong><span>happy ${adopted === 1 ? 'tail' : 'tails'}</span></p>
      </div>
    </div>
    <div class="pp-rail" data-pp-rail>
      <div class="pp-rail__track" tabindex="0" aria-label="Pawsome Pooches this week">
        ${live.map((d) => ppCard(d)).join('')}
        <article class="pp-card pp-card--submit"><a class="pp-card__link" href="${href('pawsome-pooches/#submit')}"><span class="pp-card__body"><span class="pp-submit__icon">${paw()}</span><span class="pp-card__name">Know a pup who needs a spotlight?</span><span class="pp-card__facts">Rescues, shelters and families can send us a dog to feature.</span><span class="pp-card__cta">How to submit ${icon('arrow', { size: 18 })}</span></span></a></article>
      </div>
      <div class="pp-rail__nav"><button type="button" class="pp-rail__btn" data-pp-prev aria-label="Previous dogs">${icon('arrow', { size: 20 })}</button><button type="button" class="pp-rail__btn" data-pp-next aria-label="More dogs">${icon('arrow', { size: 20 })}</button></div>
    </div>
    <p class="pawsome__more">${button('See all Pawsome Pooches', 'pawsome-pooches/', { variant: 'primary', ic: 'paw' })}</p>
  </div>
  ${templates(live)}
  ${dialogShell()}
</section>`;
}

const templates = (list) => list.map((d) => `<template id="pp-tpl-${esc(d.slug)}">${ppDetail(d, { headingLevel: 'h2' })}</template>`).join('');
const dialogShell = () => `<dialog class="pp-dialog" data-pp-dialog aria-labelledby=""><button type="button" class="pp-dialog__close" data-pp-close aria-label="Close">${icon('x')}</button><div class="pp-dialog__body" data-pp-body></div></dialog>`;

// ---------- full page ----------
export function pawsomePage(pooches) {
  const live = pooches.filter((d) => d.status !== 'adopted');
  const adopted = pooches.filter((d) => d.status === 'adopted').sort((a, b) => String(b.adoptedDate || '').localeCompare(String(a.adoptedDate || '')));
  const week = live.map((d) => d.featuredWeek).filter(Boolean).sort().pop();
  const counts = Object.fromEntries(FILTER_GROUPS.map(([k]) => [k, k === 'all' ? live.length : live.filter((d) => d.loc.group === k).length]));
  return `
<section class="page-head pawsome-head">
  ${sparkles()}
  <div class="wrap">
    ${breadcrumb([['Home', ''], ['Pawsome Pooches', '']])}
    <p class="pawsome__kicker">${paw()} Updated weekly ${week ? `· week of ${esc(fmtDate(week))}` : ''}</p>
    <h1 class="pawsome__title pawsome__title--page">Pawsome <span>Pooches</span></h1>
    <p class="page-lede">Every week we feature dogs who are ready for adoption or foster in our community: at Miami-Dade Animal Services in Doral and Medley, the Broward County shelter, local rescues doing the work every day, and families who need to rehome safely.</p>
    <div class="pawsome__stats pawsome__stats--page">
      <p><strong>${live.length}</strong><span>${live.length === 1 ? 'pup' : 'pups'} looking</span></p>
      <p><strong>${new Set(live.map((d) => d.loc.name || d.loc.type)).size}</strong><span>${new Set(live.map((d) => d.loc.name || d.loc.type)).size === 1 ? 'place' : 'places'}</span></p>
      <p><strong>${adopted.length}</strong><span>happy ${adopted.length === 1 ? 'tail' : 'tails'}</span></p>
    </div>
  </div>
</section>
<div class="wrap pawsome-page" data-pp-page>
  <div class="pp-filters" role="group" aria-label="Filter dogs">
    <div class="pp-filters__row"><span class="pp-filters__label">Where</span>${FILTER_GROUPS.filter(([k]) => k === 'all' || counts[k]).map(([k, l]) => `<button type="button" class="chip" data-pp-loc="${k}" aria-pressed="${k === 'all'}">${l} <span class="chip__n">${counts[k]}</span></button>`).join('')}</div>
    <div class="pp-filters__row"><span class="pp-filters__label">Looking for</span><button type="button" class="chip" data-pp-need="adopt" aria-pressed="false">Adopters</button><button type="button" class="chip" data-pp-need="foster" aria-pressed="false">Fosters</button>
    <span class="pp-filters__label">Good with</span>${['kids', 'dogs', 'cats'].map((k) => `<button type="button" class="chip" data-pp-good="${k}" aria-pressed="false">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div>
    <p class="pp-count" role="status"><span data-pp-count>${live.length}</span> shown</p>
  </div>
  <div class="pp-grid" data-pp-grid>${live.map((d) => ppCard(d, { headingLevel: 'h2' })).join('')}</div>
  <p class="pp-empty" data-pp-empty hidden>No pups match those filters this week. Try fewer filters.</p>

  ${adopted.length ? `<section class="pp-happy" aria-labelledby="happy-h"><h2 id="happy-h" class="section-h">Happy tails</h2><p>Featured here, and now home. Thank you for sharing!</p><div class="pp-grid pp-grid--happy">${adopted.map((d) => ppCard(d)).join('')}</div></section>` : ''}

  <section class="pp-submit" id="submit" aria-labelledby="submit-h">
    <div><h2 id="submit-h" class="section-h">Know a pup who needs a spotlight?</h2>
    <p>Rescues, shelter volunteers and families can send us a dog to feature. Send a DM to <a href="${esc(ctx.site.social.instagram.url)}" target="_blank" rel="noopener">@bentleysplayhouse<span class="visually-hidden"> (opens in a new tab)</span></a> with clear photos, the dog's age, sex, breed, spay/neuter and vaccine status, how they do with dogs, cats and kids, and where they are.</p>
    <p>Want to meet more adoptable pets? Follow <a href="https://www.instagram.com/adoptmiamipets/" target="_blank" rel="noopener">@adoptmiamipets<span class="visually-hidden"> (opens in a new tab)</span></a> for Miami-Dade Animal Services and see <a href="${href('rescues-you-can-help/')}">rescues you can help</a>.</p></div>
    <div class="btn-row">${button('Send us a dog on Instagram', ctx.site.social.instagram.url, { ic: 'instagram', externalLink: true })}${button('Thinking of rehoming? Read this first', 'resources/rehoming-a-dog-safely/', { variant: 'ghost' })}</div>
  </section>
  ${!pooches.length ? previewNote('Add dogs in the admin (/admin) under Pawsome Pooches.') : ''}
</div>
${templates(pooches)}
${dialogShell()}`;
}

export function pawsomeDogPage(d) {
  return `
<div class="wrap pp-standalone">
  ${breadcrumb([['Home', ''], ['Pawsome Pooches', 'pawsome-pooches/'], [d.name, '']])}
  ${ppDetail(d, { headingLevel: 'h1', standalone: true })}
  <p class="pp-back"><a class="arrow-link" href="${href('pawsome-pooches/')}">Meet more Pawsome Pooches ${icon('arrow', { size: 18 })}</a></p>
</div>`;
}

// ---------- rescues you can help ----------
const NEEDS = { fosters: 'Foster homes', adopters: 'Adopters', volunteers: 'Volunteers', supplies: 'Supplies', donations: 'Donations', transport: 'Transport', sharing: 'Shares on social' };
export function rescueCard(r) {
  const ig = r.instagram && r.instagram.replace(/^@/, '');
  return `<article class="rescue-card">
    <div class="rescue-card__head">${r.logo ? `<img class="rescue-card__logo" src="${img(r.logo, 'img/rescues/')}" alt="" loading="lazy">` : `<span class="rescue-card__logo rescue-card__logo--paw">${paw()}</span>`}
      <div><h2 class="rescue-card__name">${esc(r.name)}</h2>${r.area ? `<p class="rescue-card__area">${esc(r.area)}</p>` : ''}</div></div>
    ${r.summary ? `<p>${esc(r.summary)}</p>` : ''}
    ${(r.needs || []).length ? `<p class="rescue-card__needs"><span class="visually-hidden">They need: </span>${r.needs.map((n) => `<span class="pp-chip">${esc(NEEDS[n] || n)}</span>`).join('')}</p>` : ''}
    ${r.body && r.body.trim() ? `<div class="prose rescue-card__how">${md(r.body)}</div>` : '<p class="muted">See their page for what they need right now.</p>'}
    <div class="rescue-card__links">
      ${ig ? `<a href="https://www.instagram.com/${esc(ig)}/" target="_blank" rel="noopener">${icon('instagram', { size: 18 })} @${esc(ig)}<span class="visually-hidden"> (opens in a new tab)</span></a>` : ''}
      ${r.website ? `<a href="${esc(r.website)}" target="_blank" rel="noopener">${icon('globe', { size: 18 })} Website<span class="visually-hidden"> (opens in a new tab)</span></a>` : ''}
      ${r.wishlist ? `<a href="${esc(r.wishlist)}" target="_blank" rel="noopener">${icon('gift', { size: 18 })} Wishlist<span class="visually-hidden"> (opens in a new tab)</span></a>` : ''}
      ${r.donate ? `<a href="${esc(r.donate)}" target="_blank" rel="noopener">${icon('heart', { size: 18 })} Donate<span class="visually-hidden"> (opens in a new tab)</span></a>` : ''}
    </div>
  </article>`;
}
export function rescuesPage(rescues) {
  return `
<section class="page-head"><div class="wrap wrap--text">
  ${breadcrumb([['Home', ''], ['Get Involved', 'get-involved/'], ['Rescues you can help', '']])}
  <p class="eyebrow">${tag('Miami-Dade', 'violet')}</p>
  <h1 class="page-h">Rescues you can help</h1>
  <p class="page-lede">These rescues and shelters are in the trenches every day. Following, sharing, fostering, volunteering or sending supplies all make a real difference.</p>
</div></section>
<div class="wrap">
  <div class="rescue-grid">${rescues.map(rescueCard).join('')}</div>
  ${!rescues.length ? previewNote('Add rescues in the admin (/admin) under Rescues you can help.') : ''}
  <p class="pp-back"><a class="arrow-link" href="${href('pawsome-pooches/')}">See their dogs in Pawsome Pooches ${icon('arrow', { size: 18 })}</a></p>
</div>`;
}
