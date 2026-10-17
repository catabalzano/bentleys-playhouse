/* Adoption and foster applications: keeps a draft on this device, checks required answers, sends to the worker. */
(function () {
  'use strict';
  var T = window.BP_T || function (s) { return s; };
  var form = document.querySelector('form[data-app]');
  if (!form) return;
  var kind = form.getAttribute('data-app');
  var KEY = 'bp-app-' + kind;
  var statusEl = form.querySelector('.form__status');
  var started = Date.now();
  function say(msg, cls) { statusEl.textContent = msg; statusEl.className = 'form__status' + (cls ? ' is-' + cls : ''); }

  // ---- draft on this device (never the driver's license number) ----
  var store = {
    get: function () { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } },
    set: function (v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} },
    del: function () { try { localStorage.removeItem(KEY); } catch (e) {} },
  };
  var SKIP = { website: 1, license: 1, 'cf-turnstile-response': 1, consent: 1 };
  function snapshot() {
    var o = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || SKIP[el.name]) return;
      if (el.type === 'checkbox' || el.type === 'radio') { if (el.checked) (o[el.name] = o[el.name] || []).push(el.value); }
      else if (el.value) o[el.name] = el.value;
    });
    return o;
  }
  function restore(o) {
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || !(el.name in o)) return;
      var v = o[el.name];
      if (el.type === 'checkbox' || el.type === 'radio') el.checked = [].concat(v).indexOf(el.value) > -1;
      else el.value = v;
    });
  }
  var draft = store.get();
  if (Object.keys(draft).length) { restore(draft); say(T('We filled in the answers you saved on this device.')); }
  var t;
  form.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { store.set(snapshot()); }, 400); });
  form.addEventListener('change', function () { store.set(snapshot()); });

  // ---- pre-fill: the pup's name from ?pet= and today's date ----
  try {
    var q = new URLSearchParams(location.search), pet = q.get('pet') || q.get('pup');
    var pf = form.querySelector('[data-pet]');
    if (pf && pet && !pf.value) pf.value = pet.slice(0, 80);
  } catch (e) {}
  Array.prototype.forEach.call(form.querySelectorAll('[data-today]'), function (el) {
    if (!el.value) { var d = new Date(); el.value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  });

  // ---- spam check widget ----
  if (form.querySelector('.cf-turnstile') && !document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')) {
    var ts = document.createElement('script'); ts.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'; ts.async = true; ts.defer = true; document.head.appendChild(ts);
  }
  function resetTs() { if (window.turnstile && form.querySelector('.cf-turnstile')) try { window.turnstile.reset(form.querySelector('.cf-turnstile')); } catch (x) {} }

  // ---- check before sending ----
  function check() {
    var bad = [];
    Array.prototype.forEach.call(form.querySelectorAll('input[required], textarea[required]'), function (el) {
      var no = el.type === 'checkbox' ? !el.checked : !el.value.trim() || (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()));
      el.setAttribute('aria-invalid', no ? 'true' : 'false');
      if (no) bad.push(el);
    });
    Array.prototype.forEach.call(form.querySelectorAll('fieldset[data-req]'), function (fs) {
      var no = !fs.querySelector('input:checked');
      fs.classList.toggle('is-bad', no);
      if (no) bad.push(fs.querySelector('input'));
    });
    bad.sort(function (a, b) { return a.compareDocumentPosition(b) & 4 ? -1 : 1; });
    return bad;
  }
  form.addEventListener('change', function (e) { var fs = e.target.closest && e.target.closest('fieldset.is-bad'); if (fs && fs.querySelector('input:checked')) fs.classList.remove('is-bad'); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (form.hasAttribute('data-disconnected')) { say(T('Applications are not switched on yet. Please email hello@bentleysplayhouse.org.'), 'error'); return; }
    var bad = check();
    if (bad.length) { say(bad.length === 1 ? T('One answer is missing. We marked it in red.') : T('Some answers are missing. We marked them in red.') + ' (' + bad.length + ')', 'error'); bad[0].focus(); bad[0].scrollIntoView({ block: 'center' }); return; }
    var hp = form.querySelector('[name="website"]');
    if ((hp && hp.value) || Date.now() - started < 8000) { say(T('Not sent. Please try again in a moment.'), 'error'); return; }
    if (form.querySelector('.cf-turnstile')) { var tok = form.querySelector('[name="cf-turnstile-response"]'); if (!tok || !tok.value) { say(T('Please complete the "I am human" check above the Send button.'), 'error'); return; } }
    var btn = form.querySelector('[type="submit"]');
    btn.disabled = true; say(T('Sending your application…'));
    var data = new FormData(form); data.delete('website');
    fetch(form.getAttribute('data-endpoint'), { method: 'POST', body: data, headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (!res.ok) return res.json().catch(function () { return {}; }).then(function (j) { var er = new Error(j.error || ''); er.pub = !!j.error; throw er; });
        store.del(); form.reset(); form.hidden = true;
        var done = document.querySelector('[data-app-done]'); done.hidden = false; done.focus(); window.scrollTo({ top: done.getBoundingClientRect().top + scrollY - 120 });
      })
      .catch(function (er) { say(er && er.pub ? er.message : T("It didn't send. Your answers are still here. Please try again, or email hello@bentleysplayhouse.org."), 'error'); })
      .then(function () { btn.disabled = false; resetTs(); });
  });
})();
