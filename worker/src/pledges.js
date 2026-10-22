// Pledge drives (Cata, Oct 22, 2026): bentleysplayhouse.org/pledge/<slug>/ — people promise an amount to help pull a shelter dog.
// Nothing is charged. Once the dog is pulled, the admin emails everyone who pledged with how to send it.
//
//  POST   /pledge                         public: drive, firstName, lastName, email, social, amount → pledge:<drive>:<id>
//  GET    /pledge/stats?drive=<slug>      public: { total, count } for the progress bar (no names)
//  GET    /api/pledges?drive=<slug>       admin: every pledge for a drive
//  PUT    /api/pledges/<drive>/<id>       admin: { paid: true|false }
//  DELETE /api/pledges/<drive>/<id>       admin: remove one (spam, duplicates)
//  POST   /api/pledges/<drive>/email      admin: { subject, message, only: 'all'|'unpaid'|'unemailed' } → one email per pledger, with their amount
//
// Each pledge is its own KV key (no lost pledges when two people pledge at once); everything the roster
// shows also lives in the key's metadata, so one list call gives the whole roster and the total.
// The drives themselves (name, A number, status) are content files (content/pledges/*.md) edited in the admin;
// the site publishes them at /pledge/drives.json and this service only accepts pledges for open drives.
import { sessionOk } from './admin.js';
import { sendMail, layout, p, note, facts, h, plain } from './mail.js';

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const fail = (msg, status = 400) => Object.assign(new Error(msg), { publicMessage: msg, status });
const clean = (v, max = 300) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
const SITE = (env) => (env.SITE_URL || 'https://bentleysplayhouse.org').replace(/\/$/, '');
const SLUG = /^[a-z0-9][a-z0-9-]{1,79}$/;
const money = (n) => '$' + (Math.round(n * 100) % 100 ? n.toFixed(2) : String(Math.round(n)));
async function sha256(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); }

export async function drives(env) {
  const r = await fetch(`${SITE(env)}/pledge/drives.json?t=${Math.floor(Date.now() / 60000)}`, { cf: { cacheTtl: 60 } }).catch(() => null);
  if (!r || !r.ok) return {};
  return r.json().catch(() => ({}));
}

