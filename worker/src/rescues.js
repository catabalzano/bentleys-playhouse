// Rescue contacts: a private address book of the rescues and fosters who list pups on Pawsome Pooches.
// Filled in automatically: every submission for a pup that's with a rescue, a foster or "other" adds
// (or updates) that rescue here, with the person who sent it in. Admins can also add, edit and delete.
//
//  GET    /api/rescues              admin: all rescue contacts, A–Z
//  POST   /api/rescues              admin: add one by hand
//  PUT    /api/rescues/:id          admin: edit (name, emails, phones, socials, website, city, notes)
//  DELETE /api/rescues/:id          admin: remove from the list
//  POST   /api/rescues/import       admin: (re)collect from every submission and every pup on the website
import { sessionOk } from './admin.js';
import { pupsIndex } from './mail.js';

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const fail = (msg, status = 400) => Object.assign(new Error(msg), { publicMessage: msg, status });
const clean = (v, max = 200) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
const cleanLong = (v, max = 3000) => String(v == null ? '' : v).replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/\b(the|inc|llc|corp)\b/g, '').replace(/[^a-z0-9]/g, '');
const digits = (s) => String(s || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
const handle = (s) => { s = String(s || '').trim(); const m = /instagram\.com\/([\w.]+)/i.exec(s); return (m ? m[1] : s).replace(/^@/, '').toLowerCase(); };
const newId = () => 'r' + Date.now().toString(36) + crypto.randomUUID().slice(0, 6);
const uniq = (arr, key = (x) => x) => { const seen = new Set(); return arr.filter((x) => { const k = key(x); if (!x || !k || seen.has(k)) return false; seen.add(k); return true; }); };

async function all(env) {
  const out = [];
  let cursor;
  do {
    const page = await env.SUBMISSIONS.list({ prefix: 'rescue:', cursor });
    for (const k of page.keys) { const r = await env.SUBMISSIONS.get(k.name, 'json'); if (r) out.push(r); }
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  return out;
}
const save = (env, r) => env.SUBMISSIONS.put(`rescue:${r.id}`, JSON.stringify(r));

/** The same rescue = same email, same phone, same Instagram or the same name (ignoring caps, spaces, "the", "inc"). */
function findMatch(list, c) {
  const e = (c.emails || []).map((x) => x.toLowerCase()), p = (c.phones || []).map(digits).filter((x) => x.length >= 7), s = (c.socials || []).map(handle).filter(Boolean), n = norm(c.name);
  return list.find((r) => (n && norm(r.name) === n)
    || r.emails.some((x) => e.includes(x.toLowerCase()))
    || r.phones.some((x) => p.includes(digits(x)))
    || r.socials.some((x) => s.includes(handle(x))));
}

/** Add what we just learned about a rescue to the address book (never removes or overwrites what's there). */
async function merge(env, list, c) {
  const now = new Date().toISOString();
  let r = findMatch(list, c);
  if (!r) {
    r = { id: newId(), name: c.name, type: c.type || 'rescue', emails: [], phones: [], socials: [], website: '', cities: [], people: [], pups: [], notes: '', firstSeen: c.at || now, lastSeen: c.at || now, addedBy: c.addedBy || 'auto' };
    list.push(r);
  }
  if (c.name && (!r.name || (r.name === r.name.toLowerCase() && c.name !== c.name.toLowerCase()))) r.name = c.name; // prefer "Lotus Gold" over "lotus gold"
  r.emails = uniq([...r.emails, ...(c.emails || []).filter(isEmail)], (x) => x.toLowerCase());
  r.phones = uniq([...r.phones, ...(c.phones || []).filter((x) => digits(x).length >= 7)], digits);
  r.socials = uniq([...r.socials, ...(c.socials || []).map((x) => clean(x, 100)).filter(Boolean)], handle);
  if (!r.website && c.website) r.website = c.website;
  r.cities = uniq([...(r.cities || []), ...(c.cities || []).filter(Boolean)], (x) => x.toLowerCase());
  if (c.person && (c.person.name || c.person.email)) r.people = uniq([...r.people, c.person], (x) => (x.email || x.name || '').toLowerCase());
  if (c.pup && c.pup.name) {
    const i = r.pups.findIndex((x) => (c.pup.submissionId && x.submissionId === c.pup.submissionId) || (c.pup.slug && x.slug === c.pup.slug) || (!x.slug && !x.submissionId && x.name === c.pup.name));
    if (i > -1) r.pups[i] = { ...r.pups[i], ...Object.fromEntries(Object.entries(c.pup).filter(([, v]) => v)) };
    else r.pups.push(c.pup);
  }
  if ((c.at || now) < r.firstSeen) r.firstSeen = c.at;
  if ((c.at || now) > r.lastSeen) r.lastSeen = c.at || now;
  await save(env, r);
  return r;
}

/** From a Pawsome Pooches submission (pending, approved or rejected). Family rehomings and shelters are skipped. */
function fromSubmission(rec) {
  const D = rec.dog || {}, S = rec.submitter || {};
  if (!['rescue', 'foster', 'other'].includes(D.locationType) || !D.orgName) return null;
  return {
    name: D.orgName, type: D.locationType, emails: [D.orgEmail], phones: [D.orgPhone], socials: [D.orgSocial], website: D.orgUrl || '', cities: [D.city], at: rec.createdAt,
    person: { name: [S.firstName, S.lastName].filter(Boolean).join(' '), email: S.email || '', phone: S.phone || '', social: S.social || '', at: rec.createdAt },
    pup: { name: D.name, submissionId: rec.id, slug: (rec.published && rec.published.slug) || '', url: (rec.published && rec.published.url) || '', status: rec.status, at: rec.createdAt },
  };
}

/** Called by /submit and by approve: keeps the address book up to date. Never throws. */
export async function logRescueFromSubmission(env, rec) {
  try { const c = fromSubmission(rec); if (c) await merge(env, await all(env), c); } catch (e) { console.error('rescue log', e && e.message); }
}

async function importAll(env) {
  const list = await all(env);
  const before = list.length;
  let cursor;
  do {
    const page = await env.SUBMISSIONS.list({ prefix: 'sub:', cursor });
    for (const k of page.keys) { const rec = await env.SUBMISSIONS.get(k.name, 'json'); const c = rec && fromSubmission(rec); if (c) await merge(env, list, c); }
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  // pups already on the website (some were added by hand in the admin, without a submission)
  const pups = await pupsIndex(env);
  for (const [slug, p] of Object.entries(pups)) {
    const R = p.rescue;
    if (!R || !R.name || p.locType === 'family' || /^(mdas|broward)/.test(p.locType || '')) continue;
    await merge(env, list, { name: R.name, type: p.locType || 'rescue', emails: [R.email], phones: [R.phone], socials: R.instagram ? ['@' + handle(R.instagram)] : [], website: R.website || '', cities: [R.city], pup: { name: p.name, slug, url: p.url, status: p.status, submissionId: p.submissionId || '' } });
  }
  return { added: list.length - before, total: list.length };
}

function fromBody(b) {
  const lines = (v) => (Array.isArray(v) ? v : String(v || '').split(/[\n,;]+/)).map((x) => clean(x, 120)).filter(Boolean).slice(0, 10);
  const emails = lines(b.emails);
  const bad = emails.find((x) => !isEmail(x));
  if (bad) throw fail(`"${bad}" doesn't look like an email address.`);
  return { name: clean(b.name, 120), type: ['rescue', 'foster', 'other'].includes(b.type) ? b.type : 'rescue', emails, phones: lines(b.phones), socials: lines(b.socials), website: clean(b.website, 200), cities: lines(b.cities), notes: cleanLong(b.notes, 3000) };
}

export async function handleRescues(req, env, url) {
  if (!(await sessionOk(env, req))) throw fail('Please sign in again.', 401);
  const parts = url.pathname.split('/').filter(Boolean); // api, rescues, id|import
  const rid = parts[2];
  if (!rid && req.method === 'GET') {
    const list = await all(env);
    list.sort((a, b) => String(a.name).localeCompare(String(b.name), 'en', { sensitivity: 'base' }));
    return json({ rescues: list });
  }
  if (rid === 'import' && req.method === 'POST') return json(await importAll(env));
  if (!rid && req.method === 'POST') {
    const b = fromBody(await req.json().catch(() => ({})));
    if (!b.name) throw fail('Please add the rescue\'s name.');
    const list = await all(env);
    const twin = findMatch(list, b);
    if (twin) throw fail(`It looks like "${twin.name}" is already in the list. Edit that one instead.`, 409);
    const now = new Date().toISOString();
    const r = { id: newId(), ...b, people: [], pups: [], firstSeen: now, lastSeen: now, addedBy: 'admin' };
    await save(env, r);
    return json({ ok: true, rescue: r });
  }
  if (!rid || !/^r[\w-]{4,40}$/.test(rid)) throw fail('Not found.', 404);
  const key = `rescue:${rid}`;
  const r = await env.SUBMISSIONS.get(key, 'json');
  if (!r) throw fail('That rescue is no longer in the list.', 404);
  if (req.method === 'PUT') {
    const b = fromBody(await req.json().catch(() => ({})));
    if (!b.name) throw fail('Please add the rescue\'s name.');
    Object.assign(r, b, { updatedAt: new Date().toISOString() });
    await save(env, r);
    return json({ ok: true, rescue: r });
  }
  if (req.method === 'DELETE') { await env.SUBMISSIONS.delete(key); return json({ ok: true }); }
  throw fail('Not found.', 404);
}
