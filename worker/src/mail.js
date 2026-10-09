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
    <p style="margin:24px 0 0;font-family:${BODY};font-size:16px;line-height:1.6;color:${INK}">With love and wagging tails,<br><strong>Bentley's Playhouse</strong></p>
  </td></tr>
  <tr><td align="center" style="padding:20px 16px 8px;font-family:${BODY};font-size:13px;line-height:1.6;color:${MUTED}">
    <a href="${site}/" style="color:${DEEP};font-weight:700;text-decoration:none">bentleysplayhouse.org</a> &nbsp;·&nbsp;
    <a href="https://www.instagram.com/bentleysplayhouse/" style="color:${DEEP};font-weight:700;text-decoration:none">Instagram</a> &nbsp;·&nbsp;
    <a href="https://www.facebook.com/itsbentleysplayhouse/" style="color:${DEEP};font-weight:700;text-decoration:none">Facebook</a><br>
    Bentley's Playhouse · Dog rescue and advocacy · Miami, Florida<br>
    Questions? Just reply to this email.
  </td></tr>
</table></td></tr></table></body></html>`;
}
/** Plain-text twin of every email (spam filters and some people prefer it). */
export const plain = (lines) => lines.filter((l) => l !== null && l !== undefined).join('\n') + "\n\nWith love and wagging tails,\nBentley's Playhouse\nhttps://bentleysplayhouse.org\nQuestions? Just reply to this email.\n";

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
    p(`Need to change something? Just reply to this email.`, `color:${MUTED};font-size:15px`),
    btn('See Pawsome Pooches', `${site}/pawsome-pooches/`),
  ].join('');
  const text = plain([`Hi ${S.firstName},`, '', `Thank you for sending us ${D.name}. We review every pup by hand, usually within a few days. If we have questions, we'll email or text you.`, '', `Once ${D.name} is approved, you'll get another email with the link to the listing, Instagram Story images and a button to tell us when ${D.name} finds a home.`, '', `Pup: ${D.name}`, `Breed: ${D.breed}`, `Age: ${D.age}`, '', 'Need to change something? Just reply to this email.', '', `Pawsome Pooches: ${site}/pawsome-pooches/`]);
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
    p(`<strong>Share the link</strong> on Facebook, in group chats and in your neighborhood groups:`),
    `<p style="margin:0 0 16px">${ghostBtn('Facebook', `https://www.facebook.com/sharer/sharer.php?u=${enc}`)}${ghostBtn('WhatsApp', `https://wa.me/?text=${shareText}`)}${ghostBtn('Text a friend', `sms:?&body=${shareText}`)}${ghostBtn('Email a friend', `mailto:?subject=${encodeURIComponent('Meet ' + name)}&body=${shareText}`)}</p>`,
    p(`Tip: Stories with a Link sticker and a short, personal line (“This is ${h(name)}, the sweetest couch buddy”) get the most taps.`, `color:${MUTED};font-size:15px`),
    h2(`When ${h(name)} Finds a Home`),
    note(`Please tap the button below <strong>as soon as ${h(name)} is adopted</strong>. It marks ${h(name)} as adopted on the website right away and lets us know, so nobody asks about a pup who already went home. Keep this email so you can find the button later.`),
    btn(`${h(name)} Was Adopted!`, adoptUrl, { color: BLUE, ink: '#ffffff' }),
    p(`Thank you for helping ${h(name)}. You're the reason this works.`),
  ].join('');
  const text = plain([`Hi ${firstName},`, '', `Great news: ${name} is now on Pawsome Pooches.`, `See the listing: ${url}`, '', `HELP ${name.toUpperCase()} GET SEEN`, `Post to your Instagram Story (add a Link sticker with ${url}). Story images:`, ...(stories || []).map((s) => `- ${s.label}: ${s.url}`), '', `Share the link on Facebook, in group chats and neighborhood groups: ${url}`, '', `WHEN ${name.toUpperCase()} FINDS A HOME`, `Open this link to mark ${name} as adopted. Please keep this email so you can find it later:`, adoptUrl]);
  return { subject: `${name} is live on Pawsome Pooches! Help ${name} get seen`, html: layout(env, { pre: `${name}'s listing is up. Here are Story images and the "adopted" button for later.`, title, body, photo, photoAlt: name }), text };
}

