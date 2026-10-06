// Cover art for articles and guides, and 1200×630 share images (Facebook, WhatsApp, X, Threads, Telegram…).
// The same art is drawn inline at the top of each article; share images add the title and are rendered to PNG with resvg.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './core.mjs';
import { ICON_PATHS } from './icons.mjs';

// Brand palettes per topic: [background from, background to, blob, accent]
export const THEMES = {
  'lost-found': ['#2F45C8', '#7A45E6', '#5271FF', '#FFBD59'],
  'rescue-basics': ['#FF914D', '#FFBD59', '#FFE0CC', '#2F45C8'],
  'adopt-foster': ['#7A45E6', '#FF914D', '#B194FF', '#FFBD59'],
  care: ['#5271FF', '#8DA2FF', '#DCE4FF', '#FF914D'],
  behavior: ['#FFBD59', '#FF914D', '#FFE9C2', '#7A45E6'],
  affordable: ['#2F45C8', '#5271FF', '#AEBBFF', '#FFBD59'],
  emergency: ['#E9661C', '#FFBD59', '#FFD9BF', '#2F45C8'],
  rescuers: ['#7A45E6', '#2F45C8', '#B194FF', '#FFBD59'],
  'laws-travel': ['#24226A', '#5271FF', '#7A45E6', '#FFBD59'],
  default: ['#2F45C8', '#7A45E6', '#5271FF', '#FFBD59'],
};
// A big icon per topic (keys from icons.mjs)
const TOPIC_ICON = { 'lost-found': 'found', 'rescue-basics': 'rescued', 'adopt-foster': 'adopt', care: 'med', behavior: 'heart', affordable: 'gift', emergency: 'alert', rescuers: 'hands', 'laws-travel': 'book', default: 'paw' };

const bentleyB64 = () => 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'src/assets/img/bentley-head.png')).toString('base64');
const escX = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const PAW = '<ellipse cx="12" cy="16" rx="4.4" ry="3.7"/><ellipse cx="5.9" cy="10.8" rx="1.8" ry="2.3"/><ellipse cx="9.4" cy="6.9" rx="1.8" ry="2.4"/><ellipse cx="14.6" cy="6.9" rx="1.8" ry="2.4"/><ellipse cx="18.1" cy="10.8" rx="1.8" ry="2.3"/>';
const STAR = (x, y, r, c) => `<path transform="translate(${x} ${y}) scale(${r / 10})" d="M0-10L2.6-2.6 10 0 2.6 2.6 0 10-2.6 2.6-10 0-2.6-2.6z" fill="${c}"/>`;

/** The illustration: gradient, soft blob, big topic icon in a circle, paw trail, sparkles, Bentley peeking.
 *  `bentleyHref` lets the page use a normal URL and the PNG renderer an embedded image. */