async function roster(env, drive) {
  const out = [];
  let cursor;
  do {
    const page = await env.SUBMISSIONS.list({ prefix: `pledge:${drive}:`, cursor });
    for (const k of page.keys) if (k.metadata) out.push({ id: k.name.split(':')[2], ...k.metadata });
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  out.sort((a, b) => String(a.at).localeCompare(String(b.at)));
  return out;
}
const totals = (list) => ({ total: Math.round(list.reduce((s, x) => s + (Number(x.amount) || 0), 0) * 100) / 100, count: list.length });

async function save(env, drive, rec) {
  await env.SUBMISSIONS.put(`pledge:${drive}:${rec.id}`, JSON.stringify(rec), { metadata: rec });
}

// ---------- public ----------
export async function pledgePublic(req, env, url) {
  if (url.pathname === '/pledge/stats' && req.method === 'GET') {
    const drive = clean(url.searchParams.get('drive'), 80);
    if (!SLUG.test(drive)) throw fail('Unknown pledge drive.', 404);
    const r = json(totals(await roster(env, drive)));
    r.headers.set('Cache-Control', 'public, max-age=30');
    return r;
  }
  if (url.pathname === '/pledge' && req.method === 'POST') return receivePledge(req, env);
  throw fail('Not found', 404);
}

async function receivePledge(req, env) {
  const ip = req.headers.get('CF-Connecting-IP') || 'local';
  const rlKey = `rlp:${await sha256(ip)}:${new Date().toISOString().slice(0, 10)}`;
  const used = Number(await env.SUBMISSIONS.get(rlKey)) || 0;
  if (used >= 10) throw fail('Too many pledges from this connection today. Please email hello@bentleysplayhouse.org.', 429);

  let f;
  try { f = await req.formData(); } catch (e) { throw fail('Please use the form on the website.'); }
  if (clean(f.get('website'))) return json({ ok: true }); // honeypot
  if (env.TURNSTILE_SECRET) {
    const token = String(f.get('cf-turnstile-response') || '');
    const v = token ? await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip }) }).then((r) => r.json()).catch(() => ({})) : {};
    if (!v.success) throw fail('Please complete the "I am human" check and try again.');
  }

  const drive = clean(f.get('drive'), 80);
  const all = await drives(env);
  const d = all[drive];
  if (!SLUG.test(drive) || !d) throw fail('This pledge drive could not be found. Please refresh the page and try again.', 404);
  if (d.status !== 'open') throw fail(`Pledges for ${d.name} are closed. Thank you so much for wanting to help!`, 409);

  const t = {
    first: clean(f.get('firstName'), 60), last: clean(f.get('lastName'), 60),
    email: clean(f.get('email'), 120).toLowerCase(), social: clean(f.get('social'), 100),
  };
  const raw = clean(f.get('amount'), 20) === 'other' ? clean(f.get('amountOther'), 20) : clean(f.get('amount'), 20);
  const amount = Math.round(parseFloat(raw.replace(/[$,\s]/g, '')) * 100) / 100;
  const missing = [];
  if (!t.first) missing.push('first name');
  if (!t.last) missing.push('last name');
  if (!t.email) missing.push('email');
  if (!t.social) missing.push('Instagram or other social');
  if (missing.length) throw fail(`Please add your ${missing.join(', ').replace(/, ([^,]*)$/, ' and $1')}.`);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t.email)) throw fail('Please check your email address.');
  if (!(amount >= 1)) throw fail('Please choose how much you would like to pledge.');
  if (amount > 25000) throw fail('That amount looks too big. Please check it, or email hello@bentleysplayhouse.org.');

  const rec = {
    id: new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + crypto.randomUUID().slice(0, 8),
    first: t.first, last: t.last, email: t.email, social: t.social, amount, at: new Date().toISOString(), paid: false,
  };
  await save(env, drive, rec);
  await env.SUBMISSIONS.put(rlKey, String(used + 1), { expirationTtl: 90000 });
  // their copy (always: it's their record of what they promised); the alert to hello@ follows ALERTS
  try { rec.confirm = await toPledger(env, d, rec); await save(env, drive, rec); } catch (e) { console.error('pledge confirm', e); }
  if (env.ALERTS !== 'off') try { await sendMail(env, { to: env.NOTIFY_EMAIL || 'hello@bentleysplayhouse.org', subject: `New pledge for ${d.name}: ${money(amount)}`, text: `${t.first} ${t.last} (${t.email}, ${t.social}) pledged ${money(amount)} for ${d.name}.\nRoster: ${SITE(env)}/admin/#pledges`, html: `<p>${h(t.first)} ${h(t.last)} (${h(t.email)}, ${h(t.social)}) pledged <b>${money(amount)}</b> for ${h(d.name)}.</p><p><a href="${SITE(env)}/admin/#pledges">Open the roster</a></p>`, replyTo: t.email, tag: 'pledge-alert' }); } catch (e) { console.error('pledge alert', e); }
  const now = totals(await roster(env, drive));
  // KV lists can lag a few seconds; make sure the new pledge is counted in what the page shows
  return json({ ok: true, amount, ...(now.count ? now : { total: amount, count: 1 }) });
}

