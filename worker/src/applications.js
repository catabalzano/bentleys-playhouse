// Adoption and foster applications sent from bentleysplayhouse.org/applications/…
//  POST /apply?form=adoption|foster   public: checked against app-forms.js, stored as msg:<id> (form adoptapp|fosterapp)
// They show up in the admin's 📬 Messages with every answer, and hello@ gets an email with the answers.
// The applicant gets a short "we got it" email. A driver's license number is kept in the admin only, never emailed.
import { APP_FORMS, allFields } from './app-forms.js';
import { sendMail, layout, p, note, plain, h } from './mail.js';

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const fail = (msg, status = 400) => Object.assign(new Error(msg), { publicMessage: msg, status });
const clean = (v, max = 300) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
const cleanLong = (v, max = 3000) => String(v == null ? '' : v).replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
export const APP_KIND = { adoption: 'adoptapp', foster: 'fosterapp' };

async function sha256(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); }
async function turnstileOk(env, f, ip) {
  if (!env.TURNSTILE_SECRET) return true;
  const token = String(f.get('cf-turnstile-response') || '');
  if (!token) return false;
  const v = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip }) }).then((r) => r.json()).catch(() => ({}));
  return !!v.success;
}

export async function receiveApplication(req, env, url) {
  const form = APP_FORMS[url.searchParams.get('form')];
  if (!form) throw fail('Unknown application.');
  const ip = req.headers.get('CF-Connecting-IP') || 'local';
  const rlKey = `rla:${await sha256(ip)}:${new Date().toISOString().slice(0, 10)}`;
  const used = Number(await env.SUBMISSIONS.get(rlKey)) || 0;
  if (used >= 5) throw fail('Too many applications from this connection today. Please email hello@bentleysplayhouse.org.', 429);

  let f;
  try { f = await req.formData(); } catch (e) { throw fail('Please use the form on the website.'); }
  if (clean(f.get('website'))) return json({ ok: true }); // honeypot
  if (!(await turnstileOk(env, f, ip))) throw fail('Please complete the "I am human" check and try again.');

  const answers = [];
  const missing = [];
  for (const fd of allFields(form)) {
    let a;
    if (fd.type === 'checks') a = f.getAll(fd.id).map((x) => clean(x, 80)).filter((x) => fd.opts.includes(x));
    else if (fd.type === 'agree') a = f.get(fd.id) ? 'Yes' : '';
    else if (fd.type === 'radio') { a = clean(f.get(fd.id), 120); if (a && !fd.opts.includes(a)) a = ''; }
    else if (fd.type === 'textarea') a = cleanLong(f.get(fd.id));
    else if (fd.type === 'initials') a = clean(f.get(fd.id), 6);
    else a = clean(f.get(fd.id), fd.type === 'text' ? 300 : 120);
    const empty = Array.isArray(a) ? !a.length : !a;
    if (fd.req && empty) missing.push(fd.label);
    answers.push({ id: fd.id, s: fd.section, q: fd.label, a, type: fd.type, ...(fd.private ? { private: true } : {}) });
  }
  const get = (id) => (answers.find((x) => x.id === id) || {}).a || '';
  const email = get('email');
  if (missing.length) throw fail(`Please answer: ${missing.slice(0, 3).join('; ')}${missing.length > 3 ? ` and ${missing.length - 3} more` : ''}.`);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fail('Please check your email address.');
  if (!f.get('consent')) throw fail('Please tick the box so we can contact you about your application.');

  const name = get('name');
  const m = {
    id: new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + crypto.randomUUID().slice(0, 8),
    form: APP_KIND[form.id],
    createdAt: new Date().toISOString(),
    read: false,
    name, email,
    phone: get('cell') || get('phone'),
    area: form.id === 'adoption' ? get('city') : '',
    topic: form.id === 'adoption' ? `Adoption application${get('pet') ? ': ' + get('pet') : ''}` : 'Foster application',
    pupName: form.id === 'adoption' ? get('pet') : '',
    answers,
  };
  await env.SUBMISSIONS.put(`msg:${m.id}`, JSON.stringify(m));
  await env.SUBMISSIONS.put(rlKey, String(used + 1), { expirationTtl: 90000 });
  if (env.ALERTS !== 'off') {
    try { await toTeam(env, form, m); } catch (e) { console.error('application alert', e); }
    try { m.confirm = await toApplicant(env, form, m); await env.SUBMISSIONS.put(`msg:${m.id}`, JSON.stringify(m)); } catch (e) { console.error('application confirm', e); }
  }
  return json({ ok: true });
}

