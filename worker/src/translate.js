// Automatic Spanish for the website.
// The site build publishes /i18n/missing-es.json (English text on the site that has no Spanish yet).
// Every 20 minutes (and when someone presses "Translate now" in the admin) this translates up to
// `limit` of those strings with Cloudflare Workers AI and saves them in content/i18n/es-auto.json.
// Spanish typed or approved in the admin goes to content/i18n/es.json, which always wins over es-auto.json.
import { githubToken, commitFiles } from './admin.js';

const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const AUTO = 'content/i18n/es-auto.json';
const HUMAN = 'content/i18n/es.json';
const KEEP = ["Bentley's Playhouse", 'Pawsome Pooches', 'Fénix Animal Project', 'Miami-Dade Animal Services', 'MDAS', 'Instagram', 'Facebook', 'Threads', 'YouTube'];

const systemFor = (names) => `You translate website text for Bentley's Playhouse, a small Miami dog rescue, from English into Spanish.
Rules:
- Neutral Latin American Spanish, warm and plain. Address the reader as "tú", never "usted".
- Keep every placeholder tag exactly as written and in a sensible place: <t1>…</t1>, <t2/>, etc. Do not add, drop, renumber or translate tags.
- Keep HTML entities (&#39; &quot; &amp;) as they are or use the plain character.
- Do not translate names of organizations, people, dogs, places, programs, websites, emails or phone numbers. Keep these exactly: ${KEEP.join(', ')}.
- These are dogs' names and rescue or shelter names. Never translate, change or swap them, even when they are ordinary English words ("Meet Snow" → "Conoce a Snow", never "Nieve"): ${names.join(', ') || '(none)'}.
- Times: "5 p.m." becomes "5 p. m.", "10 a.m." becomes "10 a. m.", "noon" becomes "mediodía". Dates: "Oct. 5, 2026" becomes "5 de octubre de 2026".
- "pup"/"pups" is "perrito"/"perritos" (never "cachorro", which means a baby puppy); "dog" is "perro". Translate breed names into Spanish ("American bulldog mix" → "mezcla de bulldog americano"). "Sex" labels: Female → Hembra, Male → Macho.
- No serial comma before "y"/"o". Spanish capitalization (sentence case) for headings.
- Return ONLY a JSON array of strings: the translations, in the same order, same count as the input.`;

const tagsOf = (s) => (String(s).match(/<\/?t\d+\/?>/g) || []).sort().join('|');
const readRaw = async (env, token, path) => {
  const r = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}?ref=${env.GITHUB_BRANCH || 'main'}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.raw+json', 'User-Agent': 'bentleys-playhouse-admin', 'X-GitHub-Api-Version': '2022-11-28' } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('read ' + path + ' ' + r.status);
  return r.text();
};

const has = (text, n) => new RegExp(`(?<![\\w@])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w])`).test(text);
// names in the English must come through exactly, and the Spanish must not add a name that wasn't there
const keepsNames = (en, es, names) => [...names, ...KEEP].every((n) => has(en, n) ? es.includes(n) : !has(es, n));

export async function translateTexts(env, texts, names = []) {
  const SYSTEM = systemFor(names);
  if (!env.AI) throw Object.assign(new Error('Automatic translation is not switched on yet.'), { status: 503, publicMessage: 'Automatic translation is not switched on yet.' });
  const out = [];
  for (let i = 0; i < texts.length; i += 12) {
    const batch = texts.slice(i, i + 12);
    let arr = null;
    for (let attempt = 0; attempt < 2 && !arr; attempt++) {
      const res = await env.AI.run(MODEL, { messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: JSON.stringify(batch) }], max_tokens: 4096, temperature: 0.2 });
      const txt = typeof res === 'string' ? res : res && (res.response ?? res.result?.response);
      try {
        const parsed = typeof txt === 'object' ? txt : JSON.parse(String(txt).slice(String(txt).indexOf('['), String(txt).lastIndexOf(']') + 1));
        if (Array.isArray(parsed) && parsed.length === batch.length) arr = parsed.map(String);
      } catch (e) { /* retry once */ }
    }
    batch.forEach((en, k) => {
      const es = arr && arr[k] ? arr[k].trim() : '';
      out.push(es && tagsOf(es) === tagsOf(en) && es !== en && keepsNames(en, es, names) ? es : null); // skip anything that lost its formatting or changed a dog's name
    });
  }
  return out;
}

/** Translate what's missing on the live site. Returns { translated, remaining }. */
export async function translateMissing(env, { limit = 60 } = {}) {
  const site = (env.SITE_URL || 'https://bentleysplayhouse.org').replace(/\/$/, '');
  const r = await fetch(`${site}/i18n/missing-es.json?t=${Date.now()}`, { cf: { cacheTtl: 0 } });
  if (!r.ok) return { translated: 0, remaining: 0 };
  const missing = (await r.json()).filter((s) => typeof s === 'string' && s.length < 4000);
  const nr = await fetch(`${site}/i18n/names.json?t=${Date.now()}`, { cf: { cacheTtl: 0 } });
  const names = nr.ok ? (await nr.json()).filter((n) => typeof n === 'string' && n) : [];
  const token = await githubToken(env);
  const autoText = await readRaw(env, token, AUTO);
  const auto = autoText ? JSON.parse(autoText) : {};
  const todo = missing.filter((s) => !auto[s]).slice(0, limit);
  if (!todo.length) return { translated: 0, remaining: 0 };
  const es = await translateTexts(env, todo, names);
  let n = 0;
  todo.forEach((en, i) => { if (es[i]) { auto[en] = es[i]; n++; } });
  if (n) await commitFiles(env, token, `Spanish: translate ${n} new ${n === 1 ? 'string' : 'strings'} automatically`, [{ path: AUTO, content: JSON.stringify(auto, null, 1) + '\n' }]);
  return { translated: n, remaining: Math.max(0, missing.filter((s) => !auto[s]).length) };
}

/** For the admin: every automatic translation, plus whether a person has approved or edited it. */
export async function listTranslations(env) {
  const token = await githubToken(env);
  const [a, h] = await Promise.all([readRaw(env, token, AUTO), readRaw(env, token, HUMAN)]);
  const auto = a ? JSON.parse(a) : {}, human = h ? JSON.parse(h) : {};
  return Object.keys(auto).reverse().map((en) => ({ en, es: human[en] || auto[en], approved: !!human[en] }));
}

/** Save Spanish a person approved or edited: [{en, es}] → es.json (wins over the automatic version). */
export async function approveTranslations(env, items) {
  const token = await githubToken(env);
  const h = await readRaw(env, token, HUMAN);
  const human = h ? JSON.parse(h) : {};
  let n = 0;
  for (const it of items || []) {
    const en = String(it.en || ''), es = String(it.es || '').trim();
    if (!en || !es) continue;
    if (tagsOf(es) !== tagsOf(en)) { const m = 'Keep the little tags like <t1>…</t1> in the Spanish text, exactly as in the English.'; throw Object.assign(new Error(m), { status: 400, publicMessage: m }); }
    human[en] = es; n++;
  }
  if (n) await commitFiles(env, token, `Spanish: ${n} ${n === 1 ? 'translation' : 'translations'} approved in the admin`, [{ path: HUMAN, content: JSON.stringify(human, null, 1) + '\n' }]);
  return { saved: n };
}
