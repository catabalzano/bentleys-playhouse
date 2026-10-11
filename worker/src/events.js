// Community Calendar: trusted event partners add events with their own access code; an admin approves them.
//
//  POST   /events/check                public: {code} → {ok, name} (is this code active?)
//  POST   /events/submit               public: {code, event fields} → saved as a request (status: pending)
//  GET    /api/eventreqs               admin: all requests, newest first
//  POST   /api/eventreqs/:id/approve   admin: {edits?} → commits content/events/<date>-<slug>.md (goes live in ~2 min)
//  POST   /api/eventreqs/:id/reject    admin: {note?}
//  DELETE /api/eventreqs/:id           admin: remove the request
//  GET    /api/partners                admin: all partners with their codes
//  POST   /api/partners                admin: {name, org, email, phone} → new partner + code
//  PUT    /api/partners/:id            admin: edit or turn on/off {active}
//  DELETE /api/partners/:id            admin: remove (their code stops working)
import { sessionOk, githubToken, commitFiles, stringifyMd, slugify } from './admin.js';

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const fail = (msg, status = 400) => Object.assign(new Error(msg), { publicMessage: msg, status });
const clean = (v, max = 200) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
const cleanLong = (v, max = 3000) => String(v == null ? '' : v).replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
const newId = () => new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + crypto.randomUUID().slice(0, 8);
const CATS = ['spay', 'walk', 'adopt', 'clinic', 'fund'];
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);
async function sha256(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); }
// Codes look like PAWS-7K3M-Q9TD: easy to read out loud, no 0/O or 1/I mix-ups
function makeCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', r = crypto.getRandomValues(new Uint8Array(8));
  const s = [...r].map((x) => A[x % A.length]).join('');
  return `PAWS-${s.slice(0, 4)}-${s.slice(4)}`;
}
const normCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

