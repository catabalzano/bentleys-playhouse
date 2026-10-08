var T = window.BP_T || function (s) { return s; };
/* Lost & found flyer builder. Everything happens in this browser tab: the photo is never uploaded. */
(function () {
  'use strict';
  var root = document.querySelector('[data-flyer]');
  if (!root) return;
  var $ = function (s) { return root.querySelector(s); };
  var sheet = $('#flyer-sheet');
  var els = {
    kind: root.querySelectorAll('input[name="kind"]'), photo: $('#f-photo'), name: $('#f-name'), desc: $('#f-desc'),
    temper: $('#f-temper'), where: $('#f-where'), when: $('#f-when'),
    cPhone: $('#c-phone'), fPhone: $('#f-phone'), cText: $('#c-text'), cEmail: $('#c-email'), fEmail: $('#f-email'), cOther: $('#c-other'), fOther: $('#f-other')
  };
  var out = {
    band: sheet.querySelector('.flyer__kind'), img: sheet.querySelector('.flyer__photo img'), noPhoto: sheet.querySelector('.flyer__nophoto'),
    name: sheet.querySelector('.flyer__name'), desc: sheet.querySelector('.flyer__desc'), temper: sheet.querySelector('.flyer__temper'),
    where: sheet.querySelector('.flyer__where'), when: sheet.querySelector('.flyer__when'), whenL: sheet.querySelector('.flyer__when-l'), contact: sheet.querySelector('.flyer__contact')
  };
  var statusEl = root.querySelector('.flyer-status');
  var removeBtn = root.querySelector('[data-remove-photo]');
  var warn = root.querySelector('[data-address-warn]');
  var photoURL = null, photoImg = null;

  // default date = today
  try { els.when.value = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10); } catch (e) { /* ignore */ }

  var TEMPER = { shy: T("Shy: please don't chase. Call with the location."), friendly: T('Friendly. May come to you.'), meds: T('Needs daily medication.') };
  function kind() { for (var i = 0; i < els.kind.length; i++) if (els.kind[i].checked) return els.kind[i].value; return 'lost'; }
  var AP = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
  function fmtDate(v) { if (!v) return ''; var d = new Date(v + 'T12:00:00'); if (isNaN(d)) return v; return window.BP_LANG === 'es' ? d.toLocaleDateString('es-US', { month: 'short', day: 'numeric', year: 'numeric' }) : AP[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); }
  function contactLines() {
    var lines = [];
    if (els.cPhone.checked && els.fPhone.value.trim()) lines.push((els.cText.checked ? T('Text ') : T('Call or text ')) + els.fPhone.value.trim());
    else if (els.cText.checked && els.fPhone.value.trim()) lines.push(T('Text ') + els.fPhone.value.trim());
    if (els.cEmail.checked && els.fEmail.value.trim()) lines.push(els.fEmail.value.trim());
    if (els.cOther.checked && els.fOther.value.trim()) lines.push(els.fOther.value.trim());
    return lines;
  }
  function looksLikeAddress(v) { return /^\s*\d{2,6}\s+[a-z0-9]/i.test(v) && !/&| and |near|corner/i.test(v); }

  function render() {
    var k = kind();
    sheet.setAttribute('data-kind', k);
    root.querySelectorAll('[data-only]').forEach(function (el) { el.hidden = el.getAttribute('data-only') !== k; });
    out.band.textContent = k === 'lost' ? T('LOST DOG') : T('FOUND DOG');
    out.name.textContent = k === 'lost' ? (els.name.value.trim() ? T('Answers to') + ' “' + els.name.value.trim() + '”' : '') : T('Is this your dog?');
    out.name.hidden = !out.name.textContent;
    out.desc.textContent = els.desc.value.trim();
    out.temper.textContent = k === 'lost' ? (TEMPER[els.temper.value] || '') : T('Describe your dog to claim.');
    out.temper.hidden = !out.temper.textContent;
    out.where.textContent = els.where.value.trim() || '—';
    out.whenL.textContent = k === 'lost' ? T('Last seen') : T('Found');
    out.when.textContent = fmtDate(els.when.value) || '—';
    var lines = contactLines();
    out.contact.innerHTML = '';
    if (lines.length) {
      lines.forEach(function (l, i) { var s = document.createElement(i ? 'small' : 'span'); s.textContent = l; out.contact.appendChild(s); });
    } else { var s = document.createElement('small'); s.textContent = T('Add a way to reach you'); out.contact.appendChild(s); }
    warn.hidden = !looksLikeAddress(els.where.value);
  }

  root.addEventListener('input', render);
  root.addEventListener('change', render);

  // ----- photo: read locally, downscale, keep only in memory -----
  els.photo.addEventListener('change', function () {
    var f = els.photo.files && els.photo.files[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) { statusEl.textContent = T('That file isn’t an image. Try a JPG or PNG.'); return; }
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var max = 1600, sc = Math.min(1, max / Math.max(img.width, img.height));
        var c = document.createElement('canvas'); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (blob) {
          if (photoURL) URL.revokeObjectURL(photoURL);
          photoURL = URL.createObjectURL(blob);
          photoImg = new Image(); photoImg.src = photoURL;
          out.img.src = photoURL; out.img.hidden = false; out.noPhoto.hidden = true;
          out.img.alt = 'Photo of the ' + kind() + ' dog';
          removeBtn.hidden = false;
          statusEl.textContent = T('Photo added. It stays on this device.');
        }, 'image/jpeg', 0.9);
      };
      img.onerror = function () { statusEl.textContent = T('We couldn’t read that image. Try another photo.'); };
      img.src = reader.result;
    };
    reader.readAsDataURL(f);
  });
  removeBtn.addEventListener('click', function () {
    if (photoURL) URL.revokeObjectURL(photoURL);
    photoURL = null; photoImg = null; els.photo.value = '';
    out.img.removeAttribute('src'); out.img.hidden = true; out.noPhoto.hidden = false;
    removeBtn.hidden = true; statusEl.textContent = T('Photo removed.');
    els.photo.focus();
  });

  // ----- print -----
  root.querySelector('[data-flyer-print]').addEventListener('click', function () { render(); window.print(); });

  // ----- save as PNG (drawn on a canvas, 8.5×11 at 200 dpi) -----
  function wrap(ctx, text, maxW) {
    var words = text.split(/\s+/), lines = [], line = '';
    words.forEach(function (w) { var t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
    if (line) lines.push(line); return lines;
  }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function draw() {
    var W = 1700, H = 2200, M = 85, cw = W - 2 * M;
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var ctx = c.getContext('2d'); var k = kind();
    var band = k === 'lost' ? '#E9661C' : '#2F45C8';
    var disp = '"Fredoka", "Arial Rounded MT Bold", sans-serif', body = '"Figtree", system-ui, sans-serif';
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = band; rr(ctx, M, M, cw, 270, 50); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 210px ' + disp;
    ctx.fillText(out.band.textContent, W / 2, M + 145);
    // bottom-up layout
    var y = H - M; ctx.textBaseline = 'alphabetic';
    ctx.font = '600 44px ' + body; ctx.fillStyle = '#5B566B'; ctx.fillText(T('fenixanimalproject.org and Petco Love Lost.'), W / 2, y); ctx.fillText(T('Also check Miami-Dade Animal Services,'), W / 2, y - 56); y -= 136;
    var lines = contactLines(); if (!lines.length) lines = [T('Add a way to reach you')];
    var ch = 80 + 100 + (lines.length - 1) * 64;
    ctx.fillStyle = '#1F1D2B'; rr(ctx, M, y - ch, cw, ch, 40); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '800 92px ' + body; ctx.fillText(lines[0], W / 2, y - ch + 125);
    ctx.font = '600 52px ' + body; lines.slice(1).forEach(function (l, i) { ctx.fillText(l, W / 2, y - ch + 200 + i * 64); });
    y -= ch + 40;
    // facts
    var fh = 190, fw = (cw - 34) / 2;
    [[out.whenL.textContent, out.when.textContent], [T('Area'), out.where.textContent]].reverse().forEach(function (f, i) {
      var x = M + i * (fw + 34); ctx.fillStyle = '#F6F1EC'; rr(ctx, x, y - fh, fw, fh, 30); ctx.fill();
      ctx.textAlign = 'left'; ctx.fillStyle = '#5B566B'; ctx.font = '700 40px ' + body; ctx.fillText(f[0].toUpperCase(), x + 40, y - fh + 65);
      ctx.fillStyle = '#1F1D2B'; ctx.font = '700 56px ' + body; wrap(ctx, f[1], fw - 80).slice(0, 2).forEach(function (l, j) { ctx.fillText(l, x + 40, y - fh + 130 + j * 58); });
    });
    ctx.textAlign = 'center'; y -= fh + 50;
    if (!out.temper.hidden) { ctx.fillStyle = '#A93A07'; ctx.font = '700 58px ' + body; ctx.fillText(out.temper.textContent, W / 2, y); y -= 85; }
    if (out.desc.textContent) { ctx.fillStyle = '#1F1D2B'; ctx.font = '700 70px ' + body; var dl = wrap(ctx, out.desc.textContent, cw).slice(0, 2).reverse(); dl.forEach(function (l) { ctx.fillText(l, W / 2, y); y -= 84; }); y -= 10; }
    if (!out.name.hidden) { ctx.font = '700 128px ' + disp; ctx.fillText(out.name.textContent, W / 2, y); y -= 150; }
    // photo fills what's left
    var top = M + 270 + 40, ph = y - top;
    ctx.save(); rr(ctx, M, top, cw, ph, 50); ctx.clip();
    if (photoImg && photoImg.complete) {
      var s = Math.max(cw / photoImg.width, ph / photoImg.height), iw = photoImg.width * s, ih = photoImg.height * s;
      ctx.drawImage(photoImg, M + (cw - iw) / 2, top + (ph - ih) / 2, iw, ih);
    } else { ctx.fillStyle = '#EEE9E4'; ctx.fillRect(M, top, cw, ph); ctx.fillStyle = '#6B6577'; ctx.font = '700 60px ' + body; ctx.fillText(T('Add a photo'), W / 2, top + ph / 2); }
    ctx.restore();
    return c;
  }
  root.querySelector('[data-flyer-download]').addEventListener('click', function () {
    render(); statusEl.textContent = T('Preparing your image…');
    var go = function () {
      draw().toBlob(function (blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a'); a.href = url; a.download = kind() + (window.BP_LANG === 'es' ? '-perro-volante.png' : '-dog-flyer.png');
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        statusEl.textContent = T('Your browser should now save ') + a.download + '.';
      }, 'image/png');
    };
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(go, go);
  });
  window.addEventListener('pagehide', function () { if (photoURL) URL.revokeObjectURL(photoURL); });
  render();
  window.BPFlyerDraw = draw; // used by automated tests
})();
