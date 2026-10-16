// 🐾 Adoption cases: every "I Want to Adopt" message becomes a case with steps to follow, per where the pup is.
// The message itself stays in msg:<id>; what we've done about it is kept in case:<id> (same id).
// Steps that the system does itself (the automatic email, telling the rescue) tick themselves.
//
//  GET  /api/cases         admin: every case, newest first, with its steps, flags and the pup's live status
//  PUT  /api/cases/:id     admin: {step, done, note?} ticks or unticks a step · {notes} · {outcome} ('' reopens)
import { sessionOk } from './admin.js';
import { pupsIndex, SHELTERS } from './mail.js';

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const fail = (msg, status = 400) => Object.assign(new Error(msg), { publicMessage: msg, status });
const clean = (v, max = 300) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
const cleanLong = (v, max = 4000) => String(v == null ? '' : v).replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);

// The steps Cata confirmed (Oct 16). `auto` steps tick themselves when the system did them.
export const STEPS = {
  shelter: [
    { key: 'auto', label: 'Automatic email sent to the adopter', auto: true },
    { key: 'reply', label: 'We replied to the adopter' },
    { key: 'contact', label: 'Contacted the shelter with the animal ID' },
    { key: 'confirm', label: 'Shelter confirmed the pup is still available' },
    { key: 'visit', label: 'Adopter visited the shelter' },
    { key: 'result', label: 'Result' },
  ],
  rescue: [
    { key: 'auto', label: 'Automatic email sent to the adopter', auto: true },
    { key: 'notified', label: 'Rescue got the adopter\'s details', auto: true },
    { key: 'reply', label: 'We replied to the adopter' },
    { key: 'rcontact', label: 'Rescue confirmed they contacted the adopter' },
    { key: 'application', label: 'Application or home visit' },
    { key: 'meet', label: 'Meet-and-greet' },
    { key: 'result', label: 'Result' },
  ],
  family: [
    { key: 'auto', label: 'Automatic email sent to the adopter', auto: true },
    { key: 'screen', label: 'Screening call with the adopter' },
    { key: 'intro', label: 'Introduced the adopter to the family' },
    { key: 'meet', label: 'Meet-and-greet' },
    { key: 'result', label: 'Result' },
  ],
};
export const OUTCOMES = { adopted: 'Adopted 🎉', fostered: 'Fostering 🏡', nomatch: 'Not a match', noreply: 'Adopter stopped answering', taken: 'Pup went to someone else', other: 'Closed (other)' };

function kindOf(pup, m) {
  const t = (pup && pup.locType) || m.locType || '';
  if (SHELTERS[t] || /^(mdas|broward)/.test(t)) return 'shelter';
  if (t === 'family') return 'family';
  if ((pup && pup.rescue && pup.rescue.name) || m.rescue) return 'rescue';
  return 'family';
}

async function adoptMessages(env) {
  const out = [];
  let cursor;
  do {
    const page = await env.SUBMISSIONS.list({ prefix: 'msg:', cursor });
    for (const k of page.keys) { const m = await env.SUBMISSIONS.get(k.name, 'json'); if (m && m.form === 'adopt') out.push(m); }
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  return out;
}

/** One case = the message + what we did + where the pup is now. */
function build(m, c, pups) {
  const pup = pups[m.pup] || null;
  c = c || { steps: {} };
  const kind = c.kind || kindOf(pup, m);
  const steps = STEPS[kind].map((s) => {
    let st = c.steps[s.key] || null;
    const off = st && st.off; if (off) st = null;
    if (!st && !off && s.key === 'auto' && m.confirm && m.confirm.status === 'sent') st = { at: m.confirm.at, by: 'system' };
    if (!st && !off && s.key === 'notified' && m.sentTo && m.sentTo.length) st = { at: m.confirm ? m.confirm.at : m.createdAt, by: 'system', note: 'Sent to ' + m.sentTo.join(', ') };
    if (s.key === 'result') st = c.outcome ? { at: c.outcomeAt, note: OUTCOMES[c.outcome] } : null;
    return { key: s.key, label: s.label, auto: !!s.auto, done: !!st, at: st ? st.at : '', note: st ? st.note || '' : '', by: st ? st.by || '' : '' };
  });
  return {
    id: m.id, createdAt: m.createdAt, kind,
    person: { name: m.name || `${m.firstName} ${m.lastName}`, firstName: m.firstName, email: m.email, phone: m.phone, city: m.city },
    message: m.message || '', verb: m.verb || 'adopt',
    pup: { slug: m.pup, name: (pup && pup.name) || m.pupName || m.pup, url: (pup && pup.url) || m.pupUrl || '', status: pup ? pup.status || 'available' : 'gone', thumb: pup && (pup.thumb || pup.photo), animalIds: (pup && pup.animalIds) || [], locType: pup && pup.locType, rescue: pup && pup.rescue ? pup.rescue : null },
    confirm: m.confirm || null,
    steps, notes: c.notes || '', outcome: c.outcome || '', outcomeAt: c.outcomeAt || '', updatedAt: c.updatedAt || '',
  };
}

export async function handleCases(req, env, url) {
  if (!(await sessionOk(env, req))) throw fail('Please sign in again.', 401);
  const parts = url.pathname.split('/').filter(Boolean); // api, cases, id
  const id = parts[2];
  if (!id && req.method === 'GET') {
    const [msgs, pups] = await Promise.all([adoptMessages(env), pupsIndex(env).catch(() => ({}))]);
    const cases = [];
    for (const m of msgs) cases.push(build(m, await env.SUBMISSIONS.get(`case:${m.id}`, 'json'), pups));
    cases.sort((a, b) => String(b.createdAt).localeCompare(a.createdAt));
    return json({ cases, outcomes: OUTCOMES });
  }
  if (!id || !/^[\w-]{6,40}$/.test(id) || req.method !== 'PUT') throw fail('Not found.', 404);
  const m = await env.SUBMISSIONS.get(`msg:${id}`, 'json');
  if (!m || m.form !== 'adopt') throw fail('That case is gone.', 404);
  const pups = await pupsIndex(env).catch(() => ({}));
  const key = `case:${id}`;
  const c = (await env.SUBMISSIONS.get(key, 'json')) || { steps: {} };
  if (!c.kind) c.kind = kindOf(pups[m.pup], m); // fixed once we start working on it
  const b = await req.json().catch(() => ({}));
  const now = new Date().toISOString();
  if (b.step) {
    const step = STEPS[c.kind].find((s) => s.key === b.step && s.key !== 'result');
    if (!step) throw fail('Unknown step.');
    if (b.done === false) { if (step.auto) c.steps[step.key] = { off: true }; else delete c.steps[step.key]; }
    else c.steps[step.key] = { at: clean(b.at, 30) || now, note: clean(b.note, 300), by: clean(b.by, 80) };
  }
  if (typeof b.notes === 'string') c.notes = cleanLong(b.notes);
  if (typeof b.outcome === 'string') {
    if (b.outcome && !OUTCOMES[b.outcome]) throw fail('Unknown result.');
    c.outcome = b.outcome; c.outcomeAt = b.outcome ? now : '';
  }
  c.updatedAt = now;
  await env.SUBMISSIONS.put(key, JSON.stringify(c));
  return json({ ok: true, case: build(m, c, pups) });
}
