/* Submit a tip: anonymous switch, MDAS fields, file limits, checks, sending. */
(function () {
  'use strict';
  var T = window.BP_T || function (s) { return s; };
  var f = document.querySelector('form[data-tip]');
  if (!f) return;
  var statusEl = f.querySelector('.form__status'), started = Date.now();
  function say(msg, cls) { statusEl.textContent = msg; statusEl.className = 'form__status' + (cls ? ' is-' + cls : ''); }
  var $$ = function (s) { return Array.prototype.slice.call(f.querySelectorAll(s)); };

  // anonymous: contact optional, no credit, extra statement
  var anon = f.querySelector('[data-anon]');
  function syncAnon() {
    var on = anon.checked;
    $$('[data-contact]').forEach(function (i) { i.required = !on; });
    $$('[data-req-label]').forEach(function (s) { s.hidden = on; });
    $$('[data-anon-only]').forEach(function (d) { d.hidden = !on; var c = d.querySelector('input'); if (c) c.required = on; });
    $$('input[name="credit"]').forEach(function (r, i) { r.disabled = on; if (on && i === 1) r.checked = true; });
    f.querySelector('[data-credit-note]').hidden = !on;
  }
  anon.addEventListener('change', syncAnon); syncAnon();

  // MDAS negligence: show shelter + animal ID
  function syncMdas() { var yes = !!f.querySelector('input[name="mdas"][value="Yes"]:checked'); $$('[data-mdas-only]').forEach(function (d) { d.hidden = !yes; }); }
  $$('input[name="mdas"]').forEach(function (r) { r.addEventListener('change', syncMdas); }); syncMdas();

  // files: PDFs (5) and photos (3), 10 MB each
  var picked = { docs: [], photos: [] };
  var RULES = { docs: { max: 5, ok: function (x) { return /pdf$/i.test(x.type) || /\.pdf$/i.test(x.name); }, bad: T("isn't a PDF.") }, photos: { max: 3, ok: function (x) { return /^image\/(jpeg|png|webp|heic|heif)$/.test(x.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(x.name); }, bad: T("isn't a photo.") } };
  ['docs', 'photos'].forEach(function (k) {
    var input = f.querySelector('input[name="' + k + '"]'), drop = input.closest('.file-drop');
    var list = document.createElement('ul'); list.className = 'file-list'; list.setAttribute('role', 'list'); drop.parentNode.insertBefore(list, drop.nextSibling);
    function draw() {
      list.innerHTML = '';
      picked[k].forEach(function (x, i) {
        var li = document.createElement('li'); li.className = 'file-list__item';
        li.innerHTML = '<span class="file-list__name"></span><span class="file-list__size"></span><button type="button" class="file-list__rm"></button>';
        li.children[0].textContent = x.name; li.children[1].textContent = x.size > 1048576 ? (x.size / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(x.size / 1024)) + ' KB';
        li.children[2].textContent = T('Remove'); li.children[2].onclick = function () { picked[k].splice(i, 1); draw(); };
        list.appendChild(li);
      });
    }
    function add(files) {
      var msg = '';
      Array.prototype.forEach.call(files, function (x) {
        if (!RULES[k].ok(x)) msg = '"' + x.name + '" ' + RULES[k].bad;
        else if (x.size > 10 * 1048576) msg = '"' + x.name + '" ' + T('is over 10 MB.');
        else if (picked[k].length >= RULES[k].max) msg = k === 'docs' ? T('You can attach up to 5 PDFs.') : T('You can attach up to 3 photos.');
        else picked[k].push(x);
      });
      draw(); say(msg, msg ? 'error' : '');
    }
    input.addEventListener('change', function () { add(input.files); input.value = ''; });
    ['dragenter', 'dragover'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('is-over'); }); });
    ['dragleave', 'drop'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove('is-over'); }); });
    drop.addEventListener('drop', function (e) { if (e.dataTransfer) add(e.dataTransfer.files); });
  });

  if (f.querySelector('.cf-turnstile') && !document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')) {
    var ts = document.createElement('script'); ts.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'; ts.async = true; ts.defer = true; document.head.appendChild(ts);
  }
  function resetTs() { if (window.turnstile && f.querySelector('.cf-turnstile')) try { window.turnstile.reset(f.querySelector('.cf-turnstile')); } catch (x) {} }

  function check() {
    var bad = [];
    $$('input[required], textarea[required]').forEach(function (el) {
      if (el.type === 'radio') return;
      if (el.closest('[hidden]')) return;
      var no = el.type === 'checkbox' ? !el.checked : !el.value.trim() || (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()));
      el.setAttribute('aria-invalid', no ? 'true' : 'false'); if (no) bad.push(el);
    });
    var em = f.querySelector('input[name="email"]');
    if (em.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value.trim())) { em.setAttribute('aria-invalid', 'true'); bad.push(em); }
    ['mdas', 'called311', 'called911', 'canPost', 'credit'].forEach(function (n) {
      var fs = f.querySelector('input[name="' + n + '"]').closest('fieldset');
      var no = !f.querySelector('input[name="' + n + '"]:checked');
      fs.classList.toggle('is-bad', no); if (no) bad.push(fs.querySelector('input'));
    });
    bad.sort(function (a, b) { return a.compareDocumentPosition(b) & 4 ? -1 : 1; });
    return bad;
  }
  f.addEventListener('change', function (e) { var fs = e.target.closest && e.target.closest('fieldset.is-bad'); if (fs && fs.querySelector('input:checked')) fs.classList.remove('is-bad'); });

  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var bad = check();
    if (bad.length) { say(bad.length === 1 ? T('One answer is missing. We marked it in red.') : T('Some answers are missing. We marked them in red.') + ' (' + bad.length + ')', 'error'); bad[0].focus(); bad[0].scrollIntoView({ block: 'center' }); return; }
    var hp = f.querySelector('[name="website"]');
    if ((hp && hp.value) || Date.now() - started < 5000) { say(T('Not sent. Please try again in a moment.'), 'error'); return; }
    if (f.querySelector('.cf-turnstile')) { var tok = f.querySelector('[name="cf-turnstile-response"]'); if (!tok || !tok.value) { say(T('Please complete the "I am human" check above the Send button.'), 'error'); return; } }
    var btn = f.querySelector('[type="submit"]');
    btn.disabled = true; say(picked.docs.length + picked.photos.length ? T('Sending your tip and files…') : T('Sending your tip…'));
    var data = new FormData(f); data.delete('website'); data.delete('docs'); data.delete('photos');
    picked.docs.forEach(function (x) { data.append('docs', x, x.name); });
    picked.photos.forEach(function (x) { data.append('photos', x, x.name); });
    fetch(f.getAttribute('data-endpoint'), { method: 'POST', body: data, headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (!res.ok) return res.json().catch(function () { return {}; }).then(function (j) { var er = new Error(j.error || ''); er.pub = !!j.error; throw er; });
        f.reset(); f.hidden = true; var done = document.querySelector('[data-tip-done]'); done.hidden = false; done.focus(); window.scrollTo({ top: done.getBoundingClientRect().top + scrollY - 120 });
      })
      .catch(function (er) { say(er && er.pub ? er.message : T("It didn't send. Please try again, or email hello@bentleysplayhouse.org."), 'error'); })
      .then(function () { btn.disabled = false; resetTs(); });
  });
})();
