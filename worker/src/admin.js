// Bentley's Playhouse admin backend: password sign-in, sessions, and reading/writing the site's content files on GitHub.
// Content stays in the repo (content/*.md / *.json), so the site build is unchanged. Every save is one commit; the site redeploys itself.
import yaml from 'js-yaml';

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');
export const sha256 = async (s) => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
const rand = (n = 32) => hex(crypto.getRandomValues(new Uint8Array(n)));
const fail = (msg, status = 400) => Object.assign(new Error(msg), { publicMessage: msg, status });
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const SESSION_DAYS = 30;

// Collections the admin can edit. folder = repo folder, images = where uploads go, format = md | json
export const COLLECTIONS = {
  pawsome: { folder: 'content/pawsome', images: 'src/assets/img/pawsome', format: 'md', title: 'name' },
  stories: { folder: 'content/stories', images: 'src/assets/img/stories', format: 'md', title: 'title' },
  rescues: { folder: 'content/rescues', images: 'src/assets/img/rescues', format: 'md', title: 'name' },
  dogs: { folder: 'content/dogs', images: 'src/assets/img/dogs', format: 'md', title: 'name' },
  money: { folder: 'content/finances/entries', images: 'src/assets/finances/receipts', format: 'json', title: 'description' },
};

// ---------- password + sessions ----------
async function hashPassword(password, saltHex) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const salt = new Uint8Array(saltHex.match(/../g).map((h) => parseInt(h, 16)));
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256));
}
async function rateLimit(env, req, key, max) {
  const ip = req.headers.get('CF-Connecting-IP') || 'local';
  const k = `rl:${key}:${await sha256(ip)}:${new Date().toISOString().slice(0, 13)}`;
  const n = Number(await env.SUBMISSIONS.get(k)) || 0;
  if (n >= max) throw fail('Too many tries. Please wait an hour and try again.', 429);
  await env.SUBMISSIONS.put(k, String(n + 1), { expirationTtl: 3700 });
}
const gh = (token) => ({ Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'bentleys-playhouse-admin', 'X-GitHub-Api-Version': '2022-11-28' });
async function tokenCanPush(env, token) {
  const r = await fetch(`${env.GITHUB_API || 'https://api.github.com'}/repos/${env.GITHUB_REPO}`, { headers: gh(token) });
  const repo = r.ok ? await r.json() : null;
  return !!(repo && repo.permissions && repo.permissions.push);
}
export async function githubToken(env) {
  const t = await env.SUBMISSIONS.get('cfg:ghToken');
  if (!t) throw fail('The admin isn\'t connected to the website yet. Open Settings and reconnect GitHub.', 503);
  return t;
}