async function list(env, prefix) {
  const out = [];
  let cursor;
  do {
    const page = await env.SUBMISSIONS.list({ prefix, cursor });
    for (const k of page.keys) { const r = await env.SUBMISSIONS.get(k.name, 'json'); if (r) out.push(r); }
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  return out;
}
async function partnerByCode(env, code) {
  const n = normCode(code);
  if (n.length < 6) return null;
  const pid = await env.SUBMISSIONS.get(`ecode:${n}`);
  if (!pid) return null;
  const p = await env.SUBMISSIONS.get(`epartner:${pid}`, 'json');
  return p && p.active !== false ? p : null;
}
/** A code you picked (e.g. FOMAPETS) or a new random one; never one that's already in use. */
async function pickCode(env, wanted, selfId) {
  if (!wanted) return makeCode();
  const n = normCode(wanted);
  if (n.length < 6 || n.length > 20) throw fail('Codes need 6 to 20 letters or numbers.');
  const owner = await env.SUBMISSIONS.get(`ecode:${n}`);
  if (owner && owner !== selfId) throw fail('That code is already used by another partner. Please pick a different one.', 409);
  return String(wanted).toUpperCase().replace(/[^A-Z0-9-]/g, '');
}
async function rateLimit(req, env, name, max) {
  const ip = req.headers.get('CF-Connecting-IP') || 'local';
  const key = `rle:${name}:${await sha256(ip)}:${new Date().toISOString().slice(0, 13)}`;
  const used = Number(await env.SUBMISSIONS.get(key)) || 0;
  if (used >= max) throw fail('Too many tries from this connection. Please try again in an hour.', 429);
  await env.SUBMISSIONS.put(key, String(used + 1), { expirationTtl: 3700 });
}

function readEvent(b) {
  const e = {
    title: clean(b.title, 120), category: clean(b.category, 10), date: clean(b.date, 10), endDate: clean(b.endDate, 10),
    time: clean(b.time, 80), price: clean(b.price, 60), venue: clean(b.venue, 120), city: clean(b.city, 80), address: clean(b.address, 200),
    organizer: clean(b.organizer, 120), link: clean(b.link, 300), description: cleanLong(b.description, 2000),
  };
  const missing = [];
  if (!e.title) missing.push('event name');
  if (!CATS.includes(e.category)) missing.push('kind of event');
  if (!isDate(e.date)) missing.push('date');
  if (!e.time) missing.push('time');
  if (!e.venue && !e.address) missing.push('place or address');
  if (!e.city) missing.push('city');
  if (!e.description) missing.push('description');
  if (missing.length) throw fail('Please add: ' + missing.join(', ') + '.');
  if (e.endDate && (!isDate(e.endDate) || e.endDate < e.date)) throw fail('The last day has to be after the first day.');
  if (e.link && !/^https?:\/\/[^\s]+\.[^\s]+/i.test(e.link)) e.link = /^[\w.-]+\.[a-z]{2,}/i.test(e.link) ? 'https://' + e.link : '';
  return e;
}

// ---------- public ----------
export async function eventsPublic(req, env, url) {
  if (req.method !== 'POST') throw fail('Not found.', 404);
  const b = await req.json().catch(() => ({}));
  if (url.pathname === '/events/check') {
    await rateLimit(req, env, 'check', 20);
    const p = await partnerByCode(env, b.code);
    if (!p) throw fail("That code didn't work. Please check it and try again, or email hello@bentleysplayhouse.org.", 403);
    return json({ ok: true, name: p.name, org: p.org || '' });
  }
  if (url.pathname === '/events/submit') {
    await rateLimit(req, env, 'submit', 15);
    const p = await partnerByCode(env, b.code);
    if (!p) throw fail("Your access code isn't working anymore. Please email hello@bentleysplayhouse.org.", 403);
    const e = readEvent(b);
    const r = { id: newId(), status: 'pending', createdAt: new Date().toISOString(), partner: { id: p.id, name: p.name, org: p.org || '', email: p.email || '' }, event: e };
    await env.SUBMISSIONS.put(`evreq:${r.id}`, JSON.stringify(r));
    return json({ ok: true });
  }
  throw fail('Not found.', 404);
}

// ---------- admin ----------
export async function eventsAdmin(req, env, url) {
  if (!(await sessionOk(env, req))) throw fail('Please sign in again.', 401);
  const parts = url.pathname.split('/').filter(Boolean); // api, partners|eventreqs, id, action
  const kind = parts[1], id = parts[2], action = parts[3];

  if (kind === 'partners') {
    if (!id && req.method === 'GET') {
      const ps = await list(env, 'epartner:');
      ps.sort((a, b) => String(a.name).localeCompare(String(b.name), 'en', { sensitivity: 'base' }));
      return json({ partners: ps });
    }
    if (!id && req.method === 'POST') {
      const b = await req.json().catch(() => ({}));
      const p = { id: 'p' + Date.now().toString(36) + crypto.randomUUID().slice(0, 4), name: clean(b.name, 80), org: clean(b.org, 120), email: clean(b.email, 120), phone: clean(b.phone, 30), active: true, createdAt: new Date().toISOString() };
      if (!p.name) throw fail('Please add their name.');
      p.code = await pickCode(env, clean(b.code, 30), p.id);
      await env.SUBMISSIONS.put(`epartner:${p.id}`, JSON.stringify(p));
      await env.SUBMISSIONS.put(`ecode:${normCode(p.code)}`, p.id);
      return json({ ok: true, partner: p });
    }
    if (!id || !/^p[\w-]{4,40}$/.test(id)) throw fail('Not found.', 404);
    const p = await env.SUBMISSIONS.get(`epartner:${id}`, 'json');
    if (!p) throw fail('That partner is gone.', 404);
    if (req.method === 'PUT') {
      const b = await req.json().catch(() => ({}));
      for (const k of ['name', 'org', 'email', 'phone']) if (typeof b[k] === 'string') p[k] = clean(b[k], k === 'org' ? 120 : 120);
      if (typeof b.active === 'boolean') p.active = b.active;
      if (b.newCode || (typeof b.code === 'string' && normCode(b.code) !== normCode(p.code))) { const next = await pickCode(env, b.newCode ? '' : clean(b.code, 30), p.id); await env.SUBMISSIONS.delete(`ecode:${normCode(p.code)}`); p.code = next; await env.SUBMISSIONS.put(`ecode:${normCode(p.code)}`, p.id); }
      if (!p.name) throw fail('Please add their name.');
      await env.SUBMISSIONS.put(`epartner:${id}`, JSON.stringify(p));
      return json({ ok: true, partner: p });
    }
    if (req.method === 'DELETE') {
      await env.SUBMISSIONS.delete(`ecode:${normCode(p.code)}`);
      await env.SUBMISSIONS.delete(`epartner:${id}`);
      return json({ ok: true });
    }
    throw fail('Not found.', 404);
  }

  if (kind === 'eventreqs') {
    if (!id && req.method === 'GET') {
      const rs = await list(env, 'evreq:');
      rs.sort((a, b) => String(b.createdAt).localeCompare(a.createdAt));
      return json({ requests: rs });
    }
    if (!id || !/^[\w-]{6,40}$/.test(id)) throw fail('Not found.', 404);
    const key = `evreq:${id}`;
    const r = await env.SUBMISSIONS.get(key, 'json');
    if (!r) throw fail('That request is gone.', 404);
    if (action === 'approve' && req.method === 'POST') {
      if (r.status === 'approved') throw fail('Already on the calendar.', 409);
      const b = await req.json().catch(() => ({}));
      const e = readEvent({ ...r.event, ...(b.edits || {}) });
      const token = await githubToken(env);
      const slug = `${e.date}-${slugify(e.title).slice(0, 40)}-${id.slice(-4)}`;
      const data = { title: e.title, category: e.category, date: e.date };
      if (e.endDate) data.endDate = e.endDate;
      for (const k of ['time', 'price', 'venue', 'city', 'address', 'organizer', 'link']) if (e[k]) data[k] = e[k];
      data.addedBy = r.partner.org ? `${r.partner.name} (${r.partner.org})` : r.partner.name;
      await commitFiles(env, token, `Community Calendar: add "${e.title}" (from ${r.partner.name})`, [{ path: `content/events/${slug}.md`, content: stringifyMd(data, e.description) }]);
      r.status = 'approved'; r.reviewedAt = new Date().toISOString(); r.slug = slug; r.event = e;
      await env.SUBMISSIONS.put(key, JSON.stringify(r));
      return json({ ok: true, slug });
    }
    if (action === 'reject' && req.method === 'POST') {
      const b = await req.json().catch(() => ({}));
      r.status = 'rejected'; r.reviewedAt = new Date().toISOString(); r.note = clean(b.note, 300);
      await env.SUBMISSIONS.put(key, JSON.stringify(r));
      return json({ ok: true });
    }
    if (!action && req.method === 'DELETE') { await env.SUBMISSIONS.delete(key); return json({ ok: true }); }
  }
  throw fail('Not found.', 404);
}
