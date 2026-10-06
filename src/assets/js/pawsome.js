/* Pawsome Pooches: profile pop-up, photo gallery, share, carousel arrows and filters. Every link still works without this file. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- gallery + share (inside a profile, wherever it is) ---------- */
  function wire(root) {
    $$('[data-pp-gallery]', root).forEach(function (g) {
      var main = $('[data-pp-main]', g);
      $$('.pp-thumb', g).forEach(function (t) {
        t.addEventListener('click', function () {
          if (main) main.src = t.getAttribute('data-src');
          $$('.pp-thumb', g).forEach(function (o) { o.setAttribute('aria-pressed', String(o === t)); });
        });
      });
    });
    $$('[data-pp-share]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        var slug = b.getAttribute('data-pp-share');
        var url = location.origin + '/pawsome-pooches/' + slug + '/';
        var status = b.parentNode.querySelector('.pp-share__status');
        var say = function (m) { if (status) { status.textContent = m; setTimeout(function () { status.textContent = ''; }, 4000); } };
        var title = b.getAttribute('data-title') + ' is looking for a home';
        if (navigator.share) { navigator.share({ title: title, url: url }).catch(function () {}); return; }
        if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { say('Link copied. Paste it anywhere to share.'); }, function () { say(url); });
        else say(url);
      });
    });
  }
  wire(document);

  /* ---------- pop-up profile ---------- */
  var dlg = $('[data-pp-dialog]');
  if (dlg && typeof dlg.showModal === 'function') {
    var body = $('[data-pp-body]', dlg), lastFocus = null, openSlug = null;
    function open(slug, push) {
      var tpl = document.getElementById('pp-tpl-' + slug);
      if (!tpl) return false;
      body.innerHTML = '';
      body.appendChild(tpl.content.cloneNode(true));
      var h = body.querySelector('[id^="pp-title-"]');
      if (h) dlg.setAttribute('aria-labelledby', h.id);
      wire(body);
      lastFocus = document.activeElement;
      dlg.showModal();
      body.scrollTop = 0;
      openSlug = slug;
      if (push) try { history.pushState({ pp: slug }, '', '#' + slug); } catch (e) { /* ignore */ }
      return true;
    }
    function close() { if (dlg.open) dlg.close(); }
    dlg.addEventListener('close', function () {
      if (openSlug && location.hash === '#' + openSlug) try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ }
      openSlug = null;
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    });
    $('[data-pp-close]', dlg).addEventListener('click', close);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('[data-pp-open]');
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
      if (open(a.getAttribute('data-pp-open'), true)) e.preventDefault();
    });
    window.addEventListener('popstate', function () { var s = location.hash.slice(1); if (s && document.getElementById('pp-tpl-' + s)) open(s, false); else close(); });
    var start = location.hash.slice(1);
    if (start && document.getElementById('pp-tpl-' + start)) open(start, false);
  }

  /* ---------- homepage carousel arrows ---------- */
  $$('[data-pp-rail]').forEach(function (rail) {
    var track = $('.pp-rail__track', rail), prev = $('[data-pp-prev]', rail), next = $('[data-pp-next]', rail);
    function step() { var c = track.querySelector('.pp-card'); return c ? c.getBoundingClientRect().width + 24 : 300; }
    function update() {
      var max = track.scrollWidth - track.clientWidth - 2;
      prev.disabled = track.scrollLeft <= 2; next.disabled = track.scrollLeft >= max;
      rail.classList.toggle('pp-rail--static', max <= 2);
    }
    prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
    next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
    track.addEventListener('scroll', update, { passive: true }); window.addEventListener('resize', update); update();
  });

  /* ---------- filters on the Pawsome Pooches page ---------- */
  var page = $('[data-pp-page]');
  if (page) {
    var cards = $$('[data-pp-grid] [data-pp-card]', page), countEl = $('[data-pp-count]', page), empty = $('[data-pp-empty]', page);
    var state = { loc: 'all', need: '', good: {} };
    function apply() {
      var n = 0;
      cards.forEach(function (c) {
        var needs = c.getAttribute('data-needs'), good = ' ' + c.getAttribute('data-good') + ' ';
        var ok = (state.loc === 'all' || c.getAttribute('data-loc') === state.loc) &&
          (!state.need || (state.need === 'foster' ? needs !== 'adoption' : needs !== 'foster')) &&
          Object.keys(state.good).every(function (k) { return !state.good[k] || good.indexOf(' ' + k + ' ') > -1; });
        c.hidden = !ok; if (ok) n++;
      });
      countEl.textContent = n; empty.hidden = n > 0;
    }
    $$('[data-pp-loc]', page).forEach(function (b) { b.addEventListener('click', function () { state.loc = b.getAttribute('data-pp-loc'); $$('[data-pp-loc]', page).forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); }); apply(); }); });
    $$('[data-pp-need]', page).forEach(function (b) { b.addEventListener('click', function () { var v = b.getAttribute('data-pp-need'); state.need = state.need === v ? '' : v; $$('[data-pp-need]', page).forEach(function (o) { o.setAttribute('aria-pressed', String(o.getAttribute('data-pp-need') === state.need)); }); apply(); }); });
    $$('[data-pp-good]', page).forEach(function (b) { b.addEventListener('click', function () { var k = b.getAttribute('data-pp-good'); state.good[k] = !state.good[k]; b.setAttribute('aria-pressed', String(!!state.good[k])); apply(); }); });
  }
})();
