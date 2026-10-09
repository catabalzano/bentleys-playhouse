// "Confused Bentley" for the 404 page: his real head illustration, tilted, on a seated body drawn
// in the same style (near-black fur, soft gray highlights, white chin/chest), plus a question mark.
// 4 options (?nf=1-4 on any missing page) while Cata picks one.
import { asset } from './core.mjs';

const defs = (id) => `<defs>
  <radialGradient id="${id}-chest" cx="50%" cy="38%" r="62%"><stop offset="0" stop-color="#3E3E46"/><stop offset=".55" stop-color="#1E1E23"/><stop offset="1" stop-color="#111114"/></radialGradient>
  <radialGradient id="${id}-hip" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#34343B"/><stop offset=".6" stop-color="#18181C"/><stop offset="1" stop-color="#0E0E10"/></radialGradient>
  <linearGradient id="${id}-leg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#121215"/><stop offset=".45" stop-color="#2E2E35"/><stop offset="1" stop-color="#141417"/></linearGradient>
  <filter id="${id}-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>
</defs>`;

// seated body, front view (head goes on top)
const body = (id) => `
  <ellipse cx="300" cy="690" rx="215" ry="18" fill="rgba(31,29,43,.13)"/>
  <ellipse cx="160" cy="622" rx="80" ry="58" fill="url(#${id}-hip)"/>
  <ellipse cx="440" cy="622" rx="80" ry="58" fill="url(#${id}-hip)"/>
  <path d="M168 610c10-18 26-30 44-34M432 610c-10-18-26-30-44-34" fill="none" stroke="#4A4A54" stroke-width="3" stroke-linecap="round" opacity=".5"/>
  <path d="M212 296C166 334 136 412 140 500c4 74 30 130 70 166h180c40-36 66-92 70-166 4-88-26-166-72-204z" fill="url(#${id}-chest)"/>
  <ellipse cx="300" cy="318" rx="112" ry="56" fill="#141417"/>
  <g fill="none" stroke-linecap="round">
    <path d="M178 352c-24 40-32 92-28 146" stroke="#585864" stroke-width="5" opacity=".45"/>
    <path d="M422 352c24 40 32 92 28 146" stroke="#585864" stroke-width="5" opacity=".45"/>
    <g stroke="#4E4E58" stroke-width="2.5" opacity=".5"><path d="M196 380c-6 14-10 28-11 44"/><path d="M206 404c-4 12-6 24-6 36"/><path d="M404 380c6 14 10 28 11 44"/><path d="M394 404c4 12 6 24 6 36"/><path d="M252 360c-4 10-6 20-6 30"/><path d="M348 360c4 10 6 20 6 30"/></g>
  </g>
  <path d="M300 392c-8 10-14 22-15 36-1 14 3 26 8 36l3-6 4 10 4-10 3 6c5-10 9-22 8-36-1-14-7-26-15-36z" fill="#ECECF0"/>
  <path d="M226 456c-18 56-22 120-14 196h54c4-76 6-140-2-196z" fill="url(#${id}-leg)"/>
  <path d="M374 456c18 56 22 120 14 196h-54c-4-76-6-140 2-196z" fill="url(#${id}-leg)"/>
  <g fill="none" stroke="#08080A" stroke-width="2.5" opacity=".55"><path d="M264 466c6 62 6 124 2 186"/><path d="M336 466c-6 62-6 124-2 186"/></g>
  <g fill="none" stroke="#5A5A66" stroke-width="3" stroke-linecap="round" opacity=".45"><path d="M234 496c-6 32-8 64-5 98"/><path d="M366 496c6 32 8 64 5 98"/></g>
  <ellipse cx="238" cy="662" rx="44" ry="20" fill="#18181C"/><ellipse cx="362" cy="662" rx="44" ry="20" fill="#18181C"/>
  <ellipse cx="234" cy="654" rx="24" ry="7" fill="#3A3A43" opacity=".75"/><ellipse cx="366" cy="654" rx="24" ry="7" fill="#3A3A43" opacity=".75"/>
  <g stroke="#060607" stroke-width="3" stroke-linecap="round" opacity=".7"><path d="M222 658v14"/><path d="M238 656v17"/><path d="M254 658v14"/><path d="M346 658v14"/><path d="M362 656v17"/><path d="M378 658v14"/></g>
  <ellipse cx="300" cy="366" rx="112" ry="30" fill="#000" opacity=".45" filter="url(#${id}-soft)"/>`;

const head = (tilt) => `<g transform="rotate(${tilt} 300 250)"><image href="${asset('img/bentley-head.png')}" x="160" y="60" width="280" height="323"/></g>`;

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
  return `<svg class="${cls}" viewBox="0 0 640 720" role="img" aria-label="Bentley, sitting with his head tilted, looking confused">${defs(id)}<g${flip}>${MARKS[v]()}</g>${body(id)}${head(TILT[v])}</svg>`;
}
