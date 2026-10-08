import { handleAuth, handleContent, sessionOk, githubToken } from './admin.js';
import { receiveMessage, handleMessages } from './messages.js';
import { translateMissing } from './translate.js';
// Bentley's Playhouse · Pawsome Pooches submissions
// A tiny private backend for the static site (GitHub Pages can't receive forms).
//
//  POST /submit                 public form: fields + 1–5 photos  → stored privately in KV (status: pending)
//  GET  /admin/list             Cata only: all submissions (contact info included)
//  GET  /admin/photo/:id/:n     Cata only: a submitted photo
//  POST /admin/approve/:id      Cata only: publishes the pup (one commit: photos + content/pawsome/<slug>.md)
//  POST /admin/reject/:id       Cata only: marks rejected, deletes photos
//  POST /admin/delete/:id       Cata only: removes the submission completely
//
// "Cata only" = the request carries a GitHub token that can push to the site repo
// (the same kind of token used to sign in to /admin). Nothing secret is stored here.
// Submitters' phone, email and handle never go into the public repo.

const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 6 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const LOCATION_TYPES = ['rescue', 'mdas-doral', 'mdas-medley', 'broward', 'family', 'foster', 'other'];
const YN = ['yes', 'no', 'unknown'];
const YNS = ['yes', 'no', 'some', 'unknown'];

export default {
  // every 20 minutes: translate new English text on the site into Spanish (see translate.js)
  async scheduled(event, env, ctx) { ctx.waitUntil(translateMissing(env, { limit: 60 }).catch((e) => console.log('translate', e && e.message))); },
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const cors = corsHeaders(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    try {
      let res;
      if (url.pathname === '/' && req.method === 'GET') res = json({ ok: true, service: 'pawsome-submissions' });
      else if (url.pathname === '/submit' && req.method === 'POST') res = await submit(req, env, ctx);
      else if (url.pathname.startsWith('/admin/')) res = await admin(req, env, url);
      else if (url.pathname.startsWith('/auth/')) res = await handleAuth(req, env, url);
      else if (url.pathname === '/message' && req.method === 'POST') res = await receiveMessage(req, env, url);
      else if (url.pathname.startsWith('/api/messages')) res = await handleMessages(req, env, url);
      else if (url.pathname.startsWith('/api/')) res = await handleContent(req, env, url);
      else res = json({ error: 'Not found' }, 404);
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
      return res;
    } catch (e) {
      const r = json({ error: e.publicMessage || 'Something went wrong. Please try again.' }, e.status || 500);
      for (const [k, v] of Object.entries(cors)) r.headers.set(k, v);
      if (!e.publicMessage) console.error(e && e.stack || e);
      return r;
    }
  },
};

// ---------- helpers ----------
function corsHeaders(req, env) {
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const origin = req.headers.get('Origin') || '';
  const ok = allowed.includes(origin) || allowed.includes('*');
  return ok ? { 'Access-Control-Allow-Origin': origin || '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Authorization,Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' } : { Vary: 'Origin' };
}
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const fail = (msg, status = 400) => Object.assign(new Error(msg), { publicMessage: msg, status });
const clean = (v, max = 300) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
const cleanLong = (v, max = 3000) => String(v == null ? '' : v).replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
const id = () => new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + crypto.randomUUID().slice(0, 8);
async function sha256(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); }
const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'pup';
const miamiDate = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

// A rescue's website or Instagram, typed any way ("myrescue.org", "@myrescue", full link) → a safe https link or ''
function D_url(v) {
  v = String(v || '').trim();
  if (!v) return '';
  if (/^@[\w.]{1,30}$/.test(v)) return `https://www.instagram.com/${v.slice(1)}/`;
  if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
  try { const u = new URL(v); return /^https?:$/.test(u.protocol) && u.hostname.includes('.') ? u.href : ''; } catch (e) { return ''; }
}

