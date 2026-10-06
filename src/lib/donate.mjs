// Donate pop-up ("gift card") and the same block on the Donate page.
// Amounts + "where it goes" come from content/site.json → donate.tiers; payment options from donate.methods.
import { ctx, esc, href, asset, icon } from './core.mjs';

const NOTE = "Donation to Bentley's Playhouse";
const TEMPLATES = {
  paypal: (h) => ({ base: `https://paypal.me/${h}`, tpl: `https://paypal.me/${h}/{amount}USD` }),
  venmo: (h) => ({ base: `https://venmo.com/${h}?txn=pay&note=${encodeURIComponent(NOTE)}`, tpl: `https://venmo.com/${h}?txn=pay&amount={amount}&note=${encodeURIComponent(NOTE)}` }),
  cashapp: (h) => ({ base: `https://cash.app/$${h.replace(/^\$/, '')}`, tpl: `https://cash.app/$${h.replace(/^\$/, '')}/{amount}` }),
};

/** Payment options that may appear: verified ones on the live site, all of them in preview. */
export function donateMethods() {
  const d = ctx.site.donate;
  return (d.methods || []).filter((m) => ctx.mode === 'preview' || (m.verified && (m.url || m.handle)));
}
export function donateReady() {
  const d = ctx.site.donate;
  return !!((d.verified && d.url) || (d.methods || []).some((m) => m.verified && (m.url || m.handle)));
}
export const donateVisible = () => donateReady() || ctx.mode === 'preview';

function linkFor(m) {
  const h = (m.handle || '').trim().replace(/^@/, '');
  if (m.url) return { base: m.url, tpl: m.amountUrl || m.url };
  if (h && TEMPLATES[m.type]) return TEMPLATES[m.type](h);
  return { base: '#', tpl: '#' };
}

/** The gift block. `inDialog` adds the close button and dialog heading id. */
export function giftBlock({ inDialog = false } = {}) {
  const d = ctx.site.donate;
  const tiers = d.tiers || [];
  const def = tiers.find((t) => t.default) || tiers[0] || {};
  const methods = donateMethods();
  const links = methods.filter((m) => m.type !== 'zelle');
  const primary = links.find((m) => m.primary) || links[0];
  const amt = def.amount || '';
  const fill = (l) => (amt ? l.tpl.replace('{amount}', amt) : l.base);
  const goLabel = (m) => `Donate${amt ? ` $${amt}` : ''}${m ? ` with ${esc(m.name)}` : ''}`;
  const pid = inDialog ? 'gift-title' : 'gift-title-page';
  const tierHtml = tiers.map((t) => `<button type="button" class="gift-tier" role="radio" aria-checked="${t === def}" data-amount="${esc(t.amount || '')}">
      <b class="gift-tier__amt">${t.amount ? `$${esc(t.amount)}` : 'Any'}</b><span class="gift-tier__what"><span aria-hidden="true">${esc(t.emoji || '')}</span> ${esc(t.label)}</span></button>`).join('');
  const payHtml = methods.filter((m) => m !== primary).map((m) => {
    const h = (m.handle || '').trim(); const sub = h ? esc(m.type === 'venmo' ? '@' + h.replace(/^@/, '') : m.type === 'cashapp' ? '$' + h.replace(/^\$/, '') : h) : '<em>handle needed</em>';
    if (m.type === 'zelle') return `<button type="button" class="gift-pay" data-copy="${esc(m.handle || '')}"><b>${esc(m.name)}</b><span>${sub} · Copy</span></button>`;
    const l = linkFor(m);
    return `<a class="gift-pay" href="${esc(fill(l))}" data-pay-tpl="${esc(l.tpl)}" data-pay-base="${esc(l.base)}" target="_blank" rel="noopener"><b>${esc(m.name)}</b><span>${sub}</span></a>`;
  }).join('');
  const pl = primary ? linkFor(primary) : null;
  return `<div class="gift" data-gift>
  ${inDialog ? `<button type="button" class="gift__x" data-donate-close aria-label="Close">${icon('x', { size: 20 })}</button>` : ''}
  <div class="gift__badge"><img src="${asset('img/logo-badge.png')}" alt="" width="120" height="119"></div>
  <h2 class="gift__h" id="${pid}">Help a pup today</h2>
  <p class="gift__sub">Pick an amount to see where your gift goes.</p>
  <div class="gift__tiers" role="radiogroup" aria-labelledby="${pid}">${tierHtml}</div>
  ${primary
    ? `<a class="gift__go" data-gift-go data-pay-tpl="${esc(pl.tpl)}" data-pay-base="${esc(pl.base)}" data-name="${esc(primary.name)}" href="${esc(fill(pl))}" target="_blank" rel="noopener">${icon('heart', { size: 20 })}<span data-gift-label>${goLabel(primary)}</span></a>`
    : `<span class="gift__go" aria-disabled="true">${icon('heart', { size: 20 })}<span>Donate</span></span>`}
  ${payHtml ? `<p class="gift__or">or send it with</p><div class="gift__pay">${payHtml}</div>` : ''}
  ${ctx.mode === 'preview' && !donateReady() ? `<p class="preview-note">Preview only: add your Venmo, PayPal, Zelle and Cash App handles in <code>content/site.json → donate.methods</code> and set <code>verified: true</code>. The Donate button then appears on the live site.</p>` : ''}
  <div class="gift__foot"><span>${icon('paw', { size: 16 })} 100% volunteer-run. We share every expense.</span><a href="${href('transparency/')}">Where the money goes →</a></div>
</div>`;
}

export function donateDialog() {
  if (!donateVisible()) return '';
  return `<dialog class="gift-dialog" data-donate-dialog aria-labelledby="gift-title">${giftBlock({ inDialog: true })}</dialog>`;
}
