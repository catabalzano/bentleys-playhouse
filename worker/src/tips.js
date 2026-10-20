// Community tips from bentleysplayhouse.org/submit-a-tip/ (Cata, Oct 19, 2026).
//  POST /tip   public: fields + up to 5 PDFs and 3 photos → msg:<id> (form "tip") + msgf:<id>:<n> files
// Shows up in the admin's 📬 Messages ("Tips" tab) with every answer and the attachments.
// hello@ gets an email with the answers (files stay in the admin); the tipster gets a short "we got it" email.
import { sendMail, layout, p, note, plain, h } from './mail.js';

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const fail = (msg, status = 400) => Object.assign(new Error(msg), { publicMessage: msg, status });
const clean = (v, max = 300) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
const cleanLong = (v, max = 5000) => String(v == null ? '' : v).replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
const MAX_PDFS = 5, MAX_PHOTOS = 3, MAX_FILE = 10 * 1024 * 1024, MAX_TOTAL = 60 * 1024 * 1024;
const YN = ['Yes', 'No'];
const POST = ['Yes, you may post it', 'No, only use it for the investigation'];
const CREDIT = ['Yes, credit me', "No, don't credit me"];

function sniff(b) {
  const str = (i, n) => String.fromCharCode(...b.slice(i, i + n));
  if (str(0, 5) === '%PDF-') return ['application/pdf', 'pdf'];
  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return ['image/jpeg', 'jpg'];
  if (b[0] === 0x89 && str(1, 3) === 'PNG') return ['image/png', 'png'];
  if (str(0, 4) === 'RIFF' && str(8, 4) === 'WEBP') return ['image/webp', 'webp'];
  if (str(4, 4) === 'ftyp' && /^(heic|heix|hevc|mif1|msf1|heim|heis)$/.test(str(8, 4))) return ['image/heic', 'heic'];
  return null;
}
async function sha256(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); }
async function turnstileOk(env, f, ip) {
  if (!env.TURNSTILE_SECRET) return true;
  const token = String(f.get('cf-turnstile-response') || '');
  if (!token) return false;
  const v = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip }) }).then((r) => r.json()).catch(() => ({}));
  return !!v.success;
}
const pick = (v, opts) => (opts.includes(v) ? v : '');

