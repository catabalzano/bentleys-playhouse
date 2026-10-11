var T = window.BP_T || function (s) { return s; };
/* Community Calendar "Add an event": partners enter their access code, then send an event for review. */
(function () {
  'use strict';
  var box = document.querySelector('[data-evadd]');
  if (!box) return;
  var API = box.getAttribute('data-api');
  var codeForm = box.querySelector('[data-evadd-code]'), form = box.querySelector('[data-evadd-form]'), done = box.querySelector('[data-evadd-done]');
  var codeStatus = box.querySelector('[data-evadd-codestatus]'), status = box.querySelector('[data-evadd-status]');
  var KEY = 'bp.eventCode', code = '';
  function store(v) { try { if (v) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY); } catch (e) {} }
  function saved() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function say(el, msg, ok) { el.textContent = msg; el.className = 'form__status ' + (ok ? 'is-ok' : msg ? 'is-error' : ''); }
  function post(path, body) {
    return fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || T('Something went wrong. Please try again.')); return j; }); });
  }
  function open(name) {
    codeForm.hidden = true; done.hidden = true; form.hidden = false;
    box.querySelector('[data-evadd-hi]').textContent = T('Hi') + ' ' + name + '! ' + T('Tell us about your event.');
    form.querySelector('input[name="title"]').focus();
  }
  function check(c, quiet) {
    var btn = codeForm.querySelector('button'); btn.disabled = true;
    if (!quiet) say(codeStatus, T('Checking…'));
    return post('/events/check', { code: c }).then(function (j) { code = c; store(c); say(codeStatus, ''); open(j.org || j.name); })
      .catch(function (e) { store(''); if (!quiet) say(codeStatus, e.message); })
      .then(function () { btn.disabled = false; });
  }
  codeForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var c = codeForm.querySelector('input').value.trim();
    if (!c) { say(codeStatus, T('Please enter your access code.')); return; }
    check(c);
  });
  if (saved()) { codeForm.querySelector('input').value = saved(); check(saved(), true); }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(form), data = { code: code };
    fd.forEach(function (v, k) { data[k] = String(v).trim(); });
    var miss = [];
    [['title', 'event name'], ['category', 'kind of event'], ['date', 'date'], ['time', 'time'], ['venue', 'place name'], ['city', 'city'], ['description', 'description']].forEach(function (x) { if (!data[x[0]]) miss.push(T(x[1])); });
    form.querySelectorAll('[aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
    ['title', 'date', 'time', 'venue', 'city', 'description'].forEach(function (k) { if (!data[k]) { var el = form.querySelector('[name="' + k + '"]'); if (el) el.setAttribute('aria-invalid', 'true'); } });
    if (miss.length) { say(status, T('Please add:') + ' ' + miss.join(', ') + '.'); return; }
    if (data.endDate && data.endDate < data.date) { say(status, T('The last day has to be after the first day.')); return; }
    var btn = form.querySelector('button[type="submit"]'); btn.disabled = true; say(status, T('Sending…'));
    post('/events/submit', data).then(function () {
      form.reset(); form.hidden = true; done.hidden = false; done.focus(); say(status, '');
      if (window.bpTrack) window.bpTrack('event_partner_submit');
    }).catch(function (err) { say(status, err.message); }).then(function () { btn.disabled = false; });
  });
  box.querySelector('[data-evadd-again]').addEventListener('click', function () { open(''); box.querySelector('[data-evadd-hi]').textContent = T('Tell us about your next event.'); });
})();
