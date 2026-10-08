var T = window.BP_T || function (s) { return s; };
/* Bentley's Playhouse — small, dependency-free enhancements. Every page works without this file. */
(function () {
  'use strict';
  var CFG = window.BP_CONFIG || { strings: {}, forms: {} };
  var S = CFG.strings || {};
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };

  /* ---------- mobile menu ---------- */
  var btn = $('.menu-btn'), nav = $('#site-nav');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('is-open', !open);
      if (!open) { var first = $('a', nav); if (first) first.focus(); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') {
        btn.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); btn.focus();
      }
    });
  }

  /* ---------- copy link / copy text / print ---------- */
  function status(el, msg) { var s = el.closest('header, section, div') && $('.copy-status'); if (s) { s.textContent = msg; setTimeout(function () { s.textContent = ''; }, 4000); } }
  function copy(text, el, okMsg) {
    var done = function () { status(el, okMsg); };
    var fail = function () { status(el, S.copyFailed || 'Copy failed'); };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(done, fail); }
      else fail();
    } catch (e) { fail(); }
  }
  $$('[data-copy-link]').forEach(function (b) {
    b.addEventListener('click', function () { copy(location.href.split('#')[0], b, S.copied || 'Link copied'); });
  });
  $$('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () { copy(b.getAttribute('data-copy'), b, T('Copied')); });
  });
  $$('[data-print]').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('details.acc').forEach(function (d) { d.setAttribute('data-was-open', d.open ? '1' : ''); d.open = true; });
      window.print();
    });
  });
  window.addEventListener('afterprint', function () {
    $$('details.acc[data-was-open]').forEach(function (d) { d.open = d.getAttribute('data-was-open') === '1'; });
  });
  // open an accordion if the URL points at it
  function openHash() { var id = location.hash.slice(1); if (!id) return; var el = document.getElementById(id); if (el && el.tagName === 'DETAILS') el.open = true; }
  openHash(); window.addEventListener('hashchange', openHash);

  /* ---------- library search + filters ---------- */
  var lib = $('[data-library]');
  if (lib) {
    var q = $('#lib-q', lib), area = $('#lib-area', lib), clear = $('.search__clear', lib);
    var chips = $$('.chip', lib), cards = $$('.rcard', lib), blocks = $$('[data-cat-block]', lib);
    var countEl = $('[data-count]', lib), labelEl = $('[data-count-label]', lib), empty = $('.lib-empty', lib);
    var topic = '';
    var norm = function (s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
    function apply(push) {
      var terms = norm(q.value).split(/\s+/).filter(Boolean);
      var a = area.value, shown = 0;
      cards.forEach(function (c) {
        var text = norm(c.getAttribute('data-search'));
        var ca = c.getAttribute('data-area');
        var okArea = !a || ca === a || (a === 'local' && ca === 'southFlorida');
        var ok = (!topic || c.getAttribute('data-cat') === topic) && okArea && terms.every(function (t) { return text.indexOf(t) > -1; });
        c.hidden = !ok; if (ok) shown++;
      });
      blocks.forEach(function (b) { b.hidden = !$$('.rcard:not([hidden])', b).length; });
      countEl.textContent = shown;
      labelEl.textContent = shown === 1 ? T('result') : T('results');
      empty.hidden = shown > 0;
      clear.hidden = !q.value;
      chips.forEach(function (ch) { ch.setAttribute('aria-pressed', String(ch.getAttribute('data-topic') === topic)); });
      if (push) {
        try {
          var u = new URL(location.href);
          q.value ? u.searchParams.set('q', q.value) : u.searchParams.delete('q');
          topic ? u.searchParams.set('topic', topic) : u.searchParams.delete('topic');
          a ? u.searchParams.set('area', a) : u.searchParams.delete('area');
          u.hash = topic ? 'topic-' + topic : '';
          history.replaceState(null, '', u);
        } catch (e) { /* not available in some frames */ }
      }
    }
    var t; q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { apply(true); }, 120); });
    area.addEventListener('change', function () { apply(true); });
    clear.addEventListener('click', function () { q.value = ''; apply(true); q.focus(); });
    chips.forEach(function (ch) { ch.addEventListener('click', function () { topic = ch.getAttribute('data-topic'); apply(true); }); });
    // initial state from ?q=&topic=&area= or #topic-xyz
    try {
      var p = new URL(location.href).searchParams;
      if (p.get('q')) q.value = p.get('q');
      if (p.get('topic')) topic = p.get('topic');
      if (p.get('area')) area.value = p.get('area');
    } catch (e) { /* ignore */ }
    var h = location.hash.match(/^#topic-([a-z-]+)$/); if (h) topic = h[1];
    if (q.value || topic || area.value) apply(false);
  }

  /* ---------- checklists (ticks saved in this browser only) ---------- */
  $$('[data-checklist]').forEach(function (list) {
    var key = 'bp-check-' + list.getAttribute('data-checklist');
    var boxes = $$('input[type="checkbox"]', list);
    var saved = store.get(key) || {};
    var doneEl = $('[data-done]', list), totalEl = $('[data-total]', list);
    function update() {
      var state = {}, n = 0;
      boxes.forEach(function (b) { if (b.checked) { state[b.getAttribute('data-key')] = 1; n++; } });
      doneEl.textContent = n; totalEl.textContent = boxes.length;
      return state;
    }
    boxes.forEach(function (b) { b.checked = !!saved[b.getAttribute('data-key')]; b.addEventListener('change', function () { store.set(key, update()); }); });
    var reset = $('[data-reset]', list);
    if (reset) reset.addEventListener('click', function () { boxes.forEach(function (b) { b.checked = false; }); store.del(key); update(); });
    update();
  });

  /* ---------- forms: real endpoint only, honeypot + timing check ---------- */
  $$('form[data-form]').forEach(function (form) {
    var started = Date.now();
    try { if (/[?&]topic=event\b/.test(location.search)) { var tp = form.querySelector('select[name="topic"]'); if (tp) { tp.value = 'A community event for the calendar'; var mg = form.querySelector('textarea[name="message"]'); if (mg && !mg.value) mg.placeholder = T('Event name, date, time, place, cost, who runs it and a link if there is one.'); } } } catch (e) {}
    var statusEl = $('.form__status', form);
    var route = '<a href="https://www.instagram.com/bentleysplayhouse/" target="_blank" rel="noopener">' + (CFG.preferredRoute || 'Instagram') + '</a>';
    function say(msg, kind) { msg = msg.replace('{email}', '<strong>' + (CFG.email || 'us on Instagram') + '</strong>'); statusEl.innerHTML = msg; statusEl.className = 'form__status' + (kind ? ' is-' + kind : ''); }
    // attachments: show what's picked, allow drag & drop, check size/type before sending
    var fileInput = form.querySelector('[data-files]'), fileList = form.querySelector('[data-file-list]'), picked = [];
    var OKTYPE = /^(application\/pdf|image\/(jpeg|png|webp|heic|heif))$/, OKEXT = /\.(pdf|jpe?g|png|webp|heic|heif)$/i;
    function kb(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
    function drawFiles() {
      if (!fileList) return;
      fileList.innerHTML = '';
      picked.forEach(function (f, i) {
        var li = document.createElement('li'); li.className = 'file-list__item';
        var nm = document.createElement('span'); nm.className = 'file-list__name'; nm.textContent = f.name;
        var sz = document.createElement('span'); sz.className = 'file-list__size'; sz.textContent = kb(f.size);
        var rm = document.createElement('button'); rm.type = 'button'; rm.className = 'file-list__rm'; rm.textContent = T('Remove'); rm.setAttribute('aria-label', T('Remove') + ' ' + f.name);
        rm.onclick = function () { picked.splice(i, 1); drawFiles(); };
        li.appendChild(nm); li.appendChild(sz); li.appendChild(rm); fileList.appendChild(li);
      });
    }
    function addFiles(list) {
      var bad = [];
      Array.prototype.forEach.call(list, function (f) {
        if (!(OKTYPE.test(f.type) || OKEXT.test(f.name))) bad.push('"' + f.name + '" ' + T("isn't a PDF or photo."));
        else if (f.size > 8 * 1048576) bad.push('"' + f.name + '" ' + T('is over 8 MB.'));
        else if (picked.length >= 3) bad.push(T('You can attach up to 3 files.'));
        else picked.push(f);
      });
      drawFiles(); say(bad.length ? bad[0] : '', bad.length ? 'error' : '');
    }
    if (fileInput) {
      fileInput.addEventListener('change', function () { addFiles(fileInput.files); fileInput.value = ''; });
      var drop = fileInput.closest('.file-drop');
      ['dragenter', 'dragover'].forEach(function (t) { drop.addEventListener(t, function (ev) { ev.preventDefault(); drop.classList.add('is-over'); }); });
      ['dragleave', 'drop'].forEach(function (t) { drop.addEventListener(t, function (ev) { ev.preventDefault(); drop.classList.remove('is-over'); }); });
      drop.addEventListener('drop', function (ev) { if (ev.dataTransfer && ev.dataTransfer.files) addFiles(ev.dataTransfer.files); });
    }
    if (form.querySelector('.cf-turnstile') && !document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')) {
      var ts = document.createElement('script'); ts.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'; ts.async = true; ts.defer = true; document.head.appendChild(ts);
    }
    function resetTs() { if (window.turnstile && form.querySelector('.cf-turnstile')) try { window.turnstile.reset(form.querySelector('.cf-turnstile')); } catch (x) {} }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.hasAttribute('data-disconnected')) { say((S['form.notConnected'] || '').replace('{route}', route), 'error'); return; }
      // validate
      var firstBad = null;
      $$('[required]', form).forEach(function (f) {
        var bad = f.type === 'checkbox' ? !f.checked : !f.value.trim() || (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value));
        f.setAttribute('aria-invalid', bad ? 'true' : 'false');
        if (bad && !firstBad) firstBad = f;
      });
      if (firstBad) { say(T('Please check the highlighted fields.'), 'error'); firstBad.focus(); return; }
      // spam checks: honeypot filled, or submitted faster than a person could type
      var hp = form.querySelector('[name="website"]');
      if ((hp && hp.value) || Date.now() - started < 3000) { say(S['form.spam'] || 'Not sent.', 'error'); return; }
      var tsBox = form.querySelector('.cf-turnstile');
      if (tsBox) { var tok = form.querySelector('[name="cf-turnstile-response"]'); if (!tok || !tok.value) { say(T('Please complete the "I am human" check above the Send button.'), 'error'); return; } }
      var btnEl = form.querySelector('[type="submit"]');
      btnEl.disabled = true; say(picked.length ? T('Sending your message and files…') : (S['form.sending'] || T('Sending…')));
      var data = new FormData(form); data.delete('website'); data.delete('_started'); data.delete('files');
      picked.forEach(function (f) { data.append('files', f, f.name); });
      fetch(form.getAttribute('data-endpoint'), { method: 'POST', body: data, headers: { Accept: 'application/json' } })
        .then(function (res) {
          if (!res.ok) return res.json().catch(function () { return {}; }).then(function (j) { var er = new Error(j.error || ''); er.pub = !!j.error; throw er; });
          form.reset(); picked = []; drawFiles(); say(S['form.sent'] || 'Sent.', 'ok');
        })
        .catch(function (er) { say(er && er.pub ? er.message.replace(/[<>]/g, '') : (S['form.error'] || 'Not sent.').replace('{route}', route), 'error'); })
        .then(function () { btnEl.disabled = false; resetTs(); });
    });
  });
})();

