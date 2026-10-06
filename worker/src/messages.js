// Contact + "Raise your hand" (Get Involved) form messages.
//  POST   /message?form=contact|involved   public: stored privately in KV, optional email alert
//  GET    /api/messages                    admin: all messages, newest first
//  POST   /api/messages/:id/read           admin: {read: true|false}
//  DELETE /api/messages/:id                admin: remove for good
import { sessionOk } from './admin.js';

const FORMS = { contact: 'Contact form', involved: 'Get Involved form' };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const fail = (msg, status = 400) => Object.assign(new Error(msg), { publicMessage: msg, status });
const clean = (v, max = 300) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
const cleanLong = (v, max = 3000) => String(v == null ? '' : v).replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
const h = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
async function sha256(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); }

export async function receiveMessage(req, env, url) {
  const kind = url.searchParams.get('form');
  if (!FORMS[kind]) throw fail('Unknown form.');
  const ip = req.headers.get('CF-Connecting-IP') || 'local';
  const rlKey = `rlm:${await sha256(ip)}:${new Date().toISOString().slice(0, 13)}`;
  const used = Number(await env.SUBMISSIONS.get(rlKey)) || 0;
  if (used >= Number(env.MAX_PER_HOUR || 6)) throw fail('Too many messages from this connection. Please try again in an hour.', 429);

  let f;
  try { f = await req.formData(); } catch (e) { throw fail('Please use the form on the website.'); }
  if (clean(f.get('website'))) return json({ ok: true }); // honeypot

  const m = {
    id: new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + crypto.randomUUID().slice(0, 8),
    form: kind,
    createdAt: new Date().toISOString(),
    read: false,
    name: clean(f.get('name'), 80),
    email: clean(f.get('email'), 120),
    phone: clean(f.get('phone'), 30),
    area: clean(f.get('area'), 60),
    topic: clean(f.get('topic'), 80),
    interests: f.getAll('interests').map((x) => clean(x, 40)).filter(Boolean).slice(0, 10),
    message: cleanLong(f.get('message'), 2000),
  };
  if (!m.name) throw fail('Please add your name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email)) throw fail('Please check your email address.');
  if (kind === 'contact' && !m.message) throw fail('Please write a message.');
  if (!f.get('consent')) throw fail('Please tick the box so we can reply to you.');

  await env.SUBMISSIONS.put(`msg:${m.id}`, JSON.stringify(m));
  await env.SUBMISSIONS.put(rlKey, String(used + 1), { expirationTtl: 3700 });
  try { await alert(env, m); } catch (e) { console.error('message alert', e); }
  return json({ ok: true });
}

async function alert(env, m) {
  if (!env.RESEND_API_KEY || !env.NOTIFY_EMAIL) return;
  const rows = [['Email', m.email], ['Phone', m.phone], ['Area', m.area], ['About', m.topic], ['Interested in', m.interests.join(', ')]].filter(([, v]) => v);
  const inbox = `${env.SITE_URL || ''}/admin/#messages`;
  const html = `<div style="font-family:Arial,sans-serif;color:#1F1D2B;max-width:560px"><h2 style="color:#2F45C8;margin:0 0 4px">New message from ${h(m.name)}</h2><p style="margin:0 0 14px;color:#5c5a72">${h(FORMS[m.form])} · reply to this email to answer them.</p><table style="border-collapse:collapse;font-size:14px">${rows.map(([k, v]) => `<tr><td style="padding:4px 14px 4px 0;color:#5c5a72;font-weight:bold">${h(k)}</td><td>${h(v)}</td></tr>`).join('')}</table>${m.message ? `<p style="white-space:pre-wrap;margin:16px 0">${h(m.message)}</p>` : ''}<p><a href="${h(inbox)}">Open the inbox in the admin</a></p></div>`;
  const text = `New message from ${m.name} (${FORMS[m.form]})\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${m.message}\n\nInbox: ${inbox}\n`;
  const res = await fetch(`${env.RESEND_API || 'https://api.resend.com'}/emails`, { method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: env.NOTIFY_FROM || "Bentley's Playhouse <onboarding@resend.dev>", to: [env.NOTIFY_EMAIL], reply_to: m.email, subject: `New message: ${m.name} (${FORMS[m.form]})`, html, text }) });
  if (!res.ok) console.error('resend', res.status, await res.text());
}

export async function handleMessages(req, env, url) {
  if (!(await sessionOk(env, req))) throw fail('Please sign in again.', 401);
  const parts = url.pathname.split('/').filter(Boolean); // api, messages, id, action
  const mid = parts[2];
  if (!mid && req.method === 'GET') {
    const out = [];
    let cursor;
    do {
      const page = await env.SUBMISSIONS.list({ prefix: 'msg:', cursor });
      for (const k of page.keys) { const r = await env.SUBMISSIONS.get(k.name, 'json'); if (r) out.push(r); }
      cursor = page.list_complete ? null : page.cursor;
    } while (cursor);
    out.sort((a, b) => String(b.createdAt).localeCompare(a.createdAt));
    return json({ messages: out });
  }
  if (!mid || !/^[\w-]{6,40}$/.test(mid)) throw fail('Not found.', 404);
  const key = `msg:${mid}`;
  const m = await env.SUBMISSIONS.get(key, 'json');
  if (!m) throw fail('That message is gone.', 404);
  if (parts[3] === 'read' && req.method === 'POST') {
    const b = await req.json().catch(() => ({}));
    m.read = b.read !== false;
    await env.SUBMISSIONS.put(key, JSON.stringify(m));
    return json({ ok: true, message: m });
  }
  if (!parts[3] && req.method === 'DELETE') { await env.SUBMISSIONS.delete(key); return json({ ok: true }); }
  throw fail('Not found.', 404);
}
