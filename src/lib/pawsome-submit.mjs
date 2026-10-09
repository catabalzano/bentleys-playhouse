// Pawsome Pooches: public "submit a pup" form + the email template used by "Email us" on each listing.
import { ctx, esc, href, breadcrumb, icon, previewNote } from './core.mjs';
import { LOCATIONS } from './pages3.mjs';
import { BREEDS, COMMON_BREEDS } from './breeds.mjs';

export const pawsomeEmail = () => (ctx.site.pawsome && ctx.site.pawsome.email) || 'hello@bentleysplayhouse.org';

/** mailto: link with a ready-to-send adoption (or foster) email that names the pup and links the listing. */
export function adoptMailto(d) {
  const foster = d.needs === 'foster';
  const verb = foster ? 'foster' : 'adopt';
  const url = `${ctx.site.siteUrl}/pawsome-pooches/${d.slug}/`;
  const where = [d.loc.name || d.loc.meta.label, d.loc.type !== 'family' && d.loc.name ? d.loc.meta.label : '', d.loc.city].filter(Boolean).join(', ');
  const lines = [
    "Hi Bentley's Playhouse,",
    '',
    `I'd like to ${verb} ${d.name} from Pawsome Pooches.`,
    '',
    `Pup: ${d.name}`,
    d.breed ? `Breed: ${d.breed}` : null,
    d.age ? `Age: ${d.age}` : null,
    d.sex ? `Sex: ${d.sex}` : null,
    where ? `Where: ${where}` : null,
    d.loc.animalId ? `Shelter / animal ID: ${d.loc.animalId}` : null,
    `Listing: ${url}`,
    '',
    'About me:',
    'Full name: ',
    'Phone: ',
    'City: ',
    'Do you rent or own your home? ',
    'Other pets at home: ',
    'Kids at home (ages): ',
    `Why ${d.name} would be a good fit: `,
    '',
    'Thank you!',
  ].filter((l) => l !== null);
  const subject = `${foster ? 'Foster' : 'Adoption'} inquiry: ${d.name} (Pawsome Pooches)`;
  return `mailto:${pawsomeEmail()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
}

const radios = (name, opts, req = true) => `<div class="pick-row">${opts.map(([v, l]) => `<label class="pick"><input type="radio" name="${name}" value="${v}"${req ? ' required' : ''}><span>${l}</span></label>`).join('')}</div>`;
const YN = [['yes', 'Yes'], ['no', 'No'], ['unknown', 'Not sure']];
const YNS = [['yes', 'Yes'], ['some', 'Some / depends'], ['no', 'No'], ['unknown', 'Not sure']];
const MUST = '<span class="must" aria-hidden="true">*</span>';
const field = (id, label, input, hint = '') => `<div class="field"><label for="${id}">${label}${/ required/.test(input) ? ' ' + MUST : ''}</label>${input}${hint ? `<p class="hint" id="${id}-hint">${hint}</p>` : ''}</div>`;
const text = (id, name, attrs = '') => `<input id="${id}" name="${name}" type="text" required ${attrs}>`;
const group = (label, inner, hint = '') => `<fieldset class="field"><legend>${label} ${MUST}</legend>${hint ? `<p class="hint">${hint}</p>` : ''}${inner}</fieldset>`;

export function pawsomeSubmitPage() {
  const p = ctx.site.pawsome || {};
  const tsKey = (ctx.site.forms && ctx.site.forms.turnstileSiteKey) || p.turnstileSiteKey || '';
  const live = !!p.submitEndpoint;
  return `
<section class="page-head page-head--pawsome"><div class="wrap wrap--text">
  ${breadcrumb([['Home', ''], ['Pawsome Pooches', 'pawsome-pooches/'], ['Submit a pup', '']])}
  <h1 class="page-h">Submit a Pup to Pawsome Pooches</h1>
  <p class="page-lede">Rescues, shelter volunteers and families can send us a dog who needs a home. We review every submission before it goes live, usually within a few days.</p>
</div></section>
<div class="wrap wrap--text">
  <div class="form-wrap pps">
  ${live ? '' : `<div class="form__notice">${icon('alert', { size: 22 })}<p>The submission form isn't switched on yet. For now, send us a DM on <a href="${esc(ctx.site.social.instagram.url)}" target="_blank" rel="noopener">Instagram</a> or email <a href="mailto:${esc(pawsomeEmail())}">${esc(pawsomeEmail())}</a>.</p></div>`}
  <form class="form" data-pps-form${live ? ` action="${esc(p.submitEndpoint)}/submit"` : ''} novalidate>
    <p class="hint">Fields marked with ${MUST} are required. Please only send dogs who are spayed or neutered, or who will be before adoption. <a href="${href('resources/rehoming-a-dog-safely/')}">Why this matters</a>.</p>

    <h2 class="pps__h">${icon('image', { size: 22 })} Photos</h2>
    <div class="field">
      <label for="pps-photos">Clear photos of the pup ${MUST} <span class="req">(at least 1, up to 5)</span></label>
      <p class="hint" id="pps-photos-hint">Bright, in focus, face visible. No collages or text on the photo. The first photo is the main one.</p>
      <input id="pps-photos" class="pps-file" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple aria-describedby="pps-photos-hint">
      <label class="pps-drop" for="pps-photos" aria-hidden="true">${icon('image', { size: 28 })}<span><strong>Tap to add photos</strong><br>JPG or PNG, up to 5</span></label>
      <ul class="pps-thumbs" data-pps-thumbs aria-live="polite"></ul>
    </div>

    <h2 class="pps__h">${icon('paw', { size: 22 })} About the Pup</h2>
    <div class="form__grid">
      ${field('pps-name', "Pup's name", text('pps-name', 'name', 'maxlength="80" autocomplete="off"'))}
      ${field('pps-breed', 'Breed', `<select id="pps-breed" name="breed" required aria-describedby="pps-breed-hint"><option value="">Choose a breed</option><optgroup label="Most common">${COMMON_BREEDS.map((b) => `<option value="${esc(b)}">${esc(b)}</option>`).join('')}</optgroup><optgroup label="All breeds (A to Z)">${BREEDS.map((b) => `<option value="${esc(b)}">${esc(b)}</option>`).join('')}</optgroup><optgroup label="Not listed"><option value="Other">Other (type it in)</option></optgroup></select>`, 'Your best guess is fine. Not sure? Pick "Mixed breed".')}
      <div class="field" data-pps-breedother hidden><label for="pps-breed-other">Type the breed ${MUST}</label><input id="pps-breed-other" name="breedOther" type="text" maxlength="80" autocomplete="off" placeholder="e.g., Boxer and Lab mix"></div>
      ${field('pps-age', 'Age', text('pps-age', 'age', 'maxlength="60" autocomplete="off" placeholder="e.g., 2 years, 8 months"'))}
      ${group('Male or female', radios('sex', [['male', 'Male'], ['female', 'Female']]))}
    </div>

    <h2 class="pps__h">${icon('med', { size: 22 })} Health</h2>
    <div class="form__grid">
      ${group('Spayed or neutered?', radios('fixed', YN))}
      ${group('Vaccines up to date?', radios('vaccinated', YN))}
      ${group('Microchipped?', radios('microchipped', YN))}
      ${group('Heartworm negative?', radios('heartworm', [['yes', 'Yes, tested negative'], ['no', 'Positive / in treatment'], ['unknown', 'Not sure']]))}
    </div>

    <h2 class="pps__h">${icon('heart', { size: 22 })} Gets Along With</h2>
    <div class="form__grid form__grid--3">
      ${group('Dogs', radios('goodWithDogs', YNS))}
      ${group('Cats', radios('goodWithCats', YNS))}
      ${group('Kids', radios('goodWithKids', YNS))}
    </div>

    <h2 class="pps__h">${icon('found', { size: 22 })} Where the Pup Is</h2>
    <div class="form__grid">
      ${field('pps-loc', 'The pup is…', `<select id="pps-loc" name="locationType" required><option value="">Choose one</option>${['mdas-doral', 'mdas-medley', 'broward', 'rescue', 'foster', 'family', 'other'].map((k) => `<option value="${k}">${k === 'family' ? 'With a family looking to rehome' : k === 'rescue' ? 'With a rescue' : k === 'foster' ? 'In a foster home' : k === 'other' ? 'Somewhere else' : esc(LOCATIONS[k].long)}</option>`).join('')}</select>`)}
    </div>
    <div class="pps-org" data-pps-org hidden>
      <p class="pps-org__h">The Rescue's Contact Details</p>
      <p class="hint">Shown on the listing so adopters can reach the rescue directly.</p>
      <div class="form__grid">
        <div class="field"><label for="pps-org"><span data-pps-orglabel>Name of the rescue organization</span> ${MUST}</label>${text('pps-org', 'orgName', 'maxlength="120"')}</div>
        <div class="field"><label for="pps-org-email">Rescue's email ${MUST}</label><input id="pps-org-email" name="orgEmail" type="email" maxlength="120" placeholder="e.g., adopt@myrescue.org"></div>
        <div class="field"><label for="pps-org-social">Rescue's social media handle ${MUST}</label><input id="pps-org-social" name="orgSocial" type="text" maxlength="100" placeholder="@myrescue"></div>
        <div class="field"><label for="pps-org-phone">Rescue's phone number ${MUST}</label><input id="pps-org-phone" name="orgPhone" type="tel" maxlength="30"></div>
        <div class="field"><label for="pps-url">Rescue's website <span class="opt">(if they have one)</span></label><input id="pps-url" name="orgUrl" type="text" inputmode="url" maxlength="200" placeholder="e.g., myrescue.org"></div>
      </div>
    </div>
    <div class="form__grid">
      ${field('pps-city', 'City or area', text('pps-city', 'city', 'maxlength="80" placeholder="e.g., Doral, Kendall, Hialeah"'))}
      <div class="field" data-pps-id hidden><label for="pps-id">Shelter animal ID number ${MUST}</label><input id="pps-id" name="animalId" type="text" maxlength="60" autocomplete="off" placeholder="e.g., A1234567"></div>
      ${group('Looking for', radios('needs', [['adoption', 'An adopter'], ['foster', 'A foster'], ['both', 'Either']]))}
    </div>
    ${field('pps-about', 'Tell us about them', `<textarea id="pps-about" name="about" rows="6" maxlength="3000" required placeholder="Personality, energy level, what they love, anything an adopter should know and why they need a home."></textarea>`)}

    <h2 class="pps__h">${icon('hands', { size: 22 })} About You</h2>
    <p class="hint">Only Bentley's Playhouse sees this. It's never shown on the site.</p>
    <div class="form__grid">
      ${field('pps-first', 'First name', text('pps-first', 'firstName', 'maxlength="60" autocomplete="given-name"'))}
      ${field('pps-last', 'Last name', text('pps-last', 'lastName', 'maxlength="60" autocomplete="family-name"'))}
      ${field('pps-social', 'Social media handle', text('pps-social', 'social', 'maxlength="100" placeholder="@yourhandle"'), 'Instagram, Facebook or TikTok.')}
      ${field('pps-phone', 'Phone number', '<input id="pps-phone" name="phone" type="tel" required maxlength="30" autocomplete="tel">')}
      ${field('pps-email', 'Email', '<input id="pps-email" name="email" type="email" required maxlength="120" autocomplete="email">', "We'll email you when we get your pup and when the listing goes live.")}
      <div class="field"><label for="pps-email2">Second email <span class="opt">(optional)</span></label><input id="pps-email2" name="email2" type="email" maxlength="120" autocomplete="off"><p class="hint">Another address that should get the same emails, just in case.</p></div>
    </div>
    <label class="pick pick--block"><input type="checkbox" name="consent" value="yes" required><span>I have permission to share these photos and this information, and it's accurate to the best of my knowledge. <strong class="must" aria-hidden="true">*</strong></span></label>
    <div class="hp" aria-hidden="true"><label>Leave this empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
    ${tsKey ? `<div class="cf-turnstile" data-sitekey="${esc(tsKey)}" data-theme="light"></div>` : ''}
    <p class="form__status" data-pps-status role="status" aria-live="polite"></p>
    <div class="btn-row"><button class="btn btn--primary" type="submit"${live ? '' : ' disabled'}>${icon('paw', { size: 20 })}<span>Submit pup for review</span></button></div>
  </form>
  <div class="pps-done" data-pps-done hidden tabindex="-1">
    <h2 class="section-h">Thank You!</h2>
    <p>We got your submission and emailed you a confirmation (check your spam folder if you don't see it). We review every pup before posting, and we'll reach out if we have questions. Once approved, you'll get an email with the link and ready-made Instagram images, and the pup will appear on <a href="${href('pawsome-pooches/')}">Pawsome Pooches</a>.</p>
    <div class="btn-row"><a class="btn btn--ghost" href="${href('pawsome-pooches/submit/')}">Submit another pup</a></div>
  </div>
  </div>
  ${ctx.mode === 'preview' && !live ? previewNote('Set <code>content/site.json → pawsome.submitEndpoint</code> to the submissions service URL to switch this form on.') : ''}
</div>`;
}
