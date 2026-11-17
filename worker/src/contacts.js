// Contacts (Cata, Nov 12, 2026): one private address book of people to keep in touch with.
// Everyone who pledges is saved here automatically (one entry per email, however many pups they pledge for).
// "Newsletter" records whether they left "Send me Pups in My City" ticked on the pledge form; people who pledged
// before that box existed are saved with it off. Pups in My City lives on Substack, which has no API for adding
// subscribers: the admin downloads the newsletter list as a CSV and imports it in Substack (Subscribers › Import).
//
//  GET    /api/contacts              admin: everyone, newest first (fills in past pledgers the first time)
//  PUT    /api/contacts/<id>         admin: { news: true|false, note }
//  DELETE /api/contacts/<id>         admin: remove someone (their pledges stay in Pledges)
//
// KV: contact:<id> (id = first 16 hex of sha256(email)); everything the list shows also lives in the key's metadata.
import { sessionOk } from './admin.js';

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const fail = (msg, status = 400) => Object.assign(new Error(msg), { publicMessage: msg, status });
async function idFor(email) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(email).trim().toLowerCase()));
  return [...new Uint8Array(b)].slice(0, 8).map((x) => x.toString(16).padStart(2, '0')).join('');
}
// KV metadata is capped at 1 KB: keep the list fields small, the full record in the value
const meta = (c) => ({ email: c.email, first: c.first, last: c.last, social: c.social, news: !!c.news, from: (c.from || []).slice(-3).map((f) => f.label).join(', ').slice(0, 160), n: (c.from || []).length, firstAt: c.firstAt, lastAt: c.lastAt });
async function put(env, c) { await env.SUBMISSIONS.put(`contact:${c.id}`, JSON.stringify(c), { metadata: meta(c) }); }

/** Add or update someone. `source` = { type, key, label, at }; `news` = true/false (their choice now) or null (not asked). */
export async function upsertContact(env, { email, first, last, social, news = null, source }) {
  if (!email) return null;
  const id = await idFor(email);
  const raw = await env.SUBMISSIONS.get(`contact:${id}`);
  const now = source && source.at || new Date().toISOString();
  const c = raw ? JSON.parse(raw) : { id, email: String(email).toLowerCase(), firstAt: now, from: [], news: false };
  // the latest details win, but never blank out what we had
  c.first = first || c.first || ''; c.last = last || c.last || ''; c.social = social || c.social || '';
  if (news === true || news === false) { c.news = news; c.newsAt = now; }
  if (source && !c.from.some((f) => f.key === source.key)) c.from.push(source);
  if (!c.lastAt || now > c.lastAt) c.lastAt = now;
  await put(env, c);
  return c;
}

async function all(env) {
  const out = [];
  let cursor;
  do {
    const page = await env.SUBMISSIONS.list({ prefix: 'contact:', cursor });
    for (const k of page.keys) if (k.metadata) out.push({ id: k.name.slice(8), ...k.metadata });
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  return out.sort((a, b) => String(b.lastAt || '').localeCompare(String(a.lastAt || '')));
}

/** One time: everyone who pledged before Contacts existed. They never saw the newsletter box, so news stays off. */
async function backfill(env) {
  if (await env.SUBMISSIONS.get('contacts:backfilled')) return 0;
  const { drives } = await import('./pledges.js');
  const ds = await drives(env).catch(() => ({}));
  let n = 0, cursor;
  do {
    const page = await env.SUBMISSIONS.list({ prefix: 'pledge:', cursor });
    for (const k of page.keys) {
      const m = k.metadata; if (!m || !m.email) continue;
      const drive = k.name.split(':')[1], name = (ds[drive] && ds[drive].name) || drive;
      await upsertContact(env, { email: m.email, first: m.first, last: m.last, social: m.social, news: null, source: { type: 'pledge', key: `pledge:${drive}`, label: `Pledged for ${name}`, at: m.at } });
      n++;
    }
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  await env.SUBMISSIONS.put('contacts:backfilled', new Date().toISOString());
  return n;
}

export async function handleContacts(req, env, url) {
  if (!(await sessionOk(env, req))) throw fail('Please sign in again.', 401);
  const id = url.pathname.split('/').filter(Boolean)[2];
  if (!id && req.method === 'GET') {
    await backfill(env);
    return json({ contacts: await all(env) });
  }
  if (!/^[0-9a-f]{16}$/.test(id || '')) throw fail('Not found', 404);
  const raw = await env.SUBMISSIONS.get(`contact:${id}`);
  if (!raw) throw fail('That contact was not found.', 404);
  if (req.method === 'PUT') {
    const b = await req.json().catch(() => ({}));
    const c = JSON.parse(raw);
    if (typeof b.news === 'boolean') { c.news = b.news; c.newsAt = new Date().toISOString(); c.newsBy = 'admin'; }
    await put(env, c);
    return json({ ok: true, contact: { id, ...meta(c) } });
  }
  if (req.method === 'DELETE') { await env.SUBMISSIONS.delete(`contact:${id}`); return json({ ok: true }); }
  throw fail('Not found', 404);
}
