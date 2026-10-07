var T = window.BP_T || function (s) { return s; };
/* Vet clinic directory: "open now" status (Miami time), today's hours, and filters. */
(function () {
  'use strict';
  var root = document.querySelector('[data-clinics]');
  if (!root) return;
  var KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  var NAMES = { sun: T('Sun'), mon: T('Mon'), tue: T('Tue'), wed: T('Wed'), thu: T('Thu'), fri: T('Fri'), sat: T('Sat') };
  function miamiNow() {
    try {
      var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
      var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
      return { day: o.weekday.slice(0, 3).toLowerCase(), mins: parseInt(o.hour, 10) * 60 + parseInt(o.minute, 10) };
    } catch (e) { var d = new Date(); return { day: KEYS[d.getDay()], mins: d.getHours() * 60 + d.getMinutes() }; }
  }
  var toMin = function (hm) { var p = hm.split(':'); return +p[0] * 60 + +p[1]; };
  function fmt(hm) { var p = hm.split(':'), h = +p[0], m = +p[1], ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + (m ? ':' + String(m).padStart(2, '0') : '') + ' ' + ap; }
  function status(hours, now) {
    if (hours === '24/7') return { open: true, text: T('Open 24/7') };
    var today = hours[now.day] || [];
    for (var i = 0; i < today.length; i++) {
      var a = toMin(today[i][0]), b = toMin(today[i][1]);
      if (now.mins >= a && now.mins < b) return { open: true, text: T('Open now · until ') + fmt(today[i][1]) };
      if (now.mins < a) return { open: false, text: T('Closed now · opens ') + fmt(today[i][0]) + T(' today') };
    }
    var idx = KEYS.indexOf(now.day);
    for (var d = 1; d <= 7; d++) {
      var k = KEYS[(idx + d) % 7];
      if ((hours[k] || []).length) return { open: false, text: T('Closed now · opens ') + (d === 1 ? T('tomorrow') : NAMES[k]) + ' ' + fmt(hours[k][0][0]) };
    }
    return { open: false, text: T('Closed') };
  }
  var cards = Array.prototype.slice.call(root.querySelectorAll('.clinic'));
  function refresh() {
    var now = miamiNow();
    cards.forEach(function (c) {
      var h; try { h = JSON.parse(c.getAttribute('data-hours')); } catch (e) { return; }
      var st = status(h, now);
      c.setAttribute('data-open', st.open ? '1' : '0');
      var el = c.querySelector('[data-status]');
      el.innerHTML = '<span class="status status--' + (st.open ? 'open' : 'closed') + '">' + st.text + '</span>';
      var row = c.querySelector('tr[data-day="' + now.day + '"]');
      c.querySelectorAll('tr.is-today').forEach(function (r) { r.classList.remove('is-today'); });
      if (row) row.classList.add('is-today');
    });
  }
  refresh(); setInterval(refresh, 60000);

  var chips = Array.prototype.slice.call(root.querySelectorAll('[data-filter]'));
  var statusEl = root.querySelector('[data-clinic-status]');
  var empty = root.querySelector('.clinic-empty');
  chips.forEach(function (ch) {
    ch.addEventListener('click', function () {
      var f = ch.getAttribute('data-filter'), shown = 0;
      chips.forEach(function (x) { x.setAttribute('aria-pressed', String(x === ch)); });
      cards.forEach(function (c) {
        var ok = f === 'all' || (f === 'emergency' && c.dataset.kind === 'emergency') || (f === 'clinic' && c.dataset.kind === 'clinic') ||
          (f === 'walkin' && c.dataset.walkin === 'yes') || (f === 'open' && c.dataset.open === '1');
        c.hidden = !ok; if (ok) shown++;
      });
      root.querySelectorAll('.clinic-group').forEach(function (g) { var cs = g.querySelectorAll('.clinic'); if (cs.length) g.hidden = !g.querySelector('.clinic:not([hidden])'); });
      statusEl.textContent = f === 'all' ? '' : shown + (shown === 1 ? T(' clinic') : T(' clinics')) + (f === 'open' ? T(' open right now (Miami time)') : '');
      empty.hidden = shown > 0;
    });
  });
})();