const show = (x) => (Array.isArray(x.a) ? x.a.join(', ') : x.a) || '—';

function toTeam(env, form, m) {
  const site = (env.SITE_URL || 'https://bentleysplayhouse.org').replace(/\/$/, '');
  const inbox = `${site}/admin/#messages`;
  let last = '';
  const rows = m.answers.map((x) => {
    const head = x.s !== last ? `<tr><td colspan="2" style="padding:16px 0 6px;font-weight:bold;color:#2F45C8;font-size:15px">${h(x.s)}</td></tr>` : '';
    last = x.s;
    const a = x.private ? '<i>Provided. See it in the admin.</i>' : h(show(x)).replace(/\n/g, '<br>');
    return `${head}<tr><td style="padding:5px 14px 5px 0;color:#5c5a72;vertical-align:top;width:45%">${h(x.q)}</td><td style="padding:5px 0;vertical-align:top">${a}</td></tr>`;
  }).join('');
  last = '';
  const text = m.answers.map((x) => { const head = x.s !== last ? `\n== ${x.s} ==\n` : ''; last = x.s; return `${head}${x.q}\n  ${x.private ? '(provided, see the admin)' : show(x)}`; }).join('\n');
  const html = `<div style="font-family:Arial,sans-serif;color:#1F1D2B;max-width:640px"><h2 style="color:#2F45C8;margin:0 0 4px">New ${h(form.short.toLowerCase())}: ${h(m.name)}</h2><p style="margin:0 0 6px;color:#5c5a72">${h(m.topic)} · reply to this email to answer them.</p><p style="margin:0 0 10px"><a href="${h(inbox)}">Open it in the admin</a></p><table style="border-collapse:collapse;font-size:14px;width:100%">${rows}</table></div>`;
  return sendMail(env, { to: env.NOTIFY_EMAIL || 'hello@bentleysplayhouse.org', subject: `New ${form.short.toLowerCase()}: ${m.name}${m.pupName ? ' for ' + m.pupName : ''}`, html, text: `New ${form.short.toLowerCase()} from ${m.name}\nAdmin: ${inbox}\n${text}\n`, replyTo: m.email, tag: m.form });
}

async function toApplicant(env, form, m) {
  const first = m.name.split(' ')[0];
  const what = form.id === 'adoption' ? `adoption application${m.pupName && !/^not sure/i.test(m.pupName) ? ` for ${h(m.pupName)}` : ''}` : 'foster application';
  const subject = form.id === 'adoption' ? 'We got your adoption application' : 'We got your foster application';
  const next = form.id === 'adoption'
    ? 'We read every application ourselves. If it looks like a good fit, we\'ll call you for a short phone chat, then set up a home visit.'
    : 'We read every application ourselves. Next we\'ll call you for a short phone chat and set up a home visit. If you haven\'t yet, please email us photos of your home and a photo of your driver\'s license.';
  const html = layout(env, { pre: subject, title: `Thank you, ${h(first)}!`, body: p(`We got your ${what}. Thank you for wanting to help a rescue dog.`) + note(next) + p("We'll get back to you within a few days. If anything changes, just reply to this email.") });
  const text = plain([`Thank you, ${first}!`, '', `We got your ${what.replace(/<[^>]+>/g, '')}. Thank you for wanting to help a rescue dog.`, '', next, '', "We'll get back to you within a few days."]);
  const r = await sendMail(env, { to: m.email, subject, html, text, tag: m.form + '-confirm' });
  return { subject, at: new Date().toISOString(), status: r && r.id ? 'sent' : r && r.skipped ? 'off' : 'failed' };
}
