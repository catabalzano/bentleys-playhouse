/* Pawsome Pooches "submit a pup" form: photo picker (resized in the browser), required checks, send to the submissions service. */
(function () {
  'use strict';
  var form = document.querySelector('[data-pps-form]');
  if (!form) return;
  var input = document.getElementById('pps-photos');
  var thumbs = form.querySelector('[data-pps-thumbs]');
  var status = form.querySelector('[data-pps-status]');
  var done = document.querySelector('[data-pps-done]');
  var org = form.querySelector('[data-pps-org]');
  var loc = document.getElementById('pps-loc');
  var MAX = 5, photos = []; // {blob, url, name}

  function say(msg, ok) { status.textContent = msg; status.className = 'form__status ' + (ok ? 'is-ok' : msg ? 'is-error' : ''); }

  // Show "name of the rescue" only when it applies
  function syncOrg() { var need = ['rescue', 'foster', 'other'].indexOf(loc.value) > -1; org.hidden = !need; org.querySelector('input').required = need; }
  loc.addEventListener('change', syncOrg); syncOrg();

  // Resize to max 1600px JPEG so uploads are quick on phones
  function shrink(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var max = 1600, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
        var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? resolve(b) : reject(new Error('convert')); }, 'image/jpeg', 0.86);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }
  function render() {
    thumbs.innerHTML = '';
    photos.forEach(function (p, i) {
      var li = document.createElement('li');
      li.innerHTML = '<img alt="Photo ' + (i + 1) + '"><span class="pps-thumbs__tag">' + (i ? (i + 1) : 'Main') + '</span><button type="button" aria-label="Remove photo ' + (i + 1) + '">✕</button>';
      li.querySelector('img').src = p.url;
      li.querySelector('button').addEventListener('click', function () { URL.revokeObjectURL(p.url); photos.splice(i, 1); render(); });
      thumbs.appendChild(li);
    });
    form.querySelector('.pps-drop strong').textContent = photos.length ? (photos.length < MAX ? 'Add more photos (' + photos.length + ' of ' + MAX + ')' : '5 photos added') : 'Tap to add photos';
    input.disabled = photos.length >= MAX;
  }
  input.addEventListener('change', function () {
    var files = Array.prototype.slice.call(input.files || []); input.value = '';
    var room = MAX - photos.length;
    if (files.length > room) say('You can add up to 5 photos. We kept the first ' + room + '.');
    else say('');
    files.slice(0, room).reduce(function (p, f) {
      return p.then(function () {
        return shrink(f).then(function (b) { photos.push({ blob: b, url: URL.createObjectURL(b), name: f.name }); render(); })
          .catch(function () { say('We couldn\'t read "' + f.name + '". Please use a JPG or PNG photo (on iPhone, share it from Photos as "Most Compatible").'); });
      });
    }, Promise.resolve());
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.action) return;
    form.querySelectorAll('[aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
    var bad = Array.prototype.filter.call(form.elements, function (el) { return el.willValidate && !el.checkValidity(); });
    if (!photos.length) { say('Please add at least one clear photo of the pup.'); input.focus(); return; }
    if (bad.length) {
      bad.forEach(function (el) { el.setAttribute('aria-invalid', 'true'); });
      say('Please fill in every field (only the shelter ID is optional).');
      bad[0].focus(); return;
    }
    var fd = new FormData(form);
    fd.delete('photos');
    photos.forEach(function (p, i) { fd.append('photos', p.blob, 'photo-' + (i + 1) + '.jpg'); });
    var btn = form.querySelector('button[type="submit"]'); btn.disabled = true;
    say('Sending… this can take a moment with photos.', true);
    fetch(form.action, { method: 'POST', body: fd }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok || !res.j.ok) throw new Error(res.j.error || 'Something went wrong.');
        form.hidden = true; done.hidden = false; done.focus(); window.scrollTo({ top: done.getBoundingClientRect().top + window.scrollY - 120, behavior: 'smooth' });
      })
      .catch(function (err) { say(err.message || 'We couldn\'t send that. Please check your connection and try again.'); btn.disabled = false; if (window.turnstile) try { window.turnstile.reset(); } catch (x) { /* ignore */ } });
  });

  if (form.querySelector('.cf-turnstile')) { var s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'; s.async = true; s.defer = true; document.head.appendChild(s); }
})();