// ---------- 3a. "We got your interest" (to the person who wants to adopt) ----------
export function interestToAdopter(env, { m, pup, rescue, sharedWithRescue }) {
  const verb = m.verb || 'adopt';
  const rb = rescueBlock(rescue);
  const title = `You Want to ${verb === 'foster' ? 'Foster' : 'Adopt'} ${h(pup.name)}!`;
  const direct = rescue && rb.html;
  const body = [
    p(`Hi ${h(m.firstName)},`),
    p(`Thank you for your interest in <strong>${h(pup.name)}</strong>. Bentley's Playhouse has been told, and we'll help you connect.`),
    direct ? h2(`Reach ${h(rescue.name || 'the Rescue')} Directly`) : '',
    direct ? p(`${h(pup.name)} is with ${h(rescue.name || 'a rescue')}. They handle the adoption, so the fastest way is to contact them now and mention you saw ${h(pup.name)} on Bentley's Playhouse.${sharedWithRescue ? ` We also sent them your name and contact details, so they may reach out to you first.` : ''}`) : '',
    direct ? rb.html : note(`We'll be in touch soon by email or phone with the next steps for ${h(pup.name)}.`),
    h2('Tips for a Smooth Adoption'),
    note(`• Ask about ${h(pup.name)}'s routine, energy and vet records.<br>• Plan a meet-and-greet, with your other dogs if you have any.<br>• Have your home ready: a quiet spot, a crate or bed, and a leash and ID tag.`),
    btn(`See ${h(pup.name)} Again`, pup.url),
  ].join('');
  const text = plain([`Hi ${m.firstName},`, '', `Thank you for your interest in ${pup.name}. Bentley's Playhouse has been told, and we'll help you connect.`, '', ...(direct ? [`Reach the rescue directly (they handle the adoption):`, ...rb.text, sharedWithRescue ? 'We also sent them your contact details.' : null] : [`We'll be in touch soon with the next steps.`]), '', `${pup.name}: ${pup.url}`]);
  return { subject: `Next steps for ${pup.name}`, html: layout(env, { pre: direct ? `How to reach ${rescue.name || 'the rescue'} about ${pup.name}.` : `We got your interest in ${pup.name}.`, title, body, photo: pup.photo, photoAlt: pup.name }), text };
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
    p(`Reply to this email to write to them directly, or give them a call. They're expecting to hear from you.`),
    btn(`Email ${h(m.firstName)}`, `mailto:${m.email}?subject=${encodeURIComponent(pup.name + ' from Bentley\'s Playhouse')}`),
    p(`${h(pup.name)}'s listing: <a href="${h(pup.url)}" style="color:${DEEP};font-weight:700">${h(pup.url)}</a>`, `font-size:15px`),
  ].join('');
  const text = plain([`Good news: someone who found ${pup.name} on Bentley's Playhouse wants to ${verb}.`, '', `Name: ${m.firstName} ${m.lastName}`, `City: ${m.city}`, `Phone: ${m.phone}`, `Email: ${m.email}`, m.message ? `\nTheir note:\n${m.message}` : null, '', 'Reply to this email to write to them directly.', '', `Listing: ${pup.url}`]);
  return { subject: `${m.firstName} wants to ${verb} ${pup.name}`, html: layout(env, { pre: `${m.firstName} ${m.lastName} from ${m.city} wants to ${verb} ${pup.name}.`, title, body, photo: pup.photo, photoAlt: pup.name }), text };
}
