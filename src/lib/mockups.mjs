// Design options shown to Cata on the live site (noindex, not in the sitemap). Delete once a choice is made.
import { ctx, asset, icon } from './core.mjs';

export function adoptMobileMockups() {
  const s = ctx.site;
  const rm = s.social.rescueme.url;
  const mdas = '/adopt-foster/#mdas';
  const broward = 'https://24petconnect.com/BrowardAllAnimals?at=DOG';
  const westie = asset('img/adopt-westie.png');
  const h = 'Looking for a dog to adopt?';
  const p = 'Profiles of our current dogs will live here. For now, our adoptable dogs are listed on RescueMe, and our day-to-day rescue work is on Instagram.';
  const ext = ' target="_blank" rel="noopener"';
  const primary = `<a class="btn btn--primary mk-full" href="${rm}"${ext}><span>See our RescueMe listings</span></a>`;
  const opt = (id, name, note, body) => `
<section class="mk" aria-label="Option ${id}">
  <p class="mk__label"><b>Option ${id}</b> · ${name}</p>
  <p class="mk__note">${note}</p>
  <div class="mk__phone">${body}</div>
</section>`;
  return `
<style>
.mockups { padding-block: 2rem 4rem; }
.mockups__intro { max-width: 430px; margin: 0 auto 2rem; }
.mk { max-width: 430px; margin: 0 auto 3rem; }
.mk__label { font-size: 1.15rem; margin: 0 0 .2rem; }
.mk__note { color: var(--muted); margin: 0 0 1rem; font-size: .95rem; }
.mk__phone { background: var(--bg, #F3F5FF); border-radius: 28px; padding: 18px 16px; box-shadow: 0 0 0 2px var(--line); }
.mk .box { background: var(--tint-violet); border-radius: var(--r-lg); padding: 1.6rem 1.3rem; }
.mk h2 { font-size: 1.85rem; margin: 0 0 .6rem; line-height: 1.12; }
.mk p.mk-p { margin: 0 0 1.25rem; }
.mk .mk-full { display: flex; width: 100%; justify-content: center; }
/* A */
.mkA .box { text-align: center; }
.mkA img { display: block; width: 130px; height: auto; margin: 0 auto .8rem; }
.mkA .btn + .btn { margin-top: .75rem; }
/* B */
.mkB .box { position: relative; margin-top: 70px; padding-top: 1.4rem; }
.mkB img { position: absolute; right: 14px; top: -78px; width: 104px; height: auto; }
.mkB h2 { padding-right: 96px; }
.mk-list { list-style: none; margin: 1rem 0 0; padding: 0; background: var(--paper); border-radius: var(--r-md); overflow: hidden; }
.mk-list li + li { border-top: 1.5px solid var(--line); }
.mk-list a { display: flex; align-items: center; justify-content: space-between; gap: .75rem; padding: .95rem 1.1rem; color: var(--ink); font-weight: 700; text-decoration: none; }
.mk-list a span.go { color: var(--link); flex: none; }
.mk-list small { display: block; font-weight: 500; color: var(--muted); font-size: .85rem; }
/* C */
.mkC .head { display: flex; align-items: center; gap: .9rem; margin-bottom: .8rem; }
.mkC .head img { width: 84px; height: auto; flex: none; }
.mkC h2 { margin: 0; font-size: 1.6rem; }
.mk-sub { font-size: .78rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); margin: 1.4rem 0 .5rem; }
/* D */
.mkD .box { text-align: center; }
.mkD img { display: block; width: 120px; height: auto; margin: 0 auto .6rem; }
.mk-tiles { display: grid; grid-template-columns: 1fr 1fr; gap: .7rem; margin-top: .8rem; text-align: left; }
.mk-tile { display: flex; flex-direction: column; justify-content: space-between; gap: .6rem; min-height: 112px; padding: .9rem; border-radius: var(--r-md); background: var(--paper); border: 2px solid var(--line); color: var(--ink); text-decoration: none; }
.mk-tile b { font-size: .98rem; line-height: 1.25; }
.mk-tile small { color: var(--muted); font-size: .8rem; display: block; font-weight: 600; }
.mk-tile .go { color: var(--link); display: inline-flex; align-items: center; gap: .3rem; font-weight: 800; font-size: .88rem; }
</style>
<section class="mockups"><div class="wrap">
  <div class="mockups__intro">
    <h1 class="section-h">"Looking for a dog to adopt?" on phones</h1>
    <p>Four options for the mobile layout only. The desktop version stays as it is. Tell Claude which letter you like.</p>
  </div>
  ${opt('A', 'Centered and stacked', 'Westie centered on top, everything centered, three full-width buttons of equal width.', `
    <div class="mkA"><div class="box">
      <img src="${westie}" alt="" width="160" height="220">
      <h2>${h}</h2><p class="mk-p">${p}</p>
      ${primary}
      <a class="btn btn--ghost mk-full" href="${mdas}"><span>Dogs at Miami-Dade Animal Services</span></a>
      <a class="btn btn--ghost mk-full" href="${broward}"${ext}><span>Dogs at Broward County Animal Care</span></a>
    </div></div>`)}
  ${opt('B', 'Peeking Westie + shelter list', 'The Westie sits on top of the card’s corner. One main button, and the two shelters as a clean tap-list instead of more big buttons.', `
    <div class="mkB"><div class="box">
      <img src="${westie}" alt="" width="160" height="220">
      <h2>${h}</h2><p class="mk-p">${p}</p>
      ${primary}
      <ul class="mk-list">
        <li><a href="${mdas}"><span>Miami-Dade Animal Services<small>Doral and Medley shelters</small></span><span class="go">${icon('arrow', { size: 20 })}</span></a></li>
        <li><a href="${broward}"${ext}><span>Broward County Animal Care<small>Fort Lauderdale shelter</small></span><span class="go">${icon('external', { size: 18 })}</span></a></li>
      </ul>
    </div></div>`)}
  ${opt('C', 'Compact header', 'Smaller Westie next to the title so the card is shorter. Shelters grouped under a small “More dogs nearby” label.', `
    <div class="mkC"><div class="box">
      <div class="head"><img src="${westie}" alt="" width="160" height="220"><h2>${h}</h2></div>
      <p class="mk-p">${p}</p>
      ${primary}
      <p class="mk-sub">More dogs nearby</p>
      <ul class="mk-list">
        <li><a href="${mdas}"><span>Miami-Dade Animal Services</span><span class="go">${icon('arrow', { size: 20 })}</span></a></li>
        <li><a href="${broward}"${ext}><span>Broward County Animal Care</span><span class="go">${icon('external', { size: 18 })}</span></a></li>
      </ul>
    </div></div>`)}
  ${opt('D', 'Centered with shelter tiles', 'Centered Westie and title, one main button, then the two shelters as side-by-side tiles.', `
    <div class="mkD"><div class="box">
      <img src="${westie}" alt="" width="160" height="220">
      <h2>${h}</h2><p class="mk-p">${p}</p>
      ${primary}
      <div class="mk-tiles">
        <a class="mk-tile" href="${mdas}"><span><b>Miami-Dade Animal Services</b><small>Doral &amp; Medley</small></span><span class="go">See dogs ${icon('arrow', { size: 16 })}</span></a>
        <a class="mk-tile" href="${broward}"${ext}><span><b>Broward County Animal Care</b><small>Fort Lauderdale</small></span><span class="go">See dogs ${icon('external', { size: 15 })}</span></a>
      </div>
    </div></div>`)}
</div></section>`;
}
