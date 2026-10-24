// /pupsinmycity/ — Pups in My City, Bentley's Playhouse's video series (Cata, Oct 23, 2026).
// A light nod to Sex and the City: dog-friendly Miami, dates with dogs, shelter pup pawventures and rescue visits.
import { ctx, esc, href, asset, icon, breadcrumb } from './core.mjs';

export const PIMC = {
  instagram: { url: 'https://www.instagram.com/pupsinmycity/', handle: '@pupsinmycity' },
  youtube: { url: 'https://www.youtube.com/@pupsinmycity', handle: '@pupsinmycity' },
};

const ext = () => `<span class="visually-hidden"> (${ctx.t('externalLink')})</span>`;
const out = (url, label, cls, ic) => `<a class="btn ${cls}" href="${esc(url)}" target="_blank" rel="noopener">${icon(ic, { size: 20 })}<span>${label}</span>${ext()}</a>`;

const SEGMENTS = [
  ['food', 'orange', 'Dog-Friendly Miami', 'Brunch, patios, shops and parks that roll out the welcome mat for dogs. We bring a pup along and show you what it\'s really like.'],
  ['heart', 'violet', 'Dating With Dogs', 'A first date, plus one very good chaperone. We bring a dog along and watch the reaction. Nothing tells you more about someone.'],
  ['paw', 'blue', 'Shelter Pawventures', 'We take a dog from Miami-Dade Animal Services out for the day, so you can see who they are outside the kennel, and maybe fall for them.'],
  ['handshake', 'teal', 'Inside the Dog Community', 'Visits to places like the Humane Society of Greater Miami, and the important stories in Miami\'s dog world, told in plain words.'],
];

// YouTube video ID from any link: watch?v=, youtu.be/, /shorts/, /embed/, /live/
export const ytId = (u) => (String(u || '').match(/(?:youtu\.be\/|[?&]v=|\/(?:shorts|embed|live)\/)([A-Za-z0-9_-]{11})/) || [])[1] || '';
// Episodes added in the admin (content/episodes): visible ones, featured first, then newest.
// Cata (Oct 23): show just 1 for now. Raise SHOW to show more (the first stays big if it's featured).
const SHOW = 1;
export const prepEpisodes = (list) => list
  .map((e) => ({ ...e, id: ytId(e.youtube) }))
  .filter((e) => e.id && !e.hidden)
  .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || String(b.date || '').localeCompare(String(a.date || '')))
  .slice(0, SHOW);

// Click-to-play: only a thumbnail until someone presses play (no YouTube cookies before that). Without JavaScript it's a link to YouTube.
const episodeCard = (e, i, all) => `<li class="pimc-ep${i === 0 && (e.featured || all.length === 1) ? ' pimc-ep--big' : ''}">
  <div class="pimc-ep__video" data-yt="${esc(e.id)}" data-title="${esc(e.title)}">
    <a class="pimc-ep__play" href="https://www.youtube.com/watch?v=${esc(e.id)}" target="_blank" rel="noopener">
      <img src="https://i.ytimg.com/vi/${esc(e.id)}/hqdefault.jpg" alt="" loading="lazy" width="480" height="360">
      <span class="pimc-ep__btn" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg></span>
      <span class="visually-hidden">Play ${esc(e.title)}</span>
    </a>
  </div>
  <h3 class="pimc-ep__t">${esc(e.title)}</h3>
  ${e.summary ? `<p class="pimc-ep__s">${esc(e.summary)}</p>` : ''}
</li>`;

function episodesSection(episodes) {
  const body = episodes.length
    ? `<ul class="pimc-eps" role="list">${episodes.map(episodeCard).join('')}</ul>
    <p class="pimc-eps__more"><a class="arrow-link" href="${esc(PIMC.youtube.url)}" target="_blank" rel="noopener">See every episode on YouTube ${icon('arrow', { size: 18 })}${ext()}</a></p>`
    : `<div class="pimc-eps__soon">${icon('youtube', { size: 28 })}<p><strong>The first episodes are on the way.</strong> Subscribe on YouTube so you don't miss them.</p>${out(PIMC.youtube.url, 'Subscribe on YouTube', 'btn--primary', 'youtube')}</div>`;
  return `<section class="pimc-sec pimc-watch" id="episodes" aria-labelledby="pimc-watch-h">
    <h2 class="pimc-h" id="pimc-watch-h">Watch a Few Episodes</h2>
    ${body}
  </section>`;
}

