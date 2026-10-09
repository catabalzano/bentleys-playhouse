import crypto from 'node:crypto';
// Build the static site:  node src/build.mjs [--live] [--pretty] [--out dist]
//   default            → preview build (shows "Needs confirmation" items, links to folder/index.html)
//   --live             → live build (hides unverified items, allows indexing)
//   --pretty           → links as /folder/ (use when hosting on Netlify, Cloudflare Pages, etc.)
import fs from 'node:fs';
import path from 'node:path';
import { ctx, ROOT, readJSON, readCollection, md, strip, href, apHtml, apTitle } from './lib/core.mjs';
import { page } from './lib/layout.mjs';
import * as P from './lib/pages.mjs';
import * as P2 from './lib/pages2.mjs';
import * as P3 from './lib/pages3.mjs';
import * as PS from './lib/pawsome-submit.mjs';
import { renderShare } from './lib/covers.mjs';
import { prepEvents, eventsPage } from './lib/events.mjs';
import { parse as parseCSV } from 'csv-parse/sync';

const args = process.argv.slice(2);
ctx.mode = args.includes('--live') ? 'live' : 'preview';
ctx.links = args.includes('--pretty') ? 'pretty' : 'explicit';
const OUT = path.join(ROOT, args.includes('--out') ? args[args.indexOf('--out') + 1] : 'dist');

// ---------- load content ----------
ctx.site = readJSON('site.json');
const strings = readJSON('strings/en.json');
ctx.t = Object.assign((k) => strings[k] ?? k, { all: strings });
ctx.categories = readJSON('categories.json');
ctx.instagram = fs.existsSync(path.join(ROOT, 'content/instagram.json')) ? readJSON('instagram.json').posts : [];

const guides = readCollection('guides');
const articles = readCollection('library');
const checklists = readCollection('checklists').map((c) => ({ ...c, groups: c.groups || [] }));
const dogs = readCollection('dogs');
const stories = readCollection('stories');
const directory = readJSON('directory.json').resources;
const involved = readJSON('involved.json').ways;
const faq = readJSON('faq.json').questions;
const pages = Object.fromEntries(readCollection('pages').map((p) => [p.slug, p]));

const clinicData = readJSON('clinics.json');
const mdas = readJSON('mdas.json');
ctx.mdas = mdas;
const pooches = P3.prepPooches(readCollection('pawsome'));
const rescues = readCollection('rescues');
const events = prepEvents(readCollection('events'));

// ---------- finances (Transparency page) ----------
function loadFinances() {
  const settings = readJSON('finances/settings.json');
  const valid = new Set([...settings.expenseCategories, ...settings.incomeCategories].map((c) => c.id));
  const read = (f) => parseCSV(fs.readFileSync(path.join(ROOT, 'content/finances', f), 'utf8'), { columns: true, skip_empty_lines: true, trim: true });
  // entries added in the admin (content/finances/entries/*.json) plus any rows still in the CSV
  const entryDir = path.join(ROOT, 'content/finances/entries');
  const entries = fs.existsSync(entryDir) ? fs.readdirSync(entryDir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(entryDir, f), 'utf8'))) : [];
  let raw = [...read('transactions.csv'), ...entries.map((e) => ({ ...e, amount: String(e.amount ?? ''), receipt: e.receipt ? path.basename(String(e.receipt)) : '' }))];
  let isExample = false;
  if (!raw.length && ctx.mode === 'preview') { raw = read('example-transactions.csv'); isExample = true; }
  const warnings = [];
  const rows = raw.map((r, i) => {
    const amount = Math.abs(parseFloat(String(r.amount).replace(/[$,]/g, '')));
    const type = /^in/i.test(r.type) ? 'income' : 'expense';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) warnings.push(`row ${i + 2}: date should look like 2026-09-28`);
    if (isNaN(amount)) warnings.push(`row ${i + 2}: amount isn't a number`);
    if (!valid.has(r.category)) warnings.push(`row ${i + 2}: unknown category "${r.category}"`);
    if (r.receipt && !/^https?:/.test(r.receipt) && !fs.existsSync(path.join(ROOT, 'src/assets/finances/receipts', r.receipt))) warnings.push(`row ${i + 2}: receipt file "${r.receipt}" not found`);
    const hideDate = r.hideDate === true || /^(yes|true|1)$/i.test(String(r.hide_date || ''));
    return { date: r.date, hideDate, type, category: r.category, description: r.description, amount: amount || 0, party: r.paid_to_or_from, dog: r.dog, receipt: r.receipt, notes: r.notes };
  }).sort((a, b) => b.date.localeCompare(a.date));
  const docs = (isExample ? readJSON('finances/example-documents.json') : readJSON('finances/documents.json')).documents;
  warnings.forEach((w) => console.warn('  ⚠ ledger ' + w));
  return { rows, isExample, docs, settings, warnings };
}
const finances = loadFinances();

