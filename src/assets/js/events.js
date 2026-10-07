/* Community calendar: mini month calendar + "Coming up" list */
(function () {
  var root = document.querySelector('[data-events]');
  var raw = document.getElementById('ev-data');
  if (!root || !raw) return;
  var D = JSON.parse(raw.textContent), CATS = D.cats, ALL = D.events;
  var DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var $ = function (s) { return root.querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var iso = function (y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); };
  var now = new Date(), TODAY = iso(now.getFullYear(), now.getMonth(), now.getDate());
  var state = { y: now.getFullYear(), m: now.getMonth(), day: null, cats: Object.keys(CATS) };
  var minKey = now.getFullYear() * 12 + now.getMonth(), maxKey = minKey + 12;

  // multi-day events cover each day from date to endDate
  function days(e) {
    var out = [], d = new Date(e.date + 'T12:00:00'), end = new Date((e.endDate || e.date) + 'T12:00:00'), n = 0;
    while (d <= end && n++ < 60) { out.push(iso(d.getFullYear(), d.getMonth(), d.getDate())); d.setDate(d.getDate() + 1); }
    return out;
  }
  var byDay = {};
  ALL.forEach(function (e) { days(e).forEach(function (k) { (byDay[k] = byDay[k] || []).push(e); }); });
  function on(k) { return (byDay[k] || []).filter(function (e) { return state.cats.indexOf(e.cat) > -1; }); }

  function drawCal() {
    var y = state.y, m = state.m, first = new Date(y, m, 1).getDay(), n = new Date(y, m + 1, 0).getDate(), html = '';
    $('[data-ev-month]').textContent = MONTHS[m] + ' ' + y;
    for (var i = 0; i < first; i++) html += '<span class="ev-day ev-day--blank"></span>';
    for (var d = 1; d <= n; d++) {
      var k = iso(y, m, d), es = on(k), cls = 'ev-day', st = '';
      if (k === TODAY) cls += ' is-today';
      if (k < TODAY) cls += ' is-past';
      if (es.length) {
        var c1 = CATS[es[0].cat], c2 = es.length > 1 && es[1].cat !== es[0].cat ? CATS[es[1].cat] : null;
        cls += ' has-ev'; st = ' style="--tint:' + c1.tint + ';--ink:' + c1.ink + (c2 ? ';--ring:' + c2.color : '') + '"';
        if (c2) cls += ' has-more';
      }
      if (state.day === k) cls += ' is-sel';
      var label = MONTHS[m] + ' ' + d + (es.length ? ', ' + es.length + (es.length > 1 ? ' events' : ' event') : '');
      html += es.length
        ? '<button type="button" class="' + cls + '"' + st + ' data-day="' + k + '" aria-label="' + esc(label) + '" aria-pressed="' + (state.day === k) + '">' + d + '</button>'
        : '<span class="' + cls + '" aria-label="' + esc(label) + '">' + d + '</span>';
    }
    $('[data-ev-grid]').innerHTML = html;
    var key = y * 12 + m;
    $('[data-ev-prev]').disabled = key <= minKey;
    $('[data-ev-next]').disabled = key >= maxKey;
  }

  function gcal(e) {
    var s = e.date.replace(/-/g, ''), endD = new Date((e.endDate || e.date) + 'T12:00:00'); endD.setDate(endD.getDate() + 1);
    var en = iso(endD.getFullYear(), endD.getMonth(), endD.getDate()).replace(/-/g, '');
    var details = [e.time && 'Time: ' + e.time, e.price && 'Cost: ' + e.price, e.link].filter(Boolean).join('\n');
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(e.title) + '&dates=' + s + '/' + en + '&details=' + encodeURIComponent(details) + '&location=' + encodeURIComponent([e.venue, e.address, e.city].filter(Boolean).join(', '));
  }
  function row(e) {
    var c = CATS[e.cat], d = new Date(e.date + 'T12:00:00'), where = [e.venue, e.address, e.address && e.city && e.address.toLowerCase().indexOf(e.city.toLowerCase()) > -1 ? '' : e.city].filter(Boolean).join(', ');
    var multi = e.endDate && e.endDate !== e.date ? ' – ' + MONTHS[new Date(e.endDate + 'T12:00:00').getMonth()].slice(0, 3) + ' ' + new Date(e.endDate + 'T12:00:00').getDate() : '';
    return '<li class="ev-item" style="--c:' + c.color + ';--ink:' + c.ink + ';--tint:' + c.tint + '">' +
      '<div class="ev-item__date"><span>' + DOW[d.getDay()].slice(0, 3) + '</span><b>' + d.getDate() + '</b><span>' + MONTHS[d.getMonth()].slice(0, 3) + '</span></div>' +
      '<div class="ev-item__bar"></div>' +
      '<div class="ev-item__body"><h3 class="ev-item__h">' + esc(e.title) + '</h3>' +
      '<p class="ev-item__meta">' + [e.time, e.city || e.venue].filter(Boolean).map(esc).join(' · ') + (multi ? ' · until' + esc(multi.slice(2)) : '') + (e.price ? ' · <b class="' + (/^free/i.test(e.price) ? 'is-free' : '') + '">' + esc(e.price) + '</b>' : '') + '</p>' +
      '<details class="ev-more"><summary>Details <span aria-hidden="true">→</span></summary><div class="ev-more__in">' +
        '<span class="ev-cat" style="background:' + c.tint + ';color:' + c.ink + '">' + esc(c.label) + '</span>' +
        (e.desc ? '<div class="ev-more__desc">' + e.desc + '</div>' : '') +
        '<dl class="ev-more__dl">' + (where ? '<div><dt>Where</dt><dd>' + esc(where) + ' · <a href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(where) + '" target="_blank" rel="noopener">Map</a></dd></div>' : '') +
        (e.time ? '<div><dt>When</dt><dd>' + DOW[d.getDay()] + ', ' + MONTHS[d.getMonth()] + ' ' + d.getDate() + esc(multi) + ' · ' + esc(e.time) + '</dd></div>' : '') +
        (e.price ? '<div><dt>Cost</dt><dd>' + esc(e.price) + '</dd></div>' : '') +
        (e.organizer ? '<div><dt>Hosted by</dt><dd>' + esc(e.organizer) + '</dd></div>' : '') + '</dl>' +
        '<div class="ev-more__btns">' + (e.link ? '<a class="btn btn--primary btn--small" href="' + esc(e.link) + '" target="_blank" rel="noopener">Event page<span class="visually-hidden"> (opens in a new tab)</span></a>' : '') +
        '<a class="btn btn--ghost btn--small" href="' + gcal(e) + '" target="_blank" rel="noopener">Add to Google Calendar<span class="visually-hidden"> (opens in a new tab)</span></a></div>' +
      '</div></details></div></li>';
  }

  function drawList() {
    var list, head, y = state.y, m = state.m, all = $('[data-ev-all]');
    if (state.day) {
      list = on(state.day);
      var d = new Date(state.day + 'T12:00:00');
      head = DOW[d.getDay()] + ', ' + MONTHS[d.getMonth()] + ' ' + d.getDate();
      all.hidden = false;
    } else {
      var a = iso(y, m, 1), b = iso(y, m, new Date(y, m + 1, 0).getDate()), from = a < TODAY ? TODAY : a;
      list = ALL.filter(function (e) { return state.cats.indexOf(e.cat) > -1 && (e.endDate || e.date) >= from && e.date <= b; });
      head = (y * 12 + m === minKey ? 'Coming up in ' : '') + MONTHS[m] + (y !== now.getFullYear() ? ' ' + y : '');
      all.hidden = true;
    }
    $('[data-ev-heading]').textContent = head;
    var html = list.map(row).join('');
    if (!html) {
      var next = ALL.filter(function (e) { return state.cats.indexOf(e.cat) > -1 && e.date > iso(y, m, 31); })[0];
      html = '<li class="ev-empty">' + (state.cats.length ? 'No events listed for ' + MONTHS[m] + ' yet.' : 'Pick at least one kind of event to see the list.') +
        (next && state.cats.length ? ' <button type="button" class="ev-link" data-jump="' + next.date + '">Next event: ' + esc(next.title) + ' →</button>' : '') + '</li>';
    }
    $('[data-ev-list]').innerHTML = html;
  }
  function draw() { drawCal(); drawList(); }

  root.addEventListener('click', function (ev) {
    var t = ev.target.closest('button'); if (!t || !root.contains(t)) return;
    if (t.hasAttribute('data-day')) { var k = t.getAttribute('data-day'); state.day = state.day === k ? null : k; draw(); var f = root.querySelector('[data-day="' + k + '"]'); if (f) f.focus(); return; }
    if (t.hasAttribute('data-ev-prev') || t.hasAttribute('data-ev-next')) {
      var dm = t.hasAttribute('data-ev-prev') ? -1 : 1, key = state.y * 12 + state.m + dm;
      if (key < minKey || key > maxKey) return;
      state.y = Math.floor(key / 12); state.m = key % 12; state.day = null; draw(); return;
    }
    if (t.hasAttribute('data-ev-all')) { state.day = null; draw(); return; }
    if (t.hasAttribute('data-jump')) { var j = new Date(t.getAttribute('data-jump') + 'T12:00:00'); state.y = j.getFullYear(); state.m = j.getMonth(); state.day = null; draw(); }
  });
  root.addEventListener('change', function (ev) {
    if (!ev.target.matches('[data-ev-cat]')) return;
    state.cats = Array.prototype.map.call(root.querySelectorAll('[data-ev-cat]:checked'), function (x) { return x.value; });
    draw();
  });
  draw();
})();