// ---------- public: submit ----------
async function submit(req, env, ctx) {
  const ct = req.headers.get('Content-Type') || '';
  if (!ct.includes('multipart/form-data')) throw fail('Please use the form on the website.');
  const ip = req.headers.get('CF-Connecting-IP') || 'local';
  const hour = new Date().toISOString().slice(0, 13);
  const rlKey = `rl:${await sha256(ip)}:${hour}`;
  const used = Number(await env.SUBMISSIONS.get(rlKey)) || 0;
  if (used >= Number(env.MAX_PER_HOUR || 6)) throw fail('Too many submissions from this connection. Please try again in an hour.', 429);

  const f = await req.formData();
  if (clean(f.get('website'))) return json({ ok: true }); // honeypot: bots fill hidden fields

  if (env.TURNSTILE_SECRET) {
    const token = f.get('cf-turnstile-response');
    const v = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: String(token || ''), remoteip: ip }) }).then((r) => r.json()).catch(() => ({}));
    if (!v.success) throw fail('Please complete the "I am human" check and try again.');
  }

  const g = (k, max) => clean(f.get(k), max);
  const d = {
    dog: {
      name: g('name', 80), breed: g('breed', 80), age: g('age', 60), sex: g('sex', 10),
      fixed: g('fixed', 10), vaccinated: g('vaccinated', 10), microchipped: g('microchipped', 10), heartworm: g('heartworm', 10),
      goodWithDogs: g('goodWithDogs', 10), goodWithCats: g('goodWithCats', 10), goodWithKids: g('goodWithKids', 10),
      locationType: g('locationType', 20), orgName: g('orgName', 120), orgUrl: D_url(g('orgUrl', 200)), city: g('city', 80), animalId: g('animalId', 60),
      needs: g('needs', 10), about: cleanLong(f.get('about'), 3000),
    },
    submitter: { firstName: g('firstName', 60), lastName: g('lastName', 60), social: g('social', 100), phone: g('phone', 30), email: g('email', 120) },
  };
  const D = d.dog, S = d.submitter;
  const missing = [];
  const need = (v, label) => { if (!v) missing.push(label); };
  need(D.name, "pup's name"); need(D.breed, 'breed'); need(D.age, 'age'); need(D.about, 'about the pup'); need(D.city, 'city or area');
  if (!['male', 'female'].includes(D.sex)) missing.push('male or female');
  for (const [k, l] of [['fixed', 'spayed/neutered'], ['vaccinated', 'vaccines'], ['microchipped', 'microchip'], ['heartworm', 'heartworm test']]) if (!YN.includes(D[k])) missing.push(l);
  for (const [k, l] of [['goodWithDogs', 'good with dogs'], ['goodWithCats', 'good with cats'], ['goodWithKids', 'good with kids']]) if (!YNS.includes(D[k])) missing.push(l);
  if (!LOCATION_TYPES.includes(D.locationType)) missing.push('where the pup is');
  if (['rescue', 'foster', 'other'].includes(D.locationType)) need(D.orgName, 'rescue or organization name');
  if (!['adoption', 'foster', 'both'].includes(D.needs)) missing.push('adopter or foster');
  need(S.firstName, 'your first name'); need(S.lastName, 'your last name'); need(S.social, 'your social media handle'); need(S.phone, 'your phone number'); need(S.email, 'your email');
  if (S.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(S.email)) missing.push('a valid email');
  if (S.phone && S.phone.replace(/\D/g, '').length < 7) missing.push('a valid phone number');
  if (f.get('consent') !== 'yes') missing.push('permission to share');

  const files = f.getAll('photos').filter((x) => x && typeof x === 'object' && x.size > 0);
  if (!files.length) missing.push('at least one photo');
  if (missing.length) throw fail('Please fill in: ' + missing.join(', ') + '.');
  if (files.length > MAX_PHOTOS) throw fail(`Please send up to ${MAX_PHOTOS} photos.`);
  for (const file of files) {
    if (!PHOTO_TYPES.includes(file.type)) throw fail('Photos must be JPG, PNG or WEBP.');
    if (file.size > MAX_PHOTO_BYTES) throw fail('One of the photos is too large. Please use a smaller photo.');
  }

  const sid = id();
  for (let i = 0; i < files.length; i++) {
    await env.SUBMISSIONS.put(`photo:${sid}:${i}`, await files[i].arrayBuffer(), { metadata: { type: files[i].type } });
  }
  const record = { id: sid, status: 'pending', createdAt: new Date().toISOString(), photoCount: files.length, ...d };
  await env.SUBMISSIONS.put(`sub:${sid}`, JSON.stringify(record), { metadata: { status: 'pending', name: D.name, createdAt: record.createdAt } });
  await env.SUBMISSIONS.put(rlKey, String(used + 1), { expirationTtl: 3700 });
  const mail = notify(env, record, files[0]).catch((e) => console.error('notify failed', e && e.message));
  if (ctx && ctx.waitUntil) ctx.waitUntil(mail); else await mail;
  return json({ ok: true, id: sid });
}