export function pupsCityPage(episodes = []) {
  const email = ctx.site.contact.email;
  return `
<section class="page-head pimc-head"><div class="wrap">
  ${breadcrumb([['Home', ''], ['Pups in My City', '']])}
  <div class="pimc-head__in">
    <div class="pimc-head__txt">
      <p class="pimc-kicker">A video series by Bentley's Playhouse</p>
      <h1 class="page-h">Pups in My City</h1>
      <p class="page-lede">Brunch dates, first dates and shelter pups on a day out. Pups in My City is our fun, lighthearted look at dog life in Miami: the places that welcome dogs, the people who show up for them and the dogs still waiting for a home.</p>
      <div class="btn-row pimc-ctas">
        ${out(PIMC.youtube.url, 'Watch on YouTube', 'btn--primary', 'youtube')}
        ${out(PIMC.instagram.url, 'Follow on Instagram', 'btn--ghost', 'instagram')}
      </div>
    </div>
    <figure class="pimc-tv">
      <div class="pimc-tv__screen"><img src="${asset('img/pups-in-my-city-logo.jpg')}" alt="Pups in My City logo: the words Pups in My City over a Miami skyline with palm trees" width="1400" height="788" fetchpriority="high"></div>
      <figcaption class="pimc-tv__onair"><span class="pimc-dot" aria-hidden="true"></span>Filmed in Miami</figcaption>
    </figure>
  </div>
</div></section>

<div class="wrap">
  <blockquote class="pimc-wonder">
    <p><span>And I couldn't help but wonder…</span> what if every shelter dog got a night out on the town?</p>
  </blockquote>

  ${episodesSection(episodes)}

  <section class="pimc-sec" aria-labelledby="pimc-what-h">
    <h2 class="pimc-h" id="pimc-what-h">What We Film</h2>
    <p class="pimc-sub">Every episode has a dog at the center of it. Here's what you'll see.</p>
    <ul class="pimc-segs" role="list">
      ${SEGMENTS.map(([ic, tone, h, p]) => `<li class="pimc-seg pimc-seg--${tone}"><span class="pimc-seg__ic">${icon(ic, { size: 26 })}</span><h3>${h}</h3><p>${p}</p></li>`).join('')}
    </ul>
  </section>

  <section class="pimc-sec pimc-why" aria-labelledby="pimc-why-h">
    <h2 class="pimc-h" id="pimc-why-h">Why We Make It</h2>
    <p class="pimc-sub">It's supposed to be fun. It's also how we get dogs seen.</p>
    <ol class="pimc-why__list">
      <li><strong>Shelter and community dogs who need a home.</strong> A dog laughing on a patio does more for an adoption than a kennel photo ever could.</li>
      <li><strong>Animal well-being.</strong> We cover what's happening in Miami's dog community and how you can help.</li>
      <li><strong>Dog-friendly businesses.</strong> We spotlight the places that make room for dogs, so you know where to bring yours.</li>
    </ol>
  </section>

  <section class="pimc-sec pimc-host" aria-labelledby="pimc-host-h">
    <div class="pimc-host__photo"><img src="${asset('img/cata-and-pups.jpg')}" alt="Cata smiling in the car with Bentley, a black French bulldog, and Romeo, a merle French bulldog, in the back seat" width="1000" height="1250" loading="lazy"></div>
    <div class="pimc-host__txt">
      <p class="pimc-kicker">Meet the host</p>
      <h2 class="pimc-h" id="pimc-host-h">Cata Balzano</h2>
      <p>Cata is a journalist, animal activist, dog lover and the founder of Bentley's Playhouse. She hosts every episode, usually with a pup riding shotgun.</p>
      <p><a class="arrow-link" href="${href('our-story/')}">Read the Bentley's Playhouse story ${icon('arrow', { size: 18 })}</a></p>
    </div>
  </section>

  <section class="pimc-sec pimc-pitch" aria-labelledby="pimc-pitch-h">
    <h2 class="pimc-h" id="pimc-pitch-h">Want to Be on the Show?</h2>
    <div class="pimc-pitch__grid">
      <div class="pimc-card"><h3>Dog-Friendly Spots</h3><p>Own a Miami restaurant, cafe, shop or park that welcomes dogs? Tell us about it.</p><a class="arrow-link" href="mailto:${esc(email)}?subject=${encodeURIComponent('Pups in My City: dog-friendly spot')}">Email us ${icon('arrow', { size: 18 })}</a></div>
      <div class="pimc-card"><h3>Shelters and Rescues</h3><p>Have a dog who'd shine on a pawventure, or something we should cover? Let's talk.</p><a class="arrow-link" href="mailto:${esc(email)}?subject=${encodeURIComponent('Pups in My City: rescue or shelter')}">Email us ${icon('arrow', { size: 18 })}</a></div>
      <div class="pimc-card"><h3>Fell for a Pup?</h3><p>Dogs from the show who still need a home are listed on Pawsome Pooches.</p><a class="arrow-link" href="${href('pawsome-pooches/')}">Meet the pups ${icon('arrow', { size: 18 })}</a></div>
    </div>
  </section>

  <section class="pimc-follow" aria-labelledby="pimc-follow-h">
    <h2 class="pimc-h" id="pimc-follow-h">Catch Every Episode</h2>
    <p>New pawventures land on YouTube and Instagram first.</p>
    <ul class="pimc-follow__list" role="list">
      <li><a href="${esc(PIMC.youtube.url)}" target="_blank" rel="noopener">${icon('youtube', { size: 26 })}<span><b>YouTube</b> ${PIMC.youtube.handle}</span>${ext()}</a></li>
      <li><a href="${esc(PIMC.instagram.url)}" target="_blank" rel="noopener">${icon('instagram', { size: 26 })}<span><b>Instagram</b> ${PIMC.instagram.handle}</span>${ext()}</a></li>
    </ul>
  </section>
</div>`;
}
