import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
// Shared helpers: content loading, links, markdown, small components.
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';
import { icon } from './icons.mjs';

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
export const CONTENT = path.join(ROOT, 'content');

export const ctx = {
  mode: 'preview',      // 'preview' | 'live'
  links: 'explicit',    // 'explicit' (folder/index.html) | 'pretty' (folder/)
  route: '',            // route of the page currently being rendered
  site: null,
  t: null,
};

// ---------- text helpers ----------
export const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const slugify = (s) => String(s).toLowerCase().replace(/&/g, 'and').replace(/['’]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const strip = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim();
export function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ---------- content loading ----------
export const readJSON = (p) => JSON.parse(fs.readFileSync(path.join(CONTENT, p), 'utf8'));
export function readCollection(dir) {
  const full = path.join(CONTENT, dir);
  if (!fs.existsSync(full)) return [];
  return fs.readdirSync(full)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .map((f) => {
      const { data, content } = matter(fs.readFileSync(path.join(full, f), 'utf8'));
      const slug = data.slug || f.replace(/\.md$/, '');
      for (const k of Object.keys(data)) if (data[k] instanceof Date) data[k] = data[k].toISOString().slice(0, 10);
      return { ...data, slug, body: content, file: path.join('content', dir, f) };
    })
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || String(a.title).localeCompare(b.title));
}

// ---------- links ----------
const depth = (route) => route.split('/').filter((x) => x && !x.includes('.')).length;
export function rel() { return depth(ctx.route) ? '../'.repeat(depth(ctx.route)) : './'; }
/** Link to an internal route like "get-help/found-a-dog/" (optionally with #hash). */
export function href(target = '') {
  let [p, hash] = target.replace(/^\//, '').split('#');
  if (p && !p.endsWith('/') && !p.includes('.')) p += '/';
  let out;
  if (ctx.links === 'pretty') out = '/' + p; // root-absolute: works from any URL, including 404 pages
  else out = p.includes('.') ? rel() + p : rel() + p + 'index.html';
  if (ctx.links !== 'pretty') out = out.replace(/^\.\/(?=.)/, '');
  return hash ? `${out}#${hash}` : out;
}
// css/js get a content hash (?v=) so browsers pick up changes right after each deploy
const _ver = {};
function assetVersion(p) {
  if (!/\.(css|js)$/.test(p)) return '';
  if (!(p in _ver)) {
    try { _ver[p] = '?v=' + createHash('sha1').update(readFileSync(new URL('../assets/' + p, import.meta.url))).digest('hex').slice(0, 8); }
    catch { _ver[p] = ''; }
  }
  return _ver[p];
}
export const asset = (p) => (ctx.links === 'pretty' ? '/' : rel()) + 'assets/' + p + assetVersion(p);
export const isCurrent = (section) => ctx.route.startsWith(section);

// ---------- markdown ----------
const renderer = new marked.Renderer();
renderer.heading = function ({ tokens, depth }) {
  const text = this.parser.parseInline(tokens);
  return `<h${depth} id="${slugify(strip(text))}">${text}</h${depth}>\n`;
};
renderer.link = function ({ href: h, title, tokens }) {
  const text = this.parser.parseInline(tokens);
  if (/^https?:\/\//.test(h)) {
    return `<a href="${esc(h)}" target="_blank" rel="noopener"${title ? ` title="${esc(title)}"` : ''}>${text}<span class="visually-hidden"> (${ctx.t('externalLink')})</span></a>`;
  }
  if (h.startsWith('/')) h = href(h);
  return `<a href="${esc(h)}">${text}</a>`;
};
renderer.blockquote = function ({ tokens }) {
  const inner = this.parser.parse(tokens);
  const local = /^<p><strong>(In Miami-Dade|Miami-Dade|In Broward|South Florida|Florida)/.test(inner.trim());
  return `<aside class="note${local ? ' note--local' : ''}">${local ? `<span class="tag tag--local">${icon('map', { size: 16 })} Local</span>` : ''}${inner}</aside>\n`;
};
marked.use({ renderer, gfm: true });
/** {{preview: …}} in content renders as a preview note, and disappears in live builds. */
const previewTokens = (s) => s.replace(/\{\{preview:\s*([\s\S]*?)\}\}/g, (_, x) =>
  ctx.mode === 'preview' ? `\n\n<aside class="preview-note" role="note"><strong>Preview note:</strong> ${marked.parseInline(x.trim())}</aside>\n\n` : '');
export const md = (s = '') => marked.parse(previewTokens(s));
export const isEmptyBody = (s = '') => !previewTokens(s).trim();
export const mdInline = (s = '') => marked.parseInline(s);

/** Split markdown into sections at each "## " heading. */
export function sections(body) {
  const parts = body.split(/^## /m);
  const intro = parts.shift().trim();
  return {
    intro,
    sections: parts.map((p) => {
      const nl = p.indexOf('\n');
      const title = p.slice(0, nl).trim();
      return { title, id: slugify(title), body: p.slice(nl + 1).trim() };
    }),
  };
}

// ---------- components ----------
export const tag = (label, variant = '') =>
  `<span class="tag${variant ? ` tag--${variant}` : ''}"><span class="tag__hole" aria-hidden="true"></span>${label}</span>`;

/** Visible only in preview builds. */
export function previewNote(html, { inline = false } = {}) {
  if (ctx.mode !== 'preview') return '';
  const El = inline ? 'span' : 'aside';
  return `<${El} class="preview-note${inline ? ' preview-note--inline' : ''}" role="note"><strong>${ctx.t('previewNote')}:</strong> ${html}</${El}>`;
}
export const needsConfirm = () => (ctx.mode === 'preview' ? `<span class="confirm-chip">${ctx.t('needsConfirm')}</span>` : '');
/** True if a value should render: verified, or we're in preview. */
export const show = (verified) => verified || ctx.mode === 'preview';

export function ext(url, label, cls = '') {
  return `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener">${label}<span class="visually-hidden"> (${ctx.t('externalLink')})</span>${icon('external', { size: 15, cls: 'icon-ext' })}</a>`;
}
export function button(label, target, { variant = 'primary', ic = '', externalLink = false } = {}) {
  if (externalLink) return `<a class="btn btn--${variant}" href="${esc(target)}" target="_blank" rel="noopener">${ic ? icon(ic, { size: 20 }) : ''}<span>${label}</span><span class="visually-hidden"> (${ctx.t('externalLink')})</span></a>`;
  return `<a class="btn btn--${variant}" href="${href(target)}">${ic ? icon(ic, { size: 20 }) : ''}<span>${label}</span></a>`;
}
export function breadcrumb(items) {
  ctx.crumbs = items; // used by layout.mjs for BreadcrumbList structured data
  return `<nav class="breadcrumb" aria-label="Breadcrumb"><ol>${items.map((it, i) =>
    i === items.length - 1 ? `<li><span aria-current="page">${esc(it[0])}</span></li>` : `<li><a href="${href(it[1])}">${esc(it[0])}</a></li>`).join('')}</ol></nav>`;
}
export function sourcesList(sources = [], lastReviewed) {
  if (!sources.length && !lastReviewed) return '';
  return `<section class="sources" aria-labelledby="sources-h">
    <h2 id="sources-h" class="sources__h">${ctx.t('sources')}</h2>
    ${lastReviewed ? `<p class="reviewed">${icon('clock', { size: 18 })} ${ctx.t('lastReviewed')}: <time datetime="${lastReviewed}">${fmtDate(lastReviewed)}</time></p>` : ''}
    <ul>${sources.map((s) => `<li>${ext(s.url, esc(s.title))}${s.org ? ` <span class="muted">· ${esc(s.org)}</span>` : ''}</li>`).join('')}</ul>
    <p class="muted small">This is general information to help you act quickly and safely. It isn't veterinary or legal advice. Rules and services change, so check with the agency or clinic directly.</p>
  </section>`;
}
export const paw = (cls = '') => `<svg class="paw ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><ellipse cx="12" cy="16" rx="4.4" ry="3.7"/><ellipse cx="5.9" cy="10.8" rx="1.8" ry="2.3"/><ellipse cx="9.4" cy="6.9" rx="1.8" ry="2.4"/><ellipse cx="14.6" cy="6.9" rx="1.8" ry="2.4"/><ellipse cx="18.1" cy="10.8" rx="1.8" ry="2.3"/></svg>`;
export function pawTrail(cls = '') {
  return `<div class="paw-trail ${cls}" aria-hidden="true">${[0, 1, 2, 3, 4].map((i) => paw(i % 2 ? 'paw--r' : 'paw--l')).join('')}</div>`;
}
/** The main circular logo; swaps to the light-lettering version in dark mode. */
export function logo(cls = '', { alt = "Bentley's Playhouse Animal Rescue", eager = false } = {}) {
  const l = eager ? '' : ' loading="lazy"';
  return `<span class="logo ${cls}"><img class="logo__l" src="${asset('img/logo-main.png')}" alt="${alt}" width="720" height="714"${l}><img class="logo__d" src="${asset('img/logo-main-dark.png')}" alt="${alt}" width="720" height="714"${l}></span>`;
}
export { icon };
