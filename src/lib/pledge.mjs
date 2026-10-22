// /pledge/<slug>/ — pledge drives to pull a shelter dog (Cata, Oct 22, 2026).
// Content: content/pledges/*.md (admin: 🙏 Pledges). Script: js/pledge.js. Backend: worker/src/pledges.js.
import { ctx, esc, href, icon, tag, asset } from './core.mjs';
import { turnstileKey } from './pages.mjs';
import { img } from './pages3.mjs';

export const AMOUNTS = [10, 25, 50, 100];
export const pledgeRoute = (d) => `pledge/${d.slug}/`;
const endpoint = () => { try { return new URL(ctx.site.forms.contactEndpoint).origin; } catch (e) { return ''; } };
const R = () => ` <span class="req">(${ctx.t('form.required')})</span>`;

export function prepPledges(list) {
  return list.map((d) => ({
    ...d,
    status: ['open', 'pulled', 'closed'].includes(d.status) ? d.status : 'open',
    goal: Number(String(d.goal || '').replace(/[$,]/g, '')) || 0,
    shelterLabel: [d.shelter || 'Miami-Dade Animal Services', d.shelterSite].filter(Boolean).join(' · '),
  })).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
}

/** The pup's photo as a taped polaroid, or a shelter-tag card until a photo is added. */
function polaroid(d) {
  const inner = d.photo
    ? `<img src="${img(d.photo, 'img/pledges/')}" alt="${esc(d.photoAlt || d.name)}" width="800" height="800">`
    : `<div class="pl-tag" role="img" aria-label="${esc(d.name)}, ${esc(d.animalId || '')}"><span class="pl-tag__name">${esc(d.name)}</span><span class="pl-tag__id">${esc(d.animalId || '')}</span>${icon('paw', { size: 40 })}</div>`;
  return `<figure class="pl-polaroid"><span class="pl-polaroid__tape" aria-hidden="true"></span>${inner}<figcaption>${d.status === 'pulled' ? `${esc(d.name)} is safe!` : `${esc(d.name)}, waiting for a way out`}</figcaption></figure>`;
}

function progress(d) {
  return `<div class="pl-progress" data-pl-progress${d.goal ? ` data-goal="${d.goal}"` : ''}>
    <p class="pl-progress__num"><b data-pl-total>$0</b> <span data-pl-count>pledged so far</span>${d.goal ? `<span class="pl-progress__goal">Goal $${d.goal.toLocaleString('en-US')}</span>` : ''}</p>
    ${d.goal ? `<div class="pl-bar" role="progressbar" aria-label="Pledged so far" aria-valuemin="0" aria-valuemax="${d.goal}" aria-valuenow="0"><span data-pl-bar style="width:0%"></span></div>` : ''}
  </div>`;
}

function share(d) {
  return `<div class="pl-share" data-pl-share data-title="${esc(`Pledge for ${d.name}!`)}">
    <button class="btn btn--small pl-share__copy" type="button" data-pl-copy>${icon('copy', { size: 18 })}<span>Copy link</span></button>
    <button class="btn btn--small pl-share__share" type="button" data-pl-native>${icon('share', { size: 18 })}<span>Share ${esc(d.name)}</span></button>
    <p class="pl-share__msg" role="status" aria-live="polite" data-pl-share-msg></p>
  </div>`;
}

function form(d) {
  const id = (k) => `pl-${k}`;
  return `<form class="form pl-form" data-pledge data-endpoint="${esc(endpoint())}" data-drive="${esc(d.slug)}" novalidate>
    <input type="hidden" name="drive" value="${esc(d.slug)}">
    <div class="form__grid">
      <div class="field"><label for="${id('first')}">First name${R()}</label><input id="${id('first')}" name="firstName" type="text" autocomplete="given-name" maxlength="60" required></div>
      <div class="field"><label for="${id('last')}">Last name${R()}</label><input id="${id('last')}" name="lastName" type="text" autocomplete="family-name" maxlength="60" required></div>
    </div>
    <div class="field"><label for="${id('email')}">Email${R()}</label><input id="${id('email')}" name="email" type="email" autocomplete="email" maxlength="120" required></div>
    <div class="field"><label for="${id('social')}">Instagram or other social${R()}</label><input id="${id('social')}" name="social" type="text" maxlength="100" placeholder="@yourhandle" autocomplete="off" required></div>
    <fieldset class="field app-q pl-amounts"><legend>How much would you like to pledge?${R()}</legend>
      <div class="app-chips">${AMOUNTS.map((a, i) => `<label class="app-chip"><input type="radio" name="amount" value="${a}"${i === 1 ? ' checked' : ''}><span>$${a}</span></label>`).join('')}<label class="app-chip"><input type="radio" name="amount" value="other" data-pl-other-pick><span>Other</span></label></div>
      <div class="field pl-other" data-pl-other hidden><label for="${id('other')}">Other amount</label><div class="pl-other__in"><span aria-hidden="true">$</span><input id="${id('other')}" name="amountOther" type="text" inputmode="decimal" maxlength="9" placeholder="0"></div></div>
    </fieldset>
    <div class="pl-promise">${icon('heart', { size: 22 })}<p><strong>This is a promise, not a payment.</strong> Nothing is charged today. Once ${esc(d.name)} is safe, we'll email you how to send your pledge.</p></div>
    <div class="hp" aria-hidden="true"><label for="${id('website')}">Leave this empty</label><input id="${id('website')}" name="website" type="text" tabindex="-1" autocomplete="off"></div>
    ${turnstileKey() ? `<div class="cf-turnstile" data-sitekey="${esc(turnstileKey())}" data-theme="light" data-size="flexible"></div>` : ''}
    <button class="btn btn--primary pl-submit" type="submit">${icon('heart', { size: 20 })}<span>Pledge for ${esc(d.name)}</span></button>
    <p class="form__status" role="status" aria-live="polite"></p>
    <p class="pl-fine">Bentley's Playhouse is not a 501(c)(3) nonprofit yet, so pledges aren't tax-deductible. We only use your details to contact you about ${esc(d.name)}. <a href="${href('privacy/')}">Privacy</a></p>
  </form>`;
}

