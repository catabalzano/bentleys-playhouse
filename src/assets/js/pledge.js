/* Pledge drives (/pledge/<slug>/): live total, amount chips, sending, thank-you, sharing. Backend: worker/src/pledges.js. */
(function () {
  'use strict';
  var T = window.BP_T || function (s) { return s; };
  var root = document.querySelector('[data-pl]');
  if (!root) return;
  var money = function (n) { n = Number(n) || 0; return '$' + (Math.round(n * 100) % 100 ? n.toFixed(2) : Math.round(n).toLocaleString('en-US')); };

  // ---------- total so far ----------
  function showTotals(j) {
    if (!j || typeof j.total !== 'number') return;
    document.querySelectorAll('[data-pl-total]').forEach(function (el) { el.textContent = money(j.total); });
    document.querySelectorAll('[data-pl-count]').forEach(function (el) {
      el.textContent = j.count ? (j.count === 1 ? T('pledged by 1 person') : T('pledged by {n} people').replace('{n}', j.count)) : T('pledged so far. Be the first!');
    });
    // with a goal the bar fills toward it; without one it fills toward the next milestone ($100, $250, $500, $750, $1,000, then every $500)
    var STEPS = [100, 250, 500, 750, 1000];
    function milestone(t) { for (var i = 0; i < STEPS.length; i++) if (t < STEPS[i]) return STEPS[i]; return (Math.floor(t / 500) + 1) * 500; }
    document.querySelectorAll('[data-pl-progress]').forEach(function (box) {
      var set = Number(box.getAttribute('data-goal')) || 0, goal = set || milestone(j.total), pct = Math.min(100, Math.round(j.total / goal * 100));
      var lab = box.querySelector('[data-pl-goal]');
      if (lab) lab.textContent = set ? T('Goal') + ' ' + money(goal) : (j.total >= 1 ? T('Next milestone') + ' ' + money(goal) : '');
      var pbm = box.querySelector('[role="progressbar"]'); if (pbm) pbm.setAttribute('aria-valuemax', String(goal));
      var bar = box.querySelector('[data-pl-bar]'); if (bar) bar.style.width = pct + '%';
      var pb = box.querySelector('[role="progressbar"]'); if (pb) pb.setAttribute('aria-valuenow', String(Math.round(j.total)));
    });
  }
  var stats = root.getAttribute('data-stats');
  if (stats && /^https?:/.test(stats)) fetch(stats, { headers: { Accept: 'application/json' } }).then(function (r) { return r.ok ? r.json() : null; }).then(showTotals).catch(function () {});

  // ---------- sharing ----------
  document.querySelectorAll('[data-pl-share]').forEach(function (box) {
    var url = location.origin + location.pathname, msg = box.querySelector('[data-pl-share-msg]');
    var title = box.getAttribute('data-title') || document.title;
    var copy = box.querySelector('[data-pl-copy]'), nat = box.querySelector('[data-pl-native]');
    function say(s) { msg.textContent = s; setTimeout(function () { if (msg.textContent === s) msg.textContent = ''; }, 3500); }
    copy.addEventListener('click', function () {
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { say(T('Link copied! Paste it in your Stories, a post or a message.')); }, function () { window.prompt(T('Copy this link:'), url); });
    });
    if (!navigator.share) nat.hidden = true;
    else nat.addEventListener('click', function () { navigator.share({ title: title, text: title, url: url }).catch(function () {}); });
  });

  // ---------- the form ----------
  var f = root.querySelector('form[data-pledge]');
  if (!f) return;
  var statusEl = f.querySelector('.form__status'), started = Date.now();
  function say(m, cls) { statusEl.textContent = m; statusEl.className = 'form__status' + (cls ? ' is-' + cls : ''); }
  var otherBox = f.querySelector('[data-pl-other]'), otherIn = f.querySelector('input[name="amountOther"]');
  function syncOther() { var on = !!f.querySelector('[data-pl-other-pick]:checked'); otherBox.hidden = !on; if (on) otherIn.focus(); }
  Array.prototype.forEach.call(f.querySelectorAll('input[name="amount"]'), function (r) { r.addEventListener('change', syncOther); });

  if (f.querySelector('.cf-turnstile') && !document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')) {
    var ts = document.createElement('script'); ts.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'; ts.async = true; ts.defer = true; document.head.appendChild(ts);
  }
  function resetTs() { if (window.turnstile && f.querySelector('.cf-turnstile')) try { window.turnstile.reset(f.querySelector('.cf-turnstile')); } catch (x) {} }

  function amount() {
    var r = f.querySelector('input[name="amount"]:checked');
    if (!r) return 0;
    if (r.value !== 'other') return Number(r.value);
    return Math.round(parseFloat(String(otherIn.value).replace(/[$,\s]/g, '')) * 100) / 100 || 0;
  }
  function check() {
    var bad = [];
    Array.prototype.forEach.call(f.querySelectorAll('input[required]'), function (el) {
      var no = !el.value.trim() || (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim()));
      el.setAttribute('aria-invalid', no ? 'true' : 'false'); if (no) bad.push(el);
    });
    var a = amount();
    if (!(a >= 1)) { var tgt = f.querySelector('[data-pl-other-pick]:checked') ? otherIn : f.querySelector('input[name="amount"]'); tgt.setAttribute('aria-invalid', 'true'); bad.push(tgt); }
    else otherIn.setAttribute('aria-invalid', 'false');
    return bad;
  }
  f.addEventListener('input', function (e) { if (e.target.getAttribute('aria-invalid') === 'true' && e.target.value.trim()) e.target.setAttribute('aria-invalid', 'false'); });

  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var bad = check();
    if (bad.length) { say(bad.length === 1 ? T('One answer is missing. We marked it in red.') : T('Some answers are missing. We marked them in red.'), 'error'); bad[0].focus(); return; }
    var hp = f.querySelector('[name="website"]');
    if ((hp && hp.value) || Date.now() - started < 3000) { say(T('Not sent. Please try again in a moment.'), 'error'); return; }
    if (f.querySelector('.cf-turnstile')) { var tok = f.querySelector('[name="cf-turnstile-response"]'); if (!tok || !tok.value) { say(T('Please complete the "I am human" check above the button.'), 'error'); return; } }
    var btn = f.querySelector('[type="submit"]');
    btn.disabled = true; say(T('Sending your pledge…'));
    var data = new FormData(f); data.delete('website');
    fetch(f.getAttribute('data-endpoint') + '/pledge', { method: 'POST', body: data, headers: { Accept: 'application/json' } })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (j) {
          if (!res.ok) { var er = new Error(j.error || ''); er.pub = !!j.error; throw er; }
          showTotals(j);
          var done = root.querySelector('[data-pl-done]');
          root.querySelector('[data-pl-mine]').textContent = money(j.amount || amount());
          f.reset(); f.hidden = true; done.hidden = false;
          var sh = document.querySelector('.pl-spread [data-pl-share]');
          if (sh) done.appendChild(sh.cloneNode(true)).querySelectorAll('[data-pl-share-msg]').forEach(function (m) { m.textContent = ''; });
          wireClone(done);
          done.focus(); window.scrollTo({ top: done.getBoundingClientRect().top + scrollY - 120, behavior: 'smooth' });
        });
      })
      .catch(function (er) { say(er && er.pub ? er.message : T("It didn't send. Please try again, or email hello@bentleysplayhouse.org."), 'error'); })
      .then(function () { btn.disabled = false; resetTs(); });
  });

  // the share buttons copied into the thank-you note need their own clicks
  function wireClone(scope) {
    var box = scope.querySelector('[data-pl-share]'); if (!box) return;
    var url = location.origin + location.pathname, msg = box.querySelector('[data-pl-share-msg]');
    box.querySelector('[data-pl-copy]').addEventListener('click', function () {
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { msg.textContent = T('Link copied! Paste it in your Stories, a post or a message.'); }, function () { window.prompt(T('Copy this link:'), url); });
    });
    var nat = box.querySelector('[data-pl-native]');
    if (navigator.share) nat.addEventListener('click', function () { navigator.share({ title: box.getAttribute('data-title'), url: url }).catch(function () {}); });
  }
})();
