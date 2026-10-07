// Simple line icons (24×24, stroke = currentColor). Drawn for this site.
const P = {
  found: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z"/><circle cx="10" cy="9.2" r="1"/><circle cx="14" cy="9.2" r="1"/><circle cx="8.3" cy="11.6" r=".9"/><circle cx="15.7" cy="11.6" r=".9"/><path d="M10.4 13.6c.9-1.2 2.3-1.2 3.2 0 .5.7-.1 1.6-1.6 1.6s-2.1-.9-1.6-1.6z"/>',
  lost: '<path d="M4 9.5v5l3 .5 9 4V5L7 9z"/><path d="M7 9v6.2"/><path d="M8 15.6l1.2 4.2h2.4l-1-3.6"/><path d="M19 9.5c.7.7.7 4.3 0 5"/>',
  rescued: '<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M12 17.2s-3-1.9-3-4a1.6 1.6 0 0 1 3-.9 1.6 1.6 0 0 1 3 .9c0 2.1-3 4-3 4z"/>',
  adopt: '<path d="M6 21V8a6 6 0 0 1 12 0v13"/><path d="M3.5 21h17"/><circle cx="14.6" cy="14" r=".9"/><path d="M9.5 21v-6.5"/>',
  alert: '<path d="M12 3.5 21 19.5H3z"/><path d="M12 10v4"/><circle cx="12" cy="16.8" r=".6"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.5 4.2 4.2 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  hands: '<path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V12"/><path d="M11 11V5a1.5 1.5 0 0 1 3 0v6"/><path d="M14 11V6.5a1.5 1.5 0 0 1 3 0v7.5a6 6 0 0 1-6 6h-.5a6 6 0 0 1-4.6-2.2L3.6 14.5a1.4 1.4 0 0 1 2.2-1.8L8 15"/>',
  share: '<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="m8.2 10.8 7.6-4M8.2 13.2l7.6 4"/>',
  box: '<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18"/>',
  handshake: '<path d="m2.5 11 4-4 4 1.5 3-1.5 4 1 4 3"/><path d="m7 15 2.5 2.5a1.4 1.4 0 0 0 2-2"/><path d="m10 14 3 3a1.4 1.4 0 0 0 2-2l-3.5-3.5"/><path d="m13.5 12 3 3a1.4 1.4 0 0 0 2-2L15 9.5"/><path d="M2.5 11 7 15M21.5 11l-3 2.5"/>',
  door: '<path d="M5 21V5.5A2.5 2.5 0 0 1 7.5 3h9A2.5 2.5 0 0 1 19 5.5V21"/><path d="M3 21h18"/><circle cx="15" cy="12.5" r=".9"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
  print: '<path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="7.5" rx="2"/><path d="M7 14h10v6.5H7z"/>',
  link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
  external: '<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
  check: '<path d="m4.5 12.5 5 5 10-11"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  map: '<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4v14M15 6v14"/>',
  phone: '<path d="M6.5 3.5h3l1.5 4-2 1.5a10 10 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2z"/>',
  chat: '<path d="M4 5.5h16v11H9l-5 4z"/>',
  arrow: '<path d="M4.5 12h15M13.5 6l6 6-6 6"/>',
  home: '<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/>',
  gift: '<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8.5h14V12M12 8v12.5"/><path d="M12 8C10.5 4 7 4.5 7.3 6.6 7.5 8 12 8 12 8zM12 8c1.5-4 5-3.5 4.7-1.4C16.5 8 12 8 12 8z"/>',
  shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6z"/>',
  users: '<circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M15.5 5.2a3.5 3.5 0 0 1 0 6.6M18 14.2A6.5 6.5 0 0 1 21.5 20"/>',
  tool: '<path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3z"/><path d="M14.5 6.5 17 4l3 3-2.5 2.5"/>',
  list: '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><path d="m3.5 6.5 1 1 2-2M3.5 12l1 1 2-2M3.5 17.5l1 1 2-2"/>',
  storm: '<path d="M7 16.5a4.5 4.5 0 1 1 1.2-8.8A5.5 5.5 0 0 1 18.5 9a3.8 3.8 0 0 1-.5 7.5"/><path d="m12.5 13-2 4h3l-2 4"/>',
  food: '<path d="M4 11h16a8 8 0 0 1-16 0z"/><path d="M9 7.5c0-1.5 1-1.5 1-3M13 7.5c0-1.5 1-1.5 1-3"/>',
  med: '<rect x="3.5" y="6.5" width="17" height="13" rx="2.5"/><path d="M9 6.5V4.5h6v2M12 10v6M9 13h6"/>',
  paw: '<ellipse cx="12" cy="16" rx="4.2" ry="3.6"/><ellipse cx="6.2" cy="11" rx="1.6" ry="2.1"/><ellipse cx="9.5" cy="7.4" rx="1.6" ry="2.2"/><ellipse cx="14.5" cy="7.4" rx="1.6" ry="2.2"/><ellipse cx="17.8" cy="11" rx="1.6" ry="2.1"/>',
  instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="3.8"/><circle cx="17.2" cy="6.8" r=".7"/>',
  facebook: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><path d="M13.2 20.5v-7h2.4l.4-2.8h-2.8V9c0-.8.3-1.3 1.4-1.3H16V5.2a17 17 0 0 0-2.1-.1c-2.1 0-3.5 1.3-3.5 3.6v2h-2.3v2.8h2.3v7"/>',
  youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="m10 9.2 5 2.8-5 2.8z"/>',
  upload: '<path d="M12 15V4.5M7.5 9 12 4.5 16.5 9"/><path d="M4.5 14.5v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3"/>',
  paperclip: '<path d="m20 11.5-7.8 7.8a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8"/>',
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m3.5 6.5 8.5 7 8.5-7"/>',
  copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M15.5 8.5V5.5a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="9.5" r="1.8"/><path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5"/>',
  download: '<path d="M12 3.5v11M7 10l5 5 5-5"/><path d="M4 16.5v2A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-2"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17"/>',
  leaf: '<path d="M5 19c0-8 5-13.5 14.5-14-0.5 9.5-6 14.5-14 14z"/><path d="M5 19 13 11"/>'
};

export function icon(name, { size = 24, label = '', cls = '' } = {}) {
  const body = P[name] || P.paw;
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true" focusable="false"';
  return `<svg class="icon ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${a11y}>${body}</svg>`;
}
export { P as ICON_PATHS };