function card(d) {
  const head = `<p class="pl-kicker">${d.status === 'pulled' ? 'Rescued' : `Help us pull ${({ her: 'her', them: 'them' })[d.pronoun] || 'him'}`}</p>
    <h1 class="pl-h">${d.status === 'pulled' ? `${esc(d.name)} Is Safe!` : `Pledge for ${esc(d.name)}!`}</h1>`;
  if (d.status === 'pulled') return `${head}${progress(d)}<p>Thank you to everyone who pledged. ${esc(d.name)} is out of the shelter. If you pledged, check your email for how to send it.</p>${share(d)}`;
  if (d.status === 'closed') return `${head}${progress(d)}<p>Pledges for ${esc(d.name)} are closed. Thank you so much for wanting to help!</p><p><a class="arrow-link" href="${href('pawsome-pooches/')}">Meet other pups who need help ${icon('arrow', { size: 18 })}</a></p>`;
  return `${head}${progress(d)}${form(d)}
    <div class="pl-done" data-pl-done hidden tabindex="-1">
      <h2 class="pl-done__h">Thank You for Pledging for ${esc(d.name)}!</h2>
      <p class="pl-done__amt"><span>Your pledge</span><b data-pl-mine></b></p>
      <p>We sent a copy to your email. Once ${esc(d.name)} is out, we'll write from hello@bentleysplayhouse.org with how to send it.</p>
      <p class="pl-done__note">${esc(d.name)} owes you a tail wag.</p>
    </div>`;
}

export function pledgePage(d) {
  return `
<section class="pl" data-pl data-status="${d.status}" data-drive="${esc(d.slug)}" data-stats="${esc(endpoint())}/pledge/stats?drive=${esc(d.slug)}">
  <div class="wrap pl__in">
    <div class="pl__pup">
      <p class="pl-tags">${tag(d.status === 'pulled' ? 'Pulled!' : 'Shelter pull', 'gold')}${d.animalId ? tag(esc(d.animalId), 'blue') : ''}${tag(esc(d.shelterLabel), 'blue')}</p>
      ${polaroid(d)}
      ${d.summary || d.body ? `<div class="pl-about"><h2 class="pl-about__h">About ${esc(d.name)}</h2>${d.summary ? `<p>${esc(d.summary)}</p>` : ''}${d.bodyHtml || ''}</div>` : ''}
    </div>
    <div class="pl-card">${card(d)}</div>
  </div>
</section>
${d.status === 'open' ? `<section class="pl-how" aria-labelledby="pl-how-h">
  <div class="wrap">
    <h2 id="pl-how-h" class="section-h">How Pledging Works</h2>
    <ol class="pl-steps">
      <li><span class="pl-steps__n">1</span><h3>You Pledge</h3><p>Tell us how much you can give. No card, no payment yet.</p></li>
      <li><span class="pl-steps__n">2</span><h3>We Pull ${esc(d.name)}</h3><p>Once there's enough support, we get ${esc(d.name)} out of ${esc(d.shelter || 'the shelter')}.</p></li>
      <li><span class="pl-steps__n">3</span><h3>We Email You</h3><p>You get a note from hello@bentleysplayhouse.org with your amount and how to send it.</p></li>
    </ol>
  </div>
</section>
<section class="pl-spread" aria-labelledby="pl-spread-h">
  <div class="wrap">
    <div class="pl-spread__in">
      <img class="pl-spread__art" src="${asset('img/bentley-head.png')}" alt="" width="497" height="574" loading="lazy">
      <div class="pl-spread__txt"><h2 id="pl-spread-h">Can't Pledge? Share ${esc(d.name)}!</h2><p>Every share brings in more pledges.</p></div>
      ${share(d)}
    </div>
  </div>
</section>` : ''}`;
}

/** A redirect page for other spellings of the link (Chase-A2828453 → chase-a2828453). */
export const redirectHtml = (to) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Moved</title><meta name="robots" content="noindex"><link rel="canonical" href="${to}"><meta http-equiv="refresh" content="0; url=${to}"><script>location.replace(${JSON.stringify(to)} + location.search + location.hash)</script></head><body><p><a href="${to}">Go to the pledge page.</a></p></body></html>`;
