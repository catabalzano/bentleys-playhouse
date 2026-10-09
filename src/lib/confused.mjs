// "Confused Bentley" for the 404 page: his real head illustration, tilted, on a seated body drawn
// in the same style (near-black fur, soft gray highlights, white chin/chest), plus a question mark.
// 4 options (?nf=1-4 on any missing page) while Cata picks one.
import { asset } from './core.mjs';

const defs = (id) => `<defs>
  <radialGradient id="${id}-g-chest" cx="50%" cy="30%" r="72%"><stop offset="0" stop-color="#3C3C44"/><stop offset=".5" stop-color="#1F1F24"/><stop offset="1" stop-color="#0F0F12"/></radialGradient>
  <radialGradient id="${id}-g-thigh" cx="28%" cy="30%" r="85%"><stop offset="0" stop-color="#37373E"/><stop offset=".55" stop-color="#1B1B1F"/><stop offset="1" stop-color="#0D0D0F"/></radialGradient>
  <linearGradient id="${id}-g-leg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0F0F11"/><stop offset=".38" stop-color="#36363D"/><stop offset=".72" stop-color="#202025"/><stop offset="1" stop-color="#0E0E10"/></linearGradient>
  <linearGradient id="${id}-g-down" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".4"/></linearGradient>
  <radialGradient id="${id}-g-belly" cx="50%" cy="20%" r="80%"><stop offset="0" stop-color="#050506" stop-opacity=".85"/><stop offset="1" stop-color="#050506" stop-opacity="0"/></radialGradient>
  <linearGradient id="${id}-g-top" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".22" stop-color="#fff" stop-opacity="1"/></linearGradient>
  <mask id="${id}-m-leg" maskContentUnits="userSpaceOnUse"><rect x="0" y="520" width="640" height="300" fill="url(#${id}-g-top)"/></mask>
  <filter id="${id}-f-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="8"/></filter>
</defs>`;

// seated body, front view (head goes on top)
// seated French bulldog, front view: thick neck, wide shoulders, straight front legs, hind thighs folded at the sides
const body = (id) => `
<ellipse cx="300" cy="803" rx="232" ry="14" fill="rgba(31,29,43,.14)"/>
<g id="${id}-p-half">
  <path d="M190 520C150 548 126 610 124 684c-2 60 22 104 70 114h58V560z" fill="url(#${id}-g-thigh)"/>
  <path d="M140 620c-10 34-12 74-2 112" fill="none" stroke="#56565F" stroke-width="4" stroke-linecap="round" opacity=".45"/>
  <path d="M168 560c-16 14-26 32-30 52" fill="none" stroke="#4A4A53" stroke-width="3" stroke-linecap="round" opacity=".4"/>
  <ellipse cx="168" cy="794" rx="38" ry="12" fill="#141417"/>
  <ellipse cx="164" cy="789" rx="22" ry="4.5" fill="#34343C" opacity=".7"/>
  <g stroke="#050506" stroke-width="2.5" stroke-linecap="round" opacity=".7"><path d="M150 790v10"/><path d="M166 788v12"/><path d="M182 790v10"/></g>
</g>
<use href="#${id}-p-half" transform="translate(600 0) scale(-1 1)"/>
<path d="M214 338c-26 26-50 60-56 106-8 60 6 116 36 164 20 34 40 72 58 114h96c18-42 38-80 58-114 30-48 44-104 36-164-6-46-30-80-56-106z" fill="url(#${id}-g-chest)"/>
<path d="M252 690h96v104h-96z" fill="#121215"/><path d="M262 600h76v190h-76z" fill="url(#${id}-g-belly)"/>
<g fill="none" stroke-linecap="round">
  <path d="M172 420c-12 34-14 80-4 124" stroke="#5A5A64" stroke-width="5" opacity=".45"/>
  <path d="M428 420c12 34 14 80 4 124" stroke="#5A5A64" stroke-width="5" opacity=".45"/>
  <g stroke="#4C4C56" stroke-width="2.5" opacity=".5"><path d="M200 428c-6 16-9 32-9 50"/><path d="M212 458c-4 14-6 28-5 42"/><path d="M400 428c6 16 9 32 9 50"/><path d="M388 458c4 14 6 28 5 42"/><path d="M252 404c-3 12-4 24-3 36"/><path d="M348 404c3 12 4 24 3 36"/></g>
</g>
<path d="M300 408c-12 14-20 32-22 52-2 22 4 42 12 58l4-8 6 14 6-14 4 8c8-16 14-36 12-58-2-20-10-38-22-52z" fill="#EDEDF1"/>
<g stroke="#EDEDF1" stroke-width="2.5" stroke-linecap="round"><path d="M282 470l-7 8"/><path d="M318 470l7 8"/></g>
<g id="${id}-p-leg" mask="url(#${id}-m-leg)">
  <path d="M218 520c-8 80-10 172-2 264h52c6-92 6-184 0-264z" fill="url(#${id}-g-leg)"/>
  <path d="M218 520c-8 80-10 172-2 264h52c6-92 6-184 0-264z" fill="url(#${id}-g-down)"/>
  <path d="M231 576c-4 54-5 114-2 172" fill="none" stroke="#5E5E68" stroke-width="3" stroke-linecap="round" opacity=".5"/>
  <path d="M214 560c-6 8-8 18-6 28" fill="none" stroke="#4A4A53" stroke-width="3" stroke-linecap="round" opacity=".5"/>
  <ellipse cx="240" cy="792" rx="36" ry="14" fill="#151518"/>
  <ellipse cx="236" cy="786" rx="22" ry="5" fill="#3A3A42" opacity=".75"/>
  <g stroke="#050506" stroke-width="2.5" stroke-linecap="round" opacity=".75"><path d="M224 788v12"/><path d="M240 786v14"/><path d="M256 788v12"/></g>
</g>
<use href="#${id}-p-leg" transform="translate(600 0) scale(-1 1)"/>
<g id="${id}-p-edge" fill="none" stroke-linecap="round">
  <path d="M216 600c-5 60-6 122-1 182" stroke="#060607" stroke-width="3" opacity=".8"/>
  <path d="M270 600c4 60 4 122 0 182" stroke="#060607" stroke-width="3" opacity=".8"/>
  <path d="M236 640c-3 44-3 90 0 132" stroke="#6A6A75" stroke-width="3.5" opacity=".55"/>
  <path d="M206 586c8-8 20-12 34-12" stroke="#4E4E58" stroke-width="3" opacity=".5"/>
</g>
<use href="#${id}-p-edge" transform="translate(600 0) scale(-1 1)"/>
<ellipse cx="300" cy="374" rx="112" ry="28" fill="#000" opacity=".5" filter="url(#${id}-f-soft)"/>
`;

