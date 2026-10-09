var T = window.BP_T || function (s) { return s; };
/* "Mark as adopted" page: the link in the "your listing is live" email brings people here. Asks first, then updates the listing. */
(function () {
  'use strict';
  var box = document.querySelector('[data-ad]'); if (!box) return;
  var q = new URLSearchParams(location.search), pup = q.get('pup') || '', code = q.get('code') || '', name = (q.get('name') || '').slice(0, 60);
  var status = box.querySelector('[data-ad-status]'), ask = box.querySelector('[data-ad-ask]'), done = box.querySelector('[data-ad-done]');
  if (name) {
    document.querySelector('[data-ad-title]').textContent = T('Did {name} Find a Home?').replace('{name}', name);
    document.querySelector('[data-ad-lede]').textContent = T('Tap the button to mark {name} as adopted on Pawsome Pooches. We\'ll update the listing right away.').replace('{name}', name);
    box.querySelector('[data-ad-btn]').textContent = T('Yes, {name} Was Adopted!').replace('{name}', name);
  }
  if (!pup || !code) { ask.hidden = true; status.className = 'form__status is-error'; status.textContent = T('This link is incomplete. Please use the button in your email.'); return; }
  box.querySelector('[data-ad-go]').addEventListener('click', function () {
    var b = this; b.disabled = true; status.className = 'form__status is-ok'; status.textContent = T('Updating the listing…');
    fetch(box.getAttribute('data-endpoint') + '/adopted', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pup: pup, code: code }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok || !res.j.ok) throw new Error(res.j.error || T('Something went wrong.'));
        var n = res.j.name || name;
        ask.hidden = true; status.textContent = ''; done.hidden = false; done.focus();
        if (n) {
          done.querySelector('[data-ad-done-h]').textContent = T('Congratulations, {name}!').replace('{name}', n);
          done.querySelector('[data-ad-done-p]').textContent = res.j.already ? T('{name} is already marked as adopted. Thank you!').replace(/\{name\}/g, n) : T('Thank you for helping {name} find a home. In a minute or two, the listing will say Adopted.').replace(/\{name\}/g, n);
        }
        if (window.bpTrack) window.bpTrack('pup_marked_adopted', { pup: pup });
      })
      .catch(function (e) { status.className = 'form__status is-error'; status.textContent = e.message; b.disabled = false; });
  });
})();
