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
    b.addEventListener('click', function () { copy(b.getAttribute('data-copy'), b, 'Copied'); });
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
      labelEl.textContent = shown === 1 ? 'result' : 'results';
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
    var statusEl = $('.form__status', form);
    var route = '<a href="https://www.instagram.com/bentleysplayhouse/" target="_blank" rel="noopener">' + (CFG.preferredRoute || 'Instagram') + '</a>';
    function say(msg, kind) { msg = msg.replace('{email}', '<strong>' + (CFG.email || 'us on Instagram') + '</strong>'); statusEl.innerHTML = msg; statusEl.className = 'form__status' + (kind ? ' is-' + kind : ''); }
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
      if (firstBad) { say('Please check the highlighted fields.', 'error'); firstBad.focus(); return; }
      // spam checks: honeypot filled, or submitted faster than a person could type
      var hp = form.querySelector('[name="website"]');
      if ((hp && hp.value) || Date.now() - started < 3000) { say(S['form.spam'] || 'Not sent.', 'error'); return; }
      var btnEl = form.querySelector('[type="submit"]');
      btnEl.disabled = true; say(S['form.sending'] || 'Sending…');
      var data = new FormData(form); data.delete('website'); data.delete('_started');
      fetch(form.getAttribute('data-endpoint'), { method: 'POST', body: data, headers: { Accept: 'application/json' } })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          form.reset(); say(S['form.sent'] || 'Sent.', 'ok');
        })
        .catch(function () { say((S['form.error'] || 'Not sent.').replace('{route}', route), 'error'); })
        .then(function () { btnEl.disabled = false; });
    });
  });
})();

/* Instagram: latest posts from a Behold JSON feed (https://behold.so). Falls back to the static tiles. */
(function () {
  'use strict';
  var grid = document.querySelector('[data-ig-feed]');
  if (!grid || !window.fetch) return;
  fetch(grid.getAttribute('data-ig-feed'))
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) {
      var posts = (Array.isArray(data) ? data : data.posts || []).slice(0, 6);
      if (!posts.length) return;
      grid.innerHTML = '';
      grid.removeAttribute('aria-hidden');
      grid.classList.add('community__grid--feed');
      posts.forEach(function (p) {
        var src = (p.sizes && p.sizes.medium && p.sizes.medium.mediaUrl) || p.thumbnailUrl || p.mediaUrl;
        if (!src) return;
        var a = document.createElement('a');
        a.className = 'ig-post'; a.href = p.permalink; a.target = '_blank'; a.rel = 'noopener';
        var img = document.createElement('img');
        img.src = src; img.loading = 'lazy';
        var cap = (p.altText || p.prunedCaption || p.caption || 'Instagram post').replace(/\s+/g, ' ').trim();
        img.alt = cap.length > 120 ? cap.slice(0, 117) + '…' : cap;
        a.appendChild(img);
        if (p.mediaType === 'VIDEO') { var b = document.createElement('span'); b.className = 'ig-post__badge'; b.textContent = 'Video'; a.appendChild(b); }
        var sr = document.createElement('span'); sr.className = 'visually-hidden'; sr.textContent = ' (opens Instagram in a new tab)'; a.appendChild(sr);
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
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      Array.prototype.forEach.call(e.target.querySelectorAll('[data-reveal]'), function (c) { c.classList.add('is-in'); });
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  Array.prototype.forEach.call(els, function (el) { if (!el.parentElement.closest('[data-reveal="panel"]')) io.observe(el); });
})();