const searchText = (...parts) => parts.filter(Boolean).join(' ').toLowerCase().replace(/\s+/g, ' ').slice(0, 2500);

// Every library entry, in one list (used by Library, Home, related links, search).
const items = [
  ...guides.map((g) => ({ ...g, type: 'guide', route: `get-help/${g.slug}/`,
    searchText: searchText(g.title, g.summary, (g.keywords || []).join(' '), g.steps.map((s) => s.title + ' ' + s.body).join(' '), strip(md(g.body))) })),
  ...articles.map((a) => ({ ...a, type: 'article', route: `resources/${a.slug}/`,
    searchText: searchText(a.title, a.summary, (a.keywords || []).join(' '), strip(md(a.body))) })),
  { slug: 'flyer-builder', type: 'tool', category: 'lost-found', route: 'resources/flyer-builder/', title: 'Lost & found flyer builder',
    summary: 'Add a photo and details, choose what contact info to show, then print or save a flyer.', short: 'Make a printable lost or found flyer', area: 'general', featured: true,
    searchText: 'flyer poster lost found dog print photo sign notice' },
  { slug: 'vet-clinics', type: 'tool', category: 'affordable', route: 'resources/vet-clinics/', title: 'Vet clinic directory',
    summary: 'Hours, walk-in policies, phone numbers and addresses for 6 emergency hospitals and 6 everyday clinics in Miami-Dade.', short: 'Emergency hospitals and everyday clinics', area: 'local', featured: true,
    searchText: 'vet clinic veterinarian emergency hospital 24 hours walk in hours phone address cheap low cost ' + clinicData.clinics.map((c) => c.name + ' ' + c.area).join(' ').toLowerCase() },
  ...checklists.map((c) => ({ ...c, type: 'checklist', route: `resources/checklists/${c.slug}/`, summary: c.intro, short: c.short,
    searchText: searchText(c.title, c.intro, c.groups.flatMap((g) => g.items).join(' ')) })),
  ...directory.filter((d) => d.verified !== false || ctx.mode === 'preview').map((d) => ({ ...d, type: 'link', slug: d.id, searchText: searchText(d.title, d.summary, d.keywords, d.area) })),
];
const data = { pooches, rescues, guides, articles, checklists, dogs, stories, directory: items.filter((i) => i.type === 'link'), involved, faq, pages, items, mdas };

