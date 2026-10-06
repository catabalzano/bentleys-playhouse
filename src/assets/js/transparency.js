/* Transparency ledger: filters recalculate totals and the category chart. */
(function () {
  'use strict';
  var root = document.querySelector('[data-fin]');
  if (!root) return;
  var $ = function (s) { return root.querySelector(s); };
  var rows = Array.prototype.slice.call(root.querySelectorAll('tbody tr'));
  var bars = Array.prototype.slice.call(root.querySelectorAll('[data-bars] .bar'));
  var usd = function (n) { return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }); };
  var year = $('#fin-year'), type = $('#fin-type'), cat = $('#fin-cat'), q = $('#fin-q');
  function apply() {
    var terms = q.value.toLowerCase().split(/\s+/).filter(Boolean);
    var tin = 0, tout = 0, n = 0, rc = 0, byCat = {};
    rows.forEach(function (r) {
      var d = r.dataset;
      var ok = (!year.value || d.year === year.value) && (!type.value || d.type === type.value) && (!cat.value || d.cat === cat.value) &&
        terms.every(function (t) { return d.search.indexOf(t) > -1; });
      r.hidden = !ok;
      if (!ok) return;
      var amt = parseFloat(d.amount); n++; if (d.receipt === '1') rc++;
      if (d.type === 'income') tin += amt; else { tout += amt; byCat[d.cat] = (byCat[d.cat] || 0) + amt; }
    });
    $('[data-in]').textContent = usd(tin); $('[data-out]').textContent = usd(tout);
    $('[data-count]').textContent = n; $('[data-receipts]').textContent = rc;
    var max = 0; Object.keys(byCat).forEach(function (k) { max = Math.max(max, byCat[k]); });
    var list = $('[data-bars]'), any = false;
    bars.sort(function (a, b) { return (byCat[b.dataset.cat] || 0) - (byCat[a.dataset.cat] || 0); }).forEach(function (b) {
      var v = byCat[b.dataset.cat] || 0;
      b.hidden = !v; if (v) any = true;
      b.querySelector('.bar__fill').style.width = (max ? v / max * 100 : 0).toFixed(1) + '%';
      b.querySelector('.bar__value').textContent = usd(v);
      b.title = b.querySelector('.bar__label').textContent + ': ' + usd(v);
      list.appendChild(b);
    });
    $('.bars-empty').hidden = any;
    $('[data-fin-status]').textContent = n === rows.length ? '' : 'Showing ' + n + ' of ' + rows.length + ' entries';
  }
  [year, type, cat].forEach(function (el) { el.addEventListener('change', apply); });
  q.addEventListener('input', apply);
})();
