// Build the static site:  node src/build.mjs [--live] [--pretty] [--out dist]
//   default            → preview build (shows "Needs confirmation" items, links to folder/index.html)
//   --live             → live build (hides unverified items, allows indexing)
//   --pretty           → links as /folder/ (use when hosting on Netlify, Cloudflare Pages, etc.)
import fs from 'node:fs';
import path from 'node:path';
import { ctx, ROOT, readJSON, readCollection, md, strip, href } from './lib/core.mjs';
import { page } from './lib/layout.mjs';
import * as P from './lib/pages.mjs';
import * as P2 from './lib/pages2.mjs';
import * as P3 from './lib/pages3.mjs';
import { renderShare } from './lib/covers.mjs';
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
    return { date: r.date, type, category: r.category, description: r.description, amount: amount || 0, party: r.paid_to_or_from, dog: r.dog, receipt: r.receipt, notes: r.notes };
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
  ctx.crumbs = null;
  // every page gets its own 1200×630 share image (title + topic art, or the dog's photo)
  if (!opts.noindex && !opts.ogImage) {
    const name = route.replace(/\/$/, '').replace(/\//g, '--') || 'home';
    opts = { ...opts, ogImage: `og/${name}.png` };
    shareJobs.push({ file: path.join(OUT, 'assets', opts.ogImage), title: opts.shareTitle || opts.title, kicker: opts.shareKicker || "Bentley's Playhouse", category: opts.shareCategory || 'default', icon: opts.shareIcon, photo: opts.sharePhoto });
  }
  const { html, fragment } = page({ ...opts, body: typeof opts.body === 'function' ? opts.body() : opts.body });
  const file = route.endsWith('.html') ? path.join(OUT, route) : path.join(OUT, route, 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  if (route === '' && ctx.mode === 'preview') fs.writeFileSync(path.join(OUT, '_artifact-home.html'), fragment);
  if (!opts.noindex) sitemap.push(route);
  count++;
}

emit('', { home: true, bodyClass: 'home', title: 'Home', shareTitle: 'We support the pups, and the heroes who help them', shareKicker: 'Miami dog rescue',
  description: "Bentley's Playhouse is a Miami dog rescue. Rescue, rehab, rehome, plus practical help if you've found, lost or rescued a dog.", body: () => P.home(data), scripts: ['js/pawsome.js'] });
emit('pawsome-pooches/', { shareTitle: 'Pawsome Pooches: dogs in our community who need a home', shareKicker: 'Updated weekly', shareCategory: 'adopt-foster', sharePhoto: (() => { const d = pooches.find((x) => x.status !== 'adopted' && x.photos[0]); return d && (d.sharePhoto || d.photos[0]); })(), title: 'Pawsome Pooches', description: 'Adoptable dogs in our community, updated weekly: Miami-Dade Animal Services (Doral and Medley), the Broward shelter, local rescues and families rehoming safely.', bodyClass: 'is-pawsome', body: () => P3.pawsomePage(pooches), scripts: ['js/pawsome.js'] });
for (const d of pooches) emit(`pawsome-pooches/${d.slug}/`, { title: `${d.name} · Pawsome Pooches`, shareTitle: d.status === 'adopted' ? `${d.name} found a home!` : `Meet ${d.name}`, shareKicker: d.status === 'adopted' ? 'Pawsome Pooches · Happy tail' : 'Pawsome Pooches · Adopt me', shareCategory: 'adopt-foster', sharePhoto: d.sharePhoto || d.photos[0], description: d.tagline || `Meet ${d.name}, looking for a home.`, bodyClass: 'is-pawsome', body: () => P3.pawsomeDogPage(d), scripts: ['js/pawsome.js'] });
emit('rescues-you-can-help/', { title: 'Rescues You Can Help', description: 'Miami-Dade rescues and shelters you can support by fostering, volunteering, sharing or sending supplies.', body: () => P3.rescuesPage(rescues) });
emit('get-help/', { title: 'Get Help', description: 'Step-by-step help if you found a dog, lost your dog, rescued a dog, or a dog is hurt or in danger in Miami-Dade.', body: () => P.helpHub(data) });
for (const g of guides) emit(`get-help/${g.slug}/`, { shareKicker: 'Get Help', shareCategory: g.category || 'lost-found', title: g.title, seoTitle: g.seoTitle, ogType: 'article', modified: g.lastReviewed, description: g.summary, bodyClass: 'is-guide', body: () => P.guide(g, data) });
emit('adopt-foster/', { title: 'Adopt & Foster', description: pages.adopt.summary, body: () => P.adopt(data) });
for (const d of dogs) emit(`adopt-foster/dogs/${d.slug}/`, { title: d.name, description: d.summary || `Meet ${d.name}.`, body: () => P.dogPage(d) });
emit('resources/', { title: 'Resource Library', description: 'Searchable guides, printable checklists and trusted resources for dog rescue, lost and found, adoption and care in Miami and beyond.', body: () => P.library(data), scripts: [] });
for (const a of articles) emit(`resources/${a.slug}/`, { shareKicker: catLabel(a.category) || 'Resource Library', shareCategory: a.category, shareIcon: a.icon, title: a.title, seoTitle: a.seoTitle, ogType: 'article', modified: a.lastReviewed, description: a.summary, body: () => P.article(a, data) });
for (const c of checklists) emit(`resources/checklists/${c.slug}/`, { shareKicker: 'Printable checklist', shareCategory: c.category, shareIcon: c.icon || 'list', title: c.title, description: c.intro, bodyClass: 'is-checklist', body: () => P.checklist(c) });
emit('resources/flyer-builder/', { title: 'Lost & Found Flyer Builder', description: 'Make a printable lost or found dog flyer. Your photo stays on your device.', bodyClass: 'is-flyer', body: () => P.flyer(), scripts: ['js/flyer.js'] });
emit('resources/vet-clinics/', { title: 'Vet Clinic Directory', description: 'Miami-Dade vet clinics and 24/7 emergency hospitals: hours, walk-in policies, phone numbers and addresses.', bodyClass: 'is-clinics', body: () => P2.clinics(clinicData), scripts: ['js/clinics.js'] });
emit('transparency/', { title: 'Where the Money Goes', description: "Every expense Bentley's Playhouse makes, with receipts: food, spay/neuter, medical care, toys and support for other rescues.", bodyClass: 'is-fin', body: () => P2.transparency(finances), scripts: ['js/transparency.js'] });
emit('our-story/', { title: 'Our Story', description: pages.story.summary, body: () => P.story(data) });
emit('get-involved/', { title: 'Get Involved', description: 'Volunteer, foster, donate supplies, share rescue information or offer your skills to Bentley\'s Playhouse.', body: () => P.involved(data) });
emit('donate/', { title: 'Donate', description: 'Support Bentley\'s Playhouse, a volunteer-run dog rescue in Miami: food, spay/neuter, vet care and supplies for dogs in our care.', noindex: !ctx.site.donate.verified, body: () => P.donate() });
emit('contact/', { title: 'Contact & FAQ', description: 'How to reach Bentley\'s Playhouse, what we can help with, and who to call when an animal needs urgent help.', body: () => P.contact(data) });
emit('privacy/', { title: 'Privacy', description: 'How Bentley\'s Playhouse handles the information you share: forms, the flyer builder, checklists and website analytics.', body: () => P.privacy() });
emit('404.html', { title: 'Page not found', description: 'Page not found.', noindex: true, body: () => P.notFound() });

// assets
fs.cpSync(path.join(ROOT, 'src/assets'), path.join(OUT, 'assets'), { recursive: true });
// the public ledger CSV (live data only) and no example files on the live site
fs.mkdirSync(path.join(OUT, 'assets/finances'), { recursive: true });
if (!finances.isExample) {
  const q = (v) => (/[",\n]/.test(String(v ?? '')) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v ?? ''));
  const csv = ['date,type,category,description,amount,paid_to_or_from,dog,receipt,notes', ...finances.rows.map((r) => [r.date, r.type, r.category, r.description, r.amount.toFixed(2), r.party, r.dog, r.receipt, r.notes].map(q).join(','))].join('\n') + '\n';
  fs.writeFileSync(path.join(OUT, 'assets/finances/transactions.csv'), csv);
}
if (ctx.mode === 'live') for (const d of ['receipts', 'statements']) for (const f of fs.readdirSync(path.join(OUT, 'assets/finances', d))) if (f.startsWith('example-')) fs.rmSync(path.join(OUT, 'assets/finances', d, f));
fs.cpSync(path.join(ROOT, 'src/static'), OUT, { recursive: true });
// share images (after assets are copied so dog photos can be read)
const mime = (f) => (/\.png$/i.test(f) ? 'image/png' : /\.webp$/i.test(f) ? 'image/webp' : 'image/jpeg');
for (const j of shareJobs) {
  let photo;
  if (j.photo) { const f = path.join(ROOT, 'src', j.photo.replace(/^\/?/, '').replace(/^assets\//, 'assets/')); if (fs.existsSync(f)) photo = `data:${mime(f)};base64,` + fs.readFileSync(f).toString('base64'); }
  const ok = (await renderShare({ ...j, photo }, j.file)) || (photo && (await renderShare({ ...j, photo: undefined }, j.file)));
  if (!ok) fs.copyFileSync(path.join(ROOT, 'src/assets/img/og-image.png'), j.file);
}
// sitemap + robots
const base = ctx.site.siteUrl.replace(/\/$/, '');
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap.map((r) => `  <url><loc>${base}/${r}</loc></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(OUT, 'robots.txt'), ctx.mode === 'live' ? `User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n');

console.log(`Built ${count} pages (${ctx.mode}, ${ctx.links} links) → ${path.relative(ROOT, OUT)}/`);