const head = (tilt) => `<g transform="rotate(${tilt} 300 250)"><ellipse cx="300" cy="336" rx="100" ry="56" fill="#18181B"/><image href="${asset('img/bentley-head.png')}" x="160" y="60" width="280" height="323"/></g>`;

const MARKS = {
  // 1: one big hand-drawn orange question mark
  1: () => `<g transform="rotate(12 505 150)"><text x="505" y="220" text-anchor="middle" font-family="Caveat, 'Comic Sans MS', cursive" font-weight="700" font-size="230" fill="#FFC94D">?</text><text x="497" y="212" text-anchor="middle" font-family="Caveat, 'Comic Sans MS', cursive" font-weight="700" font-size="230" fill="#FF914D">?</text></g>`,
  // 2: three floating question marks in brand colors
  2: () => `<g font-family="Fredoka, 'Arial Rounded MT Bold', sans-serif" font-weight="700" text-anchor="middle">
      <text x="96" y="170" font-size="120" fill="#5271FF" transform="rotate(-16 96 130)">?</text>
      <text x="500" y="150" font-size="170" fill="#FF914D" transform="rotate(12 500 100)">?</text>
      <text x="560" y="290" font-size="84" fill="#FFC94D" transform="rotate(20 560 260)">?</text></g>
    <g stroke="#8C52FF" stroke-width="5" stroke-linecap="round"><path d="M420 44l8 18"/><path d="M452 36l-2 20"/><path d="M168 60l10 14"/></g>`,
  // 3: thought bubble with a question mark
  3: () => `<g transform="translate(24 -14)"><g fill="#fff" stroke="#2F45C8" stroke-width="5">
      <circle cx="420" cy="214" r="10"/><circle cx="446" cy="182" r="15"/>
      <path d="M470 160c-34 2-50-32-28-54-10-34 30-56 54-36 16-30 66-24 70 10 34 0 46 40 22 58 12 30-24 52-50 36-18 22-56 14-68-14z"/>
    </g><text x="531" y="146" text-anchor="middle" font-family="Fredoka, 'Arial Rounded MT Bold', sans-serif" font-weight="700" font-size="92" fill="#2F45C8">?</text></g>`,
  // 4: a marker-drawn question mark whose dot is a paw print
  4: () => `<g transform="translate(48 0)"><path d="M450 132c0-52 46-78 86-66 40 12 52 60 22 88-24 22-48 30-50 68" fill="none" stroke="#FF914D" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
    <g fill="#5271FF" transform="translate(508 276) rotate(-10)"><ellipse cx="0" cy="8" rx="17" ry="14"/><ellipse cx="-17" cy="-10" rx="6" ry="8"/><ellipse cx="-6" cy="-19" rx="6" ry="8"/><ellipse cx="7" cy="-19" rx="6" ry="8"/><ellipse cx="18" cy="-10" rx="6" ry="8"/></g></g>`,
};
const TILT = { 1: 14, 2: -13, 3: 15, 4: -12 };

export function confusedBentley(v = 1, { cls = 'nf-art' } = {}) {
  const id = 'cb' + v;
  // marks on the left side when the head tilts left, so the tilt "points" at them
  const flip = TILT[v] < 0 && v !== 2 ? ' transform="scale(-1 1) translate(-640 0)"' : '';
  return `<svg class="${cls}" viewBox="0 0 640 840" role="img" aria-label="Bentley, sitting with his head tilted, looking confused">${defs(id)}<g${flip}>${MARKS[v]()}</g>${body(id)}${head(TILT[v])}</svg>`;
}