// ---------- two-step sign-in (authenticator app codes, RFC 6238) ----------
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function b32encode(bytes) { let bits = 0, val = 0, out = ''; for (const b of bytes) { val = (val << 8) | b; bits += 8; while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; } } if (bits > 0) out += B32[(val << (5 - bits)) & 31]; return out; }
function b32decode(str) { const s = String(str).replace(/=+$/, '').toUpperCase().replace(/\s/g, ''); let bits = 0, val = 0; const out = []; for (const c of s) { const i = B32.indexOf(c); if (i < 0) continue; val = (val << 5) | i; bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; } } return new Uint8Array(out); }
async function totpAt(secret, step) {
  const key = await crypto.subtle.importKey('raw', b32decode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const msg = new ArrayBuffer(8); const v = new DataView(msg); v.setUint32(0, Math.floor(step / 4294967296)); v.setUint32(4, step >>> 0);
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg)); const o = h[19] & 15;
  return String((((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1000000).padStart(6, '0');
}
/** Returns the matching time step (to stop the same code being used twice) or -1. */
async function checkTotp(secret, code, lastStep) {
  code = String(code || '').replace(/\D/g, '');
  if (code.length !== 6) return -1;
  const now = Math.floor(Date.now() / 30000);
  for (const d of [0, -1, 1]) { const st = now + d; if (st > (lastStep || 0) && (await totpAt(secret, st)) === code) return st; }
  return -1;
}
const cleanUser = (u) => String(u || '').trim().toLowerCase();
const publicProfile = (a) => ({ username: a.username || '', name: a.name || '', email: a.email || '', photo: a.photo || '', twoFactor: !!a.totp, recoveryLeft: (a.recovery || []).length });
// ---------- admin accounts (several admins, like Fénix) ----------
// KV cfg:users = [{ id, username, name, email, photo, salt, hash, totp, totpStep, recovery, active, createdAt }]
async function loadUsers(env) {
  let users = await env.SUBMISSIONS.get('cfg:users', 'json');
  if (!users) {
    const legacy = await env.SUBMISSIONS.get('cfg:admin', 'json'); // the first single-account version
    users = legacy ? [{ id: 'u1', active: true, ...legacy }] : [];
    if (legacy) await env.SUBMISSIONS.put('cfg:users', JSON.stringify(users));
  }
  return users;
}
const saveUsers = (env, users) => env.SUBMISSIONS.put('cfg:users', JSON.stringify(users));
const newId = () => 'u' + rand(6);
async function newSession(env, userId) {
  const token = rand(32);
  await env.SUBMISSIONS.put(`sess:${await sha256(token)}`, userId, { expirationTtl: SESSION_DAYS * 86400 });
  return token;
}
/** The signed-in admin (active accounts only), or null. */
export async function sessionUser(env, req) {
  const m = (req.headers.get('Authorization') || '').match(/^Session\s+([a-f0-9]{64})$/i);
  if (!m) return null;
  const v = await env.SUBMISSIONS.get(`sess:${await sha256(m[1])}`);
  if (!v) return null;
  const users = await loadUsers(env);
  const u = v === '1' ? users[0] : users.find((x) => x.id === v); // '1' = sessions from before multi-user
  return u && u.active !== false ? u : null;
}
export async function sessionOk(env, req) { return !!(await sessionUser(env, req)); }

const listRow = (u) => ({ id: u.id, username: u.username || '', name: u.name || '', email: u.email || '', photo: u.photo || '', active: u.active !== false, twoFactor: !!u.totp, createdAt: u.createdAt || '' });
const makeCodes = async () => { const codes = Array.from({ length: 8 }, () => rand(5).toUpperCase().slice(0, 10).replace(/(.{5})/, '$1-')); return { codes, hashes: await Promise.all(codes.map((c) => sha256(c.replace(/-/g, '')))) }; };
function checkUsername(u, users, selfId) {
  if (!/^[a-z0-9._-]{3,30}$/.test(u)) throw fail('Usernames are 3 to 30 letters or numbers (dots, dashes and underscores are fine).');
  if (users.some((x) => x.username === u && x.id !== selfId)) throw fail('That username is taken.');
}
function checkEmail(e) { if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) throw fail('Please enter a valid email.'); }

export async function handleAuth(req, env, url) {
  const parts = url.pathname.split('/').filter(Boolean); // auth, action, id, sub
  const action = parts[1];
  const body = req.method === 'POST' || req.method === 'DELETE' ? await req.json().catch(() => ({})) : {};
  const users = await loadUsers(env);

  if (action === 'status') { const me = await sessionUser(env, req); return json({ setup: users.length > 0, session: !!me, username: !!(me && me.username) }); }

  if (action === 'setup' && req.method === 'POST') {
    if (users.length) throw fail('The admin is already set up. Sign in instead.', 409);
    await rateLimit(env, req, 'setup', 10);
    const pw = String(body.password || '');
    if (pw.length < 10) throw fail('Please use a password with at least 10 characters.');
    const token = String(body.githubToken || '').trim();
    if (!token || !(await tokenCanPush(env, token))) throw fail('We couldn\'t confirm this is the site owner. The GitHub token is missing or can\'t edit the site.', 403);
    const u = cleanUser(body.username); if (u) checkUsername(u, users);
    const salt = rand(16);
    const user = { id: newId(), username: u, salt, hash: await hashPassword(pw, salt), active: true, createdAt: new Date().toISOString() };
    await saveUsers(env, [user]);
    await env.SUBMISSIONS.put('cfg:ghToken', token);
    return json({ ok: true, session: await newSession(env, user.id) });
  }

  if (action === 'login' && req.method === 'POST') {
    if (!users.length) throw fail('The admin hasn\'t been set up yet.', 409);
    await rateLimit(env, req, 'login', 10);
    const name = cleanUser(body.username);
    // before usernames existed there was one account with none: it signs in with any username
    const u = users.find((x) => x.username && x.username === name) || (users.length === 1 && !users[0].username ? users[0] : null);
    const passOk = u && (await hashPassword(String(body.password || ''), u.salt)) === u.hash;
    if (!passOk) throw fail('That username or password isn\'t right.', 401);
    if (u.active === false) throw fail('This account is turned off. Ask another admin to turn it back on.', 403);
    if (u.totp) {
      const pending = rand(32);
      await env.SUBMISSIONS.put(`pend:${await sha256(pending)}`, u.id, { expirationTtl: 300 });
      return json({ ok: true, needCode: true, pending });
    }
    return json({ ok: true, session: await newSession(env, u.id) });
  }

  if (action === 'code' && req.method === 'POST') {
    await rateLimit(env, req, 'code', 10);
    const pkey = `pend:${await sha256(String(body.pending || ''))}`;
    const uid = await env.SUBMISSIONS.get(pkey);
    const u = uid && users.find((x) => x.id === uid || (uid === '1' && x === users[0]));
    if (!u || !u.totp || u.active === false) throw fail('That took too long. Please sign in again.', 401);
    const code = String(body.code || '').trim();
    const st = await checkTotp(u.totp, code, u.totpStep);
    if (st > 0) u.totpStep = st;
    else {
      const h = await sha256(code.toUpperCase().replace(/[^A-Z0-9]/g, ''));
      const i = (u.recovery || []).indexOf(h);
      if (i < 0) throw fail('That code isn\'t right. Check your authenticator app and try again.', 401);
      u.recovery.splice(i, 1);
    }
    await saveUsers(env, users);
    await env.SUBMISSIONS.delete(pkey);
    return json({ ok: true, session: await newSession(env, u.id), recoveryLeft: (u.recovery || []).length });
  }

  if (action === 'logout' && req.method === 'POST') {
    const m = (req.headers.get('Authorization') || '').match(/^Session\s+([a-f0-9]{64})$/i);
    if (m) await env.SUBMISSIONS.delete(`sess:${await sha256(m[1])}`);
    return json({ ok: true });
  }

  // ----- signed-in only below -----
  const me = await sessionUser(env, req);
  if (!me) throw fail('Please sign in again.', 401);
  const self = users.find((x) => x.id === me.id) || users[0];
  const pwOk = async (u, p) => (await hashPassword(String(p || ''), u.salt)) === u.hash;

  if (action === 'me') return json({ ...publicProfile(self), id: self.id });

  if (action === 'profile' && req.method === 'POST') {
    const u = cleanUser(body.username); checkUsername(u, users, self.id);
    if (body.photo && (String(body.photo).length > 300000 || !/^data:image\/(jpeg|png|webp);base64,/.test(body.photo))) throw fail('That photo is too big. Please choose a smaller one.');
    const email = String(body.email || '').trim(); checkEmail(email);
    Object.assign(self, { username: u, name: String(body.name || '').trim().slice(0, 60), email: email.slice(0, 120) });
    if (body.photo !== undefined) self.photo = body.photo || '';
    await saveUsers(env, users);
    return json({ ok: true, profile: publicProfile(self) });
  }

  if (action === 'password' && req.method === 'POST') {
    if (!(await pwOk(self, body.current))) throw fail('Your current password isn\'t right.', 401);
    if (String(body.password || '').length < 10) throw fail('Please use a new password with at least 10 characters.');
    self.salt = rand(16); self.hash = await hashPassword(body.password, self.salt); self.changedAt = new Date().toISOString();
    await saveUsers(env, users);
    return json({ ok: true });
  }

  if (action === 'github' && req.method === 'POST') {
    const token = String(body.githubToken || '').trim();
    if (!(await tokenCanPush(env, token))) throw fail('That GitHub token can\'t edit the site. It needs Contents: Read and write for bentleys-playhouse.', 400);
    await env.SUBMISSIONS.put('cfg:ghToken', token);
    return json({ ok: true });
  }

  // two-step sign-in for yourself (/auth/2fa-*) or, from Manage users, for another admin (/auth/users/:id/2fa-*)
  const twoFA = async (target, step) => {
    const pkey = `cfg:totpPending:${target.id}`;
    if (step === 'start') {
      const secret = b32encode(crypto.getRandomValues(new Uint8Array(20)));
      await env.SUBMISSIONS.put(pkey, secret, { expirationTtl: 900 });
      const label = encodeURIComponent(`Bentley's Playhouse:${target.username || 'admin'}`);
      return json({ secret, uri: `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent("Bentley's Playhouse")}&algorithm=SHA1&digits=6&period=30` });
    }
    if (step === 'confirm') {
      const secret = await env.SUBMISSIONS.get(pkey);
      if (!secret) throw fail('That setup expired. Please start again.', 400);
      const st = await checkTotp(secret, body.code, 0);
      if (st < 0) throw fail('That code isn\'t right. Make sure the phone\'s time is correct and try the newest code.', 400);
      const { codes, hashes } = await makeCodes();
      Object.assign(target, { totp: secret, totpStep: st, recovery: hashes });
      await saveUsers(env, users); await env.SUBMISSIONS.delete(pkey);
      return json({ ok: true, recoveryCodes: codes });
    }
    if (step === 'disable') {
      delete target.totp; delete target.totpStep; delete target.recovery;
      await saveUsers(env, users);
      return json({ ok: true });
    }
    throw fail('Not found.', 404);
  };

  if (action === '2fa-start' && req.method === 'POST') return twoFA(self, 'start');
  if (action === '2fa-confirm' && req.method === 'POST') return twoFA(self, 'confirm');
  if (action === '2fa-disable' && req.method === 'POST') { if (!(await pwOk(self, body.password))) throw fail('Your password isn\'t right.', 401); return twoFA(self, 'disable'); }
  if (action === 'recovery' && req.method === 'POST') {
    if (!self.totp) throw fail('Two-step sign-in is off.');
    if (!(await pwOk(self, body.password))) throw fail('Your password isn\'t right.', 401);
    const { codes, hashes } = await makeCodes(); self.recovery = hashes; await saveUsers(env, users);
    return json({ ok: true, recoveryCodes: codes });
  }

  // ----- Manage users -----
  if (action === 'users') {
    const id = parts[2], sub = parts[3];
    if (!id && req.method === 'GET') return json({ users: users.map(listRow), me: self.id });
    if (!id && req.method === 'POST') {
      const u = cleanUser(body.username); checkUsername(u, users);
      const email = String(body.email || '').trim(); checkEmail(email);
      if (String(body.password || '').length < 10) throw fail('Please give them a password with at least 10 characters.');
      const salt = rand(16);
      const user = { id: newId(), username: u, name: String(body.name || '').trim().slice(0, 60), email: email.slice(0, 120), salt, hash: await hashPassword(body.password, salt), active: true, createdAt: new Date().toISOString(), createdBy: self.username || self.id };
      users.push(user); await saveUsers(env, users);
      return json({ ok: true, user: listRow(user) });
    }
    const target = users.find((x) => x.id === id);
    if (!target) throw fail('That admin wasn\'t found.', 404);
    const activeCount = users.filter((x) => x.active !== false).length;
    if (!sub && req.method === 'POST') { // edit
      const u = cleanUser(body.username || target.username); checkUsername(u, users, target.id);
      const email = String(body.email || '').trim(); checkEmail(email);
      Object.assign(target, { username: u, name: String(body.name || '').trim().slice(0, 60), email: email.slice(0, 120) });
      if (body.password) {
        if (String(body.password).length < 10) throw fail('Passwords need at least 10 characters.');
        target.salt = rand(16); target.hash = await hashPassword(body.password, target.salt);
      }
      await saveUsers(env, users);
      return json({ ok: true, user: listRow(target) });
    }
    if (sub === 'active' && req.method === 'POST') {
      if (target.id === self.id && !body.active) throw fail('You can\'t turn off your own account.');
      if (!body.active && activeCount <= 1) throw fail('At least one admin must stay active.');
      target.active = !!body.active; await saveUsers(env, users);
      return json({ ok: true, user: listRow(target) });
    }
    if (sub && sub.startsWith('2fa-') && req.method === 'POST') return twoFA(target, sub.slice(4));
    if (!sub && req.method === 'DELETE') {
      if (target.id === self.id) throw fail('You can\'t delete your own account.');
      if (target.active !== false && activeCount <= 1) throw fail('At least one admin must stay active.');
      users.splice(users.indexOf(target), 1); await saveUsers(env, users);
      return json({ ok: true });
    }
  }
  throw fail('Not found.', 404);
}

// ---------- GitHub content helpers ----------
const API = (env) => env.GITHUB_API || 'https://api.github.com';
const branch = (env) => env.GITHUB_BRANCH || 'main';
async function ghCall(env, token, method, path, body) {
  const res = await fetch(`${API(env)}/repos/${env.GITHUB_REPO}${path}`, { method, headers: { ...gh(token), 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 401) throw fail('The website connection expired. Open Settings and reconnect GitHub.', 503);
  if (!res.ok) { const t = await res.text(); throw Object.assign(fail(`GitHub said no (${res.status}). Please try again.`, 502), { detail: t.slice(0, 300), ghStatus: res.status }); }
  return res.status === 204 ? null : res.json();
}
/** All files in a folder with their text, in one request (GraphQL). */
async function readFolder(env, token, folder) {
  const query = `query($o:String!,$n:String!,$e:String!){repository(owner:$o,name:$n){object(expression:$e){... on Tree{entries{name type object{... on Blob{text}}}}}}}`;
  const [o, n] = env.GITHUB_REPO.split('/');
  const res = await fetch(`${env.GITHUB_GRAPHQL || 'https://api.github.com/graphql'}`, { method: 'POST', headers: { ...gh(token), 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables: { o, n, e: `${branch(env)}:${folder}` } }) });
  if (res.status === 401) throw fail('The website connection expired. Open Settings and reconnect GitHub.', 503);
  const j = await res.json();
  if (j.errors) throw fail('Couldn\'t read the site content. Please try again.', 502);
  const obj = j.data && j.data.repository && j.data.repository.object;
  return obj && obj.entries ? obj.entries.filter((e) => e.type === 'blob' && e.object && e.object.text != null) : [];
}
async function readFile(env, token, path) {
  const res = await fetch(`${API(env)}/repos/${env.GITHUB_REPO}/contents/${path}?ref=${branch(env)}`, { headers: { ...gh(token), Accept: 'application/vnd.github.raw+json' } });
  if (res.status === 404) return null;
  if (!res.ok) throw fail('Couldn\'t read the site content. Please try again.', 502);
  return res.text();
}

/** One commit with any number of file changes: [{path, content(utf8)}|{path, base64}|{path, delete:true}] */
export async function commitFiles(env, token, message, changes) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const ref = await ghCall(env, token, 'GET', `/git/ref/heads/${branch(env)}`);
    const base = ref.object.sha;
    const baseCommit = await ghCall(env, token, 'GET', `/git/commits/${base}`);
    const tree = [];
    for (const c of changes) {
      if (c.delete) { tree.push({ path: c.path, mode: '100644', type: 'blob', sha: null }); continue; }
      const blob = await ghCall(env, token, 'POST', '/git/blobs', c.base64 != null ? { content: c.base64, encoding: 'base64' } : { content: c.content, encoding: 'utf-8' });
      tree.push({ path: c.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    const newTree = await ghCall(env, token, 'POST', '/git/trees', { base_tree: baseCommit.tree.sha, tree });
    const commit = await ghCall(env, token, 'POST', '/git/commits', { message, tree: newTree.sha, parents: [base] });
    try { await ghCall(env, token, 'PATCH', `/git/refs/heads/${branch(env)}`, { sha: commit.sha }); return commit.sha; }
    catch (e) { if (e.ghStatus !== 422 || attempt === 2) throw e; } // someone else just pushed: rebuild on the new base
  }
}

// ---------- parsing ----------
const FM = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
export function parseMd(text) {
  const m = String(text).match(FM);
  if (!m) return { data: {}, body: String(text) };
  return { data: yaml.load(m[1], { schema: yaml.CORE_SCHEMA }) || {}, body: m[2].replace(/^\n+/, '') };
}
export function stringifyMd(data, body) {
  const clean = JSON.parse(JSON.stringify(data, (k, v) => (v === '' || v === null || (Array.isArray(v) && !v.length) ? undefined : v)));
  return `---\n${yaml.dump(clean, { schema: yaml.CORE_SCHEMA, lineWidth: -1, noRefs: true, quotingType: '"' })}---\n${String(body || '').trim()}\n`;
}
export const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'item';
const validSlug = (s) => /^[a-z0-9][a-z0-9-]{0,80}$/.test(s);

// ---------- content API ----------
export async function handleContent(req, env, url) {
  if (!(await sessionOk(env, req))) throw fail('Please sign in again.', 401);
  const token = await githubToken(env);
  const parts = url.pathname.split('/').filter(Boolean); // api, content|settings, collection, slug
  const kind = parts[1];

  if (kind === 'settings') {
    const text = await readFile(env, token, 'content/site.json');
    const site = JSON.parse(text);
    if (req.method === 'GET') return json({ donate: site.donate, pawsome: site.pawsome, contact: { email: site.contact && site.contact.email } });
    if (req.method === 'PUT') {
      const b = await req.json();
      if (b.donate) {
        const d = site.donate;
        if (Array.isArray(b.donate.methods)) d.methods = b.donate.methods.map((m) => ({ type: String(m.type), name: String(m.name), handle: String(m.handle || '').trim(), ...(m.url ? { url: String(m.url).trim() } : {}), ...(m.primary ? { primary: true } : {}), verified: !!m.verified }));
        if (Array.isArray(b.donate.tiers)) d.tiers = b.donate.tiers.map((t) => ({ amount: String(t.amount || '').replace(/[^\d]/g, ''), emoji: String(t.emoji || ''), label: String(t.label || ''), ...(t.default ? { default: true } : {}) }));
        if (typeof b.donate.showButton === 'boolean') d.showButton = b.donate.showButton;
      }
      if (b.pawsome && typeof b.pawsome.email === 'string') site.pawsome.email = b.pawsome.email.trim();
      await commitFiles(env, token, 'Admin: update donation & contact settings', [{ path: 'content/site.json', content: JSON.stringify(site, null, 2) + '\n' }]);
      return json({ ok: true });
    }
  }

  if (kind !== 'content') throw fail('Not found.', 404);
  const col = COLLECTIONS[parts[2]];
  if (!col) throw fail('Unknown section.', 404);
  const ext = col.format === 'json' ? '.json' : '.md';

  if (parts.length === 3 && req.method === 'GET') {
    const files = await readFolder(env, token, col.folder);
    const items = files.filter((f) => f.name.endsWith(ext) && !f.name.startsWith('_')).map((f) => {
      const slug = f.name.slice(0, -ext.length);
      try { return col.format === 'json' ? { slug, data: JSON.parse(f.object.text), body: '' } : { slug, ...parseMd(f.object.text) }; }
      catch (e) { return { slug, data: {}, body: '', broken: true }; }
    });
    return json({ items });
  }

  const slug = parts[3];
  if (!slug || !validSlug(slug)) throw fail('Bad item name.');
  const path = `${col.folder}/${slug}${ext}`;

  if (req.method === 'PUT') {
    const b = await req.json();
    const data = b.data && typeof b.data === 'object' ? b.data : {};
    const changes = [];
    // uploads: {field, name, base64} → saved in the collection's image folder; data refers to /assets/... paths
    const stamp = Date.now().toString(36);
    const map = {};
    for (const [i, u] of (b.uploads || []).entries()) {
      const ext2 = /\.(png|webp|pdf|jpe?g)$/i.test(u.name) ? u.name.split('.').pop().toLowerCase().replace('jpeg', 'jpg') : 'jpg';
      const file = `${slug}-${stamp}${i ? '-' + i : ''}.${ext2}`;
      const repoPath = `${col.images}/${file}`;
      changes.push({ path: repoPath, base64: String(u.base64).replace(/^data:[^,]+,/, '') });
      map[u.id] = '/' + repoPath.replace(/^src\//, '');
    }
    const swap = (v) => (typeof v === 'string' && map[v] ? map[v] : Array.isArray(v) ? v.map(swap) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, swap(x)])) : v);
    const finalData = swap(data);
    if (b.isNew && (await readFile(env, token, path)) != null) throw fail('Something with this name already exists. Please choose a slightly different name.', 409);
    changes.push({ path, content: col.format === 'json' ? JSON.stringify(finalData, null, 2) + '\n' : stringifyMd(finalData, b.body) });
    const label = finalData[col.title] || slug;
    await commitFiles(env, token, `Admin: ${b.isNew ? 'add' : 'update'} ${parts[2]} "${label}"`, changes);
    return json({ ok: true, slug, data: finalData });
  }
  if (req.method === 'DELETE') {
    await commitFiles(env, token, `Admin: delete ${parts[2]} "${slug}"`, [{ path, delete: true }]);
    return json({ ok: true });
  }
  throw fail('Not found.', 404);
}
