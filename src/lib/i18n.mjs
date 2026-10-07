// Spanish site: build-time translation of the rendered English pages.
// Every English page is translated block by block using content/i18n/es.json
// ({ "English text with <t1>inline</t1> tags": "Texto en español con <t1>etiquetas</t1>" }).
// Untranslated text stays in English, and `npm run i18n` lists what's missing.
import { parse } from 'node-html-parser';

const SKIP = new Set(['script', 'style', 'svg', 'code', 'pre', 'textarea', 'template']);
const BLOCK = new Set(['address', 'article', 'aside', 'blockquote', 'details', 'dialog', 'dd', 'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'section', 'summary', 'table', 'tbody', 'thead', 'tfoot', 'tr', 'td', 'th', 'ul', 'select', 'option', 'label', 'legend', 'button', 'input', 'img', 'picture', 'video', 'iframe', 'canvas', 'textarea', 'script', 'style', 'noscript', 'body', 'html', 'head']);
const ATTRS = ['alt', 'title', 'placeholder', 'aria-label', 'data-tip', 'data-label'];
const META = /^(description|og:title|og:description|twitter:title|twitter:description|og:image:alt)$/;

const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const hasText = (s) => /[A-Za-z]/.test(s.replace(/<[^>]*>/g, '').replace(/&[a-z#0-9]+;/gi, ''));
const isLeafBlock = (el) => !el.querySelectorAll('*').some((d) => BLOCK.has(d.rawTagName && d.rawTagName.toLowerCase()) && d.rawTagName.toLowerCase() !== 'input' && d.rawTagName.toLowerCase() !== 'img');

/** Turn inline markup into short tokens so translators only see words: "Call <t1>311</t1>". */
export function tokenize(html) {
  const tags = [];
  let svgs = [];
  let s = String(html).replace(/<svg[\s\S]*?<\/svg>/gi, (m) => { svgs.push(m); return `\u0000S${svgs.length - 1}\u0000`; });
  const stack = [];
  s = s.replace(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*?)(\/?)>/g, (m, close, name, rest, self) => {
    if (close) { const n = stack.pop(); return n ? `</t${n}>` : ''; }
    tags.push(m);
    const n = tags.length;
    if (self || /^(br|img|input|wbr|hr)$/i.test(name)) return `<t${n}/>`;
    stack.push(n);
    return `<t${n}>`;
  });
  s = s.replace(/\u0000S(\d+)\u0000/g, (m, i) => { tags.push(svgs[+i]); return `<t${tags.length}/>`; });
  return { key: norm(s), tags };
}
export function detokenize(str, tags) {
  return String(str)
    .replace(/<t(\d+)\/>/g, (m, n) => tags[n - 1] || '')
    .replace(/<t(\d+)>/g, (m, n) => tags[n - 1] || '')
    .replace(/<\/t(\d+)>/g, (m, n) => { const t = tags[n - 1]; const name = t && (t.match(/^<([a-zA-Z][a-zA-Z0-9-]*)/) || [])[1]; return name ? `</${name}>` : ''; });
}

function walk(node, onUnit, onText, onEl) {
  for (const ch of node.childNodes) {
    if (ch.nodeType === 3) { if (hasText(ch.rawText)) onText(ch); continue; }
    if (ch.nodeType !== 1) continue;
    const tag = (ch.rawTagName || '').toLowerCase();
    onEl(ch, tag);
    if (SKIP.has(tag) || ch.getAttribute('translate') === 'no' || ch.classList?.contains('notranslate')) continue;
    if (BLOCK.has(tag) && isLeafBlock(ch) && hasText(ch.innerHTML)) { onUnit(ch); continue; }
    walk(ch, onUnit, onText, onEl);
  }
}

/** Collect every translatable string on a page (for the missing-strings report). */
export function collect(html, out = new Set()) {
  const root = parse(html, { comment: true });
  const t = root.querySelector('title'); if (t && hasText(t.text)) out.add(norm(t.text));
  root.querySelectorAll('meta').forEach((m) => { if (META.test(m.getAttribute('name') || m.getAttribute('property') || '') && hasText(m.getAttribute('content') || '')) out.add(norm(m.getAttribute('content'))); });
  const body = root.querySelector('body') || root;
  walk(body, (el) => out.add(tokenize(el.innerHTML).key), (tn) => out.add(norm(tn.rawText)), (el) => {
    ATTRS.forEach((a) => { const v = el.getAttribute(a); if (v && hasText(v)) out.add(norm(v)); });
    if ((el.rawTagName || '').toLowerCase() === 'input' && /^(submit|button)$/i.test(el.getAttribute('type') || '') && el.getAttribute('value')) out.add(norm(el.getAttribute('value')));
  });
  // UI strings the site's scripts read from BP_CONFIG
  root.querySelectorAll('script').forEach((s) => { const m = s.textContent.match(/window\.BP_CONFIG=(\{.*\});/); if (m) { try { Object.values(JSON.parse(m[1]).strings || {}).forEach((v) => hasText(v) && out.add(norm(v))); } catch (e) { /* ignore */ } } });
  // event data for the calendar
  const ev = root.querySelector('#ev-data');
  if (ev) { try { const d = JSON.parse(ev.textContent); d.events.forEach((e) => ['title', 'time', 'price', 'venue', 'city', 'organizer'].forEach((k) => e[k] && hasText(e[k]) && out.add(norm(e[k])))); d.events.forEach((e) => e.desc && out.add(tokenize(e.desc).key)); Object.values(d.cats).forEach((c) => out.add(c.label)); } catch (e) { /* ignore */ } }
  return out;
}

const PAGE_LINK = (u) => /^\/(?!assets\/|admin\/|es\/|sitemap|robots|favicon|CNAME)[^?#]*\/?([?#].*)?$/.test(u) && !/\.(pdf|csv|png|jpe?g|webp|svg|xml|txt|ico|json|js|css)([?#]|$)/i.test(u);

/** Translate one rendered English page into Spanish. route: "events/" etc. */
export function translatePage(html, dict, route, base, jsDict = '/assets/js/i18n-es.js') {
  const tr = (s) => { const k = norm(s); const v = dict[k]; return v ? v : null; };
  const root = parse(html, { comment: true });
  const htmlEl = root.querySelector('html'); if (htmlEl) htmlEl.setAttribute('lang', 'es');
  const t = root.querySelector('title'); if (t) { const v = tr(t.text); if (v) t.set_content(v); }
  root.querySelectorAll('meta').forEach((m) => {
    const key = m.getAttribute('name') || m.getAttribute('property') || '';
    if (META.test(key)) { const v = tr(m.getAttribute('content') || ''); if (v) m.setAttribute('content', v); }
    if (key === 'og:url') m.setAttribute('content', `${base}/es/${route}`);
    if (key === 'og:locale') m.setAttribute('content', 'es_US');
  });
  root.querySelectorAll('link[rel="canonical"]').forEach((l) => l.setAttribute('href', `${base}/es/${route}`));
  const body = root.querySelector('body') || root;
  walk(body, (el) => {
    const { key, tags } = tokenize(el.innerHTML);
    const v = dict[key];
    if (v) el.set_content(detokenize(v, tags));
  }, (tn) => {
    const v = tr(tn.rawText);
    if (v) { const lead = tn.rawText.match(/^\s*/)[0], trail = tn.rawText.match(/\s*$/)[0]; tn.rawText = lead + v + trail; }
  }, (el) => {
    ATTRS.forEach((a) => { const v0 = el.getAttribute(a); if (v0) { const v = tr(v0); if (v) el.setAttribute(a, v); } });
    if ((el.rawTagName || '').toLowerCase() === 'input' && el.getAttribute('value')) { const v = tr(el.getAttribute('value')); if (v && /^(submit|button)$/i.test(el.getAttribute('type') || '')) el.setAttribute('value', v); }
  });
  // internal page links stay inside /es/
  root.querySelectorAll('a[href], form[action]').forEach((a) => {
    const at = a.getAttribute('href') != null ? 'href' : 'action';
    const u = a.getAttribute(at);
    if (a.hasAttribute('data-lang-switch')) return;
    if (u && u.startsWith('/') && !u.startsWith('//') && PAGE_LINK(u)) a.setAttribute(at, '/es' + u);
  });
  // calendar data
  const ev = root.querySelector('#ev-data');
  if (ev) {
    try {
      const d = JSON.parse(ev.textContent);
      d.events.forEach((e) => { ['title', 'time', 'price', 'venue', 'city', 'organizer'].forEach((k) => { if (e[k]) { const v = tr(e[k]); if (v) e[k] = v; } }); if (e.desc) { const { key, tags } = tokenize(e.desc); if (dict[key]) e.desc = detokenize(dict[key], tags); } });
      Object.values(d.cats).forEach((c) => { const v = tr(c.label); if (v) c.label = v; });
      ev.set_content(JSON.stringify(d).replace(/</g, '\\u003c'));
    } catch (e) { /* ignore */ }
  }
  // language switch points back to English
  root.querySelectorAll('[data-lang-switch]').forEach((a) => { a.setAttribute('href', '/' + route); a.setAttribute('hreflang', 'en'); a.setAttribute('lang', 'en'); a.set_content(a.innerHTML.replace(/Español/, 'English').replace(/>ES</, '>EN<')); });
  root.querySelectorAll('script').forEach((s) => {
    const m = s.textContent.match(/window\.BP_CONFIG=(\{.*\});/);
    if (!m) return;
    try {
      const c = JSON.parse(m[1]);
      for (const k of Object.keys(c.strings || {})) { const v = tr(c.strings[k]); if (v) c.strings[k] = v; }
      s.set_content(s.textContent.replace(m[0], 'window.BP_CONFIG=' + JSON.stringify(c).replace(/</g, '\\u003c') + ';').replace('window.BP_LANG="en"', 'window.BP_LANG="es"'));
    } catch (e) { /* ignore */ }
  });
  let out = root.toString();
  // the Spanish words the site's scripts use (calendar, forms, flyer builder…) load before them
  out = out.replace(/(<script src="[^"]*\/js\/site\.js)/, `<script src="${jsDict}" defer></script>\n$1`);
  return out;
}