// ---------- email alert to Bentley's Playhouse (via Resend) ----------
const LOC_LABEL = { rescue: 'A rescue', 'mdas-doral': 'MDAS · Doral', 'mdas-medley': 'MDAS · Medley', broward: 'Broward shelter', family: 'Family rehoming', foster: 'In foster', other: 'Other' };
const YN_LABEL = { yes: 'Yes', no: 'No', some: 'Some / depends', unknown: 'Not sure' };
const h = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
async function notify(env, r, photo) {
  if (!env.RESEND_API_KEY || !env.NOTIFY_EMAIL) return;
  const D = r.dog, S = r.submitter;
  const review = `${env.SITE_URL || ''}/admin/submissions/`;
  const where = [D.orgName, LOC_LABEL[D.locationType], D.city].filter(Boolean).join(', ');
  const rows = [['Breed', D.breed], ['Age', D.age], ['Sex', D.sex], ['Where', where], ['Shelter ID', D.animalId || '—'], ...(D.orgUrl ? [['Rescue website', D.orgUrl]] : []),
    ['Looking for', D.needs === 'both' ? 'Adopter or foster' : D.needs === 'foster' ? 'Foster' : 'Adopter'],
    ['Spayed/neutered', YN_LABEL[D.fixed]], ['Vaccines', YN_LABEL[D.vaccinated]], ['Microchip', YN_LABEL[D.microchipped]], ['Heartworm neg.', YN_LABEL[D.heartworm]],
    ['Good with', `Dogs: ${YN_LABEL[D.goodWithDogs]} · Cats: ${YN_LABEL[D.goodWithCats]} · Kids: ${YN_LABEL[D.goodWithKids]}`],
    ['Photos', String(r.photoCount)],
    ['Submitted by', `${S.firstName} ${S.lastName}`], ['Social', S.social], ['Phone', S.phone], ['Email', S.email]];
  const html = `<div style="font-family:Arial,sans-serif;color:#1F1D2B;max-width:560px">
<h2 style="color:#2F45C8;margin:0 0 4px">New Pawsome Pooches submission: ${h(D.name)}</h2>
<p style="margin:0 0 16px;color:#5c5a72">It's waiting for your review. Nothing goes on the site until you approve it.</p>
<p><a href="${h(review)}" style="display:inline-block;background:#FF914D;color:#1F1D2B;font-weight:bold;padding:12px 20px;border-radius:999px;text-decoration:none">Review ${h(D.name)}</a></p>
<table style="border-collapse:collapse;font-size:14px">${rows.map(([k, v]) => `<tr><td style="padding:4px 14px 4px 0;color:#5c5a72;font-weight:bold;vertical-align:top">${h(k)}</td><td style="padding:4px 0">${h(v)}</td></tr>`).join('')}</table>
<p style="font-weight:bold;margin:16px 0 4px">About ${h(D.name)}</p><p style="white-space:pre-wrap;margin:0">${h(D.about)}</p>
${photo ? '<p style="color:#5c5a72;font-size:13px">The main photo is attached. See all photos on the review page.</p>' : ''}</div>`;
  const text = `New Pawsome Pooches submission: ${D.name}\n\nReview it: ${review}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nAbout ${D.name}:\n${D.about}\n`;
  const body = { from: env.NOTIFY_FROM || "Bentley's Playhouse <onboarding@resend.dev>", to: [env.NOTIFY_EMAIL], subject: `New pup to review: ${D.name} (${LOC_LABEL[D.locationType] || 'Pawsome Pooches'})`, html, text, reply_to: S.email };
  if (photo) body.attachments = [{ filename: `${slugify(D.name)}.jpg`, content: b64(await photo.arrayBuffer()) }];
  const res = await fetch(`${env.RESEND_API || 'https://api.resend.com'}/emails`, { method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) console.error('resend', res.status, await res.text());
}

// ---------- admin ----------
async function requireOwner(req, env) {
  if (await sessionOk(env, req)) return githubToken(env); // signed in to the admin with the password
  const auth = req.headers.get('Authorization') || '';
  const token = auth.replace(/^(Bearer|token)\s+/i, '').trim();
  if (!token) throw fail('Sign in needed.', 401);
  const cacheKey = `auth:${await sha256(token)}`;
  if (await env.SUBMISSIONS.get(cacheKey)) return token;
  const r = await fetch(`${env.GITHUB_API || 'https://api.github.com'}/repos/${env.GITHUB_REPO}`, { headers: gh(token) });
  const repo = r.ok ? await r.json() : null;
  if (!repo || !repo.permissions || !repo.permissions.push) throw fail('This GitHub token cannot edit the site. Check that it has Contents: Read and write for the bentleys-playhouse repository.', 403);
  await env.SUBMISSIONS.put(cacheKey, '1', { expirationTtl: 600 });
  return token;
}
const gh = (token) => ({ Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'bentleys-playhouse-submissions', 'X-GitHub-Api-Version': '2022-11-28' });

async function getRecord(env, sid) {
  const r = await env.SUBMISSIONS.get(`sub:${sid}`, 'json');
  if (!r) throw fail('Submission not found.', 404);
  return r;
}
async function saveRecord(env, r) {
  await env.SUBMISSIONS.put(`sub:${r.id}`, JSON.stringify(r), { metadata: { status: r.status, name: r.dog.name, createdAt: r.createdAt } });
}
async function deletePhotos(env, r) { for (let i = 0; i < r.photoCount; i++) await env.SUBMISSIONS.delete(`photo:${r.id}:${i}`); }

async function admin(req, env, url) {
  const token = await requireOwner(req, env);
  const parts = url.pathname.split('/').filter(Boolean); // admin, action, id, n
  const [, action, sid, n] = parts;

  if (action === 'list' && req.method === 'GET') {
    const out = [];
    let cursor;
    do {
      const page = await env.SUBMISSIONS.list({ prefix: 'sub:', cursor });
      for (const k of page.keys) { const r = await env.SUBMISSIONS.get(k.name, 'json'); if (r) out.push(r); }
      cursor = page.list_complete ? null : page.cursor;
    } while (cursor);
    out.sort((a, b) => String(b.createdAt).localeCompare(a.createdAt));
    return json({ submissions: out });
  }
  if (action === 'photo' && req.method === 'GET') {
    const { value, metadata } = await env.SUBMISSIONS.getWithMetadata(`photo:${sid}:${Number(n)}`, 'arrayBuffer');
    if (!value) throw fail('Photo not found.', 404);
    return new Response(value, { headers: { 'Content-Type': (metadata && metadata.type) || 'image/jpeg', 'Cache-Control': 'private, max-age=3600' } });
  }
  if (action === 'reject' && req.method === 'POST') {
    const r = await getRecord(env, sid);
    const body = await req.json().catch(() => ({}));
    await deletePhotos(env, r);
    r.status = 'rejected'; r.reviewedAt = new Date().toISOString(); r.photoCount = 0; r.note = clean(body.note, 500);
    await saveRecord(env, r);
    return json({ ok: true });
  }
  if (action === 'delete' && req.method === 'POST') {
    const r = await getRecord(env, sid);
    await deletePhotos(env, r);
    await env.SUBMISSIONS.delete(`sub:${sid}`);
    return json({ ok: true });
  }
  if (action === 'approve' && req.method === 'POST') {
    const r = await getRecord(env, sid);
    if (r.status === 'approved') throw fail('Already published.', 409);
    const edits = await req.json().catch(() => ({}));
    const result = await publish(env, token, r, edits);
    r.status = 'approved'; r.reviewedAt = new Date().toISOString(); r.published = result;
    await saveRecord(env, r);
    return json({ ok: true, ...result });
  }
  throw fail('Not found.', 404);
}

// ---------- publishing to the site repo (one commit) ----------
const yq = (v) => JSON.stringify(String(v == null ? '' : v)); // JSON strings are valid YAML

function buildMarkdown(dog, slug, photoPaths, opt) {
  const fixedNote = dog.fixed === 'yes' ? '' : 'No dog is adopted out until they are spayed or neutered.';
  const lines = [
    '---',
    `name: ${yq(opt.name || dog.name)}`,
    `status: available`,
    `featuredWeek: ${miamiDate()}`,
    `urgent: ${opt.urgent ? 'true' : 'false'}`,
    `needs: ${dog.needs === 'both' ? 'both' : dog.needs === 'foster' ? 'foster' : 'adoption'}`,
    'photos:',
    ...photoPaths.map((p) => `  - ${yq(p)}`),
    `photoAlt: ${yq(opt.photoAlt || `${opt.name || dog.name}, ${dog.breed}`)}`,
    `tagline: ${yq(opt.tagline || '')}`,
    `breed: ${yq(dog.breed)}`,
    `age: ${yq(dog.age)}`,
    `sex: ${yq(dog.sex === 'female' ? 'Female' : 'Male')}`,
    `fixed: ${dog.fixed}`,
    `fixedNote: ${yq(fixedNote)}`,
    `vaccinated: ${dog.vaccinated}`,
    `microchipped: ${dog.microchipped}`,
    `heartworm: ${dog.heartworm}`,
    `goodWithDogs: ${dog.goodWithDogs}`,
    `goodWithCats: ${dog.goodWithCats}`,
    `goodWithKids: ${dog.goodWithKids}`,
    `goodNote: ""`,
    'personality: []',
    'location:',
    `  type: ${dog.locationType}`,
    `  name: ${yq(dog.orgName)}`,
    `  url: ${yq(dog.orgUrl || '')}`,
    `  city: ${yq(dog.city)}`,
    `  animalId: ${yq(dog.animalId)}`,
    'contact:',
    `  instagram: ${yq(opt.contactInstagram || 'bentleysplayhouse')}`,
    `  instructions: ${yq(opt.contactInstructions || '')}`,
    `submissionId: ${yq(opt.submissionId)}`,
    '---',
    (opt.story || dog.about || '').trim(),
    '',
  ];
  return lines.join('\n');
}

async function publish(env, token, r, edits) {
  const API = env.GITHUB_API || 'https://api.github.com';
  const repo = env.GITHUB_REPO;
  const branch = env.GITHUB_BRANCH || 'main';
  const H = { ...gh(token), 'Content-Type': 'application/json' };
  const call = async (method, path, body) => {
    const res = await fetch(`${API}/repos/${repo}${path}`, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) throw fail(`GitHub said no (${res.status}) while publishing. Please try again.`, 502);
    return res.json();
  };
  const name = clean(edits.name, 80) || r.dog.name;
  let slug = slugify(edits.slug || name);
  // avoid overwriting an existing pup
  const exists = await fetch(`${API}/repos/${repo}/contents/content/pawsome/${slug}.md?ref=${branch}`, { headers: gh(token) });
  if (exists.ok) slug = `${slug}-${r.id.slice(-4)}`;

  const order = Array.isArray(edits.photoOrder) && edits.photoOrder.length ? edits.photoOrder.map(Number).filter((i) => i >= 0 && i < r.photoCount) : [...Array(r.photoCount).keys()];
  const ref = await call('GET', `/git/ref/heads/${branch}`);
  const baseSha = ref.object.sha;
  const baseCommit = await call('GET', `/git/commits/${baseSha}`);
  const tree = [];
  const photoPaths = [];
  for (let k = 0; k < order.length; k++) {
    const { value, metadata } = await env.SUBMISSIONS.getWithMetadata(`photo:${r.id}:${order[k]}`, 'arrayBuffer');
    if (!value) continue;
    const ext = (metadata && metadata.type) === 'image/png' ? 'png' : (metadata && metadata.type) === 'image/webp' ? 'webp' : 'jpg';
    const file = `${slug}${k ? '-' + (k + 1) : ''}.${ext}`;
    const blob = await call('POST', '/git/blobs', { content: b64(value), encoding: 'base64' });
    tree.push({ path: `src/assets/img/pawsome/${file}`, mode: '100644', type: 'blob', sha: blob.sha });
    photoPaths.push(`/assets/img/pawsome/${file}`);
  }
  const md = buildMarkdown(r.dog, slug, photoPaths, {
    name, tagline: clean(edits.tagline, 220), story: cleanLong(edits.story, 5000), urgent: !!edits.urgent,
    photoAlt: clean(edits.photoAlt, 200), contactInstagram: clean(edits.contactInstagram, 60).replace(/^@/, ''), contactInstructions: cleanLong(edits.contactInstructions, 800), submissionId: r.id,
  });
  const mdBlob = await call('POST', '/git/blobs', { content: md, encoding: 'utf-8' });
  tree.push({ path: `content/pawsome/${slug}.md`, mode: '100644', type: 'blob', sha: mdBlob.sha });
  const newTree = await call('POST', '/git/trees', { base_tree: baseCommit.tree.sha, tree });
  const commit = await call('POST', '/git/commits', { message: `Pawsome Pooches: add ${name} (approved submission)`, tree: newTree.sha, parents: [baseSha] });
  await call('PATCH', `/git/refs/heads/${branch}`, { sha: commit.sha });
  return { slug, url: `${env.SITE_URL || ''}/pawsome-pooches/${slug}/`, commit: commit.sha };
}

function b64(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export { buildMarkdown, slugify };