/* Instagram: latest posts from a Behold JSON feed (https://behold.so). Falls back to the static tiles. */
(function () {
  'use strict';
  var grid = document.querySelector('[data-ig-feed]');
  if (!grid || !window.fetch) return;
  // Sticky-note label: the post's first sentence when it's short, otherwise a friendly rotating label
  var LABELS = [T('Tap to read'), T('Playhouse life'), T('New pup news!'), T('Go say hi!'), T('Read the story'), T('Must see!')];
  function shortCap(c, i) {
    var t = String(c).split(/\n/)[0].replace(/[#@][\w.]+/g, '').replace(/\s+/g, ' ').trim();
    t = t.split(/(?<=[.!?])\s/)[0];
    return t && t.length <= 26 ? t : LABELS[i % LABELS.length];
  }

  fetch(grid.getAttribute('data-ig-feed'))
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) {
      var posts = (Array.isArray(data) ? data : data.posts || []).slice(0, 6);
      if (!posts.length) return;
      grid.innerHTML = '';
      grid.removeAttribute('aria-hidden');
      grid.classList.add('community__grid--feed');
      posts.forEach(function (p, i) {
        var src = (p.sizes && p.sizes.medium && p.sizes.medium.mediaUrl) || p.thumbnailUrl || p.mediaUrl;
        if (!src) return;
        var a = document.createElement('a');
        a.className = 'ig-post'; a.href = p.permalink; a.target = '_blank'; a.rel = 'noopener';
        var img = document.createElement('img');
        img.src = src; img.loading = 'lazy';
        var cap = (p.altText || p.prunedCaption || p.caption || T('Instagram post')).replace(/\s+/g, ' ').trim();
        img.alt = cap.length > 120 ? cap.slice(0, 117) + '…' : cap;
        var tape = document.createElement('span'); tape.className = 'ig-post__tape'; tape.setAttribute('aria-hidden', 'true');
        a.appendChild(tape);
        a.appendChild(img);
        var note = document.createElement('span'); note.className = 'ig-post__note'; note.setAttribute('aria-hidden', 'true');
        note.textContent = shortCap(p.prunedCaption || p.caption || '', i);
        if (note.textContent) a.appendChild(note);
        if (p.mediaType === 'VIDEO') { var b = document.createElement('span'); b.className = 'ig-post__badge'; b.textContent = T('Video'); a.appendChild(b); }
        var sr = document.createElement('span'); sr.className = 'visually-hidden'; sr.textContent = T(' (opens Instagram in a new tab)'); a.appendChild(sr);
        grid.appendChild(a);
      });
    })
    .catch(function () { /* keep the fallback tiles */ });
})();

