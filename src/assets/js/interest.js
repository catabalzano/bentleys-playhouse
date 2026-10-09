var T = window.BP_T || function (s) { return s; };
/* Pawsome Pooches "I want to adopt": opens a short form, tells Bentley's Playhouse (and the rescue, if the person agrees),
   then shows one-tap ways to reach the rescue directly. Works on pup pages and in the pop-up on the list. */
(function () {
  'use strict';
  var tsLoading = null;
  function turnstile() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (!tsLoading) tsLoading = new Promise(function (res) {
      window.bpTsReady = function () { res(window.turnstile); };
      var s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=bpTsReady'; s.async = true; document.head.appendChild(s);
    });
    return tsLoading;
  }
  function say(form, msg, ok) { var s = form.querySelector('.form__status'); s.textContent = msg; s.className = 'form__status ' + (ok ? 'is-ok' : msg ? 'is-error' : ''); }

  document.addEventListener('click', function (e) {
    var open = e.target.closest('.pp-adopt__open'); if (!open) return;
    var box = open.closest('[data-pp-adopt]'), form = box.querySelector('.pp-adopt__form');
    var show = form.hidden; form.hidden = !show; open.setAttribute('aria-expanded', String(show));
    if (!show) return;
    if (window.bpTrack) window.bpTrack('adopt_interest_open', { pup: box.getAttribute('data-pp-adopt') });
    var ts = form.querySelector('.pp-adopt__ts');
    if (ts && !ts._done) { ts._done = true; turnstile().then(function (t) { form._ts = t.render(ts, { sitekey: ts.getAttribute('data-sitekey'), theme: 'light', size: 'flexible' }); }); }
    var first = form.querySelector('input:not([type=hidden])'); if (first) first.focus({ preventScroll: true });
    form.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  document.addEventListener('submit', function (e) {
    var form = e.target.closest('.pp-adopt__form'); if (!form) return;
    e.preventDefault();
    if (!form.action) return;
    form.querySelectorAll('[aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
    var bad = Array.prototype.filter.call(form.elements, function (el) { return el.willValidate && !el.checkValidity(); });
    if (bad.length) { bad.forEach(function (el) { el.setAttribute('aria-invalid', 'true'); }); say(form, T('Please fill in every field marked with *.')); bad[0].focus(); return; }
    var btn = form.querySelector('button[type=submit]'); btn.disabled = true; say(form, T('Sending…'), true);
    fetch(form.action, { method: 'POST', body: new FormData(form) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok || !res.j.ok) throw new Error(res.j.error || T('Something went wrong.'));
        var box = form.closest('[data-pp-adopt]'), done = box.querySelector('.pp-adopt__done');
        if (res.j.shared) { var sh = done.querySelector('[data-pp-shared]'); if (sh) sh.hidden = false; }
        form.hidden = true; box.querySelector('.pp-adopt__open').hidden = true; done.hidden = false; done.focus({ preventScroll: true });
        done.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        if (window.bpTrack) window.bpTrack('adopt_interest_sent', { pup: box.getAttribute('data-pp-adopt') });
      })
      .catch(function (err) { say(form, err.message || T("We couldn't send that. Please check your connection and try again.")); btn.disabled = false; if (window.turnstile && form._ts != null) try { window.turnstile.reset(form._ts); } catch (x) { /* ignore */ } });
  });
  // fixing a field clears its red outline
  document.addEventListener('input', function (e) {
    var form = e.target.closest && e.target.closest('.pp-adopt__form'); if (!form) return;
    if (e.target.checkValidity && e.target.checkValidity()) e.target.removeAttribute('aria-invalid');
    if (!form.querySelector('[aria-invalid]')) say(form, '');
  });
  // clicks on "reach the rescue" buttons
  document.addEventListener('click', function (e) {
    var a = e.target.closest('.pp-adopt__reach a'); if (!a || !window.bpTrack) return;
    var how = /^tel:/.test(a.href) ? 'call' : /^sms:/.test(a.href) ? 'text' : /^mailto:/.test(a.href) ? 'email' : /ig\.me|instagram/.test(a.href) ? 'instagram' : 'website';
    window.bpTrack('reach_rescue_' + how, { pup: a.closest('[data-pp-adopt]').getAttribute('data-pp-adopt') });
  });
})();
