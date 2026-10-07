// Hand-drawn "doodle" icons (style D, picked Oct 6, 2026). Main strokes use currentColor,
// accents (sparkles, paw pads) use --doodle-accent (orange by default). Use instead of emojis.
const P = {
  home: '<path d="M7 23.5 24.5 8.5 41 23"/><path d="M11.5 20.5c-.4 6 .3 12.6.1 18.3 7.8.4 17.4.2 25.2-.2.3-5.9 0-12.1-.4-18.3"/><path d="M21 38.6c-.2-3.6.1-7 .2-9.6 2.3-.3 4.2-.2 6 .1.2 2.9.1 6.3 0 9.4"/><path class="d-acc" d="M40 6v4M38 8h4"/>',
  vet: '<path d="M14 7c-1.5 8-1 14 6 15.5 7-1.5 7.5-8 6-15.5"/><path d="M20 22.5c.3 8 2 13 9 13.5 6 .2 8-4 8-9"/><circle cx="37" cy="23.5" r="3.6"/><path class="d-acc" d="M8 40c3-1 4 1 6 .4M42 6v4M40 8h4"/>',
  lostfound: '<path d="M33 20.5c.3-7.4-5.8-13-13.1-12.6C12.6 8.3 7.4 14.5 8 21.6c.6 7 6.8 12 13.8 11.4 6-.5 10.9-5.8 11.2-12.5z"/><path d="M30.5 31.5 41 41.6"/><path class="d-acc d-fill" d="M17 23.5c1.5-2.6 4.5-2.7 6.4-.2 1.4 1.9-.4 4-3.2 4-2.7 0-4.4-2-3.2-3.8z"/><path class="d-acc" stroke-width="3.6" d="M15 18.6v.1M19 15.2v.1M24 15.4v.1M27 19v.1"/>',
  globe: '<path d="M40.5 24.4c.2 9-7 16.4-16.2 16.6C15.3 41.2 7.6 34 7.5 24.8 7.3 15.6 14.6 7.6 23.9 7.5c9.2-.1 16.4 7.5 16.6 16.9z"/><path d="M8.5 20c5.3 1.8 9.6-2.4 14-.8 4 1.4 3.1 7.6 8.2 7.6 4.3 0 6-3 9.3-3.5M11 32.5c4.3-1.2 7.4 2.3 11 1.6"/><path class="d-acc" d="M43 6v4M41 8h4"/>',
  heart: '<path d="M24 40.5c-6.5-4.6-15.8-11.2-16.3-19.3-.4-5.6 3.4-10 8.4-10.1 3.6-.1 6.4 2.2 7.9 5.3 1.6-3.2 4.6-5.5 8.3-5.3 4.9.3 8.4 4.7 7.9 10-.8 8.2-9.7 14.6-16.2 19.4z"/><path class="d-acc" d="M40 5v4M38 7h4M8 40c2.5-.8 3.5.8 5.3.3"/>',
  paw: '<path d="M15.5 33.5c-.4-5.5 3.9-10.2 8.6-10.3 4.9-.1 9 4.6 8.6 10.1-.2 3.4-3.2 5.2-6.3 4.3-1.6-.5-3.1-.5-4.7 0-3.1.9-6-.7-6.2-4.1z"/><path d="M12.6 21.8c-1.5-2.5-.9-5.5 1.2-6.4 2.1-.9 4.6.8 5.3 3.6.7 2.5-.3 4.8-2.1 5.2-1.6.4-3.4-.6-4.4-2.4zM20.5 12.6c-.4-3 1.2-5.6 3.5-5.7 2.3-.1 4 2.5 3.7 5.5-.3 2.8-2 4.7-3.8 4.6-1.9 0-3.1-1.8-3.4-4.4zM28.9 19c.7-2.8 3.2-4.5 5.3-3.6 2.1.9 2.7 3.9 1.2 6.4-1 1.8-2.8 2.8-4.4 2.4-1.8-.4-2.8-2.7-2.1-5.2z"/><path class="d-acc" d="M40 6v4M38 8h4"/>',
  bowl: '<path d="M6.5 24c11.6.6 23.4.5 35-.2-.6 8.6-7.6 14.6-17.6 14.8C14 38.8 7.1 32.6 6.5 24z"/><path d="M13 38.5c6.8.7 15 .7 22-.2"/><path class="d-acc d-fill" d="M15.5 20c.8-2.5 3.7-2.6 4.6-.2M21.5 18.6c1.1-2.7 4.3-2.7 5.4 0M28.4 20c.9-2.3 3.7-2.2 4.5.1"/>',
  syringe: '<path d="M30.8 9.5 38.6 17.4"/><path d="M34.7 13.4 25.6 22.3"/><path d="M27.9 13.1 12.2 28.7c-.8 3-.9 5.3-.3 7.6 2.3.6 4.6.5 7.6-.3l15.6-15.6"/><path d="M11.9 36.3 6.8 41.4"/><path class="d-acc" d="M18.6 28.6l2.7 2.7M22.7 24.5l2.7 2.7M26.8 20.4l2.7 2.7"/>',
  cookie: '<path d="M38.6 24.3c.6 8.2-6.1 15.5-14.5 15.8C15.7 40.5 8.5 34 8.2 25.5 7.9 17 14.4 9.6 22.8 9.3c-.4 3.6 2.2 6.6 5.6 6.6.3 3.5 3.2 6.1 6.8 5.8.3 1.1 1.8 2.3 3.4 2.6z"/><path class="d-acc d-fill" d="M17 20.2v.1M25.5 27.2v.1M16.5 30.5v.1M30.8 31.9v.1M21.7 35.4v.1" stroke-width="4"/>',
  dog: '<path d="M13.2 18.8 9.6 7.6c4.3.8 7.4 3.3 9.8 6.7 3-1 6.3-1 9.3 0 2.4-3.4 5.5-5.9 9.8-6.7l-3.6 11.2c2 2.6 3.1 5.8 3 9.2-.3 7.6-6.7 13.1-14.2 13.1S9.6 35.6 9.9 28c.1-3.4 1.3-6.6 3.3-9.2z"/><path d="M18.2 25.6v.1M29.8 25.6v.1" stroke-width="3.6"/><path class="d-acc d-fill" d="M21.4 31.2c1.6-1.3 3.9-1.3 5.3 0-.6 1.9-4.7 1.9-5.3 0z"/>',
};
export const DOODLES = Object.keys(P);
export function doodle(name, { size = 40, cls = '' } = {}) {
  const p = P[name] || P.paw;
  return `<svg class="doodle ${cls}" width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${p}</svg>`;
}
// Donation tiers in content/site.json still store an "emoji" (editable in the admin); map it to a doodle.
export function doodleFor(emoji = '') {
  const e = String(emoji);
  if (/🥣|🍖|🦴|🍗|🥫/.test(e)) return 'bowl';
  if (/💉/.test(e)) return 'syringe';
  if (/🩺|🏥|💊/.test(e)) return 'vet';
  if (/🏠|🏡/.test(e)) return 'home';
  if (/🐶|🐕/.test(e)) return 'dog';
  if (/🐾/.test(e)) return 'paw';
  return 'heart';
}
