// Contact + "Raise your hand" (Get Involved) form messages.
//  POST   /message?form=contact|involved   public: stored privately in KV, optional email alert
//  GET    /api/messages                    admin: all messages, newest first
//  POST   /api/messages/:id/read           admin: {read: true|false}
//  GET    /api/messages/:id/file/:n        admin: download an attachment
//  DELETE /api/messages/:id                admin: remove for good (and its attachments)
import { sessionOk } from './admin.js';

const FORMS = { contact: 'Contact form', involved: 'Get Involved form' };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const fail = (msg, status = 400) => Object.assign(new Error(msg), { publicMessage: msg, status });
const clean = (v, max = 300) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
const cleanLong = (v, max = 3000) => String(v == null ? '' : v).replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
const h = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MAX_FILES = 3, MAX_FILE = 8 * 1024 * 1024, MAX_TOTAL = 20 * 1024 * 1024;
// Only real PDFs and photos: check the file's first bytes, not just its name
function sniff(b) {
  const a = (i) => b[i], str = (i, n) => String.fromCharCode(...b.slice(i, i + n));
  if (str(0, 5) === '%PDF-') return ['application/pdf', 'pdf'];
  if (a(0) === 0xFF && a(1) === 0xD8 && a(2) === 0xFF) return ['image/jpeg', 'jpg'];
  if (a(0) === 0x89 && str(1, 3) === 'PNG') return ['image/png', 'png'];
  if (str(0, 4) === 'RIFF' && str(8, 4) === 'WEBP') return ['image/webp', 'webp'];
  if (str(4, 4) === 'ftyp' && /^(heic|heix|hevc|mif1|msf1|heim|heis)$/.test(str(8, 4))) return ['image/heic', 'heic'];
  return null;
}
async function turnstileOk(env, f, ip) {
  if (!env.TURNSTILE_SECRET) return true;
  const token = String(f.get('cf-turnstile-response') || '');
  if (!token) return false;
  const v = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip }) }).then((r) => r.json()).catch(() => ({}));
  return !!v.success;
}
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
  if (!(await turnstileOk(env, f, ip))) throw fail('Please complete the "I am human" check and try again.');

  // attachments (Contact form only): flyers, invites, PDFs
  const uploads = kind === 'contact' ? f.getAll('files').filter((x) => x && typeof x === 'object' && x.size > 0) : [];
  if (uploads.length > MAX_FILES) throw fail(`Please attach up to ${MAX_FILES} files.`);
  let total = 0;
  const files = [];
  for (const u of uploads) {
    if (u.size > MAX_FILE) throw fail(`"${clean(u.name, 60)}" is too big. Each file can be up to 8 MB.`);
    total += u.size;
    if (total > MAX_TOTAL) throw fail('Those files are too big together. Please keep them under 20 MB in total.');
    const buf = await u.arrayBuffer();
    const kindOf = sniff(new Uint8Array(buf.slice(0, 16)));
    if (!kindOf) throw fail(`"${clean(u.name, 60)}" isn't a PDF or photo. Please attach a PDF, JPG, PNG or HEIC file.`);
    const base = clean(u.name, 80).replace(/[^\w .()-]/g, '').replace(/\.[^.]*$/, '') || 'attachment';
    files.push({ buf, name: `${base}.${kindOf[1]}`, type: kindOf[0], size: u.size });
  }

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
    files: files.map((x, i) => ({ n: i, name: x.name, type: x.type, size: x.size })),
  };
  if (!m.name) throw fail('Please add your name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email)) throw fail('Please check your email address.');
  if (kind === 'contact' && !m.message) throw fail('Please write a message.');
  if (!f.get('consent')) throw fail('Please tick the box so we can reply to you.');

  for (const [i, x] of files.entries()) await env.SUBMISSIONS.put(`msgf:${m.id}:${i}`, x.buf, { metadata: { name: x.name, type: x.type } });
  await env.SUBMISSIONS.put(`msg:${m.id}`, JSON.stringify(m));
  await env.SUBMISSIONS.put(rlKey, String(used + 1), { expirationTtl: 3700 });
  try { await alert(env, m); } catch (e) { console.error('message alert', e); }
  return json({ ok: true });
}

async function alert(env, m) {
  if (!env.RESEND_API_KEY || !env.NOTIFY_EMAIL) return;
  const rows = [['Email', m.email], ['Phone', m.phone], ['Area', m.area], ['About', m.topic], ['Interested in', m.interests.join(', ')], ['Attachments', (m.files || []).map((x) => x.name).join(', ')]].filter(([, v]) => v);
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
  if (parts[3] === 'file' && req.method === 'GET') {
    const n = Number(parts[4]);
    const meta = (m.files || []).find((x) => x.n === n);
    if (!meta) throw fail('That file is gone.', 404);
    const r = await env.SUBMISSIONS.getWithMetadata(`msgf:${mid}:${n}`, 'arrayBuffer');
    if (!r.value) throw fail('That file is gone.', 404);
    return new Response(r.value, { headers: { 'Content-Type': meta.type, 'Content-Disposition': `attachment; filename="${meta.name.replace(/"/g, '')}"`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  }
  if (!parts[3] && req.method === 'DELETE') {
    for (const x of m.files || []) await env.SUBMISSIONS.delete(`msgf:${mid}:${x.n}`);
    await env.SUBMISSIONS.delete(key);
    return json({ ok: true });
  }
  throw fail('Not found.', 404);
}
