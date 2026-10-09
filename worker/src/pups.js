// Pawsome Pooches: connecting people, rescues and the folks who list pups.
//
//  POST /interest            public: "I want to adopt" form on a pup's page → admin inbox + emails
//                             (to the person, and to the rescue + whoever listed the pup, if they agreed)
//  POST /adopted             public, with the private code from the "listing is live" email:
//                             marks the pup adopted on the site and tells us in the admin inbox
//  cron (every 5 minutes)    sends "your listing is live" emails once the new listing page is online
import { githubToken, commitFiles, parseMd, stringifyMd } from './admin.js';
import { sendMail, pupsIndex, adoptToken, adoptLink, interestToAdopter, interestToRescue, listingApproved } from './mail.js';

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const fail = (msg, status = 400) => Object.assign(new Error(msg), { publicMessage: msg, status });
const clean = (v, max = 300) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
const cleanLong = (v, max = 2000) => String(v == null ? '' : v).replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
const newId = () => new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + crypto.randomUUID().slice(0, 8);
async function sha256(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); }
const site = (env) => (env.SITE_URL || 'https://bentleysplayhouse.org').replace(/\/$/, '');
async function turnstileOk(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return true;
  if (!token) return false;
  const v = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: String(token), remoteip: ip }) }).then((r) => r.json()).catch(() => ({}));
  return !!v.success;
}
/** Emails of the person (and second email) who submitted a pup through the form, if any. */
async function listerEmails(env, submissionId) {
  if (!submissionId) return { emails: [], firstName: '' };
  const r = await env.SUBMISSIONS.get(`sub:${submissionId}`, 'json');
  if (!r || !r.submitter) return { emails: [], firstName: '' };
  return { emails: [r.submitter.email, r.submitter.email2].filter(Boolean), firstName: r.submitter.firstName || '' };
}

// ---------- "I want to adopt" ----------
export async function receiveInterest(req, env, ctx) {
  const ip = req.headers.get('CF-Connecting-IP') || 'local';
  const rlKey = `rli:${await sha256(ip)}:${new Date().toISOString().slice(0, 13)}`;
  const used = Number(await env.SUBMISSIONS.get(rlKey)) || 0;
  if (used >= 10) throw fail('Too many requests from this connection. Please try again in an hour.', 429);
  let f;
  try { f = await req.formData(); } catch (e) { throw fail('Please use the form on the website.'); }
  if (clean(f.get('website'))) return json({ ok: true }); // honeypot
  if (!(await turnstileOk(env, f.get('cf-turnstile-response'), ip))) throw fail('Please complete the "I am human" check and try again.');

  const m = {
    id: newId(), form: 'adopt', createdAt: new Date().toISOString(), read: false,
    firstName: clean(f.get('firstName'), 60), lastName: clean(f.get('lastName'), 60), city: clean(f.get('city'), 80),
    phone: clean(f.get('phone'), 30), email: clean(f.get('email'), 120), message: cleanLong(f.get('message'), 1500),
    pup: clean(f.get('pup'), 90), shareWithRescue: f.get('share') === 'yes',
  };
  const missing = [];
  if (!m.firstName) missing.push('first name'); if (!m.lastName) missing.push('last name'); if (!m.city) missing.push('city');
  if (m.phone.replace(/\D/g, '').length < 7) missing.push('phone number'); if (!isEmail(m.email)) missing.push('email');
  if (missing.length) throw fail('Please add your ' + missing.join(', ') + '.');

  const pups = await pupsIndex(env);
  const pup = pups[m.pup];
  if (!pup) throw fail("We couldn't find that pup. Please refresh the page and try again.", 404);
  m.verb = pup.needs === 'foster' ? 'foster' : 'adopt';
  m.name = `${m.firstName} ${m.lastName}`;
  m.area = m.city;
  m.topic = `Wants to ${m.verb} ${pup.name}`;
  m.pupName = pup.name; m.pupUrl = pup.url;
  m.rescue = pup.rescue ? pup.rescue.name : '';

  await env.SUBMISSIONS.put(`msg:${m.id}`, JSON.stringify(m));
  await env.SUBMISSIONS.put(rlKey, String(used + 1), { expirationTtl: 3700 });

  // Who else hears about it: the rescue (from the listing) and whoever submitted the pup, unless it's a family rehoming (we screen those).
  const direct = pup.rescue && pup.locType !== 'family';
  const work = (async () => {
    const lister = await listerEmails(env, pup.submissionId);
    const a = interestToAdopter(env, { m, pup, rescue: direct ? pup.rescue : null, sharedWithRescue: direct && m.shareWithRescue });
    await sendMail(env, { to: m.email, subject: a.subject, html: a.html, text: a.text, tag: 'adopt-interest' });
    if (direct && m.shareWithRescue) {
      const r = interestToRescue(env, { m, pup });
      const to = [pup.rescue.email, ...lister.emails].filter(Boolean);
      if (to.length) await sendMail(env, { to: to[0], cc: to.slice(1), subject: r.subject, html: r.html, text: r.text, replyTo: m.email, tag: 'adopt-interest-rescue' });
      m.sentTo = to;
      await env.SUBMISSIONS.put(`msg:${m.id}`, JSON.stringify(m));
    }
  })().catch((e) => console.error('interest mail', e && e.message));
  if (ctx && ctx.waitUntil) ctx.waitUntil(work); else await work;
  return json({ ok: true, rescue: direct ? pup.rescue : null, shared: !!(direct && m.shareWithRescue) });
}

