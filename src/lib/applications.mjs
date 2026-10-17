// /applications/adoption/ and /applications/foster/ (Cata, Oct 17, 2026).
// The questions live in worker/src/app-forms.js so the page and the backend always agree.
import { ctx, esc, href, icon, breadcrumb } from './core.mjs';
import { turnstileKey } from './pages.mjs';
import { APP_FORMS } from '../../worker/src/app-forms.js';

export { APP_FORMS };
const endpoint = (id) => { try { return new URL(ctx.site.forms.contactEndpoint).origin + '/apply?form=' + id; } catch (e) { return ''; } };

function field(form, fd) {
  const id = `${form.id}-${fd.id}`;
  const req = fd.req ? ` <span class="req">(${ctx.t('form.required')})</span>` : '';
  const hint = fd.hint ? `<p class="hint" id="${id}-h">${esc(fd.hint)}</p>` : '';
  const desc = fd.hint ? ` aria-describedby="${id}-h"` : '';
  const R = fd.req ? ' required' : '';
  const cls = `field${fd.half ? '' : ' field--wide'}`;
  if (fd.type === 'radio' || fd.type === 'checks') {
    const t = fd.type === 'radio' ? 'radio' : 'checkbox';
    return `<fieldset class="${cls} app-q" data-group="${fd.id}"${fd.req ? ' data-req' : ''}${desc}><legend>${esc(fd.label)}${req}${fd.type === 'checks' ? ' <span class="opt">(choose any)</span>' : ''}</legend>${hint}
      <div class="app-chips">${fd.opts.map((o, i) => `<label class="app-chip"><input type="${t}" name="${fd.id}" value="${esc(o)}" id="${id}-${i}"><span>${esc(o)}</span></label>`).join('')}</div></fieldset>`;
  }
  if (fd.type === 'agree') return `<div class="check-line app-agree field--wide"><input type="checkbox" id="${id}" name="${fd.id}" value="yes"${R}><label for="${id}">${esc(fd.label)}${req}</label></div>`;
  if (fd.type === 'initials') return `<div class="app-initial field--wide"><p class="app-initial__txt" id="${id}-t">${esc(fd.label)}</p><label class="app-initial__box" for="${id}"><span>Initials</span><input id="${id}" name="${fd.id}" type="text" maxlength="5" autocomplete="off" autocapitalize="characters"${R} aria-describedby="${id}-t"></label></div>`;
  const auto = fd.auto ? ` autocomplete="${fd.auto}"` : ' autocomplete="off"';
  const input = fd.type === 'textarea'
    ? `<textarea id="${id}" name="${fd.id}" rows="${fd.rows || 3}" maxlength="3000"${R}${desc}${auto}></textarea>`
    : `<input id="${id}" name="${fd.id}" type="${fd.type === 'number' ? 'text' : fd.type}"${fd.type === 'number' ? ' inputmode="numeric"' : ''} maxlength="${fd.type === 'text' ? 300 : 120}"${R}${desc}${auto}${fd.today ? ' data-today' : ''}${fd.sign ? ' class="app-sign"' : ''}${fd.id === 'pet' ? ' data-pet' : ''}>`;
  return `<div class="${cls}"><label for="${id}">${esc(fd.label)}${req}</label>${hint}${input}</div>`;
}

export function applicationPage(kind) {
  const form = APP_FORMS[kind];
  const s = ctx.site;
  const ep = endpoint(kind);
  const other = APP_FORMS[kind === 'adoption' ? 'foster' : 'adoption'];
  return `
<section class="page-head page-head--apply"><div class="wrap wrap--text">
  ${breadcrumb([['Home', ''], ['Adopt & Foster', 'adopt-foster/'], [form.title, '']])}
  <h1 class="page-h">${esc(form.title)}</h1>
  <p class="page-lede">${esc(form.lede)}</p>
  <p class="app-note">${icon('clock', { size: 18 })} ${esc(form.note)}</p>
</div></section>
<div class="wrap wrap--text app-wrap">
  <form class="form app-form" data-app="${kind}" ${ep ? `data-endpoint="${esc(ep)}"` : 'data-disconnected'} novalidate>
    <nav class="app-steps" aria-label="Sections of this application"><ol>${form.sections.map((sec, i) => `<li><a href="#${kind}-s${i}">${esc(sec.h)}</a></li>`).join('')}</ol></nav>
    ${form.sections.map((sec, i) => `<section class="app-sec" id="${kind}-s${i}" aria-labelledby="${kind}-s${i}-h">
      <h2 class="app-sec__h" id="${kind}-s${i}-h"><span class="app-sec__n">${i + 1}</span>${esc(sec.h)}</h2>
      ${sec.note ? `<p class="app-sec__note">${esc(sec.note)}</p>` : ''}
      <div class="form__grid">${sec.fields.map((fd) => field(form, fd)).join('')}</div>
    </section>`).join('')}
    <section class="app-sec app-sec--send" aria-label="Send your application">
      <div class="hp" aria-hidden="true"><label for="${kind}-website">Leave this empty</label><input id="${kind}-website" name="website" type="text" tabindex="-1" autocomplete="off"></div>
      <div class="check-line"><input type="checkbox" id="${kind}-consent" name="consent" required><label for="${kind}-consent">I'm OK with ${esc(s.name)} using these details to review my application and contact me about it. <a href="${href('privacy/')}">Privacy</a> <span class="req">(${ctx.t('form.required')})</span></label></div>
      ${turnstileKey() ? `<div class="cf-turnstile" data-sitekey="${esc(turnstileKey())}" data-theme="light" data-size="flexible"></div>` : ''}
      <div class="form__actions"><button class="btn btn--primary" type="submit"${ep ? '' : ' disabled aria-disabled="true"'}>${icon('paw', { size: 20 })}<span>Send my application</span></button></div>
      <p class="form__status" role="status" aria-live="polite"></p>
    </section>
  </form>
  <div class="app-done" data-app-done hidden tabindex="-1">
    <h2 class="section-h">Thank You! We Got Your Application.</h2>
    <p>We read every application ourselves and will get back to you within a few days. We also sent a copy of this note to your email.</p>
    ${kind === 'foster' ? `<p>If you haven't yet, please email photos of your home and a photo of your driver's license to <strong>hello@bentleysplayhouse.org</strong>.</p>` : ''}
    <p><a class="arrow-link" href="${href('pawsome-pooches/')}">Meet the Pawsome Pooches ${icon('arrow', { size: 18 })}</a></p>
  </div>
  <p class="app-other muted">Looking for the ${esc(other.short.toLowerCase())}? <a href="${href(other.route)}">Go to the ${esc(other.title)}</a>.</p>
</div>`;
}
