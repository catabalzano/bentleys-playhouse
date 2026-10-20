// /submit-a-tip/ — community tips about animals at risk in Miami (Cata, Oct 19, 2026). Script: js/tip.js. Backend: worker/src/tips.js.
import { ctx, esc, href, icon, breadcrumb } from './core.mjs';
import { turnstileKey } from './pages.mjs';
import { TIP_AGREE } from '../../worker/src/tip-agree.js';

const endpoint = () => { try { return new URL(ctx.site.forms.contactEndpoint).origin + '/tip'; } catch (e) { return ''; } };
const R = () => ` <span class="req">(${ctx.t('form.required')})</span>`;
const chips = (name, opts, req) => `<div class="app-chips">${opts.map((o, i) => `<label class="app-chip"><input type="radio" name="${name}" value="${esc(o)}" id="tip-${name}-${i}"${req && !i ? ' required' : ''}><span>${esc(o)}</span></label>`).join('')}</div>`;
const agree = (id, text, extra = '') => `<div class="check-line app-agree"${extra}><input type="checkbox" id="tip-${id}" name="${id}" value="yes" required><label for="tip-${id}">${text}${R()}</label></div>`;

export function tipPage() {
  const ig = ctx.site.social.instagram;
  return `
<section class="page-head page-head--apply"><div class="wrap wrap--text">
  ${breadcrumb([['Home', ''], ['Get Help', 'get-help/'], ['Submit a Tip', '']])}
  <h1 class="page-h">Submit a Tip</h1>
  <p class="page-lede">Seen an animal being hurt, neglected or put in danger in Miami? Tell us what's happening. We read every tip, look into it and, when it helps the animal, bring it to the right people.</p>
  <p class="app-note">${icon('shield', { size: 18 })} Want to report a negligence case at Miami-Dade Animal Services? Use this form too.</p>
</div></section>
<div class="wrap wrap--text app-wrap">
  <aside class="tip-urgent" role="note">${icon('alert', { size: 22 })}<p><strong>Is an animal in danger right now?</strong> Don't wait on us. Call <strong>911</strong> if it's happening now, or Miami-Dade Animal Services at <strong>311</strong>. Then tell us below. <a href="${href('get-help/emergency/')}">Emergency steps</a></p></aside>

  <form class="form app-form tip-form" data-tip data-endpoint="${esc(endpoint())}" novalidate>
    <section class="app-sec tip-anon">
      <div class="check-line tip-anon__line"><input type="checkbox" id="tip-anonymous" name="anonymous" value="yes" data-anon><label for="tip-anonymous"><strong>Keep me anonymous.</strong> We'll never share or publish your name or Instagram. You can still leave your contact details so we can follow up, or leave them blank.</label></div>
    </section>

    <section class="app-sec" aria-labelledby="tip-s1-h">
      <h2 class="app-sec__h" id="tip-s1-h"><span class="app-sec__n">1</span>About You</h2>
      <div class="form__grid">
        <div class="field"><label for="tip-first">First name<span data-req-label>${R()}</span></label><input id="tip-first" name="firstName" type="text" autocomplete="given-name" maxlength="60" required data-contact></div>
        <div class="field"><label for="tip-last">Last name<span data-req-label>${R()}</span></label><input id="tip-last" name="lastName" type="text" autocomplete="family-name" maxlength="60" required data-contact></div>
        <div class="field"><label for="tip-email">Email<span data-req-label>${R()}</span></label><input id="tip-email" name="email" type="email" autocomplete="email" maxlength="120" required data-contact></div>
        <div class="field"><label for="tip-phone">Phone number<span data-req-label>${R()}</span></label><input id="tip-phone" name="phone" type="tel" autocomplete="tel" maxlength="30" required data-contact></div>
        <div class="field"><label for="tip-ig">Instagram account <span class="opt">(optional)</span></label><input id="tip-ig" name="instagram" type="text" maxlength="60" placeholder="@yourhandle" autocomplete="off"></div>
        <fieldset class="field app-q"><legend>Can we DM you on Instagram?</legend>${chips('canDm', ['Yes', 'No'])}</fieldset>
      </div>
    </section>

    <section class="app-sec" aria-labelledby="tip-s2-h">
      <h2 class="app-sec__h" id="tip-s2-h"><span class="app-sec__n">2</span>What's Happening</h2>
      <div class="form__grid">
        <fieldset class="field field--wide app-q"><legend>Want to report a negligence case at Miami-Dade Animal Services?${R()}</legend>${chips('mdas', ['Yes', 'No'], true)}</fieldset>
        <div class="field" data-mdas-only hidden><label for="tip-mdas-where">Which shelter?</label><select id="tip-mdas-where" name="mdasShelter"><option value="">Choose one</option><option>Doral</option><option>Medley</option><option>Not sure</option></select></div>
        <div class="field" data-mdas-only hidden><label for="tip-mdas-id">Animal ID, if you know it</label><input id="tip-mdas-id" name="mdasAnimalId" type="text" maxlength="40" placeholder="For example A1234567"></div>
        <div class="field field--wide"><label for="tip-what">Tell us exactly what is happening. Be as specific as possible.${R()}</label><p class="hint" id="tip-what-h">What you saw, the animal (type, color, size), how often it happens and anything that could help us find it.</p><textarea id="tip-what" name="details" rows="7" maxlength="5000" required aria-describedby="tip-what-h"></textarea></div>
        <div class="field"><label for="tip-where">Where is this happening?${R()}</label><input id="tip-where" name="where" type="text" maxlength="200" required placeholder="Address, cross streets or neighborhood"></div>
        <div class="field"><label for="tip-when">When did you see it? <span class="opt">(optional)</span></label><input id="tip-when" name="when" type="text" maxlength="120" placeholder="Date and time, or &quot;every day&quot;"></div>
      </div>
    </section>

    <section class="app-sec" aria-labelledby="tip-s3-h">
      <h2 class="app-sec__h" id="tip-s3-h"><span class="app-sec__n">3</span>Who You've Already Contacted</h2>
      <div class="tip-call">
        <fieldset class="app-q tip-call__q"><legend>Did you already call 311?${R()}</legend>${chips('called311', ['Yes', 'No'], true)}</fieldset>
        <div class="field tip-call__a"><label for="tip-311">What did they say?</label><textarea id="tip-311" name="said311" rows="2" maxlength="1500" placeholder="Leave blank if you didn't call"></textarea></div>
      </div>
      <div class="tip-call">
        <fieldset class="app-q tip-call__q"><legend>Did you call 911?${R()}</legend>${chips('called911', ['Yes', 'No'], true)}</fieldset>
        <div class="tip-call__a">
          <div class="field"><label for="tip-911">What did the police say?</label><textarea id="tip-911" name="said911" rows="2" maxlength="1500" placeholder="Leave blank if you didn't call"></textarea></div>
          <div class="field"><label for="tip-case">Did they give you a case number? Write it here.</label><input id="tip-case" name="caseNumber" type="text" maxlength="60" placeholder="Case or report number"></div>
        </div>
      </div>
    </section>

    <section class="app-sec" aria-labelledby="tip-s4-h">
      <h2 class="app-sec__h" id="tip-s4-h"><span class="app-sec__n">4</span>Proof and Posts</h2>
      <div class="form__grid">
        <div class="field field--wide"><label for="tip-posts">Links to social media posts you've made about this <span class="opt">(optional)</span></label><textarea id="tip-posts" name="postLinks" rows="3" maxlength="2000" placeholder="One link per line"></textarea></div>
        <div class="field field--wide field--files"><span class="lbl-like">Documents <span class="opt">(optional, up to 5 PDFs)</span></span>
          <label class="file-drop" for="tip-docs">${icon('paperclip', { size: 22 })}<span><b>Choose PDFs</b> or drop them here</span><input id="tip-docs" name="docs" type="file" multiple accept=".pdf,application/pdf" class="visually-hidden-file"></label>
          <p class="hint">Police reports, vet records, letters or anything else in writing. Up to 10 MB each.</p></div>
        <div class="field field--wide field--files"><span class="lbl-like">Photos <span class="opt">(optional, up to 3)</span></span>
          <label class="file-drop" for="tip-photos">${icon('image', { size: 22 })}<span><b>Choose photos</b> or drop them here</span><input id="tip-photos" name="photos" type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,.heic" class="visually-hidden-file"></label>
          <p class="hint">JPG, PNG or HEIC, up to 10 MB each.</p></div>
        <div class="field field--wide"><label for="tip-videos">Video links <span class="opt">(optional)</span></label><textarea id="tip-videos" name="videoLinks" rows="2" maxlength="2000" placeholder="Google Drive, Dropbox, YouTube, Instagram, one link per line"></textarea><p class="hint">Or send videos to us by Instagram DM at <a href="${esc(ig.url)}" target="_blank" rel="noopener">${esc(ig.handle)}</a>. Mention "tip" so we can match them to this form.</p></div>
      </div>
    </section>

    <section class="app-sec" aria-labelledby="tip-s5-h">
      <h2 class="app-sec__h" id="tip-s5-h"><span class="app-sec__n">5</span>Using Your Content</h2>
      <div class="form__grid">
        <fieldset class="field field--wide app-q"><legend>May we post or repost your content on social media to report what's happening?${R()}</legend>${chips('canPost', ['Yes, you may post it', 'No, only use it for the investigation'], true)}</fieldset>
        <fieldset class="field field--wide app-q" data-credit><legend>Do you want credit for your content?${R()}</legend>${chips('credit', ['Yes, credit me', "No, don't credit me"], true)}<p class="hint" data-credit-note hidden>You asked to stay anonymous, so we won't credit you.</p></fieldset>
      </div>
    </section>

    <section class="app-sec" aria-labelledby="tip-s6-h">
      <h2 class="app-sec__h" id="tip-s6-h"><span class="app-sec__n">6</span>Your Agreement</h2>
      <p class="app-sec__note">Please read and tick each statement. Ticking these boxes is the same as signing them.</p>
      <div class="tip-agree">
        ${agree('accurate', TIP_AGREE.accurate)}
        ${agree('owner', TIP_AGREE.owner)}
        ${agree('investigate', TIP_AGREE.investigate)}
        ${agree('anonUnderstand', TIP_AGREE.anonUnderstand, ' data-anon-only hidden')}
        ${agree('release', TIP_AGREE.release)}
      </div>
    </section>

    <section class="app-sec app-sec--send" aria-label="Send your tip">
      <div class="hp" aria-hidden="true"><label for="tip-website">Leave this empty</label><input id="tip-website" name="website" type="text" tabindex="-1" autocomplete="off"></div>
      <div class="check-line"><input type="checkbox" id="tip-consent" name="consent" required><label for="tip-consent">I'm OK with Bentley's Playhouse using these details to look into my tip and contact me about it. <a href="${href('privacy/')}">Privacy</a>${R()}</label></div>
      ${turnstileKey() ? `<div class="cf-turnstile" data-sitekey="${esc(turnstileKey())}" data-theme="light" data-size="flexible"></div>` : ''}
      <div class="form__actions"><button class="btn btn--primary" type="submit">${icon('shield', { size: 20 })}<span>Send my tip</span></button></div>
      <p class="form__status" role="status" aria-live="polite"></p>
    </section>
  </form>
  <div class="app-done" data-tip-done hidden tabindex="-1">
    <h2 class="section-h">Thank You for Speaking Up</h2>
    <p>We got your tip and will look into it. If you left an email, we sent you a copy of this note.</p>
    <p>If an animal is in danger right now, please call <strong>911</strong>, or Miami-Dade Animal Services at <strong>311</strong>.</p>
    <p><a class="arrow-link" href="${href('get-help/')}">Back to Get Help ${icon('arrow', { size: 18 })}</a></p>
  </div>
</div>`;
}