export function coverArt({ category = 'default', icon, uid = 'c', bentleyHref, width = 1200, height = 630, iconX = 870, iconY = 260, showBentley = true }) {
  const [a, b, blob, acc] = THEMES[category] || THEMES.default;
  const ic = ICON_PATHS[icon || TOPIC_ICON[category] || 'paw'] || ICON_PATHS.paw;
  return `<defs>
    <linearGradient id="${uid}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
    <radialGradient id="${uid}r" cx=".8" cy=".2" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#${uid}g)"/>
  <rect width="${width}" height="${height}" fill="url(#${uid}r)"/>
  <path d="M${iconX - 330} ${height} C ${iconX - 360} ${iconY - 40}, ${iconX - 120} ${iconY - 250}, ${iconX + 120} ${iconY - 190} S ${width + 60} ${iconY + 10}, ${width} ${height} Z" fill="${blob}" opacity=".45"/>
  <g fill="#fff" opacity=".16">${[[90, 520, 2.2, -20], [190, 455, 2, 10], [300, 520, 2.1, -15], [400, 455, 1.9, 15], [510, 520, 2, -10]].map(([x, y, s, r]) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})">${PAW}</g>`).join('')}</g>
  <circle cx="${iconX}" cy="${iconY}" r="150" fill="#fff" opacity=".95"/>
  <circle cx="${iconX}" cy="${iconY}" r="150" fill="none" stroke="${acc}" stroke-width="10" stroke-dasharray="2 22" stroke-linecap="round"/>
  <g transform="translate(${iconX - 84} ${iconY - 84}) scale(7)" fill="none" stroke="${a}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ic}</g>
  ${STAR(iconX - 210, iconY - 120, 22, acc)}${STAR(iconX + 190, iconY - 150, 14, '#fff')}${STAR(iconX + 230, iconY + 60, 18, acc)}${STAR(120, 90, 12, '#fff')}
  ${showBentley ? `<image href="${bentleyHref}" x="${iconX + 150}" y="${height - 205}" width="170" height="196" preserveAspectRatio="xMidYMax meet"/>` : ''}`;
}

/** Inline SVG for the top of an article page (no text; the page has the real title). */
export function coverInline({ category, icon, bentleyHref, uid, iconX = 640, iconY = 300 }) {
  return `<svg class="cover-art" viewBox="0 0 1200 630" preserveAspectRatio="xMidYMid slice" role="img" aria-label="" aria-hidden="true" focusable="false">${coverArt({ category, icon, uid, bentleyHref, iconX, iconY })}</svg>`;
}

// Wrap a title into lines that fit (rough width model for Fredoka Bold).
function wrap(text, size, maxW) {
  const words = String(text).split(/\s+/); const lines = []; let line = '';
  const w = (s) => s.length * size * 0.55;
  for (const word of words) { const t = line ? line + ' ' + word : word; if (w(t) > maxW && line) { lines.push(line); line = word; } else line = t; }
  if (line) lines.push(line);
  return lines;
}

/** 1200×630 share image SVG with title. `photo` (data URI) makes a photo card instead of the illustration. */
export function shareSVG({ title, kicker, category = 'default', icon, photo }) {
  let size = 76; let lines = wrap(title, size, 600);
  while (lines.length > 4 && size > 50) { size -= 6; lines = wrap(title, size, 600); }
  const lh = Math.round(size * 1.08);
  const textH = lines.length * lh;
  const y0 = 330 - textH / 2 + size * 0.8;
  const [a] = THEMES[category] || THEMES.default;
  const art = photo
    ? `<defs><linearGradient id="sh" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1F1D2B" stop-opacity=".85"/><stop offset=".62" stop-color="#1F1D2B" stop-opacity=".35"/><stop offset="1" stop-color="#1F1D2B" stop-opacity="0"/></linearGradient></defs>
       <rect width="1200" height="630" fill="${a}"/><image href="${photo}" x="0" y="0" width="1200" height="630" preserveAspectRatio="xMidYMid slice"/><rect width="1200" height="630" fill="url(#sh)"/>`
    : coverArt({ category, icon, uid: 's', bentleyHref: bentleyB64() });
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630">
  ${art}
  ${kicker ? `<rect x="64" y="${y0 - size - 62}" rx="22" ry="22" width="${Math.min(560, 40 + kicker.length * 15.5)}" height="44" fill="#FFBD59"/><text x="86" y="${y0 - size - 32}" font-family="Figtree" font-weight="800" font-size="22" letter-spacing="2" fill="#1F1D2B">${escX(kicker.toUpperCase())}</text>` : ''}
  <text font-family="Fredoka" font-weight="700" font-size="${size}" fill="#fff">${lines.map((l, i) => `<tspan x="64" y="${y0 + i * lh}">${escX(l)}</tspan>`).join('')}</text>
  <g transform="translate(64 556)"><rect width="330" height="46" rx="23" fill="#fff" opacity=".95"/><g transform="translate(14 9) scale(1.15)" fill="#FF914D">${PAW}</g><text x="52" y="31" font-family="Figtree" font-weight="800" font-size="21" fill="#2F45C8">bentleysplayhouse.org</text></g>
</svg>`;
}

let Resvg = null;
const FONTS = ['Fredoka-Bold.ttf', 'Figtree-SemiBold.ttf', 'Figtree-ExtraBold.ttf'].map((f) => path.join(ROOT, 'src/fonts', f));
/** Render a share image to PNG. Returns false if rendering isn't possible (the page then falls back to the default image). */
export async function renderShare(opts, outFile) {
  try {
    if (!Resvg) ({ Resvg } = await import('@resvg/resvg-js'));
    const svg = shareSVG(opts);
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 }, font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: 'Figtree' } }).render().asPng();
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, png);
    return true;
  } catch (e) {
    console.warn('  ⚠ share image skipped for', path.basename(outFile), '-', e.message);
    return false;
  }
}