/* Scroll-triggered entrance for [data-reveal] elements. Without JS (or with reduced motion) everything simply shows. */
(function () {
  'use strict';
  var els = document.querySelectorAll('[data-reveal]');
  if (!els.length || !('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('js-reveal');
  // children of a panel wait for the panel, then rise one after another
  // desktop: Rescue → Rehab → Rehome → Repeat rise in one by one once the top of their section reaches the top of the screen
  var mq = window.matchMedia ? window.matchMedia('(min-width: 821px)') : null;
  function deskSteps() { return !!(mq && mq.matches); }
  Array.prototype.forEach.call(document.querySelectorAll('[data-steps]'), function (list) {
    var sec = list.closest('section') || list;
    function check() {
      if (!deskSteps()) return;
      if (sec.getBoundingClientRect().top <= 1) {
        list.classList.add('steps-go');
        Array.prototype.forEach.call(list.querySelectorAll('[data-reveal]'), function (c) { c.classList.add('is-in'); });
        window.removeEventListener('scroll', check); window.removeEventListener('resize', check);
      }
    }
    requestAnimationFrame(function () { requestAnimationFrame(function () { list.classList.add('steps-armed'); }); });
    window.addEventListener('scroll', check, { passive: true }); window.addEventListener('resize', check); check();
  });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      Array.prototype.forEach.call(e.target.querySelectorAll('[data-reveal]'), function (c) { if (!(deskSteps() && c.closest('[data-steps]'))) c.classList.add('is-in'); });
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  Array.prototype.forEach.call(els, function (el) { if (!el.parentElement.closest('[data-reveal="panel"]')) io.observe(el); });
})();

/* Pin point for the stacked section: stick when its bottom reaches the bottom of the screen (works for tall sections on phones too). */
(function () {
  'use strict';
  var els = document.querySelectorAll('.stack > :first-child');
  if (!els.length) return;
  function set() { Array.prototype.forEach.call(els, function (el) { el.style.setProperty('--stick-top', Math.min(0, window.innerHeight - el.offsetHeight) + 'px'); }); }
  set(); window.addEventListener('resize', set);
})();

/* Donate: gift pop-up (and the same block on the Donate page). Without JS the nav button just opens /donate/. */
(function () {
  'use strict';
  function wireGift(g) {
    var go = g.querySelector('[data-gift-go]'), label = g.querySelector('[data-gift-label]');
    var tiers = Array.prototype.slice.call(g.querySelectorAll('.gift-tier'));
    var pays = Array.prototype.slice.call(g.querySelectorAll('[data-pay-tpl]'));
    function pick(t) {
      var amt = t.getAttribute('data-amount');
      tiers.forEach(function (o) { o.setAttribute('aria-checked', String(o === t)); });
      pays.forEach(function (a) { var tpl = a.getAttribute('data-pay-tpl'); if (tpl && tpl !== '#') a.href = amt ? tpl.replace('{amount}', amt) : a.getAttribute('data-pay-base'); });
      if (label) label.textContent = T('Donate') + (amt ? ' $' + amt : '') + (go && go.getAttribute('data-name') ? T(' with ') + go.getAttribute('data-name') : '');
    }
    tiers.forEach(function (t, i) {
      t.addEventListener('click', function () { pick(t); });
      t.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!d) return; e.preventDefault(); var n = tiers[(i + d + tiers.length) % tiers.length]; n.focus(); pick(n);
      });
    });
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-gift]'), wireGift);
  var dlg = document.querySelector('[data-donate-dialog]');
  if (!dlg || typeof dlg.showModal !== 'function') return;
  var last = null;
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-donate-open]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault(); last = document.activeElement; dlg.showModal();
    var on = dlg.querySelector('.gift-tier[aria-checked="true"]'); if (on) on.focus();
  });
  dlg.querySelector('[data-donate-close]').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', function () { if (last && last.focus) last.focus(); });
  if (location.hash === '#donate') dlg.showModal();
})();

