var T = window.BP_T || function (s) { return s; };
/* Pawsome Pooches "Share to Stories": draws a 1080x1920 story image of the pup on a canvas,
   then opens the phone's share sheet (pick Instagram → Story) and copies the pup's link for a Link sticker.
   On computers it saves the image instead. */
(function () {
  'use strict';
  var W = 1080, H = 1920;
  var INK = '#1F1D2B', BLUE = '#2F45C8', VIOLET = '#8C52FF', ORANGE = '#FF914D', GOLD = '#FFC94D';
  var DISPLAY = '"Fredoka", "Arial Rounded MT Bold", system-ui, sans-serif';
  var BODY = '"Figtree", system-ui, sans-serif';
  var HAND = '"Caveat", "Comic Sans MS", cursive';
  var cache = {};


  /* ---------- helpers ---------- */
  function loadImg(src) {
    return new Promise(function (res) {
      if (!src) return res(null);
      var i = new Image();
      i.decoding = 'async';
      i.onload = function () { res(i); };
      i.onerror = function () { res(null); };
      i.src = src;
    });
  }
  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([
      document.fonts.load('700 100px "Fredoka"'), document.fonts.load('600 100px "Fredoka"'),
      document.fonts.load('400 40px "Figtree"'), document.fonts.load('700 40px "Figtree"'), document.fonts.load('800 40px "Figtree"'),
      document.fonts.load('700 80px "Caveat"')
    ]).catch(function () {});
  }
  function rr(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function arch(c, x, y, w, h, rBottom) {
    var r = w / 2;
    c.beginPath(); c.moveTo(x, y + r); c.arc(x + r, y + r, r, Math.PI, 0); c.lineTo(x + w, y + h - rBottom);
    c.arcTo(x + w, y + h, x + w - rBottom, y + h, rBottom); c.lineTo(x + rBottom, y + h); c.arcTo(x, y + h, x, y + h - rBottom, rBottom); c.closePath();
  }
  function cover(c, img, x, y, w, h, focus) {
    if (!img) { c.fillStyle = '#DDE4FF'; c.fillRect(x, y, w, h); return; }
    var fx = 0.5, fy = 0.4, m = /^(\d{1,3})% (\d{1,3})%$/.exec(focus || '');
    if (m) { fx = m[1] / 100; fy = m[2] / 100; }
    var s = Math.max(w / img.width, h / img.height), sw = w / s, sh = h / s;
    var sx = Math.min(Math.max(img.width * fx - sw / 2, 0), img.width - sw), sy = Math.min(Math.max(img.height * fy - sh / 2, 0), img.height - sh);
    c.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }
  function font(c, weight, size, fam) { c.font = weight + ' ' + size + 'px ' + fam; }
  function fit(c, text, maxW, weight, size, fam, min) {
    font(c, weight, size, fam);
    while (c.measureText(text).width > maxW && size > (min || 20)) { size -= 2; font(c, weight, size, fam); }
    return size;
  }
  function wrap(c, text, maxW) {
    var words = String(text).split(' '), lines = [], line = '';
    words.forEach(function (w) { var t = line ? line + ' ' + w : w; if (c.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
    if (line) lines.push(line);
    return lines;
  }
  function lines(c, arr, x, y, lh, align) {
    c.textAlign = align || 'left';
    arr.forEach(function (l, i) { c.fillText(l, x, y + i * lh); });
    return y + arr.length * lh;
  }
  function rot(c, cx, cy, deg, fn) { c.save(); c.translate(cx, cy); c.rotate(deg * Math.PI / 180); fn(); c.restore(); }
  // washi tape with torn ends, centered at (cx, cy)
  function tape(c, cx, cy, w, h, deg, color) {
    rot(c, cx, cy, deg, function () {
      var x = -w / 2, y = -h / 2, n = 6, i;
      c.beginPath(); c.moveTo(x, y);
      c.lineTo(x + w, y);
      for (i = 1; i <= n; i++) c.lineTo(x + w - (i % 2 ? 9 : 0), y + h * i / n);
      c.lineTo(x, y + h);
      for (i = n - 1; i >= 0; i--) c.lineTo(x + (i % 2 ? 9 : 0), y + h * i / n);
      c.closePath();
      c.globalAlpha = 0.85; c.fillStyle = color; c.shadowColor = 'rgba(0,0,0,.18)'; c.shadowBlur = 4; c.shadowOffsetY = 2; c.fill();
      c.shadowColor = 'transparent'; c.globalAlpha = 0.3; var g = c.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, '#fff'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fill(); c.globalAlpha = 1;
    });
  }
  function shadow(c, blur, oy, a) { c.shadowColor = 'rgba(31,29,43,' + (a || 0.3) + ')'; c.shadowBlur = blur; c.shadowOffsetX = 0; c.shadowOffsetY = oy; }
  function noShadow(c) { c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0; c.shadowOffsetX = 0; }
  function specks(c, x, y, w, h, n, colors, rmax, seed) {
    var s = seed || 7; function rnd() { s = (s * 16807) % 2147483647; return s / 2147483647; }
    for (var i = 0; i < n; i++) { c.fillStyle = colors[i % colors.length]; c.beginPath(); c.arc(x + rnd() * w, y + rnd() * h, 0.6 + rnd() * rmax, 0, 7); c.fill(); }
  }
  function paw(c, x, y, s, color) {
    c.fillStyle = color; c.beginPath(); c.ellipse(x, y + s * 0.35, s * 0.42, s * 0.34, 0, 0, 7); c.fill();
    [[-0.42, -0.12], [-0.15, -0.38], [0.15, -0.38], [0.42, -0.12]].forEach(function (p) { c.beginPath(); c.ellipse(x + p[0] * s, y + p[1] * s, s * 0.14, s * 0.18, 0, 0, 7); c.fill(); });
  }
  function barcode(c, x, y, w, h, color) {
    c.fillStyle = color; var px = x, k = 0, pat = [3, 1, 2, 1, 4, 2, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 4, 1, 2, 3, 1, 1, 2, 1, 3, 2, 1, 2];
    while (px < x + w) { var bw = pat[k % pat.length] * 2.2; if (k % 2 === 0) c.fillRect(px, y, bw, h); px += bw + 2.4; k++; }
  }

  /* ---------- the pup's words ---------- */
  function words(d) {
    var age = String(d.age || '').trim();
    if (/^\d+(\.\d+)?$/.test(age)) age = age + ' ' + (age === '1' ? T('year old') : T('years old'));
    var facts = [age, d.sex ? T(d.sex) : '', d.breed].filter(Boolean).join(' · ');
    var list = function (a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' ' + T('and') + ' ' + a[a.length - 1]; };
    var good = [['dogs', T('dogs')], ['cats', T('cats')], ['kids', T('kids')]].filter(function (k) { return d.good && d.good[k[0]] === 'yes'; }).map(function (k) { return k[1]; });
    var health = [];
    if (d.fixed === 'yes') health.push(/^f/i.test(d.sex || '') ? T('spayed') : /^m/i.test(d.sex || '') ? T('neutered') : T('fixed'));
    if (d.vaccinated === 'yes') health.push(T('vaccinated'));
    if (d.microchipped === 'yes') health.push(T('microchipped'));
    var cap = function (s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; };
    var url = (/^(localhost|127\.|\[)/.test(location.host) ? 'bentleysplayhouse.org' : location.host.replace(/^www\./, '')) + (window.BP_LANG === 'es' ? '/es' : '') + '/pawsome-pooches/' + d.slug;
    return {
      name: d.name, facts: facts, size: d.size ? T(d.size) : '',
      where: [d.where, d.city].filter(Boolean).join(', '),
      good: good.length ? T('Good with') + ' ' + list(good) : '',
      health: health.length ? cap(list(health)) : '',
      ask: d.needs === 'foster' ? T('Foster me!') : d.needs === 'both' ? T('Adopt or foster me!') : T('Adopt me!'),
      hi: T("Hi, I'm {name}!").replace('{name}', d.name),
      url: url
    };
  }
  function infoLines(w) { return [w.facts, w.where, w.good, w.health].filter(Boolean); }

  /* ---------- 5 designs ---------- */
  var DESIGNS = {
    // 3 scrapbook: cream paper, taped photo, ADOPT ME stamp, handwriting
    3: function (c, d, w, img, logo) {
      c.fillStyle = '#FBF6EA'; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(47,69,200,.10)'; for (var yy = 30; yy < H; yy += 48) for (var xx = 30; xx < W; xx += 48) { c.beginPath(); c.arc(xx, yy, 2.4, 0, 7); c.fill(); }
      paw(c, 120, 300, 60, 'rgba(255,145,77,.5)'); paw(c, 965, 1720, 64, 'rgba(255,145,77,.45)'); paw(c, 990, 260, 40, 'rgba(140,82,255,.35)');
      c.fillStyle = BLUE; font(c, 700, 84, HAND); c.textAlign = 'center'; fit(c, w.hi, 900, 700, 110, HAND, 60); c.fillText(w.hi, W / 2, 320);
      rot(c, W / 2, 830, 2, function () {
        shadow(c, 22, 12, 0.32); c.fillStyle = '#fff'; c.fillRect(-400, -420, 800, 840); noShadow(c);
        cover(c, img, -370, -390, 740, 780, d.focus);
      });
      tape(c, W / 2 - 360, 445, 200, 52, -38, GOLD); tape(c, W / 2 + 370, 1220, 200, 52, -36, '#C8F2B5');
      // stamp
      rot(c, 250, 1175, -12, function () {
        c.strokeStyle = 'rgba(217,83,42,.9)'; c.lineWidth = 7; c.beginPath(); c.arc(0, 0, 118, 0, 7); c.stroke(); c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 100, 0, 7); c.stroke();
        c.fillStyle = 'rgba(217,83,42,.9)'; font(c, 700, 50, DISPLAY); c.textAlign = 'center'; var a = w.ask.replace('!', '').toUpperCase(); fit(c, a, 150, 700, 46, DISPLAY, 22); c.fillText(a, 0, 16);
      });
      c.textAlign = 'left'; var y = 1380;
      infoLines(w).forEach(function (l) {
        c.strokeStyle = BLUE; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(128, y - 16); c.lineTo(142, y - 2); c.lineTo(166, y - 32); c.stroke();
        c.fillStyle = INK; fit(c, l, 780, 600, 42, BODY, 26); c.fillText(l, 190, y); y += 66;
      });
      if (logo) c.drawImage(logo, 120, 1650, 110, 110);
      c.fillStyle = 'rgba(31,29,43,.65)'; font(c, 700, 44, HAND); c.fillText(T('Meet me at'), 250, 1690);
      c.fillStyle = BLUE; fit(c, w.url, 720, 700, 38, DISPLAY, 22); c.fillText(w.url, 250, 1745);
    },
    // 4 ticket: white ticket, notches, barcode stub, gold washi tape
    4: function (c, d, w, img, logo) {
      c.fillStyle = '#F2F5FF'; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(47,69,200,.07)'; for (var yy = 24; yy < H; yy += 40) for (var xx = 24; xx < W; xx += 40) { c.beginPath(); c.arc(xx, yy, 2.2, 0, 7); c.fill(); }
      var x = 110, y = 250, tw = 860, th = 1480, sy = y + th - 250, nr = 30;
      function ticket() {
        c.beginPath(); c.moveTo(x + 40, y); c.lineTo(x + tw - 40, y); c.arcTo(x + tw, y, x + tw, y + 40, 40);
        c.lineTo(x + tw, sy - nr); c.arc(x + tw, sy, nr, -Math.PI / 2, Math.PI / 2, true); c.lineTo(x + tw, y + th - 40); c.arcTo(x + tw, y + th, x + tw - 40, y + th, 40);
        c.lineTo(x + 40, y + th); c.arcTo(x, y + th, x, y + th - 40, 40); c.lineTo(x, sy + nr); c.arc(x, sy, nr, Math.PI / 2, -Math.PI / 2, true);
        c.lineTo(x, y + 40); c.arcTo(x, y, x + 40, y, 40); c.closePath();
      }
      shadow(c, 40, 20, 0.22); c.fillStyle = '#fff'; ticket(); c.fill(); noShadow(c);
      c.save(); ticket(); c.clip(); c.fillStyle = '#D3DCFF'; c.fillRect(x, sy, tw, th); c.restore();
      c.strokeStyle = 'rgba(31,29,43,.25)'; c.lineWidth = 4; c.setLineDash([18, 14]); c.beginPath(); c.moveTo(x + nr + 10, sy); c.lineTo(x + tw - nr - 10, sy); c.stroke(); c.setLineDash([]);
      c.save(); rr(c, x + 40, y + 40, tw - 80, 640, 26); c.clip(); cover(c, img, x + 40, y + 40, tw - 80, 640, d.focus); c.restore();
      c.fillStyle = 'rgba(31,29,43,.55)'; font(c, 800, 30, BODY); c.textAlign = 'left'; c.fillText(T('ADMIT ONE') + '  ·  PAWSOME POOCHES', x + 48, y + 752);
      c.fillStyle = INK; fit(c, w.name, tw - 96, 700, 130, DISPLAY, 60); c.fillText(w.name, x + 44, y + 868);
      c.fillStyle = ORANGE; font(c, 700, 44, DISPLAY); c.fillText(w.ask, x + 48, y + 930);
      var ly = y + 1000; c.fillStyle = INK; infoLines(w).forEach(function (l) { fit(c, l, tw - 100, 500, 36, BODY, 24); c.fillText(l, x + 48, ly); ly += 50; });
      if (logo) c.drawImage(logo, x + 44, sy + 50, 150, 150);
      c.fillStyle = 'rgba(31,29,43,.6)'; font(c, 800, 26, BODY); c.fillText(T('MEET ME AT'), x + 220, sy + 100);
      c.fillStyle = BLUE; fit(c, w.url, 600, 700, 34, DISPLAY, 20); c.fillText(w.url, x + 220, sy + 150);
      barcode(c, x + 220, sy + 172, 300, 34, INK);
      tape(c, W / 2, y - 6, 260, 60, -2, '#FFD36B');
    },
    // 5 poster
    5: function (c, d, w, img, logo) {
      cover(c, img, 0, 0, W, H, d.focus);
      var g = c.createLinearGradient(0, 0, 0, 520); g.addColorStop(0, 'rgba(20,18,40,.55)'); g.addColorStop(1, 'rgba(20,18,40,0)'); c.fillStyle = g; c.fillRect(0, 0, W, 520);
      g = c.createLinearGradient(0, 950, 0, H); g.addColorStop(0, 'rgba(20,18,40,0)'); g.addColorStop(0.45, 'rgba(20,18,40,.78)'); g.addColorStop(1, 'rgba(20,18,40,.95)'); c.fillStyle = g; c.fillRect(0, 950, W, H - 950);
      if (logo) { shadow(c, 16, 6, 0.4); c.drawImage(logo, 70, 200, 140, 140); noShadow(c); }
      c.fillStyle = '#fff'; font(c, 700, 50, DISPLAY); c.textAlign = 'left'; c.fillText('Pawsome Pooches', 232, 268);
      c.fillStyle = 'rgba(255,255,255,.8)'; font(c, 600, 30, BODY); c.fillText("Bentley's Playhouse", 234, 312);
      rot(c, 90, 1210, -4, function () {
        font(c, 700, 52, DISPLAY); var pw = c.measureText(w.ask).width + 70; c.fillStyle = ORANGE; rr(c, 0, -50, pw, 90, 12); c.fill();
        c.fillStyle = INK; c.textAlign = 'left'; c.fillText(w.ask, 35, 14);
      });
      c.fillStyle = '#fff'; fit(c, w.name, 920, 700, 180, DISPLAY, 80); c.textAlign = 'left'; c.fillText(w.name, 80, 1420);
      var y = 1500; c.fillStyle = 'rgba(255,255,255,.92)'; [w.facts, w.where, w.good].filter(Boolean).forEach(function (l) { fit(c, l, 920, 500, 42, BODY, 26); c.fillText(l, 84, y); y += 58; });
      c.strokeStyle = GOLD; c.lineWidth = 4; rr(c, 80, 1700, 920, 96, 48); c.stroke();
      c.fillStyle = GOLD; fit(c, w.url, 840, 700, 38, DISPLAY, 22); c.textAlign = 'center'; c.fillText(w.url, 540, 1761);
    }
  };

  var STYLES = [[3, 'Scrapbook'], [4, 'Ticket'], [5, 'Poster']];
  function data(btn) { return JSON.parse(btn.getAttribute('data-story')); }
  function render(btn, st) {
    var key = btn.getAttribute('data-pp-story') + ':' + st;
    if (cache[key]) return cache[key];
    var d; try { d = data(btn); } catch (e) { return Promise.reject(e); }
    cache[key] = Promise.all([loadImg(d.photo), loadImg(d.logo), fontsReady()]).then(function (r) {
      var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      var c = cv.getContext('2d'); c.textBaseline = 'alphabetic';
      DESIGNS[st](c, d, words(d), r[0], r[1]);
      return new Promise(function (res, rej) { cv.toBlob(function (b) { b ? res(b) : rej(new Error('no image')); }, 'image/png'); });
    });
    cache[key].catch(function () { delete cache[key]; });
    return cache[key];
  }
  function warmAll(btn) { STYLES.forEach(function (s) { render(btn, s[0]).catch(function () {}); }); }

  function say(btn, msg) {
    var s = btn.closest('.pp-share').querySelector('.pp-share__status'); if (!s) return;
    s.textContent = msg; clearTimeout(s._t); s._t = setTimeout(function () { s.textContent = ''; }, 10000);
  }
  // the style picker: three tappable previews; tapping one shares that design
  function picker(btn) {
    var wrap = btn.closest('.pp-share'), panel = wrap.nextElementSibling;
    if (panel && panel.classList.contains('pp-story-pick')) return panel;
    var id = 'pp-story-pick-' + btn.getAttribute('data-pp-story');
    panel = document.createElement('div'); panel.className = 'pp-story-pick'; panel.id = id; panel.hidden = true;
    panel.innerHTML = '<p class="pp-story-pick__h">' + T('Pick a design, then tap it to share') + '</p><div class="pp-story-pick__row" role="group" aria-label="' + T('Story designs') + '"></div>';
    var row = panel.querySelector('.pp-story-pick__row');
    STYLES.forEach(function (s) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'pp-story-opt is-loading';
      b.innerHTML = '<span class="pp-story-opt__img"><img alt=""></span><span class="pp-story-opt__label">' + T(s[1]) + '</span>';
      b.setAttribute('aria-label', T('Share the') + ' ' + T(s[1]).toLowerCase() + ' ' + T('design to your story'));
      b.addEventListener('click', function () { if (window.bpTrack) window.bpTrack('share_to_stories_' + s[1].toLowerCase(), { pup: btn.getAttribute('data-pp-story'), design: s[1].toLowerCase() }); share(btn, s[0]); });
      row.appendChild(b);
      render(btn, s[0]).then(function (blob) { b.querySelector('img').src = URL.createObjectURL(blob); b.classList.remove('is-loading'); }, function () { b.classList.remove('is-loading'); });
    });
    wrap.parentNode.insertBefore(panel, wrap.nextSibling);
    btn.setAttribute('aria-controls', id);
    return panel;
  }
  function prep(root) {
    Array.prototype.forEach.call((root || document).querySelectorAll('[data-pp-story]'), function (btn) {
      if (btn._story) return; btn._story = true;
      btn.setAttribute('aria-expanded', 'false');
      btn.addEventListener('pointerdown', function () { warmAll(btn); });
      btn.addEventListener('click', function () {
        var p = picker(btn), open = p.hidden;
        p.hidden = !open; btn.setAttribute('aria-expanded', String(open));
        if (open) { var first = p.querySelector('.pp-story-opt'); if (first) first.focus({ preventScroll: true }); p.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
      });
    });
  }
  function share(btn, st) {
    var d = data(btn);
    var link = location.origin + (window.BP_LANG === 'es' ? '/es' : '') + '/pawsome-pooches/' + d.slug + '/';
    var copied = navigator.clipboard ? navigator.clipboard.writeText(link).then(function () { return true; }, function () { return false; }) : Promise.resolve(false);
    render(btn, st).then(function (blob) {
      var file = new File([blob], d.slug + '-story.png', { type: 'image/png' });
      var touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      if (touch && navigator.canShare && navigator.canShare({ files: [file] })) {
        say(btn, T('Pick Instagram, then Story. Link copied: add a Link sticker and paste it.'));
        navigator.share({ files: [file] }).catch(function (e) { if (e && e.name === 'AbortError') return; download(blob, d.slug); copied.then(function (ok) { say(btn, saved(ok)); }); });
        return;
      }
      download(blob, d.slug);
      copied.then(function (ok) { say(btn, saved(ok)); });
    }, function () { say(btn, T("Sorry, we couldn't make the image. Try again in a moment.")); });
  }
  function saved(ok) {
    return T('Image saved. Send it to your phone and post it to your Instagram story.') + (ok ? ' ' + T('The link is copied too: add a Link sticker and paste it.') : '');
  }
  function download(blob, slug) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = slug + '-instagram-story.png';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }

  window.BPStory = { prep: prep, render: render, styles: STYLES };
  prep(document);
  if ('MutationObserver' in window) new MutationObserver(function () { prep(document); }).observe(document.body, { childList: true, subtree: true });
})();