// ---------- "Mark as adopted" (from the button in the listing email) ----------
export async function markAdopted(req, env) {
  const b = await req.json().catch(() => ({}));
  const slug = clean(b.pup, 90);
  if (!/^[a-z0-9][a-z0-9-]{0,89}$/.test(slug)) throw fail('That link looks incomplete. Please use the button in your email.');
  const good = await adoptToken(env, slug);
  if (clean(b.code, 64) !== good) throw fail('That link looks incomplete. Please use the button in your email.', 403);
  const token = await githubToken(env);
  const path = `content/pawsome/${slug}.md`;
  const r = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}?ref=${env.GITHUB_BRANCH || 'main'}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.raw+json', 'User-Agent': 'bentleys-playhouse-admin', 'X-GitHub-Api-Version': '2022-11-28' } });
  if (r.status === 404) throw fail('This pup is no longer on the website.', 404);
  if (!r.ok) throw fail('Something went wrong. Please try again in a minute.', 502);
  const { data, body } = parseMd(await r.text());
  const name = data.name || slug;
  if (data.status === 'adopted') return json({ ok: true, already: true, name });
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  data.status = 'adopted'; data.adoptedDate = today;
  await commitFiles(env, token, `Pawsome Pooches: ${name} was adopted (marked by the person who listed them)`, [{ path, content: stringifyMd(data, body) }]);
  // tell us: a note in the admin inbox
  const note = { id: newId(), form: 'adopted', createdAt: new Date().toISOString(), read: false, name, topic: `${name} was adopted`, pup: slug, pupName: name, pupUrl: `${site(env)}/pawsome-pooches/${slug}/`, message: `${name} was marked as adopted by the person who listed them (from the button in their email). The listing now shows "Adopted" and Share to Stories is hidden. Nothing else to do, unless you'd like to celebrate on Instagram.`, email: '' };
  await env.SUBMISSIONS.put(`msg:${note.id}`, JSON.stringify(note));
  return json({ ok: true, name });
}

// ---------- "Your listing is live" emails, sent once the page is online ----------
export async function queueApprovalEmail(env, rec, result, stories) {
  const S = rec.submitter || {};
  const to = [S.email, S.email2].filter(isEmail);
  if (!to.length) return;
  await env.SUBMISSIONS.put(`mailq:${rec.id}`, JSON.stringify({ sid: rec.id, slug: result.slug, name: result.name, url: result.url, photo: result.photo, needs: rec.dog.needs, firstName: S.firstName || '', to, stories, queuedAt: new Date().toISOString() }));
}
export async function sendQueuedEmails(env) {
  const page = await env.SUBMISSIONS.list({ prefix: 'mailq:' });
  for (const k of page.keys) {
    const q = await env.SUBMISSIONS.get(k.name, 'json');
    if (!q) { await env.SUBMISSIONS.delete(k.name); continue; }
    const age = Date.now() - Date.parse(q.queuedAt);
    const live = await fetch(q.url, { method: 'HEAD', cf: { cacheTtl: 0 } }).then((r) => r.ok).catch(() => false);
    const imgs = !q.stories.length || await fetch(q.stories[0].url, { method: 'HEAD', cf: { cacheTtl: 0 } }).then((r) => r.ok).catch(() => false);
    if (!(live && imgs) && age < 6 * 3600 * 1000) continue; // try again in 5 minutes (give up waiting after 6 hours)
    if (!env.RESEND_API_KEY) { if (age > 3 * 24 * 3600 * 1000) await env.SUBMISSIONS.delete(k.name); continue; } // waits for email to be switched on
    const e = listingApproved(env, { name: q.name, url: q.url, firstName: q.firstName, adoptUrl: await adoptLink(env, q.slug, q.name), stories: q.stories, photo: q.photo, needs: q.needs });
    const res = await sendMail(env, { to: q.to[0], cc: q.to.slice(1), subject: e.subject, html: e.html, text: e.text, tag: 'listing-live' });
    if (res && res.error) continue;
    await env.SUBMISSIONS.delete(k.name);
    const rec = await env.SUBMISSIONS.get(`sub:${q.sid}`, 'json');
    if (rec) { rec.liveEmailSentAt = new Date().toISOString(); await env.SUBMISSIONS.put(`sub:${rec.id}`, JSON.stringify(rec), { metadata: { status: rec.status, name: rec.dog.name, createdAt: rec.createdAt } }); }
  }
}