// ---------- write ----------
fs.rmSync(OUT, { recursive: true, force: true });
let count = 0;
const sitemap = [];
const shareJobs = [];
const catLabel = (id) => (ctx.categories.find((c) => c.id === id) || {}).label;
function emit(route, opts) {
  ctx.route = route;
  // page titles and link-preview titles in AP title case
  opts = { ...opts, ...(opts.title ? { title: apTitle(opts.title) } : {}), ...(opts.shareTitle ? { shareTitle: apTitle(opts.shareTitle) } : {}), ...(opts.seoTitle ? { seoTitle: apTitle(opts.seoTitle) } : {}) };
  ctx.crumbs = null;
  // every page gets its own 1200×630 share image (title + topic art, or the dog's photo)
  if (!opts.noindex && !opts.ogImage) {
    const name = route.replace(/\/$/, '').replace(/\//g, '--') || 'home';
    opts = { ...opts, ogImage: `og/${name}.png` };
    shareJobs.push({ file: path.join(OUT, 'assets', opts.ogImage), title: opts.shareTitle || opts.title, kicker: opts.shareKicker || "Bentley's Playhouse", category: opts.shareCategory || 'default', icon: opts.shareIcon, photo: opts.sharePhoto });
  }
  const out = page({ ...opts, body: typeof opts.body === 'function' ? opts.body() : opts.body });
  // AP style everywhere: 5 p.m., 10:30 a.m., noon; Oct. 1, 2026
  const html = apHtml(out.html), fragment = out.fragment && apHtml(out.fragment);
  const file = route.endsWith('.html') ? path.join(OUT, route) : path.join(OUT, route, 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  if (route === '' && ctx.mode === 'preview') fs.writeFileSync(path.join(OUT, '_artifact-home.html'), fragment);
  if (!opts.noindex) sitemap.push(route);
  count++;
}

emit('', { home: true, bodyClass: 'home', title: 'Home', shareTitle: 'We Support the Pups, and the Heroes Who Help Them', shareKicker: 'Miami dog rescue',
  description: "Bentley's Playhouse is a Miami dog rescue. We rescue, rehab and rehome dogs in Miami-Dade, and help you adopt, foster, or help a dog you've found or lost.", body: () => P.home(data), scripts: ['js/pawsome.js', 'js/story.js', 'js/interest.js'] });
emit('pawsome-pooches/', { seoTitle: 'Adoptable Rescue Dogs in Miami: Pawsome Pooches', shareTitle: 'Pawsome Pooches: dogs in our community who need a home', shareKicker: 'Updated weekly', shareCategory: 'adopt-foster', sharePhoto: (() => { const d = pooches.find((x) => x.status !== 'adopted' && x.photos[0]); return d && (d.sharePhoto || d.photos[0]); })(), title: 'Pawsome Pooches', description: 'Adoptable dogs in our community, updated weekly: Miami-Dade Animal Services (Doral and Medley), the Broward shelter, local rescues and families rehoming safely.', bodyClass: 'is-pawsome', body: () => P3.pawsomePage(pooches), scripts: ['js/pawsome.js', 'js/story.js', 'js/interest.js'] });
for (const d of pooches) emit(`pawsome-pooches/${d.slug}/`, { title: `${d.name} · Pawsome Pooches`, shareTitle: d.status === 'adopted' ? `${d.name} found a home!` : `Meet ${d.name}`, shareKicker: d.status === 'adopted' ? 'Pawsome Pooches · Happy tail' : 'Pawsome Pooches · Adopt me', shareCategory: 'adopt-foster', sharePhoto: d.sharePhoto || d.photos[0], description: d.tagline || `Meet ${d.name}, looking for a home.`, bodyClass: 'is-pawsome', body: () => P3.pawsomeDogPage(d), scripts: ['js/pawsome.js', 'js/story.js', 'js/interest.js'] });
// "Mark as adopted" page (link in the "your listing is live" email; asks before changing anything)
emit('pawsome-pooches/adopted/', { title: 'Mark a Pup as Adopted', description: 'Tell Bentley\'s Playhouse a pup found a home.', noindex: true, bodyClass: 'is-pawsome', body: () => P3.adoptedPage(), scripts: ['js/adopted.js'] });
emit('pawsome-pooches/submit/', { title: 'Submit a pup · Pawsome Pooches', shareTitle: 'Submit a pup to Pawsome Pooches', shareKicker: 'Rescues, volunteers & families', shareCategory: 'adopt-foster', description: 'Rescues, shelter volunteers and families can submit a dog who needs a home to be featured on Pawsome Pooches.', bodyClass: 'is-pawsome', body: () => PS.pawsomeSubmitPage(), scripts: ['js/pawsome-submit.js'] });
emit('rescues-you-can-help/', { title: 'Rescues You Can Help', seoTitle: 'Miami Dog Rescues You Can Help', description: 'Miami-Dade rescues and shelters you can support by fostering, volunteering, sharing or sending supplies.', body: () => P3.rescuesPage(rescues) });
emit('get-help/', { title: 'Get Help', description: 'Step-by-step help if you found a dog, lost your dog, rescued a dog, or a dog is hurt or in danger in Miami-Dade.', body: () => P.helpHub(data) });
for (const g of guides) emit(`get-help/${g.slug}/`, { shareKicker: 'Get Help', sharePhoto: g.cover && 'assets/img/covers/' + g.cover, shareCategory: g.category || 'lost-found', title: g.title, seoTitle: g.seoTitle, ogType: 'article', modified: g.lastReviewed, description: g.summary, bodyClass: 'is-guide', body: () => P.guide(g, data) });
emit('adopt-foster/', { title: 'Adopt & Foster', seoTitle: 'Adopt or Foster a Rescue Dog in Miami', description: pages.adopt.summary, body: () => P.adopt(data) });
for (const d of dogs) emit(`adopt-foster/dogs/${d.slug}/`, { title: d.name, description: d.summary || `Meet ${d.name}.`, body: () => P.dogPage(d) });
emit('resources/', { title: 'Resource Library', description: 'Searchable guides, printable checklists and trusted resources for dog rescue, lost and found, adoption and care in Miami and beyond.', body: () => P.library(data), scripts: [] });
for (const a of articles) emit(`resources/${a.slug}/`, { shareKicker: catLabel(a.category) || 'Resource Library', shareCategory: a.category, shareIcon: a.icon, sharePhoto: a.cover && 'assets/img/covers/' + a.cover, title: a.title, seoTitle: a.seoTitle, ogType: 'article', modified: a.lastReviewed, description: a.summary, body: () => P.article(a, data) });
for (const c of checklists) emit(`resources/checklists/${c.slug}/`, { shareKicker: 'Printable checklist', shareCategory: c.category, shareIcon: c.icon || 'list', sharePhoto: c.cover && 'assets/img/covers/' + c.cover, title: c.title, description: c.intro, bodyClass: 'is-checklist', body: () => P.checklist(c) });
emit('resources/flyer-builder/', { title: 'Lost & Found Flyer Builder', description: 'Make a printable lost or found dog flyer. Your photo stays on your device.', bodyClass: 'is-flyer', body: () => P.flyer(), scripts: ['js/flyer.js'] });
emit('resources/vet-clinics/', { title: 'Vet Clinic Directory', description: 'Miami-Dade vet clinics and 24/7 emergency hospitals: hours, walk-in policies, phone numbers and addresses.', bodyClass: 'is-clinics', body: () => P2.clinics(clinicData), scripts: ['js/clinics.js'] });
emit('events/', { title: 'Community Calendar', shareTitle: 'Dog events in South Florida', shareKicker: 'Community Calendar', description: 'Free and low-cost dog events in Miami-Dade and Broward: spay/neuter clinics, vaccine days, adoption events and dog walks.', bodyClass: 'is-events', body: () => eventsPage(events), scripts: ['js/events.js'] });
emit('transparency/', { title: 'Where the Money Goes', description: "Every expense Bentley's Playhouse makes, with receipts: food, spay/neuter, medical care, toys and support for other rescues.", bodyClass: 'is-fin', body: () => P2.transparency(finances), scripts: ['js/transparency.js'] });
emit('our-story/', { title: 'Our Story', seoTitle: 'Our Story: A Grassroots Miami Dog Rescue', description: pages.story.summary, body: () => P.story(data) });
emit('get-involved/', { title: 'Get Involved', seoTitle: 'Ways to Help Dogs in Miami', description: 'Volunteer, foster, donate supplies, share rescue information or offer your skills to Bentley\'s Playhouse.', body: () => P.involved(data) });
emit('donate/', { title: 'Donate', description: 'Support Bentley\'s Playhouse, a volunteer-run dog rescue in Miami: food, spay/neuter, vet care and supplies for dogs in our care.', noindex: !ctx.site.donate.verified, body: () => P.donate() });
emit('contact/', { title: 'Contact & FAQ', description: 'How to reach Bentley\'s Playhouse, what we can help with, and who to call when an animal needs urgent help.', body: () => P.contact(data) });
emit('privacy/', { title: 'Privacy Policy', description: 'How Bentley\'s Playhouse handles the information you share: forms, pup submissions, donations, analytics and your choices.', body: () => P.privacy() });
emit('terms/', { title: 'Terms of Use', description: 'The ground rules for using the Bentley\'s Playhouse website: guidance, listings, submissions and donations.', body: () => P.terms() });
emit('cookies/', { title: 'Cookie Policy', description: 'Which cookies and browser storage the Bentley\'s Playhouse website uses, and how to change your choice.', body: () => P.cookies() });
emit('404.html', { title: 'Page not found', description: 'Page not found.', noindex: true, body: () => P.notFound() });

// assets
fs.cpSync(path.join(ROOT, 'src/assets'), path.join(OUT, 'assets'), { recursive: true });
// lighter photos: big phone photos are resized (max 1600px) and recompressed in the published copy only
await (async () => {
  let sharp; try { sharp = (await import('sharp')).default; } catch (e) { console.log('Photos: sharp not installed, skipping'); return; }
  const files = [];
  const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.(jpe?g|png|webp)$/i.test(f.name) && fs.statSync(p).size > 200 * 1024) files.push(p); } };
  for (const dir of ['img', 'uploads']) if (fs.existsSync(path.join(OUT, 'assets', dir))) walk(path.join(OUT, 'assets', dir));
  let before = 0, after = 0;
  for (const f of files) {
    try {
      const buf = fs.readFileSync(f); const img = sharp(buf, { failOn: 'none' }).rotate(); const meta = await img.metadata();
      if (/\.png$/i.test(f) && meta.hasAlpha) continue; // logos and cut-outs keep their transparency as is
      let pipe = img.resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true });
      pipe = /\.png$/i.test(f) ? pipe.png({ compressionLevel: 9, palette: true, quality: 85 }) : /\.webp$/i.test(f) ? pipe.webp({ quality: 78 }) : pipe.jpeg({ quality: 78, mozjpeg: true });
      const out = await pipe.toBuffer();
      before += buf.length;
      if (out.length < buf.length) { fs.writeFileSync(f, out); after += out.length; } else after += buf.length;
    } catch (e) { /* leave the original */ }
  }
  if (files.length) console.log(`Photos: ${files.length} resized, ${(before / 1048576).toFixed(1)} MB → ${(after / 1048576).toFixed(1)} MB`);
})();
// the public ledger CSV (live data only) and no example files on the live site
fs.mkdirSync(path.join(OUT, 'assets/finances'), { recursive: true });
if (!finances.isExample) {
  const q = (v) => (/[",\n]/.test(String(v ?? '')) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v ?? ''));
  const csv = ['date,type,category,description,amount,paid_to_or_from,dog,receipt,notes', ...finances.rows.map((r) => [r.hideDate ? '' : r.date, r.type, r.category, r.description, r.amount.toFixed(2), r.party, r.dog, r.receipt, r.notes].map(q).join(','))].join('\n') + '\n';
  fs.writeFileSync(path.join(OUT, 'assets/finances/transactions.csv'), csv);
}
if (ctx.mode === 'live') for (const d of ['receipts', 'statements']) for (const f of fs.readdirSync(path.join(OUT, 'assets/finances', d))) if (f.startsWith('example-')) fs.rmSync(path.join(OUT, 'assets/finances', d, f));
fs.cpSync(path.join(ROOT, 'src/static'), OUT, { recursive: true });
// the admin reads its service URL (and the money categories) from here
{
  const fin = readJSON('finances/settings.json');
  const cats = [...fin.expenseCategories.map((c) => ({ value: c.id, label: 'Spending · ' + c.label })), ...fin.incomeCategories.map((c) => ({ value: c.id, label: 'Income · ' + c.label }))];
  fs.writeFileSync(path.join(OUT, 'build.json'), JSON.stringify({ t: Date.now() }));
  fs.writeFileSync(path.join(OUT, 'admin/config.js'), `window.BP_ADMIN=${JSON.stringify({ api: (ctx.site.pawsome && ctx.site.pawsome.submitEndpoint) || '', categories: cats })};\n`);
  // cache-bust the admin's own files so browsers always load the newest version
  const ah = path.join(OUT, 'admin/index.html');
  const v = (f) => crypto.createHash('sha1').update(fs.readFileSync(path.join(OUT, 'admin', f))).digest('hex').slice(0, 8);
  fs.writeFileSync(ah, fs.readFileSync(ah, 'utf8').replace(/(admin\.(?:js|css)|config\.js)"/g, (m, f) => `${f}?v=${f === 'config.js' ? Date.now().toString(36) : v(f)}"`));
}
// share images (after assets are copied so dog photos can be read)
const mime = (f) => (/\.png$/i.test(f) ? 'image/png' : /\.webp$/i.test(f) ? 'image/webp' : 'image/jpeg');
for (const j of shareJobs) {
  let photo;
  if (j.photo) { const f = path.join(ROOT, 'src', j.photo.replace(/^\/?/, '').replace(/^assets\//, 'assets/')); if (fs.existsSync(f)) photo = `data:${mime(f)};base64,` + fs.readFileSync(f).toString('base64'); }
  const ok = (await renderShare({ ...j, photo }, j.file)) || (photo && (await renderShare({ ...j, photo: undefined }, j.file)));
  if (!ok) fs.copyFileSync(path.join(ROOT, 'src/assets/img/og-image.png'), j.file);
}
// a light JPEG copy of each pup's share card, used at the top of the emails we send about that pup
try {
  const sharp = (await import('sharp')).default;
  for (const j of shareJobs) if (/og\/pawsome-pooches--[^/]+\.png$/.test(j.file) && fs.existsSync(j.file)) await sharp(j.file).jpeg({ quality: 80, mozjpeg: true }).toFile(j.file.replace(/\.png$/, '.jpg'));
} catch (e) { console.log('Email cards skipped:', e.message); }
// Spanish site (/es/): translate every indexable English page with content/i18n/es.json
const base = ctx.site.siteUrl.replace(/\/$/, '');
const CONTENT_DIR = path.join(ROOT, 'content');
const esOn = (ctx.site.languages || []).some((l) => l.code === 'es' && l.enabled) || process.argv.includes('--es');
const esRoutes = [];
if (esOn && fs.existsSync(path.join(CONTENT_DIR, 'i18n/es.json'))) {
  const { translatePage, collect } = await import('./lib/i18n.mjs');
  // es.json = Spanish written or approved by a person; es-auto.json = automatic translations (worker/src/translate.js). People win.
  const autoFile = path.join(CONTENT_DIR, 'i18n/es-auto.json');
  const dict = { ...(fs.existsSync(autoFile) ? JSON.parse(fs.readFileSync(autoFile, 'utf8')) : {}), ...JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'i18n/es.json'), 'utf8')) };
  const jsDict = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'i18n/es-js.json'), 'utf8'));
  fs.writeFileSync(path.join(OUT, 'assets/js/i18n-es.js'), `window.BP_ES=${JSON.stringify(jsDict)};window.BP_T=function(s){return (window.BP_ES&&window.BP_ES[s])||s;};\n`);
  const all = new Set();
  for (const r of sitemap) {
    const src = path.join(OUT, r, 'index.html');
    const html = fs.readFileSync(src, 'utf8');
    collect(html, all);
    const outFile = path.join(OUT, 'es', r, 'index.html');
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, translatePage(html, dict, r, base, (ctx.links === 'pretty' ? '/' : '../'.repeat(r.split('/').filter(Boolean).length + 1)) + 'assets/js/i18n-es.js'));
    esRoutes.push('es/' + r);
  }
  const missing = [...all].filter((k) => !dict[k]);
  fs.writeFileSync(path.join(ROOT, 'tmp-missing-es.json'), JSON.stringify(Object.fromEntries(missing.map((k) => [k, ''])), null, 1));
  // public list of English text still waiting for Spanish; the worker translates it automatically
  fs.mkdirSync(path.join(OUT, 'i18n'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'i18n/missing-es.json'), JSON.stringify(missing));
  // dog names must stay as they are in Spanish (Snow is not "Nieve"); the worker rejects translations that drop one
  const dogNames = new Set();
  for (const dir of ['pawsome', 'dogs']) {
    const d = path.join(CONTENT_DIR, dir);
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) {
      if (!f.endsWith('.md') || f.startsWith('_')) continue;
      const txt = fs.readFileSync(path.join(d, f), 'utf8');
      const m = txt.match(/^name:\s*["']?(.+?)["']?\s*(#.*)?$/m);
      if (m) m[1].split(/\s*(?:&|,|\band\b)\s*/).forEach((n) => n.trim() && dogNames.add(n.trim()));
      // rescue/shelter names (e.g. location.name "Joy and Love Rescue") must also come through exactly
      for (const o of txt.matchAll(/^\s+name:\s*["']?(.+?)["']?\s*(#.*)?$/gm)) if (o[1].trim() && !/^(their|his|her|my|our)\b/i.test(o[1].trim())) dogNames.add(o[1].trim());
    }
  }
  const rescDir = path.join(CONTENT_DIR, 'rescues');
  if (fs.existsSync(rescDir)) for (const f of fs.readdirSync(rescDir)) if (f.endsWith('.md') && !f.startsWith('_')) { const m = fs.readFileSync(path.join(rescDir, f), 'utf8').match(/^name:\s*["']?(.+?)["']?\s*(#.*)?$/m); if (m) dogNames.add(m[1].trim()); }
  const storyDir = path.join(CONTENT_DIR, 'stories');
  if (fs.existsSync(storyDir)) for (const f of fs.readdirSync(storyDir)) if (f.endsWith('.md') && !f.startsWith('_')) { const n = f.replace(/\.md$/, '').split('-')[0]; dogNames.add(n.charAt(0).toUpperCase() + n.slice(1)); }
  fs.writeFileSync(path.join(OUT, 'i18n/names.json'), JSON.stringify([...dogNames].sort()));
  console.log(`Spanish: ${esRoutes.length} pages, ${all.size - missing.length}/${all.size} strings translated${missing.length ? ` (${missing.length} missing → tmp-missing-es.json)` : ''}`);
}
sitemap.push(...esRoutes);

// Pawsome Pooches: what the submissions service needs to know about each pup (rescue contacts for "I want to adopt")
{
  const abs = (u) => (u ? (/^https?:/.test(u) ? u : base + (u.startsWith('/') ? u : '/assets/img/' + u)) : '');
  const idx = {};
  for (const d of pooches) {
    const c = d.contact || {};
    idx[d.slug] = { name: d.name, status: d.status || 'available', needs: d.needs || 'adoption', url: `${base}/pawsome-pooches/${d.slug}/`, photo: `${base}/assets/og/pawsome-pooches--${d.slug}.jpg`, locType: d.loc.type, submissionId: d.submissionId || '',
      rescue: d.loc.type === 'family' ? null : { name: d.loc.name || d.loc.meta.long || d.loc.meta.label, city: d.loc.city || '', email: c.email || '', phone: c.phone || '', instagram: c.instagram || '', website: c.website || (/^https?:/.test(d.loc.url || '') ? d.loc.url : '') } };
  }
  fs.writeFileSync(path.join(OUT, 'pawsome-pooches/pups.json'), JSON.stringify(idx));
  // old links keep working when a pup's page is renamed (front matter: oldSlugs)
  const redirect = (to) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Moved</title><meta name="robots" content="noindex"><link rel="canonical" href="${to}"><meta http-equiv="refresh" content="0; url=${to}"><script>location.replace(${JSON.stringify(to)} + location.search + location.hash)</script></head><body><p><a href="${to}">This page moved here.</a></p></body></html>`;
  for (const d of pooches) for (const old of [].concat(d.oldSlugs || [])) {
    if (!/^[a-z0-9-]+$/.test(old) || old === d.slug) continue;
    for (const pre of ['', ...(esRoutes.length ? ['es/'] : [])]) {
      const f = path.join(OUT, pre, 'pawsome-pooches', old, 'index.html');
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, redirect(`${base}/${pre}pawsome-pooches/${d.slug}/`));
    }
  }
}
// sitemap + robots
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap.map((r) => `  <url><loc>${base}/${r}</loc></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(OUT, 'robots.txt'), ctx.mode === 'live' ? `User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n');

console.log(`Built ${count} pages (${ctx.mode}, ${ctx.links} links) → ${path.relative(ROOT, OUT)}/`);