export async function receiveTip(req, env) {
  const ip = req.headers.get('CF-Connecting-IP') || 'local';
  const rlKey = `rlt:${await sha256(ip)}:${new Date().toISOString().slice(0, 10)}`;
  const used = Number(await env.SUBMISSIONS.get(rlKey)) || 0;
  if (used >= 8) throw fail('Too many tips from this connection today. Please email hello@bentleysplayhouse.org.', 429);

  let f;
  try { f = await req.formData(); } catch (e) { throw fail('Please use the form on the website.'); }
  if (clean(f.get('website'))) return json({ ok: true }); // honeypot
  if (!(await turnstileOk(env, f, ip))) throw fail('Please complete the "I am human" check and try again.');

  const anon = !!f.get('anonymous');
  const t = {
    first: clean(f.get('firstName'), 60), last: clean(f.get('lastName'), 60),
    email: clean(f.get('email'), 120), phone: clean(f.get('phone'), 30),
    instagram: clean(f.get('instagram'), 60), canDm: pick(clean(f.get('canDm')), YN),
    mdas: pick(clean(f.get('mdas')), YN), mdasShelter: pick(clean(f.get('mdasShelter')), ['Doral', 'Medley', 'Not sure']), mdasAnimalId: clean(f.get('mdasAnimalId'), 40),
    details: cleanLong(f.get('details')), where: clean(f.get('where'), 200), when: clean(f.get('when'), 120),
    called311: pick(clean(f.get('called311')), YN), said311: cleanLong(f.get('said311'), 1500),
    called911: pick(clean(f.get('called911')), YN), said911: cleanLong(f.get('said911'), 1500), caseNumber: clean(f.get('caseNumber'), 60),
    postLinks: cleanLong(f.get('postLinks'), 2000), videoLinks: cleanLong(f.get('videoLinks'), 2000),
    canPost: pick(clean(f.get('canPost')), POST),
    credit: anon ? CREDIT[1] : pick(clean(f.get('credit')), CREDIT),
  };
  const agreed = ['accurate', 'owner', 'investigate', 'release', ...(anon ? ['anonUnderstand'] : [])];
  const missing = [];
  if (!anon) { if (!t.first) missing.push('first name'); if (!t.last) missing.push('last name'); if (!t.phone) missing.push('phone number'); }
  if (!t.mdas) missing.push('whether this is about Miami-Dade Animal Services');
  if (!t.details) missing.push('what is happening');
  if (!t.where) missing.push('where it is happening');
  if (!t.called311) missing.push('whether you called 311');
  if (!t.called911) missing.push('whether you called 911');
  if (!t.canPost) missing.push('whether we may post your content');
  if (!t.credit) missing.push('whether you want credit');
  if (missing.length) throw fail(`Please add ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? ' and a few more answers' : ''}.`);
  if ((!anon || t.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t.email)) throw fail('Please check your email address.');
  if (agreed.some((k) => !f.get(k)) || !f.get('consent')) throw fail('Please tick every statement in "Your Agreement" and the privacy box.');

  // attachments: PDFs and photos, checked by their first bytes
  const files = [];
  let total = 0, pdfs = 0, photos = 0;
  for (const [field, kind] of [['docs', 'pdf'], ['photos', 'image']]) {
    for (const u of f.getAll(field).filter((x) => x && typeof x === 'object' && x.size > 0)) {
      if (u.size > MAX_FILE) throw fail(`"${clean(u.name, 60)}" is too big. Each file can be up to 10 MB.`);
      total += u.size;
      if (total > MAX_TOTAL) throw fail('Those files are too big together. Please send some of them by email instead.');
      const buf = await u.arrayBuffer();
      const k = sniff(new Uint8Array(buf.slice(0, 16)));
      if (!k || (kind === 'pdf') !== (k[1] === 'pdf')) throw fail(kind === 'pdf' ? `"${clean(u.name, 60)}" isn't a PDF.` : `"${clean(u.name, 60)}" isn't a photo. Please use JPG, PNG or HEIC.`);
      if (kind === 'pdf' && ++pdfs > MAX_PDFS) throw fail(`Please attach up to ${MAX_PDFS} PDFs.`);
      if (kind === 'image' && ++photos > MAX_PHOTOS) throw fail(`Please attach up to ${MAX_PHOTOS} photos.`);
      const base = clean(u.name, 80).replace(/[^\w .()-]/g, '').replace(/\.[^.]*$/, '') || (kind === 'pdf' ? 'document' : 'photo');
      files.push({ buf, name: `${base}.${k[1]}`, type: k[0], size: u.size });
    }
  }

  const name = [t.first, t.last].filter(Boolean).join(' ') || 'Anonymous';
  const A = (s, q, a) => ({ s, q, a: a || '' });
  const answers = [
    A('About them', 'Wants to stay anonymous', anon ? 'Yes' : 'No'),
    A('About them', 'Name', [t.first, t.last].filter(Boolean).join(' ')),
    A('About them', 'Email', t.email), A('About them', 'Phone', t.phone),
    A('About them', 'Instagram', t.instagram), A('About them', 'Can we DM them?', t.canDm),
    A("What's happening", 'Negligence at Miami-Dade Animal Services?', t.mdas), A("What's happening", 'MDAS shelter', t.mdas === 'Yes' ? t.mdasShelter : ''), A("What's happening", 'MDAS animal ID', t.mdas === 'Yes' ? t.mdasAnimalId : ''),
    A("What's happening", 'What is happening', t.details), A("What's happening", 'Where', t.where), A("What's happening", 'When', t.when),
    A('Who they contacted', 'Called 311?', t.called311), A('Who they contacted', '311 said', t.said311),
    A('Who they contacted', 'Called 911?', t.called911), A('Who they contacted', 'Police said', t.said911), A('Who they contacted', 'Case number', t.caseNumber),
    A('Proof and posts', 'Social media posts', t.postLinks), A('Proof and posts', 'Video links', t.videoLinks),
    A('Proof and posts', 'Attachments', files.map((x) => x.name).join(', ')),
    A('Using their content', 'May we post or repost it?', t.canPost), A('Using their content', 'Credit', t.credit),
    A('Agreement', 'Ticked', `Accurate, owns the content, investigation use, release${anon ? ', anonymity' : ''}, privacy (${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC)`),
  ];
  const m = {
    id: new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + crypto.randomUUID().slice(0, 8),
    form: 'tip', createdAt: new Date().toISOString(), read: false,
    name: anon ? (name === 'Anonymous' ? name : `${name} (asked to stay anonymous)`) : name, email: t.email, phone: t.phone, area: t.where,
    topic: `${t.mdas === 'Yes' ? 'MDAS negligence tip' : 'Tip'}: ${t.where}`, anonymous: anon, answers,
    files: files.map((x, i) => ({ n: i, name: x.name, type: x.type, size: x.size })),
  };
  for (const [i, x] of files.entries()) await env.SUBMISSIONS.put(`msgf:${m.id}:${i}`, x.buf, { metadata: { name: x.name, type: x.type } });
  await env.SUBMISSIONS.put(`msg:${m.id}`, JSON.stringify(m));
  await env.SUBMISSIONS.put(rlKey, String(used + 1), { expirationTtl: 90000 });
  if (env.ALERTS !== 'off') {
    try { await toTeam(env, m); } catch (e) { console.error('tip alert', e); }
    if (t.email) try { m.confirm = await toTipster(env, m, t.first); await env.SUBMISSIONS.put(`msg:${m.id}`, JSON.stringify(m)); } catch (e) { console.error('tip confirm', e); }
  }
  return json({ ok: true });
}