/* Rescue stories polaroids: tap to flip to the story on the back */
(function () {
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-pol]');
    if (!b) return;
    var on = b.getAttribute('aria-pressed') === 'true';
    b.setAttribute('aria-pressed', String(!on));
  });
})();

/* Cookie choice: a small notice until the visitor picks; analytics loads only after "Accept". Also powers the Cookie Policy buttons. */
(function () {
  'use strict';
  if (typeof window.bpLoadGA !== 'function') return; // analytics not set up on this build
  var KEY = 'bp.cookies';
  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function clearGA() { document.cookie.split(';').forEach(function (c) { var n = c.split('=')[0].trim(); if (/^_ga/.test(n)) { ['', '; domain=' + location.hostname, '; domain=.' + location.hostname.replace(/^www\./, '')].forEach(function (d) { document.cookie = n + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + d; }); } }); }
  function choose(v) { set(v); if (v === 'yes') window.bpLoadGA(); else clearGA(); var b = document.querySelector('.cookie-note'); if (b) b.remove(); sync(); }
  function sync() { var st = document.querySelector('[data-cookie-status]'); if (!st) return; var v = get(); st.textContent = v === 'yes' ? T('You’re allowing analytics cookies.') : v === 'no' ? T('You’ve turned analytics cookies off.') : T('You haven’t made a choice yet.'); }
  document.addEventListener('click', function (e) { var t = e.target.closest('[data-cookie-choice]'); if (t) choose(t.getAttribute('data-cookie-choice')); });
  sync();
  if (get() || document.querySelector('[data-cookie-page]')) return;
  var base = (document.querySelector('link[rel="stylesheet"][href*="css/site.css"]') || {}).getAttribute ? document.querySelector('link[rel="stylesheet"][href*="css/site.css"]').getAttribute('href').replace(/assets\/css\/site\.css.*$/, '') : '/';
  var n = document.createElement('div');
  n.className = 'cookie-note'; n.setAttribute('role', 'region'); n.setAttribute('aria-label', T('Cookie choice'));
  n.innerHTML = '<p><svg class="doodle cookie-note__icon" width="28" height="28" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M38.6 24.3c.6 8.2-6.1 15.5-14.5 15.8C15.7 40.5 8.5 34 8.2 25.5 7.9 17 14.4 9.6 22.8 9.3c-.4 3.6 2.2 6.6 5.6 6.6.3 3.5 3.2 6.1 6.8 5.8.3 1.1 1.8 2.3 3.4 2.6z"/><path class="d-acc" stroke-width="4" d="M17 20.2v.1M25.5 27.2v.1M16.5 30.5v.1M30.8 31.9v.1M21.7 35.4v.1"/></svg> ' + T('We use a few analytics cookies to see which guides help people most. Nothing else, and never for ads.') + ' <a href="' + base + (window.BP_LANG === 'es' ? 'es/' : '') + 'cookies/">' + T('Cookie policy') + '</a></p><div class="cookie-note__btns"><button type="button" class="btn btn--primary btn--small" data-cookie-choice="yes">' + T('Accept') + '</button><button type="button" class="btn btn--ghost btn--small" data-cookie-choice="no">' + T('No thanks') + '</button></div>';
  document.body.appendChild(n);
})();
