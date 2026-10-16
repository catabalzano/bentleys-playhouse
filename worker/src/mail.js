// Emails people get from Bentley's Playhouse (sent with Resend from hello@bentleysplayhouse.org).
//
// Deliverability: every email has a plain-text part, a real Reply-To, no link shorteners, all links on
// bentleysplayhouse.org (or Instagram/Facebook), and comes from the same verified address every time.
// The domain needs SPF + DKIM (Resend's records) and a DMARC record. See worker/README-email.md.
//
// Brand: cream page, white card, Playhouse Blue header with the logo, orange buttons, Fredoka-style
// rounded headings (web-safe fallbacks: most email apps can't load web fonts).

const SITE = (env) => (env.SITE_URL || 'https://bentleysplayhouse.org').replace(/\/$/, '');
export const h = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const INK = '#1F1D2B', MUTED = '#5C5A72', BLUE = '#5271FF', DEEP = '#2F45C8', ORANGE = '#FF914D', CREAM = '#FFF8F0', GOLD = '#FFD36B', TINT = '#EEF1FF';
const HEAD = "'Fredoka','Arial Rounded MT Bold','Helvetica Rounded',Arial,sans-serif";
const BODY = "'Figtree','Segoe UI',Helvetica,Arial,sans-serif";

/** Send one email. Quietly does nothing until the Resend key is set (so forms never break). */
export async function sendMail(env, { to, cc, subject, html, text, replyTo, attachments, tag }) {
  const list = (a) => [...new Set((Array.isArray(a) ? a : [a]).map((x) => String(x || '').trim().toLowerCase()).filter((x) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(x)))];
  const recipients = list(to), copies = list(cc).filter((x) => !recipients.includes(x));
  if (!recipients.length) return { skipped: 'no recipient' };
  if (!env.RESEND_API_KEY) { console.log('mail skipped (no RESEND_API_KEY):', subject); return { skipped: 'email not switched on' }; }
  const body = {
    from: env.MAIL_FROM || "Bentley's Playhouse <hello@bentleysplayhouse.org>",
    to: recipients, subject, html, text,
    reply_to: replyTo || env.MAIL_REPLY_TO || 'hello@bentleysplayhouse.org',
    // a unique id stops Gmail from bundling separate pups into one thread
    headers: { 'X-Entity-Ref-ID': crypto.randomUUID() },
  };
  if (copies.length) body.cc = copies;
  if (attachments && attachments.length) body.attachments = attachments;
  if (tag) body.tags = [{ name: 'type', value: tag }];
  const res = await fetch(`${env.RESEND_API || 'https://api.resend.com'}/emails`, { method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) { const t = await res.text(); console.error('resend', res.status, t); return { error: res.status }; }
  return res.json();
}

// ---------- building blocks ----------
export const btn = (label, href, { color = ORANGE, ink = INK } = {}) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0"><tr><td style="border-radius:999px;background:${color};box-shadow:4px 4px 0 ${GOLD}"><a href="${h(href)}" style="display:inline-block;padding:15px 28px;font-family:${HEAD};font-size:17px;font-weight:700;color:${ink};text-decoration:none;border-radius:999px">${label}</a></td></tr></table>`;
export const ghostBtn = (label, href) =>
  `<a href="${h(href)}" style="display:inline-block;margin:4px 6px 4px 0;padding:10px 18px;border:2px solid ${DEEP};border-radius:999px;font-family:${BODY};font-size:15px;font-weight:700;color:${DEEP};text-decoration:none">${label}</a>`;
export const p = (html, style = '') => `<p style="margin:0 0 14px;font-family:${BODY};font-size:16px;line-height:1.6;color:${INK};${style}">${html}</p>`;
export const h2 = (html) => `<h2 style="margin:26px 0 10px;font-family:${HEAD};font-size:21px;line-height:1.3;color:${INK}">${html}</h2>`;
export const note = (html) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px"><tr><td style="background:${TINT};border-radius:16px;padding:16px 18px;font-family:${BODY};font-size:15px;line-height:1.55;color:${INK}">${html}</td></tr></table>`;
export const facts = (rows) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;font-family:${BODY};font-size:15px;color:${INK}">${rows.filter(([, v]) => v).map(([k, v]) => `<tr><td style="padding:4px 16px 4px 0;color:${MUTED};font-weight:700;vertical-align:top;white-space:nowrap">${h(k)}</td><td style="padding:4px 0">${v}</td></tr>`).join('')}</table>`;

/** The branded shell: blue header with the logo, white card, warm footer. `pre` is the inbox preview line. */
export function layout(env, { pre, title, body, photo, photoAlt }) {
  const site = SITE(env);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light"><title>${h(title)}</title><link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;700&family=Fredoka:wght@600;700&display=swap" rel="stylesheet"></head>
<body style="margin:0;padding:0;background:${CREAM}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${CREAM}">${h(pre)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CREAM}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px">
  <tr><td align="center" style="background:${BLUE};border-radius:24px 24px 0 0;padding:22px 20px 18px">
    <a href="${site}/" style="text-decoration:none"><img src="${site}/assets/img/email/logo-white.png" width="230" alt="Bentley's Playhouse" style="display:block;width:230px;max-width:70%;height:auto;border:0;font-family:${HEAD};font-size:24px;font-weight:700;color:#ffffff"></a>
  </td></tr>
  <tr><td style="background:${GOLD};height:6px;line-height:6px;font-size:0">&nbsp;</td></tr>
  ${photo ? `<tr><td style="background:#ffffff;padding:0"><img src="${h(photo)}" width="600" height="315" alt="${h(photoAlt || '')}" style="display:block;width:100%;max-width:600px;height:auto;border:0"></td></tr>` : ''}
  <tr><td style="background:#ffffff;border-radius:${photo ? '0 0' : '0 0'} 24px 24px;padding:30px 30px 26px">
    <h1 style="margin:0 0 14px;font-family:${HEAD};font-size:27px;line-height:1.25;color:${INK}">${title}</h1>
    ${body}
    ${note(`<strong>Have any questions?</strong> Just reply to this email and we'll get back to you.`)}
    <p style="margin:24px 0 0;font-family:${BODY};font-size:16px;line-height:1.6;color:${INK}">With love and wagging tails,<br><strong>Bentley's Playhouse</strong></p>
  </td></tr>
  <tr><td align="center" style="padding:20px 16px 8px;font-family:${BODY};font-size:13px;line-height:1.6;color:${MUTED}">
    <a href="${site}/" style="color:${DEEP};font-weight:700;text-decoration:none">bentleysplayhouse.org</a> &nbsp;·&nbsp;
    <a href="https://www.instagram.com/bentleysplayhouse/" style="color:${DEEP};font-weight:700;text-decoration:none">Instagram</a> &nbsp;·&nbsp;
    <a href="https://www.facebook.com/itsbentleysplayhouse/" style="color:${DEEP};font-weight:700;text-decoration:none">Facebook</a><br>
    Bentley's Playhouse · Dog rescue and advocacy · Miami, Florida
  </td></tr>
</table></td></tr></table></body></html>`;
}
/** Plain-text twin of every email (spam filters and some people prefer it). */
export const plain = (lines) => lines.filter((l) => l !== null && l !== undefined).join('\n') + "\n\nHave any questions? Just reply to this email and we'll get back to you.\n\nWith love and wagging tails,\nBentley's Playhouse\nhttps://bentleysplayhouse.org\n";

// ---------- shared data ----------
/** What the site publishes about each pup (slug → name, status, rescue contacts…), built by src/build.mjs. */
export async function pupsIndex(env) {
  const r = await fetch(`${SITE(env)}/pawsome-pooches/pups.json?t=${Math.floor(Date.now() / 60000)}`, { cf: { cacheTtl: 60 } });
  if (!r.ok) return {};
  return r.json().catch(() => ({}));
}
/** The private "mark as adopted" code for one pup: only the person we email it to has it. */
export async function adoptToken(env, slug) {
  let key = await env.SUBMISSIONS.get('cfg:adoptKey');
  if (!key) { key = crypto.randomUUID() + crypto.randomUUID(); await env.SUBMISSIONS.put('cfg:adoptKey', key); }
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode('adopted:' + slug));
  return [...new Uint8Array(sig)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
}
export const adoptLink = async (env, slug, name) => `${SITE(env)}/pawsome-pooches/adopted/?pup=${encodeURIComponent(slug)}&name=${encodeURIComponent(name)}&code=${await adoptToken(env, slug)}`;

const igUrl = (v) => { v = String(v || '').trim(); if (!v) return ''; if (/^https?:\/\//.test(v)) return v; return `https://www.instagram.com/${v.replace(/^@/, '').replace(/\/+$/, '')}/`; };
const igHandle = (v) => { v = String(v || '').trim(); if (!v) return ''; const m = /instagram\.com\/([\w.]+)/.exec(v); return '@' + (m ? m[1] : v.replace(/^@/, '')); };
const telHref = (v) => 'tel:' + String(v || '').replace(/[^\d+]/g, '');
const smsHref = (v) => 'sms:' + String(v || '').replace(/[^\d+]/g, '');

/** Rescue/shelter contact block (HTML + text lines). */
export function rescueBlock(r) {
  if (!r || !(r.email || r.phone || r.instagram || r.website)) return { html: '', text: [] };
  const rows = [
    ['Email', r.email ? `<a href="mailto:${h(r.email)}" style="color:${DEEP};font-weight:700">${h(r.email)}</a>` : ''],
    ['Phone', r.phone ? `<a href="${h(telHref(r.phone))}" style="color:${DEEP};font-weight:700">${h(r.phone)}</a> &nbsp;<a href="${h(smsHref(r.phone))}" style="color:${DEEP}">(text)</a>` : ''],
    ['Instagram', r.instagram ? `<a href="${h(igUrl(r.instagram))}" style="color:${DEEP};font-weight:700">${h(igHandle(r.instagram))}</a>` : ''],
    ['Website', r.website ? `<a href="${h(r.website)}" style="color:${DEEP};font-weight:700">${h(String(r.website).replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</a>` : ''],
  ];
  return {
    html: note(`<strong style="font-family:${HEAD};font-size:17px">${h(r.name || 'The rescue')}</strong>${r.city ? ` <span style="color:${MUTED}">· ${h(r.city)}</span>` : ''}<br>${facts(rows).replace('margin:0 0 16px', 'margin:8px 0 0')}`),
    text: [`${r.name || 'The rescue'}${r.city ? ' (' + r.city + ')' : ''}`, r.email && `Email: ${r.email}`, r.phone && `Phone: ${r.phone}`, r.instagram && `Instagram: ${igHandle(r.instagram)}`, r.website && `Website: ${r.website}`].filter(Boolean),
  };
}

// ---------- 1. "We got your pup" (right after the Submit a Pup form) ----------
export function submissionReceived(env, rec) {
  const D = rec.dog, S = rec.submitter, site = SITE(env);
  const title = `We Got ${h(D.name)}!`;
  const body = [
    p(`Hi ${h(S.firstName)},`),
    p(`Thank you for sending us <strong>${h(D.name)}</strong>. Every pup who gets seen has a better shot at a home, and you just gave ${h(D.name)} that shot.`),
    h2('What Happens Next'),
    note(`<strong>1.</strong> We review every pup by hand, usually within a few days.<br><strong>2.</strong> If we have questions, we'll email or text you.<br><strong>3.</strong> Once ${h(D.name)} is approved, you'll get another email with the link to the listing, ready-made Instagram Story images and a button to tell us when ${h(D.name)} finds a home.`),
    h2('What You Sent Us'),
    facts([['Pup', h(D.name)], ['Breed', h(D.breed)], ['Age', h(D.age)], ['Where', h([D.orgName, D.city].filter(Boolean).join(', '))], ['Photos', String(rec.photoCount)]]),
    btn('See Pawsome Pooches', `${site}/pawsome-pooches/`),
  ].join('');
  const text = plain([`Hi ${S.firstName},`, '', `Thank you for sending us ${D.name}. We review every pup by hand, usually within a few days. If we have questions, we'll email or text you.`, '', `Once ${D.name} is approved, you'll get another email with the link to the listing, Instagram Story images and a button to tell us when ${D.name} finds a home.`, '', `Pup: ${D.name}`, `Breed: ${D.breed}`, `Age: ${D.age}`, '', `Pawsome Pooches: ${site}/pawsome-pooches/`]);
  return { subject: `We got ${D.name}! Your Pawsome Pooches submission`, html: layout(env, { pre: `Thanks for sending us ${D.name}. Here's what happens next.`, title, body }), text };
}

// ---------- 2. "Your listing is live" (after we approve, once the page is online) ----------
export function listingApproved(env, { name, url, firstName, adoptUrl, stories, photo, needs }) {
  const verb = needs === 'foster' ? 'foster' : 'adopt';
  const enc = encodeURIComponent(url);
  const shareText = encodeURIComponent(`Meet ${name}! ${name} is looking for a home. Please share: ${url}`);
  const storyCells = (stories || []).map((s) => `<td width="33%" align="center" valign="top" style="padding:0 5px"><a href="${h(s.url)}" style="text-decoration:none"><img src="${h(s.url)}" width="170" alt="${h(s.label)} story image of ${h(name)}" style="display:block;width:100%;max-width:170px;height:auto;border-radius:12px;border:0"></a><p style="margin:8px 0 0;font-family:${BODY};font-size:14px;font-weight:700;color:${INK}">${h(s.label)}</p><a href="${h(s.url)}" style="font-family:${BODY};font-size:13px;color:${DEEP};font-weight:700">Save image</a></td>`).join('');
  const title = `${h(name)} Is Live!`;
  const body = [
    p(`Hi ${h(firstName)},`),
    p(`Great news: <strong>${h(name)}</strong> is now on Pawsome Pooches, where people looking for a dog to ${verb} can find ${needs === 'foster' ? 'them' : 'them'}.`),
    btn(`See ${h(name)}'s Listing`, url),
    h2(`Help ${h(name)} Get Seen`),
    p(`The more people see ${h(name)}, the faster the right person finds them. One share can reach a friend of a friend who's been waiting for exactly this dog. It takes 30 seconds:`),
    storyCells ? note(`<strong>Post to your Instagram Story.</strong> We made three designs for you. On your phone, tap one, save it, and post it to your Story. Then add a <strong>Link sticker</strong> with ${h(name)}'s link:<br><a href="${h(url)}" style="color:${DEEP};font-weight:700;word-break:break-all">${h(url)}</a>`) : '',
    storyCells ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px"><tr>${storyCells}</tr></table>` : '',
    storyCells ? '' : note(`<strong>Post to your Instagram Story.</strong> Open ${h(name)}'s page on your phone and tap <strong>Share to Stories</strong>. Pick a design, save it, and post it to your Story. Then add a <strong>Link sticker</strong> with ${h(name)}'s link:<br><a href="${h(url)}" style="color:${DEEP};font-weight:700;word-break:break-all">${h(url)}</a>`),
    p(`<strong>Share the link</strong> on Facebook, in group chats and in your neighborhood groups:`),
    `<p style="margin:0 0 16px">${ghostBtn('Facebook', `https://www.facebook.com/sharer/sharer.php?u=${enc}`)}${ghostBtn('WhatsApp', `https://wa.me/?text=${shareText}`)}${ghostBtn('Text a friend', `sms:?&body=${shareText}`)}${ghostBtn('Email a friend', `mailto:?subject=${encodeURIComponent('Meet ' + name)}&body=${shareText}`)}</p>`,
    p(`Tip: Stories with a Link sticker and a short, personal line (“This is ${h(name)}, the sweetest couch buddy”) get the most taps.`, `color:${MUTED};font-size:15px`),
    h2(`When ${h(name)} Finds a Home`),
    note(`Please tap the button below <strong>as soon as ${h(name)} is adopted</strong>. It marks ${h(name)} as adopted on the website right away and lets us know, so nobody asks about a pup who already went home. Keep this email so you can find the button later.`),
    btn(`${h(name)} Was Adopted!`, adoptUrl, { color: BLUE, ink: '#ffffff' }),
    p(`Thank you for helping ${h(name)}. You're the reason this works.`),
  ].join('');
  const text = plain([`Hi ${firstName},`, '', `Great news: ${name} is now on Pawsome Pooches.`, `See the listing: ${url}`, '', `HELP ${name.toUpperCase()} GET SEEN`, ...((stories || []).length ? [`Post to your Instagram Story (add a Link sticker with ${url}). Story images:`, ...stories.map((s) => `- ${s.label}: ${s.url}`)] : [`Post to your Instagram Story: open ${url} on your phone, tap Share to Stories, save a design and add a Link sticker with the link.`]), '', `Share the link on Facebook, in group chats and neighborhood groups: ${url}`, '', `WHEN ${name.toUpperCase()} FINDS A HOME`, `Open this link to mark ${name} as adopted. Please keep this email so you can find it later:`, adoptUrl]);
  return { subject: `${name} is live on Pawsome Pooches! Help ${name} get seen`, html: layout(env, { pre: `${name}'s listing is up. Here are Story images and the "adopted" button for later.`, title, body, photo, photoAlt: name }), text };
}

// ---------- 3a. "You want to adopt <pup>!" (to the person who wants to adopt) ----------
// Different for shelter pups (MDAS, Broward), rescue/foster pups and family rehomings.
// rescueNotified: true only when we really emailed the rescue (or the person who listed the pup) their details.
export function interestToAdopter(env, { m, pup, rescue, rescueNotified }) {
  const verb = m.verb === 'foster' ? 'foster' : 'adopt';
  const P = pup, many = /&| and /i.test(P.name), is = many ? 'are' : 'is', them = many ? 'them' : P.name;
  const S = SHELTERS[P.locType];
  const kind = S ? 'shelter' : P.locType === 'family' ? 'family' : rescue && rescue.name ? 'rescue' : 'other';
  const ids = (P.animalIds || []).filter(Boolean);
  const title = `You Want to ${verb === 'foster' ? 'Foster' : 'Adopt'} ${h(P.name)}!`;
  const intro = p(`Thank you for your interest in <strong>${h(P.name)}</strong>! We got your message, and Bentley's Playhouse will get back to you <strong>within 24 to 48 hours</strong> to help you connect.`);
  const card = pupCard(P);
  let where = '', whereText = [], tips = [];
  if (kind === 'shelter') {
    const rows = [['Shelter', `<strong>${h(S.name)}</strong><br>${h(S.place)}`], ['Address', S.address ? `<a href="${h(mapHref(S.address))}" style="color:${DEEP};font-weight:700">${h(S.address)}</a>` : ''], ['Phone', S.phone ? `<a href="${h(telHref(S.phone))}" style="color:${DEEP};font-weight:700">${h(S.phone)}</a>` : ''], [ids.length > 1 ? 'Animal IDs' : 'Animal ID', ids.map(h).join('<br>')], ['Website', `<a href="${h(S.site)}" style="color:${DEEP};font-weight:700">Adoption page</a>`]];
    where = h2(`Where ${h(P.name)} ${many ? 'Are' : 'Is'}`) + note(facts(rows).replace('margin:0 0 16px', 'margin:0') + `<p style="margin:12px 0 0">${h(P.name)} ${is} at a county shelter, where pups go home on a first-come, first-served basis. If you're ready, the fastest way is to visit soon with ${ids.length > 1 ? 'their animal IDs' : 'the animal ID'}. We'll also let the shelter know you're interested.</p>`) + `<p style="margin:0 0 16px">${ghostBtn('Shelter adoption page', S.site)}${S.address ? ghostBtn('Directions', mapHref(S.address)) : ''}</p>`;
    whereText = [`WHERE ${P.name.toUpperCase()} ${is.toUpperCase()}`, `${S.name}, ${S.place}`, S.address, S.phone ? `Phone: ${S.phone}` : null, ids.length ? `Animal ID${ids.length > 1 ? 's' : ''}: ${ids.join(', ')}` : null, `Adoption page: ${S.site}`, `Shelter pups go home first-come, first-served. Visit soon with the animal ID. We'll also let the shelter know you're interested.`];
    tips = ['Go early in the day and bring a photo ID.', `Show the staff ${ids.length > 1 ? 'the animal IDs' : 'the animal ID'} so they can find ${them} quickly.`, 'Ask for a meet-and-greet, and bring your other dogs if the shelter allows it.', 'Ask about vet records, vaccines and what the adoption fee includes.'];
  } else if (kind === 'rescue') {
    const R = rescue;
    const rows = [['Rescue', `<strong>${h(R.name)}</strong>${R.city ? `<br>${h(R.city)}` : ''}`], ['Email', R.email ? `<a href="mailto:${h(R.email)}" style="color:${DEEP};font-weight:700">${h(R.email)}</a>` : ''], ['Phone', R.phone ? `<a href="${h(telHref(R.phone))}" style="color:${DEEP};font-weight:700">${h(R.phone)}</a> &nbsp;<a href="${h(smsHref(R.phone))}" style="color:${DEEP}">(text)</a>` : ''], ['Instagram', R.instagram ? `<a href="${h(igUrl(R.instagram))}" style="color:${DEEP};font-weight:700">${h(igHandle(R.instagram))}</a>` : ''], ['Facebook', R.facebook ? `<a href="${h(R.facebook)}" style="color:${DEEP};font-weight:700">${h(String(R.facebook).replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</a>` : ''], ['Website', R.website && !/instagram\.com/i.test(R.website) ? `<a href="${h(R.website)}" style="color:${DEEP};font-weight:700">${h(String(R.website).replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</a>` : '']];
    where = h2(`Where ${h(P.name)} ${many ? 'Are' : 'Is'}`) + note(facts(rows).replace('margin:0 0 16px', 'margin:0') + `<p style="margin:12px 0 0">${h(P.name)} ${is} with ${h(R.name)}, and they handle the adoption. Feel free to reach out to them directly too, and mention you saw ${h(P.name)} on Bentley's Playhouse. ${rescueNotified ? `We also sent them your name and contact details, so they may reach out to you first.` : `We'll also let them know you're interested.`}</p>`);
    whereText = [`WHERE ${P.name.toUpperCase()} ${is.toUpperCase()}`, R.name + (R.city ? ` (${R.city})` : ''), R.email ? `Email: ${R.email}` : null, R.phone ? `Phone: ${R.phone}` : null, R.instagram ? `Instagram: ${igHandle(R.instagram)}` : null, R.facebook ? `Facebook: ${R.facebook}` : null, R.website ? `Website: ${R.website}` : null, `They handle the adoption. Feel free to reach out directly and mention you saw ${P.name} on Bentley's Playhouse.`, rescueNotified ? 'We also sent them your name and contact details.' : `We'll also let them know you're interested.`];
    tips = [`Ask about ${them === P.name ? P.name + "'s" : 'their'} routine, energy and vet records.`, 'Most rescues ask you to fill out an application and may do a home visit.', 'Plan a meet-and-greet, with your other dogs if you have any.', 'Have your home ready: a quiet spot, a crate or bed, and a leash and ID tag.'];
  } else {
    where = h2(`Where ${h(P.name)} ${many ? 'Are' : 'Is'}`) + note(kind === 'family' ? `${h(P.name)} ${is} with ${many ? 'their' : 'their'} family, who are looking for a safe new home. We talk with every interested adopter first, then introduce you to the family.` : `We'll connect you with the people caring for ${h(them)}.`);
    whereText = [kind === 'family' ? `${P.name} ${is} with their family. We talk with every interested adopter first, then introduce you.` : `We'll connect you with the people caring for ${them}.`];
    tips = [`Think about questions for the family: ${them === P.name ? P.name + "'s" : 'their'} routine, habits and vet records.`, 'Plan a meet-and-greet, with your other dogs if you have any.', 'Have your home ready: a quiet spot, a crate or bed, and a leash and ID tag.'];
  }
  const body = [
    p(`Hi ${h(m.firstName)},`), intro, card, where,
    h2('Tips for a Smooth Adoption'), note(tips.map((t) => '• ' + h(t)).join('<br>')),
    m.message ? h2('Your Message') + note(`<span style="white-space:pre-wrap">${h(m.message)}</span>`) : '',
    btn(`See ${h(P.name)} Again`, P.url),
  ].join('');
  const text = plain([`Hi ${m.firstName},`, '', `Thank you for your interest in ${P.name}! We got your message, and Bentley's Playhouse will get back to you within 24 to 48 hours to help you connect.`, '', ...whereText, '', 'TIPS FOR A SMOOTH ADOPTION', ...tips.map((t) => '- ' + t), ...(m.message ? ['', 'Your message:', m.message] : []), '', `${P.name}: ${P.url}`]);
  return { subject: `Next steps for ${P.name}`, html: layout(env, { pre: `We'll get back to you within 24 to 48 hours. Here's where ${P.name} ${is} and how to reach them.`, title, body }), text };
}
/** Small photo + name + status card for a pup (used in emails). */
function pupCard(P) {
  const img = P.thumb || P.photo;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 18px;border:2px solid #E4E7F7;border-radius:18px"><tr>
    ${img ? `<td width="132" style="padding:12px 0 12px 12px;vertical-align:middle"><a href="${h(P.url)}"><img src="${h(img)}" width="120" height="120" alt="${h(P.name)}" style="display:block;width:120px;height:120px;object-fit:cover;border-radius:14px;border:0"></a></td>` : ''}
    <td style="padding:12px 16px;vertical-align:middle;font-family:${BODY};color:${INK}"><div style="font-family:${HEAD};font-size:22px;font-weight:700;line-height:1.2">${h(P.name)}</div>
    <div style="margin:6px 0 10px"><span style="display:inline-block;background:#E3F4EA;color:#1B6E45;font-size:13px;font-weight:700;border-radius:999px;padding:3px 10px">${P.status === 'adopted' ? 'Adopted' : P.needs === 'foster' ? 'Needs a foster' : 'Ready for adoption'}</span></div>
    <a href="${h(P.url)}" style="color:${DEEP};font-weight:700;font-size:15px">See ${h(P.name)}'s page →</a></td></tr></table>`;
}

// ---------- 3b. "Someone wants to adopt your pup" (to the rescue and the person who listed the pup) ----------
export function interestToRescue(env, { m, pup }) {
  const verb = m.verb || 'adopt';
  const rows = [['Name', h(`${m.firstName} ${m.lastName}`)], ['City', h(m.city)], ['Phone', `<a href="${h(telHref(m.phone))}" style="color:${DEEP};font-weight:700">${h(m.phone)}</a>`], ['Email', `<a href="mailto:${h(m.email)}" style="color:${DEEP};font-weight:700">${h(m.email)}</a>`]];
  const title = `Someone Wants to ${verb === 'foster' ? 'Foster' : 'Adopt'} ${h(pup.name)}!`;
  const body = [
    p(`Good news: a person who found <strong>${h(pup.name)}</strong> on Bentley's Playhouse wants to ${verb} and asked us to share their details with you.`),
    facts(rows),
    m.message ? note(`<strong>Their note:</strong><br>${h(m.message).replace(/\n/g, '<br>')}`) : '',
    p(`Tap the button to email them, or give them a call. They're expecting to hear from you.`),
    btn(`Email ${h(m.firstName)}`, `mailto:${m.email}?subject=${encodeURIComponent(pup.name + ' from Bentley\'s Playhouse')}`),
    p(`${h(pup.name)}'s listing: <a href="${h(pup.url)}" style="color:${DEEP};font-weight:700">${h(pup.url)}</a>`, `font-size:15px`),
  ].join('');
  const text = plain([`Good news: someone who found ${pup.name} on Bentley's Playhouse wants to ${verb}.`, '', `Name: ${m.firstName} ${m.lastName}`, `City: ${m.city}`, `Phone: ${m.phone}`, `Email: ${m.email}`, m.message ? `\nTheir note:\n${m.message}` : null, '', `Email them (${m.email}) or give them a call. They're expecting to hear from you.`, '', `Listing: ${pup.url}`]);
  return { subject: `${m.firstName} wants to ${verb} ${pup.name}`, html: layout(env, { pre: `${m.firstName} ${m.lastName} from ${m.city} wants to ${verb} ${pup.name}.`, title, body, photo: pup.photo, photoAlt: pup.name }), text };
}

// ---------- 5. "We got your message" (automatic reply to every form: Contact, Get Involved, I Want to Adopt) ----------
// Shelters we know: address + phone so people can go see the pup.
export const SHELTERS = {
  'mdas-doral': { name: 'Miami-Dade Animal Services', place: 'Pet Adoption and Protection Center (Doral)', address: '3599 NW 79th Ave, Doral, FL 33122', phone: '305-468-5900', site: 'https://www.miamidade.gov/global/animals/adopt-a-pet.page' },
  'mdas-medley': { name: 'Miami-Dade Animal Services', place: 'Medley facility (medium and large dogs)', address: '', phone: '305-468-5900', site: 'https://www.miamidade.gov/global/animals/adopt-a-pet.page' },
  broward: { name: 'Broward County Animal Care', place: 'Adoption Center', address: '', phone: '', site: 'https://www.broward.org/animal/Adoptions' },
};
const mapHref = (a) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(a);
/** pup: {name, url, photo, status, needs, locType, animalIds[], rescue{...}} (from pups.json) — optional */
export function messageReceived(env, { firstName, pup, message, kind }) {
  const P = pup || null, many = P && /&| and /i.test(P.name);
  const title = P ? `We Got Your Message About ${h(P.name)}!` : 'We Got Your Message!';
  let where = '', whereText = [];
  if (P) {
    const S = SHELTERS[P.locType];
    const ids = (P.animalIds || []).filter(Boolean);
    if (S) {
      const rows = [['Shelter', `<strong>${h(S.name)}</strong><br>${h(S.place)}`], ['Address', S.address ? `<a href="${h(mapHref(S.address))}" style="color:${DEEP};font-weight:700">${h(S.address)}</a>` : ''], ['Phone', S.phone ? `<a href="${h(telHref(S.phone))}" style="color:${DEEP};font-weight:700">${h(S.phone)}</a>` : ''], [ids.length > 1 ? 'Animal IDs' : 'Animal ID', ids.map(h).join('<br>')]];
      where = h2(`Where ${h(P.name)} ${many ? 'Are' : 'Is'}`) + note(facts(rows).replace('margin:0 0 16px', 'margin:0') + `<p style="margin:12px 0 0">Shelter pups can be adopted by anyone who visits. Bring ${many ? 'their animal IDs' : 'the animal ID'} so the staff can find ${many ? 'them' : P.name} quickly, and check the shelter's hours before you go.</p>`) + `<p style="margin:0 0 16px">${ghostBtn('Shelter adoption page', S.site)}${S.address ? ghostBtn('Directions', mapHref(S.address)) : ''}</p>`;
      whereText = [`WHERE ${P.name.toUpperCase()} ${many ? 'ARE' : 'IS'}`, `${S.name}, ${S.place}`, S.address, S.phone ? `Phone: ${S.phone}` : null, ids.length ? `Animal ID${ids.length > 1 ? 's' : ''}: ${ids.join(', ')}` : null, `Adoption page: ${S.site}`];
    } else if (P.locType === 'family') {
      where = h2(`Where ${h(P.name)} ${many ? 'Are' : 'Is'}`) + note(`${h(P.name)} ${many ? 'are' : 'is'} with ${many ? 'their' : 'their'} family, who are looking for a safe new home. We screen every adopter for family rehomings, so we'll be your contact and introduce you once we've talked.`);
      whereText = [`${P.name} ${many ? 'are' : 'is'} with their family. We'll be your contact and introduce you.`];
    } else if (P.rescue && P.rescue.name) {
      const rb = rescueBlock(P.rescue);
      where = h2(`Where ${h(P.name)} ${many ? 'Are' : 'Is'}`) + (rb.html || note(`<strong>${h(P.rescue.name)}</strong>`)) + p(`${h(P.rescue.name)} handles the adoption. You can also reach them directly and mention you saw ${h(P.name)} on Bentley's Playhouse.`, `font-size:15px`);
      whereText = ['WHERE ' + P.name.toUpperCase() + (many ? ' ARE' : ' IS'), ...rb.text];
    }
  }
  const pupCardOld = P ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 18px;border:2px solid #E4E7F7;border-radius:18px"><tr>
    ${P.photo ? `<td width="132" style="padding:12px 0 12px 12px;vertical-align:middle"><a href="${h(P.url)}"><img src="${h(P.photo)}" width="120" height="120" alt="${h(P.name)}" style="display:block;width:120px;height:120px;object-fit:cover;border-radius:14px;border:0"></a></td>` : ''}
    <td style="padding:12px 16px;vertical-align:middle;font-family:${BODY};color:${INK}"><div style="font-family:${HEAD};font-size:22px;font-weight:700;line-height:1.2">${h(P.name)}</div>
    <div style="margin:6px 0 10px"><span style="display:inline-block;background:#E3F4EA;color:#1B6E45;font-size:13px;font-weight:700;border-radius:999px;padding:3px 10px">${P.status === 'adopted' ? 'Adopted' : P.needs === 'foster' ? 'Needs a foster' : 'Ready for adoption'}</span></div>
    <a href="${h(P.url)}" style="color:${DEEP};font-weight:700;font-size:15px">See ${h(P.name)}'s page →</a></td></tr></table>` : '';
  const body = [
    p(`Hi ${h(firstName || 'there')},`),
    p(P ? `Thank you for reaching out about <strong>${h(P.name)}</strong>! We got your message, and someone from Bentley's Playhouse will get back to you <strong>within 24 to 48 hours</strong>.` : `Thank you for reaching out! We got your message, and someone from Bentley's Playhouse will get back to you <strong>within 24 to 48 hours</strong>.`),
    P ? pupCard(P) : '',
    where,
    message ? h2('Your Message') + note(`<span style="white-space:pre-wrap">${h(message)}</span>`) : '',
    kind === 'involved' ? p(`While you wait, see who needs help right now on <a href="${SITE(env)}/pawsome-pooches/" style="color:${DEEP};font-weight:700">Pawsome Pooches</a>.`) : '',
  ].join('');
  const text = plain([`Hi ${firstName || 'there'},`, '', `Thank you for reaching out${P ? ' about ' + P.name : ''}! We got your message, and someone from Bentley's Playhouse will get back to you within 24 to 48 hours.`, ...(P ? ['', `${P.name}: ${P.url}`] : []), ...(whereText.length ? ['', ...whereText] : []), ...(message ? ['', 'Your message:', message] : [])]);
  return { subject: P ? `We got your message about ${P.name}` : `We got your message`, html: layout(env, { pre: `Thanks for reaching out${P ? ' about ' + P.name : ''}. We'll get back to you within 24 to 48 hours.`, title, body }), text };
}
