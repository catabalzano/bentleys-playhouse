// Community Calendar: /events/ (mini month calendar + "Coming up" list, rendered by assets/js/events.js)
import { ctx, esc, href, asset, md, tag, breadcrumb, icon, apTime, apText } from './core.mjs';
import { socialButtons } from './layout.mjs';

export const EVENT_CATS = {
  spay: { label: 'Spay/neuter', color: '#FF914D', ink: '#FF914D', tint: '#FFEADC' },
  walk: { label: 'Dog walks', color: '#2F45C8', ink: '#2F45C8', tint: '#DDE4FF' },
  adopt: { label: 'Adoption', color: '#8C52FF', ink: '#6A35D6', tint: '#F0E8FF' },
  clinic: { label: 'Vaccines & chips', color: '#1B6E45', ink: '#1B6E45', tint: '#E2F4EA' },
  fund: { label: 'Fundraisers', color: '#FFBD59', ink: '#E5A23A', tint: '#FFF4DE' },
};
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function prepEvents(list) {
  const cutoff = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
  return list
    .filter((e) => e.title && /^\d{4}-\d{2}-\d{2}$/.test(String(e.date || '')) && !e.hidden && String(e.endDate || e.date) >= cutoff)
    .map((e) => ({
      slug: e.slug, title: String(e.title), date: e.date, endDate: /^\d{4}-\d{2}-\d{2}$/.test(String(e.endDate || '')) ? e.endDate : '',
      time: ((t) => t.charAt(0).toUpperCase() + t.slice(1))(apTime(e.time || '')), cat: EVENT_CATS[e.category] ? e.category : 'fund', venue: e.venue || '', city: e.city || '',
      address: e.address || '', price: e.price || '', link: e.link || '', organizer: e.organizer || '',
      desc: e.body && e.body.trim() ? md(apText(e.body)) : '',
      weekdays: Array.isArray(e.weekdays) ? e.weekdays.map(Number).filter((n) => n >= 0 && n <= 6) : [],
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
  <div class="follow">
    <p class="follow__h">Follow along and say hi:</p>
    ${socialButtons()}
  </div>
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
      <div class="ev-list__head"><h2 class="ev-list__h" data-ev-heading>Coming Up</h2><button type="button" class="ev-list__all" data-ev-all hidden>Show the whole month</button></div>
      <ul class="ev-items" role="list" data-ev-list>${upcoming.map(rowHtml).join('') || `<li class="ev-empty">No events listed yet. Check back soon.</li>`}</ul>
      <div class="ev-submit"><div class="ev-submit__text"><p class="ev-submit__h">Know about a free or low-cost dog event in South Florida?</p><p>Email us at <a href="mailto:${esc(ctx.site.contact.email)}?subject=${encodeURIComponent('Event for the Community Calendar')}">${esc(ctx.site.contact.email)}</a> and we'll add it. Event partners can <a href="${href('events/add/')}">add events with their access code</a>.</p></div><a class="btn btn--ghost" href="${href('contact/')}?topic=event">Contact form</a></div>
      <p class="ev-note">We list events run by shelters, clinics, rescues and community groups. Details can change, so please confirm with the organizer before you go.</p>
    </div>
  </div>
  <script type="application/json" id="ev-data">${JSON.stringify({ cats: EVENT_CATS, events }).replace(/</g, '\\u003c')}</script>
</div>`;
}

// ---------- "Add an event" for event partners (access code) ----------
export function eventsAddPage() {
  const forms = ctx.site.forms || {};
  const api = (() => { try { return new URL(forms.contactEndpoint).origin; } catch (e) { return ''; } })();
  const MUST = '<span class="must" aria-hidden="true">*</span>';
  const f = (id, label, input, hint = '', req = true) => `<div class="field"><label for="${id}">${label}${req ? ' ' + MUST : ' <span class="opt">(optional)</span>'}</label>${input}${hint ? `<p class="hint">${hint}</p>` : ''}</div>`;
  const t = (id, name, attrs = '', req = true) => `<input id="${id}" name="${name}" type="text"${req ? ' required' : ''} ${attrs}>`;
  return `
<section class="page-head"><div class="wrap wrap--text">
  ${breadcrumb([['Home', ''], ['Community Calendar', 'events/'], ['Add an event', '']])}
  <h1 class="page-h">Add an Event</h1>
  <p class="page-lede">For our event partners. Enter your access code, tell us about the event and we'll add it to the Community Calendar after a quick review.</p>
</div></section>
<div class="wrap wrap--text">
  <div class="form-wrap evadd" data-evadd data-api="${esc(api)}">
    <form class="form" data-evadd-code novalidate>
      <div class="form__notice">${icon('alert', { size: 22 })}<p><strong>You need an access code to add events.</strong> To request one, email us at <a href="mailto:hello@bentleysplayhouse.org?subject=${encodeURIComponent('Access code for the Community Calendar')}">hello@bentleysplayhouse.org</a>.</p></div>
      ${f('ev-code', 'Your access code', '<input id="ev-code" name="code" type="text" required maxlength="30" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="e.g. PAWS1234">')}
      <p class="form__status" data-evadd-codestatus role="status" aria-live="polite"></p>
      <div class="btn-row"><button class="btn btn--primary" type="submit">${icon('check', { size: 20 })}<span>Continue</span></button></div>
    </form>
    <form class="form" data-evadd-form hidden novalidate>
      <p class="evadd__hi" data-evadd-hi></p>
      <p class="hint">Fields marked with ${MUST} are required.</p>
      <div class="form__grid">
        ${f('ev-title', 'Event name', t('ev-title', 'title', 'maxlength="120" placeholder="e.g. Free Adoption Day"'))}
        <fieldset class="field"><legend>Kind of event ${MUST}</legend><div class="pick-row">${Object.entries(EVENT_CATS).map(([k, c]) => `<label class="pick"><input type="radio" name="category" value="${k}" required><span>${esc(c.label)}</span></label>`).join('')}</div></fieldset>
        ${f('ev-date', 'Date', '<input id="ev-date" name="date" type="date" required>')}
        ${f('ev-end', 'Last day', '<input id="ev-end" name="endDate" type="date">', 'Only if it runs several days.', false)}
        ${f('ev-time', 'Time', t('ev-time', 'time', 'maxlength="80" placeholder="e.g. 10am–2pm"'))}
        ${f('ev-price', 'Cost', t('ev-price', 'price', 'maxlength="60" placeholder="e.g. Free, $20, Reduced fees"', false), '', false)}
        ${f('ev-venue', 'Place name', t('ev-venue', 'venue', 'maxlength="120" placeholder="e.g. Tropical Park"'))}
        ${f('ev-city', 'City or neighborhood', t('ev-city', 'city', 'maxlength="80" placeholder="e.g. Coral Gables"'))}
        ${f('ev-address', 'Street address', t('ev-address', 'address', 'maxlength="200" autocomplete="off"', false), '', false)}
        ${f('ev-org', 'Hosted by', t('ev-org', 'organizer', 'maxlength="120"', false), '', false)}
        ${f('ev-link', 'Event link', '<input id="ev-link" name="link" type="text" inputmode="url" maxlength="300" placeholder="https://" autocapitalize="off" spellcheck="false">', 'Your page or post for this event.', false)}
      </div>
      ${f('ev-desc', 'Description', '<textarea id="ev-desc" name="description" required maxlength="2000" rows="5" placeholder="What is it, who is it for, what to bring"></textarea>')}
      <p class="form__status" data-evadd-status role="status" aria-live="polite"></p>
      <div class="btn-row"><button class="btn btn--primary" type="submit">${icon('calendar', { size: 20 })}<span>Send for review</span></button></div>
    </form>
    <div class="pps-done" data-evadd-done hidden tabindex="-1">
      <h2 class="section-h">Thank You!</h2>
      <p>We got your event. We'll review it and it'll show up on the <a href="${href('events/')}">Community Calendar</a> once it's approved.</p>
      <div class="btn-row"><button class="btn btn--ghost" type="button" data-evadd-again>Add another event</button></div>
    </div>
  </div>
</div>`;
}