async function toPledger(env, d, rec) {
  const subject = `Thank you for pledging for ${d.name}!`;
  const url = d.url || `${SITE(env)}/pledge/`;
  const body = p(`We got your pledge to help pull ${h(d.name)} from ${h(d.shelter || 'the shelter')}. This email is your record of it.`)
    + facts([['Your pledge', `<b>${money(rec.amount)}</b>`], ['For', h(d.name) + (d.animalId ? ` (${h(d.animalId)})` : '')], ['Name', h(`${rec.first} ${rec.last}`)], ['Social', h(rec.social)]])
    + note(`<strong>This is a promise, not a payment.</strong> Nothing is charged today. Once ${h(d.name)} is safe, we'll email you from hello@bentleysplayhouse.org with how to send your pledge.`)
    + p(`Every share brings in more pledges. Send ${h(d.name)}'s page to a friend: <a href="${h(url)}" style="color:#2F45C8;font-weight:700">${h(url.replace(/^https?:\/\//, ''))}</a>`);
  const html = layout(env, { pre: `Your ${money(rec.amount)} pledge for ${d.name} is in. Nothing is charged today.`, title: `Thank you, ${h(rec.first)}!`, body });
  const text = plain([`Thank you, ${rec.first}!`, '', `We got your pledge to help pull ${d.name} from ${d.shelter || 'the shelter'}.`, '', `Your pledge: ${money(rec.amount)}`, `For: ${d.name}${d.animalId ? ` (${d.animalId})` : ''}`, '', `This is a promise, not a payment. Nothing is charged today. Once ${d.name} is safe, we'll email you from hello@bentleysplayhouse.org with how to send your pledge.`, '', `Share ${d.name}'s page: ${url}`]);
  const r = await sendMail(env, { to: rec.email, subject, html, text, tag: 'pledge-confirm' });
  return { at: new Date().toISOString(), status: r && r.id ? 'sent' : r && r.skipped ? 'off' : 'failed' };
}

// ---------- admin ----------
export async function handlePledges(req, env, url) {
  if (!(await sessionOk(env, req))) throw fail('Please sign in again.', 401);
  const parts = url.pathname.split('/').filter(Boolean); // api, pledges, drive?, id|email
  const drive = parts[2] || clean(url.searchParams.get('drive'), 80);
  if (!SLUG.test(drive || '')) throw fail('Choose a pledge drive.');
  if (parts.length <= 3 && req.method === 'GET') {
    const list = await roster(env, drive);
    return json({ pledges: list, ...totals(list) });
  }
  if (parts[3] === 'email' && req.method === 'POST') {
    const b = await req.json().catch(() => ({}));
    const subject = clean(b.subject, 160), message = String(b.message || '').replace(/\r\n/g, '\n').trim().slice(0, 6000);
    if (!subject || !message) throw fail('Please write a subject and a message.');
    const d = (await drives(env))[drive] || { name: 'the pup' };
    const only = ['unpaid', 'unemailed'].includes(b.only) ? b.only : 'all';
    const list = (await roster(env, drive)).filter((x) => only === 'all' || (only === 'unpaid' ? !x.paid : !x.emailedAt));
    let sent = 0, failed = 0;
    for (const x of list) {
      const fill = (s) => s.replace(/\{first\}/gi, x.first).replace(/\{amount\}/gi, money(Number(x.amount)));
      const paras = fill(message).split(/\n{2,}/).map((para) => p(h(para).replace(/\n/g, '<br>'))).join('');
      const html = layout(env, { pre: fill(subject), title: `Hi ${h(x.first)}!`, body: paras + facts([['Your pledge', `<b>${money(Number(x.amount))}</b>`], ['For', h(d.name)]]) });
      const text = plain([`Hi ${x.first}!`, '', fill(message), '', `Your pledge: ${money(Number(x.amount))} for ${d.name}`]);
      const r = await sendMail(env, { to: x.email, subject: fill(subject), html, text, tag: 'pledge-update' }).catch(() => null);
      if (r && r.id) { sent++; await save(env, drive, { ...x, emailedAt: new Date().toISOString(), emailSubject: fill(subject) }); }
      else failed++;
      await new Promise((ok) => setTimeout(ok, 550)); // Resend allows about 2 emails a second
    }
    return json({ ok: true, sent, failed, of: list.length });
  }
  const pid = parts[3];
  if (!/^[\w-]{6,40}$/.test(pid || '')) throw fail('Not found', 404);
  const raw = await env.SUBMISSIONS.get(`pledge:${drive}:${pid}`);
  if (!raw) throw fail('That pledge was not found.', 404);
  if (req.method === 'PUT') {
    const b = await req.json().catch(() => ({}));
    const rec = { ...JSON.parse(raw), paid: !!b.paid };
    await save(env, drive, rec);
    return json({ ok: true, pledge: rec });
  }
  if (req.method === 'DELETE') { await env.SUBMISSIONS.delete(`pledge:${drive}:${pid}`); return json({ ok: true }); }
  throw fail('Not found', 404);
}
