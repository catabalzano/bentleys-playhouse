// Pledge drives (Cata, Oct 22, 2026): bentleysplayhouse.org/pledge/<slug>/ — people promise an amount to help get a shelter pup out; the money goes straight to the rescue that pulls them.
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
import { sendMail, layout, p, note, facts, h, h2, plain, btn } from './mail.js';

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
  const body = p(`We got your pledge to help get ${h(d.name)} out of ${h(d.shelter || 'the shelter')}. This email is your record of it.`)
    + facts([['Your pledge', `<b>${money(rec.amount)}</b>`], ['For', h(d.name) + (d.animalId ? ` (${h(d.animalId)})` : '')], ['Name', h(`${rec.first} ${rec.last}`)], ['Social', h(rec.social)]])
    + note(`<strong>This is a promise, not a payment.</strong> Nothing is charged today. Once ${h(d.name)} is safe, we'll email you from hello@bentleysplayhouse.org with how to send your pledge.`)
    + p(`Every pledge goes directly to the rescue that steps up to pull ${h(d.name)}, not to Bentley's Playhouse. We don't take a percentage, and we never collect or handle the money.`, 'color:#5C5A72;font-size:14px')
    + p(`Every share brings in more pledges. Send ${h(d.name)}'s page to a friend: <a href="${h(url)}" style="color:#2F45C8;font-weight:700">${h(url.replace(/^https?:\/\//, ''))}</a>`);
  const html = layout(env, { pre: `Your ${money(rec.amount)} pledge for ${d.name} is in. Nothing is charged today.`, title: `Thank you, ${h(rec.first)}!`, body });
  const text = plain([`Thank you, ${rec.first}!`, '', `We got your pledge to help get ${d.name} out of ${d.shelter || 'the shelter'}.`, '', `Your pledge: ${money(rec.amount)}`, `For: ${d.name}${d.animalId ? ` (${d.animalId})` : ''}`, '', `This is a promise, not a payment. Nothing is charged today. Once ${d.name} is safe, we'll email you from hello@bentleysplayhouse.org with how to send your pledge.`, '', `Every pledge goes directly to the rescue that steps up to pull ${d.name}, not to Bentley's Playhouse. We don't take a percentage, and we never collect or handle the money.`, '', `Share ${d.name}'s page: ${url}`]);
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
    const d = (await drives(env))[drive] || { name: 'the pup' };
    const mail = pledgeMail(b, d); // checks everything before anyone is emailed
    const only = ['unpaid', 'unemailed'].includes(b.only) ? b.only : 'all';
    const list = (await roster(env, drive)).filter((x) => only === 'all' || (only === 'unpaid' ? !x.paid : !x.emailedAt));
    if (b.preview) return json({ ok: true, html: mail.html({ first: 'Ana', amount: 30 }, env) });
    let sent = 0, failed = 0;
    for (const x of list) {
      const r = await sendMail(env, { to: x.email, subject: mail.subject(x), html: mail.html(x, env), text: mail.text(x), tag: 'pledge-update' }).catch(() => null);
      if (r && r.id) { sent++; await save(env, drive, { ...x, emailedAt: new Date().toISOString(), emailSubject: mail.subject(x) }); }
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

// ---------- "send your pledge" email (Nov 2, 2026: built from fields, so it always looks on brand) ----------
// body: { subject, intro, rescue: { name, instagram }, methods: [{ type, value, payee }] }
export const PAY_TYPES = { zeffy: 'Zeffy', paypal: 'PayPal', venmo: 'Venmo', zelle: 'Zelle', cashapp: 'Cash App', check: 'Check', link: 'Donation page', other: 'Other' };
const isUrl = (v) => /^https:\/\/[^\s]+\.[^\s]+$/i.test(v) && !/\.\.\.|…/.test(v);
export function pledgeMail(b, d) {
  const subjectT = clean(b.subject, 160);
  const intro = String(b.intro || '').replace(/\r\n/g, '\n').trim().slice(0, 2000);
  const rescue = { name: clean(b.rescue && b.rescue.name, 120), instagram: clean(b.rescue && b.rescue.instagram, 60).replace(/^@/, '') };
  const methods = (Array.isArray(b.methods) ? b.methods : []).slice(0, 8).map((m) => ({ type: PAY_TYPES[m.type] ? m.type : 'other', value: String(m.value || '').replace(/\r\n/g, '\n').trim().slice(0, 400), payee: clean(m.payee, 120) })).filter((m) => m.value);
  if (!subjectT) throw fail('Please write a subject.');
  if (!rescue.name) throw fail('Please add the name of the rescue that pulled the pup.');
  if (!methods.length) throw fail('Please add at least one way to send the pledge.');
  for (const m of methods) {
    if (['zeffy', 'link'].includes(m.type) && !isUrl(m.value)) throw fail(`The ${PAY_TYPES[m.type]} link has to be the full address, starting with https:// (copy it from the browser bar, not from an Instagram caption, where links get shortened with "...").`);
    if (m.type === 'paypal' && /^http/i.test(m.value) && !isUrl(m.value)) throw fail('The PayPal link has to be the full address, starting with https://.');
  }
  const name = d.name || 'the pup';
  const cap = (v) => String(v || '').charAt(0).toUpperCase() + String(v || '').slice(1);
  const fill = (s, x) => s.replace(/\{first\}/gi, cap(x.first)).replace(/\{amount\}/gi, money(Number(x.amount)));
  const A = 'color:#2F45C8;font-weight:700;text-decoration:none';
  const row = (label, valueHtml, button = '') => `<tr><td style="padding:14px 0;border-top:1px solid #E3E6F5;font-family:Figtree,\'Segoe UI\',Helvetica,Arial,sans-serif"><div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;font-weight:700;color:#5C5A72;margin:0 0 4px">${h(label)}</div><div style="font-size:16px;line-height:1.5;color:#1F1D2B">${valueHtml}</div>${button}</td></tr>`;
  const methodHtml = (m) => {
    const v = m.value;
    switch (m.type) {
      case 'zeffy': return row('Zeffy (card or bank)', 'Donate online with Zeffy. It\'s free for the rescue.', btn('Donate on Zeffy', v));
      case 'link': return row(m.payee || 'Donation page', `<a href="${h(v)}" style="${A}">${h(v.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</a>`, btn('Open the donation page', v));
      case 'paypal': return isUrl(v) ? row('PayPal', `<a href="${h(v)}" style="${A}">${h(v.replace(/^https?:\/\/(www\.)?/, ''))}</a>`, btn('Pay with PayPal', v)) : row('PayPal', `Send to <b>${h(v)}</b>`);
      case 'venmo': { const hd = v.replace(/^@/, ''); return /^[\w-]{3,40}$/.test(hd) ? row('Venmo', `<a href="https://venmo.com/u/${h(hd)}" style="${A}">@${h(hd)}</a>`) : row('Venmo', `Search for <b>${h(v)}</b>`); }
      case 'cashapp': { const tg = v.replace(/^\$/, ''); return /^[\w-]{1,30}$/.test(tg) ? row('Cash App', `<a href="https://cash.app/$${h(tg)}" style="${A}">$${h(tg)}</a>`) : row('Cash App', h(v)); }
      case 'zelle': return row('Zelle', `Send to <b>${h(v)}</b>`);
      case 'check': return row('Check', `${m.payee ? `Make it out to <b>${h(m.payee)}</b><br>` : ''}Mail it to:<br>${h(v).replace(/\n/g, '<br>')}`);
      default: return row(m.payee || 'Other', h(v).replace(/\n/g, '<br>'));
    }
  };
  const methodText = (m) => `- ${m.type === 'other' || m.type === 'link' ? (m.payee || PAY_TYPES[m.type]) : PAY_TYPES[m.type]}: ${m.type === 'check' ? `${m.payee ? `make it out to ${m.payee}, ` : ''}mail to ${m.value.replace(/\n/g, ', ')}` : m.value}`;
  const ig = rescue.instagram ? ` (<a href="https://www.instagram.com/${h(rescue.instagram)}/" style="${A}">@${h(rescue.instagram)}</a>)` : '';
  return {
    subject: (x) => fill(subjectT, x),
    html: (x, env) => layout(env, {
      pre: `You pledged ${money(Number(x.amount))} for ${name}. Here's how to send it to ${rescue.name}.`,
      title: `Hi ${h(cap(x.first))}!`,
      body: (intro ? fill(intro, x).split(/\n{2,}/).map((para) => p(h(para).replace(/\n/g, '<br>'))).join('') : p(`${h(name)} is out of the shelter, and you helped make it happen. Thank you!`))
        + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 8px"><tr><td bgcolor="#FFF3D6" style="background:#FFF3D6;border-radius:16px;padding:16px 18px;font-family:Figtree,\'Segoe UI\',Helvetica,Arial,sans-serif;color:#1F1D2B"><div style="font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#7A5A12">Your pledge</div><div style="font-size:30px;font-weight:700;line-height:1.2;margin:2px 0">${money(Number(x.amount))}</div><div style="font-size:15px">for ${h(name)}${d.animalId ? ` (${h(d.animalId)})` : ''}</div></td></tr></table>`
        + h2('How to Send Your Pledge')
        + p(`Please send it directly to <b>${h(rescue.name)}</b>${ig}, the rescue that pulled ${h(name)}. Bentley's Playhouse never collects or handles the money. Pick whichever way is easiest:`)
        + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 18px;border-bottom:1px solid #E3E6F5">${methods.map(methodHtml).join('')}</table>`
        + note(`<strong>Tip:</strong> add "${h(name)}" to the payment note so ${h(rescue.name)} knows what it's for.`)
        + p('We\'ll share updates on Instagram at <a href="https://www.instagram.com/bentleysplayhouse/" style="' + A + '">@bentleysplayhouse</a>.'),
    }),
    text: (x) => plain([`Hi ${cap(x.first)}!`, '', intro ? fill(intro, x) : `${name} is out of the shelter, and you helped make it happen. Thank you!`, '', `Your pledge: ${money(Number(x.amount))} for ${name}`, '', `HOW TO SEND YOUR PLEDGE`, `Please send it directly to ${rescue.name}${rescue.instagram ? ` (@${rescue.instagram})` : ''}, the rescue that pulled ${name}. Bentley's Playhouse never collects or handles the money.`, '', ...methods.map(methodText), '', `Tip: add "${name}" to the payment note so ${rescue.name} knows what it's for.`, '', 'We\'ll share updates on Instagram at @bentleysplayhouse.']),
  };
}
