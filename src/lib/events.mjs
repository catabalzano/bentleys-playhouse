// Community Calendar: /events/ (mini month calendar + "Coming up" list, rendered by assets/js/events.js)
import { ctx, esc, href, asset, md, tag, breadcrumb, icon } from './core.mjs';

export const EVENT_CATS = {
  spay: { label: 'Spay/neuter', color: '#FF914D', ink: '#B4500F', tint: '#FFEADC' },
  walk: { label: 'Dog walks', color: '#2F45C8', ink: '#2F45C8', tint: '#DDE4FF' },
  adopt: { label: 'Adoption', color: '#8C52FF', ink: '#6A35D6', tint: '#F0E8FF' },
  clinic: { label: 'Vaccines & chips', color: '#1B6E45', ink: '#1B6E45', tint: '#E2F4EA' },
  fund: { label: 'Fundraisers', color: '#C2560D', ink: '#A94A0B', tint: '#FFF3DC' },
};
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function prepEvents(list) {
  const cutoff = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
  return list
    .filter((e) => e.title && /^\d{4}-\d{2}-\d{2}$/.test(String(e.date || '')) && !e.hidden && String(e.endDate || e.date) >= cutoff)
    .map((e) => ({
      slug: e.slug, title: String(e.title), date: e.date, endDate: /^\d{4}-\d{2}-\d{2}$/.test(String(e.endDate || '')) ? e.endDate : '',
      time: e.time || '', cat: EVENT_CATS[e.category] ? e.category : 'fund', venue: e.venue || '', city: e.city || '',
      address: e.address || '', price: e.price || '', link: e.link || '', organizer: e.organizer || '',
      desc: e.body && e.body.trim() ? md(e.body) : '',
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
}

function rowHtml(e) {
  const d = new Date(e.date + 'T12:00:00');
  const c = EVENT_CATS[e.cat];
  return `<li class="ev-item" style="--c:${c.color};--ink:${c.ink}"><div class="ev-item__date"><span>${DOW[d.getDay()]}</span><b>${d.getDate()}</b><span>${MON[d.getMonth()]}</span></div><div class="ev-item__bar"></div><div class="ev-item__body"><h3 class="ev-item__h">${esc(e.title)}</h3><p class="ev-item__meta">${[e.time, e.city || e.venue].filter(Boolean).map(esc).join(' · ')}${e.price ? ` · <b class="${/^free/i.test(e.price) ? 'is-free' : ''}">${esc(e.price)}</b>` : ''}</p></div></li>`;
}

export function eventsPage(events) {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => (e.endDate || e.date) >= today).slice(0, 12);
  const cats = Object.entries(EVENT_CATS);
  return `
<section class="page-head has-cover"><div class="wrap page-head__split"><div class="page-head__text">
  ${breadcrumb([['Home', ''], ['Community Calendar', '']])}
  <p class="eyebrow">${tag('South Florida', 'violet')}</p>
  <h1 class="page-h">Community Calendar</h1>
  <p class="page-lede">Free and low-cost dog events across Miami-Dade and Broward: spay/neuter clinics, vaccine days, adoption events and dog walks.</p>
</div><figure class="arch-cover"><img src="${asset('img/covers/events.jpg')}" alt="A happy white golden retriever sitting in tall green grass with its tongue out" width="800" height="880" fetchpriority="high"></figure></div></section>
<div class="wrap">
  <div class="ev" data-events>
    <aside class="ev-cal" aria-label="Calendar">
      <div class="ev-cal__top"><h2 class="ev-cal__month" data-ev-month aria-live="polite">&nbsp;</h2><div class="ev-cal__nav"><button type="button" class="ev-cal__btn" data-ev-prev aria-label="Previous month">${icon('arrow', { size: 16 })}</button><button type="button" class="ev-cal__btn" data-ev-next aria-label="Next month">${icon('arrow', { size: 16 })}</button></div></div>
      <div class="ev-cal__dow" aria-hidden="true">${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((x) => `<span>${x}</span>`).join('')}</div>
      <div class="ev-cal__grid" data-ev-grid></div>
      <fieldset class="ev-filters"><legend class="visually-hidden">Show these kinds of events</legend>
        ${cats.map(([k, c]) => `<label class="ev-filter" style="--c:${c.color}"><input type="checkbox" value="${k}" checked data-ev-cat><span class="ev-filter__box" aria-hidden="true">${icon('check', { size: 12 })}</span>${esc(c.label)}</label>`).join('')}
      </fieldset>
    </aside>
    <div class="ev-list">
      <div class="ev-list__head"><h2 class="ev-list__h" data-ev-heading>Coming up</h2><button type="button" class="ev-list__all" data-ev-all hidden>Show the whole month</button></div>
      <ul class="ev-items" role="list" data-ev-list>${upcoming.map(rowHtml).join('') || `<li class="ev-empty">No events listed yet. Check back soon.</li>`}</ul>
      <div class="ev-submit"><p><b>Know about a free or low-cost dog event in South Florida?</b> Email it to <a href="mailto:${esc(ctx.site.contact.email)}">${esc(ctx.site.contact.email)}</a> and we'll add it.</p><a class="btn btn--ghost" href="mailto:${esc(ctx.site.contact.email)}?subject=${encodeURIComponent('Event for the Community Calendar')}">Email us an event</a></div>
      <p class="ev-note">We list events run by shelters, clinics, rescues and community groups. Details can change, so please confirm with the organizer before you go.</p>
    </div>
  </div>
  <script type="application/json" id="ev-data">${JSON.stringify({ cats: EVENT_CATS, events }).replace(/</g, '\\u003c')}</script>
</div>`;
}