function toTeam(env, m) {
  const site = (env.SITE_URL || 'https://bentleysplayhouse.org').replace(/\/$/, '');
  const inbox = `${site}/admin/#messages`;
  let last = '';
  const rows = m.answers.filter((x) => x.a).map((x) => {
    const head = x.s !== last ? `<tr><td colspan="2" style="padding:14px 0 6px;font-weight:bold;color:#2F45C8">${h(x.s)}</td></tr>` : '';
    last = x.s;
    return `${head}<tr><td style="padding:4px 14px 4px 0;color:#5c5a72;vertical-align:top;width:35%">${h(x.q)}</td><td style="padding:4px 0;vertical-align:top">${h(x.a).replace(/\n/g, '<br>')}</td></tr>`;
  }).join('');
  const html = `<div style="font-family:Arial,sans-serif;color:#1F1D2B;max-width:640px"><h2 style="color:#A93A07;margin:0 0 4px">New ${h(m.topic.split(':')[0].replace(/^Tip$/, 'tip').replace(/^MDAS negligence tip$/, 'MDAS negligence tip'))}: ${h(m.area)}</h2><p style="margin:0 0 6px;color:#5c5a72">From ${h(m.name)}${m.files.length ? ` · ${m.files.length} attachment${m.files.length > 1 ? 's' : ''} in the admin` : ''}</p><p style="margin:0 0 10px"><a href="${h(inbox)}">Open it in the admin</a></p><table style="border-collapse:collapse;font-size:14px;width:100%">${rows}</table></div>`;
  const text = `New tip from ${m.name}\nAdmin: ${inbox}\n\n` + m.answers.filter((x) => x.a).map((x) => `${x.q}: ${x.a}`).join('\n');
  return sendMail(env, { to: env.NOTIFY_EMAIL || 'hello@bentleysplayhouse.org', subject: `New ${m.topic.startsWith('MDAS') ? 'MDAS negligence tip' : 'tip'}: ${m.area}`, html, text, replyTo: m.email || undefined, tag: 'tip' });
}

async function toTipster(env, m, first) {
  const subject = 'We got your tip';
  const body = p('Thank you for speaking up for an animal. We got your tip and will look into it.') + note("We read every tip ourselves. If we need more details, we'll reach out using the contact information you gave us. If an animal is in danger right now, please call 911, or Miami-Dade Animal Services at 311.") + p('If you have more photos, videos or updates, just reply to this email.');
  const html = layout(env, { pre: subject, title: first ? `Thank you, ${h(first)}!` : 'Thank you!', body });
  const text = plain([first ? `Thank you, ${first}!` : 'Thank you!', '', 'We got your tip and will look into it. If an animal is in danger right now, please call 911, or Miami-Dade Animal Services at 311.', '', 'If you have more photos, videos or updates, just reply to this email.']);
  const r = await sendMail(env, { to: m.email, subject, html, text, tag: 'tip-confirm' });
  return { subject, at: new Date().toISOString(), status: r && r.id ? 'sent' : r && r.skipped ? 'off' : 'failed' };
}
