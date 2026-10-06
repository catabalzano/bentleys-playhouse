/* Bentley's Playhouse admin. Talks to the private service (window.BP_ADMIN.api); saving commits to the site, which redeploys in ~2 minutes. */
(function () {
  'use strict';
  var CFG = window.BP_ADMIN || {};
  var API = String(CFG.api || '').replace(/\/$/, '');
  var app = document.getElementById('app');
  var SKEY = 'bp.session';
  var S = { session: null, cache: {}, subs: null, preview: {} };

  // ---------- helpers ----------
  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function store(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function today() { var d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
  function slugify(s) { return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'item'; }
  function get(o, path) { return path.split('.').reduce(function (a, k) { return a == null ? undefined : a[k]; }, o); }
  function set(o, path, v) { var ks = path.split('.'), last = ks.pop(); var t = ks.reduce(function (a, k) { if (a[k] == null || typeof a[k] !== 'object') a[k] = {}; return a[k]; }, o); t[last] = v; }
  function toast(msg) { var t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3800); }
  function imgSrc(p) { if (!p) return ''; if (S.preview[p]) return S.preview[p]; return /^https?:|^data:/.test(p) ? p : (p.charAt(0) === '/' ? p : '/assets/img/' + p).replace(/^\/assets\//, '../assets/'); }

  function api(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({}, opts.headers || {});
    if (S.session) opts.headers.Authorization = 'Session ' + S.session;
    if (opts.json !== undefined) { opts.body = JSON.stringify(opts.json); opts.headers['Content-Type'] = 'application/json'; delete opts.json; }
    return fetch(API + path, opts).then(function (r) {
      var ct = r.headers.get('Content-Type') || '';
      if (ct.indexOf('json') > -1) return r.json().then(function (j) { if (!r.ok) { var e = new Error(j.error || 'Something went wrong.'); e.status = r.status; throw e; } return j; });
      if (!r.ok) throw new Error('Something went wrong (' + r.status + ').');
      return r.blob();
    }).catch(function (e) {
      if (e.status === 401 && S.session) { S.session = null; store(SKEY, null); gate('Your sign-in expired. Please sign in again.'); }
      throw e;
    });
  }

  // Resize phone photos in the browser (max 1600px JPEG) so saving is quick.
  function shrink(file) {
    return new Promise(function (resolve, reject) {
      if (file.type === 'application/pdf') { var fr = new FileReader(); fr.onload = function () { resolve({ dataUrl: fr.result, name: file.name }); }; fr.onerror = reject; fr.readAsDataURL(file); return; }
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        resolve({ dataUrl: c.toDataURL('image/jpeg', 0.86), name: 'photo.jpg' });
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('We couldn\'t read "' + file.name + '". Please use a JPG or PNG photo.')); };
      img.src = url;
    });
  }

  // ---------- what each section contains ----------
  var YN = [['yes', 'Yes'], ['no', 'No'], ['some', 'Partly / some'], ['unknown', 'Not sure yet']];
  var LOC = [['rescue', 'A rescue'], ['mdas-doral', 'MDAS · Doral'], ['mdas-medley', 'MDAS · Medley'], ['broward', 'Broward County Animal Care'], ['family', 'A family rehoming'], ['foster', 'In a foster home'], ['other', 'Other']];
  var LOCL = {}; LOC.forEach(function (x) { LOCL[x[0]] = x[1]; });
  var STATUS = [['available', 'Available'], ['pending', 'Adoption pending'], ['adopted', 'Adopted']];
  var STL = { available: 'Available', pending: 'Pending', adopted: 'Adopted' };

  var COLS = {
    pawsome: {
      label: 'Pawsome Pooches', one: 'pup', icon: '🐾', titleKey: 'name',
      intro: 'Community dogs featured each week. Adopted pups move to "Happy tails" on the site.',
      filters: [['available', 'Available'], ['pending', 'Pending'], ['adopted', 'Adopted'], ['all', 'All']], filterKey: 'status',
      thumb: function (d) { return (d.photos || [])[0]; },
      sub: function (d) { return [STL[d.status] || d.status, d.breed, LOCL[get(d, 'location.type')], d.featuredWeek && 'week of ' + d.featuredWeek].filter(Boolean).join(' · '); },
      sort: function (a, b) { return String(b.data.featuredWeek || '').localeCompare(a.data.featuredWeek || ''); },
      quick: function (it) { return it.data.status !== 'adopted' ? { label: '🎉 Mark adopted', patch: { status: 'adopted', adoptedDate: today() } } : null; },
      defaults: function () { return { status: 'available', featuredWeek: today(), needs: 'adoption', fixed: 'unknown', vaccinated: 'unknown', microchipped: 'unknown', heartworm: 'unknown', goodWithDogs: 'unknown', goodWithCats: 'unknown', goodWithKids: 'unknown', location: { type: 'rescue' }, contact: { instagram: 'bentleysplayhouse' } }; },
      groups: [
        ['The basics', [
          { k: 'name', label: 'Name', req: true, hint: 'For two dogs listed together, e.g. "Zeus & Star"' },
          { k: 'status', label: 'Status', type: 'chips1', options: STATUS, req: true },
          { k: 'adoptedDate', label: 'Adopted on', type: 'date', show: function (d) { return d.status === 'adopted'; } },
          { k: 'featuredWeek', label: 'Featured week', type: 'date', req: true, hint: 'The newest week gets a "New this week" ribbon.' },
          { k: 'needs', label: 'Looking for', type: 'chips1', options: [['adoption', 'Adopters'], ['foster', 'A foster'], ['both', 'Either']] },
          { k: 'urgent', label: 'Urgent (shows a ribbon and moves to the front)', type: 'bool' },
          { k: 'count', label: 'Number of dogs in this listing', type: 'number', hint: 'Leave empty for one dog. Use 2 for a pair.' },
          { k: 'pair', label: 'Listed together as a pair', type: 'bool' },
        ]],
        ['Photos', [
          { k: 'photos', label: 'Photos', type: 'images', wide: true, hint: 'The first photo is the main one. Use the arrows to reorder.' },
          { k: 'sharePhoto', label: 'Photo for social shares (optional)', type: 'image', hint: 'A wide photo works best. Leave empty to use the first photo.' },
          { k: 'photoAlt', label: 'Photo description', hint: 'For screen readers, e.g. "Luna, a tan pit mix, sitting in the grass"' },
        ]],
        ['About the pup', [
          { k: 'tagline', label: 'One-line intro', wide: true },
          { k: 'breed', label: 'Breed' }, { k: 'age', label: 'Age', hint: 'e.g. "About 2 years"' },
          { k: 'sex', label: 'Sex', hint: 'e.g. "Female"' }, { k: 'size', label: 'Size', type: 'chips1', options: [['Small', 'Small'], ['Medium', 'Medium'], ['Large', 'Large'], ['Extra large', 'Extra large']] },
          { k: 'weight', label: 'Weight', hint: 'e.g. "45 lb"' }, { k: 'energy', label: 'Energy', type: 'chips1', options: [['Low', 'Low'], ['Medium', 'Medium'], ['High', 'High']] },
          { k: 'fee', label: 'Adoption fee', hint: 'e.g. "$150" or "Fee waived"' },
          { k: 'personality', label: 'Personality', type: 'tags', hint: 'Short words like "Cuddly" or "Loves walks". Press Enter after each.' },
          { k: 'body', label: 'Story', type: 'markdown', wide: true, hint: 'Use **double stars** for bold.' },
        ]],
        ['Health', [
          { k: 'fixed', label: 'Spayed or neutered', type: 'chips1', options: YN }, { k: 'fixedNote', label: 'Spay/neuter note' },
          { k: 'vaccinated', label: 'Vaccines up to date', type: 'chips1', options: YN }, { k: 'microchipped', label: 'Microchipped', type: 'chips1', options: YN },
          { k: 'heartworm', label: 'Heartworm negative', type: 'chips1', options: YN }, { k: 'medical', label: 'Medical notes', type: 'text' },
        ]],
        ['Gets along with', [
          { k: 'goodWithDogs', label: 'Dogs', type: 'chips1', options: YN }, { k: 'goodWithCats', label: 'Cats', type: 'chips1', options: YN },
          { k: 'goodWithKids', label: 'Kids', type: 'chips1', options: YN }, { k: 'goodNote', label: 'Note', hint: 'e.g. "Needs a home without cats"' },
        ]],
        ['Where the pup is', [
          { k: 'location.type', label: 'The pup is with', type: 'select', options: LOC, req: true },
          { k: 'location.name', label: 'Name of the rescue or place', hint: 'Leave empty for shelters.' },
          { k: 'location.city', label: 'City or area' }, { k: 'location.animalId', label: 'Shelter animal ID', hint: 'e.g. A1234567' },
        ]],
        ['How to adopt', [
          { k: 'contact.instagram', label: 'Instagram handle', hint: 'Without the @' }, { k: 'contact.website', label: 'Website' },
          { k: 'contact.applyUrl', label: 'Application link' }, { k: 'contact.phone', label: 'Phone' }, { k: 'contact.email', label: 'Email' },
          { k: 'contact.instructions', label: 'Instructions', type: 'text', wide: true, hint: 'Optional. Leave empty to use the standard steps for this location.' },
        ]],
      ],
    },
    stories: {
      label: 'Rescue stories', one: 'story', icon: '📸', titleKey: 'title',
      intro: 'The polaroid wall on the Our Story page. Lower order numbers show first.',
      thumb: function (d) { return d.photo; }, sub: function (d) { return (d.tags || []).join(' · '); },
      sort: function (a, b) { return (a.data.order || 99) - (b.data.order || 99); },
      defaults: function () { return {}; },
      groups: [['Story', [
        { k: 'title', label: 'Pup\'s name', req: true }, { k: 'order', label: 'Order', type: 'number', hint: 'Lower numbers show first' },
        { k: 'photo', label: 'Photo', type: 'image', req: true }, { k: 'photoAlt', label: 'Photo description' },
        { k: 'tags', label: 'Tags', type: 'tags', wide: true, hint: 'e.g. "Owner surrender", "Spayed". Press Enter after each.' },
        { k: 'summary', label: 'Their story', type: 'text', req: true, wide: true, hint: 'This is what shows on the back of the polaroid.' },
      ]]],
    },
    rescues: {
      label: 'Rescues you can help', one: 'rescue', icon: '🏠', titleKey: 'name',
      intro: 'Miami-Dade rescues and shelters people can support. Lower order numbers show first.',
      thumb: function (d) { return d.logo; }, sub: function (d) { return [d.area, d.instagram && '@' + d.instagram].filter(Boolean).join(' · '); },
      sort: function (a, b) { return (a.data.order || 99) - (b.data.order || 99); },
      defaults: function () { return {}; },
      groups: [['Rescue', [
        { k: 'name', label: 'Name', req: true }, { k: 'order', label: 'Order', type: 'number' },
        { k: 'instagram', label: 'Instagram handle', hint: 'Without the @' }, { k: 'website', label: 'Website' },
        { k: 'area', label: 'Area / type', hint: 'e.g. "Rescue · Homestead"' }, { k: 'logo', label: 'Logo', type: 'image' },
        { k: 'summary', label: 'Short description', type: 'text', wide: true },
        { k: 'needs', label: 'What they need', type: 'chips', wide: true, options: [['fosters', 'Foster homes'], ['adopters', 'Adopters'], ['volunteers', 'Volunteers'], ['supplies', 'Supplies'], ['donations', 'Donations'], ['transport', 'Transport'], ['sharing', 'Shares on social']] },
        { k: 'wishlist', label: 'Wishlist link' }, { k: 'donate', label: 'Donation link' },
        { k: 'body', label: 'How to help', type: 'markdown', wide: true },
      ]]],
    },
    dogs: {
      label: 'Our dogs', one: 'dog', icon: '🐶', titleKey: 'name',
      intro: 'Dogs in Bentley\'s Playhouse\'s own care, shown on Adopt & Foster.',
      thumb: function (d) { return d.photo; }, sub: function (d) { return [STL[d.status] || d.status, d.age, d.sex].filter(Boolean).join(' · '); },
      sort: function (a, b) { return String(b.data.date || '').localeCompare(a.data.date || ''); },
      defaults: function () { return { source: 'bentleys', status: 'available', date: today() }; },
      groups: [['Dog', [
        { k: 'name', label: 'Name', req: true }, { k: 'status', label: 'Status', type: 'chips1', options: [['available', 'Available'], ['pending', 'Adoption pending'], ['adopted', 'Adopted (hidden)']] },
        { k: 'source', label: 'Whose dog', type: 'chips1', options: [['bentleys', 'Bentley\'s Playhouse'], ['partner', 'Partner rescue']] }, { k: 'partnerName', label: 'Partner rescue name', show: function (d) { return d.source === 'partner'; } },
        { k: 'photo', label: 'Photo', type: 'image' }, { k: 'photoAlt', label: 'Photo description' },
        { k: 'age', label: 'Age' }, { k: 'sex', label: 'Sex' }, { k: 'size', label: 'Size' }, { k: 'energy', label: 'Energy' },
        { k: 'goodWith', label: 'Good with' }, { k: 'medical', label: 'Medical notes' },
        { k: 'date', label: 'Date listed', type: 'date' }, { k: 'inquiryUrl', label: 'Application link for this dog' },
        { k: 'summary', label: 'Summary', type: 'text', wide: true }, { k: 'body', label: 'About', type: 'markdown', wide: true },
      ]]],
    },
    money: {
      label: 'Money in & out', one: 'entry', icon: '💸', titleKey: 'description',
      intro: 'Every purchase or donation shown on "Where the money goes". Black out card numbers and addresses on receipts first.',
      thumb: function () { return null; }, ph: function (d) { return d.type === 'income' ? '💚' : '🧾'; },
      sub: function (d) { return [d.date, (d.type === 'income' ? '+' : '−') + '$' + Number(d.amount || 0).toFixed(2), d.paid_to_or_from].filter(Boolean).join(' · '); },
      sort: function (a, b) { return String(b.data.date || '').localeCompare(a.data.date || ''); },
      slugFrom: function (d) { return (d.date || today()) + '-' + slugify(d.description).slice(0, 40); },
      defaults: function () { return { date: today(), type: 'expense' }; },
      groups: [['Entry', [
        { k: 'date', label: 'Date', type: 'date', req: true },
        { k: 'type', label: 'Money', type: 'chips1', options: [['expense', 'Spent'], ['income', 'Received']], req: true },
        { k: 'category', label: 'Category', type: 'select', options: (CFG.categories || []).map(function (c) { return [c.value, c.label]; }), req: true },
        { k: 'amount', label: 'Amount ($)', type: 'number', step: '0.01', req: true },
        { k: 'description', label: 'What it was for', req: true, hint: 'e.g. "Spay surgery for Luna"' },
        { k: 'paid_to_or_from', label: 'Paid to / received from', hint: 'For donations write "Individual donors". Never list donor names without permission.' },
        { k: 'dog', label: 'Dog it helped' }, { k: 'receipt', label: 'Receipt (photo or PDF)', type: 'file' },
        { k: 'notes', label: 'Notes', type: 'text', wide: true },
      ]]],
    },
  };
  var ORDER = ['pawsome', 'stories', 'rescues', 'dogs', 'money'];

  // ---------- sign-in ----------
  function card(inner) { app.className = ''; app.innerHTML = '<div class="gate"><div class="gate__card"><div class="card-top"></div><img class="gate__logo" src="../assets/img/logo-main.png" alt="">' + inner + '</div></div>'; }
  function signedIn(j) { S.session = j.session; store(SKEY, j.session); shell(); route(); if (j.recoveryLeft != null && j.recoveryLeft < 3) toast('You have ' + j.recoveryLeft + ' backup codes left. Make new ones in Profile & security.'); }
  function gate(msg) {
    api('/auth/status').then(function (st) {
      var setup = !st.setup;
      var ghToken = load('bp.ghToken');
      if (!ghToken) { try { var u = JSON.parse(load('sveltia-cms.user') || 'null'); if (u && u.token) ghToken = u.token; } catch (e) {} }
      card('<h1>' + (setup ? 'Create your admin login' : 'Welcome back') + '</h1>' +
        '<p>' + (setup ? 'Choose a username and password for the admin.' : 'Sign in to manage Bentley\'s Playhouse.') + '</p>' +
        '<form novalidate><div class="f"><label for="un">Username</label><input type="text" id="un" autocomplete="username" autocapitalize="off" spellcheck="false"></div>' +
        (setup ? '<div class="f"><label for="pw1">Password</label><input type="password" id="pw1" autocomplete="new-password" minlength="10" required><p class="hint">At least 10 characters.</p></div><div class="f"><label for="pw2">Type it again</label><input type="password" id="pw2" autocomplete="new-password" required></div>' +
          (ghToken ? '' : '<div class="f"><label for="ght">GitHub token (one time only)</label><input type="password" id="ght" autocomplete="off"><p class="hint">This proves you own the site. You won\'t need it again.</p></div>')
          : '<div class="f"><label for="pw">Password</label><input type="password" id="pw" autocomplete="current-password" required></div>') +
        '<p class="msg err" role="alert">' + esc(msg || '') + '</p><button class="btn btn--go" type="submit">' + (setup ? 'Create login & sign in' : 'Sign in') + '</button></form>');
      var form = $('form', app), m = $('.msg', app);
      $('#un').focus();
      form.onsubmit = function (e) {
        e.preventDefault(); m.textContent = '';
        var un = $('#un').value.trim(), req;
        if (setup) {
          var a = $('#pw1').value, b = $('#pw2').value;
          if (!/^[A-Za-z0-9._-]{3,30}$/.test(un)) { m.textContent = 'Usernames are 3 to 30 letters or numbers.'; return; }
          if (a.length < 10) { m.textContent = 'Please use at least 10 characters.'; return; }
          if (a !== b) { m.textContent = 'The two passwords don\'t match.'; return; }
          req = api('/auth/setup', { method: 'POST', json: { username: un, password: a, githubToken: ghToken || ($('#ght') && $('#ght').value) } });
        } else req = api('/auth/login', { method: 'POST', json: { username: un, password: $('#pw').value } });
        $('button', form).disabled = true;
        req.then(function (j) {
          if (setup) { store('bp.ghToken', null); store('sveltia-cms.user', null); }
          if (j.needCode) return codeStep(j.pending);
          signedIn(j);
        }).catch(function (err) { m.textContent = err.message; $('button', form).disabled = false; });
      };
    }).catch(function () { card('<h1>Can\'t reach the admin</h1><p>Please check your connection and reload.</p>'); });
  }
  function codeStep(pending) {
    card('<h1>Enter your code</h1><p>Open your authenticator app and type the 6-digit code for Bentley\'s Playhouse.</p>' +
      '<form novalidate><div class="f"><label for="cd">6-digit code</label><input type="text" id="cd" inputmode="numeric" autocomplete="one-time-code" maxlength="11" style="font-size:24px;letter-spacing:.2em;text-align:center"></div>' +
      '<p class="hint">Lost your phone? Type one of your backup codes instead.</p><p class="msg err" role="alert"></p><button class="btn btn--go" type="submit">Verify</button></form>');
    var form = $('form', app), m = $('.msg', app), cd = $('#cd');
    cd.focus();
    cd.addEventListener('input', function () { if (/^\d{6}$/.test(cd.value.trim())) form.requestSubmit(); });
    form.onsubmit = function (e) {
      e.preventDefault(); m.textContent = ''; $('button', form).disabled = true;
      api('/auth/code', { method: 'POST', json: { pending: pending, code: cd.value } }).then(signedIn)
        .catch(function (err) { if (/too long/.test(err.message)) return gate(err.message); m.textContent = err.message; cd.value = ''; cd.focus(); $('button', form).disabled = false; });
    };
  }

  // ---------- shell ----------
  function shell() {
    app.className = '';
    app.innerHTML = '<div class="shell"><aside class="side" aria-label="Admin sections">' +
      '<a class="side__brand" href="#home"><img src="../assets/img/logo-main-dark.png" alt="Bentley\'s Playhouse"><small>Admin</small></a>' +
      '<a class="side__me" href="#profile" data-nav="profile"><span class="avatar" data-avatar></span><span><b data-myname>My profile</b><small>Profile &amp; security</small></span></a>' +
      '<a class="nav" href="#home" data-nav="home">🏡 Home</a>' +
      '<a class="nav" href="#submissions" data-nav="submissions">📥 Submitted pups <span class="count" data-subcount></span></a>' +
      ORDER.map(function (k) { return '<a class="nav" href="#c/' + k + '" data-nav="c/' + k + '">' + COLS[k].icon + ' ' + esc(COLS[k].label) + '</a>'; }).join('') +
      '<a class="nav" href="#donations" data-nav="donations">💛 Donations</a>' +
      '<div class="side__sep"></div><a class="nav" href="#users" data-nav="users">👥 Manage users</a><a class="nav" href="#profile" data-nav="profile">⚙️ Profile &amp; security</a>' +
      '<div class="side__foot"><a href="../" target="_blank" rel="noopener">View the website ↗</a></div></aside>' +
      '<div><div class="topbar"><button type="button" data-menu>☰ Menu</button><b>Admin</b></div><main class="main" id="main" tabindex="-1"></main></div></div>';
    $('[data-menu]').onclick = function () { $('.shell').classList.toggle('menu-open'); };
    $$('.nav').forEach(function (n) { n.addEventListener('click', function () { $('.shell').classList.remove('menu-open'); }); });
    loadSubs(); loadMe();
  }
  function main() { return $('#main'); }
  function loadMe() {
    return api('/auth/me').then(function (me) {
      S.me = me;
      if (!me.username && location.hash !== '#profile') { location.hash = '#profile'; toast('Choose a username for signing in, then click Save profile.'); }
      var n = $('[data-myname]'); if (n) n.textContent = me.name || me.username || 'My profile';
      var av = $('[data-avatar]'); if (av) av.innerHTML = me.photo ? '<img alt="" src="' + esc(me.photo) + '">' : esc(((me.name || me.username || '?').trim()[0] || '?').toUpperCase());
      return me;
    });
  }
  function loadSubs() {
    return api('/admin/list').then(function (j) { S.subs = j.submissions || []; var n = S.subs.filter(function (s) { return s.status === 'pending'; }).length; var c = $('[data-subcount]'); if (c) c.textContent = n ? n : ''; return S.subs; });
  }

  // ---------- router ----------
  var dirty = false;
  window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  window.addEventListener('hashchange', function () { if (dirty && !confirm('You have unsaved changes. Leave without saving?')) { dirty = false; return; } dirty = false; route(); });
  function route() {
    if (!S.session) return gate();
    var h = (location.hash || '#home').slice(1), p = h.split('/');
    $$('.nav, .side__me').forEach(function (n) { var k = n.getAttribute('data-nav'); n.setAttribute('aria-current', h === k || (k !== 'home' && h.indexOf(k + '/') === 0) ? 'page' : 'false'); });
    window.scrollTo(0, 0);
    if (h === 'home') return home();
    if (h === 'submissions') return submissions();
    if (h === 'donations') return donations();
    if (h === 'settings' || h === 'profile') return profile();
    if (h === 'users') return manageUsers();
    if (p[0] === 'c' && COLS[p[1]]) return p[2] ? editor(p[1], p[2] === 'new' ? null : p[2]) : list(p[1]);
    location.hash = '#home';
  }

  // ---------- home ----------
  function home() {
    var pending = (S.subs || []).filter(function (s) { return s.status === 'pending'; }).length;
    main().innerHTML = '<div class="head"><div><h1>Hi ' + esc((S.me && (S.me.name || '').split(' ')[0]) || 'there') + '! 🐾</h1><p>Everything you save here goes live on the website in about 2 minutes.</p></div></div>' +
      '<div class="home-cards">' +
      '<a class="home-card" href="#submissions"><span class="big">' + (S.subs ? pending : '…') + '</span><b>Submitted pups</b><span>' + (pending ? 'waiting for your review' : 'Nothing new to review') + '</span></a>' +
      '<a class="home-card" href="#c/pawsome/new"><span class="big">＋</span><b>Add a Pawsome Pooch</b><span>Feature a dog yourself</span></a>' +
      ORDER.map(function (k) { return '<a class="home-card" href="#c/' + k + '"><span class="big">' + COLS[k].icon + '</span><b>' + esc(COLS[k].label) + '</b><span>' + esc(COLS[k].intro) + '</span></a>'; }).join('') +
      '<a class="home-card" href="#donations"><span class="big">💛</span><b>Donations</b><span>Payment handles, amounts and the Donate button</span></a>' +
      '</div>';
    if (!S.subs) loadSubs().then(function () { if ((location.hash || '#home') === '#home') home(); }).catch(function () {});
  }

  // ---------- list ----------
  function fetchCol(key, force) {
    if (S.cache[key] && !force) return Promise.resolve(S.cache[key]);
    return api('/api/content/' + key).then(function (j) { S.cache[key] = j.items; return j.items; });
  }
  function list(key, filter) {
    var C = COLS[key];
    filter = filter || (C.filters ? C.filters[0][0] : 'all');
    main().innerHTML = '<div class="head"><div><h1>' + C.icon + ' ' + esc(C.label) + '</h1><p>' + esc(C.intro) + '</p></div><a class="btn btn--go" href="#c/' + key + '/new">＋ Add ' + esc(C.one) + '</a></div>' +
      (C.filters ? '<div class="tabs" role="group" aria-label="Show">' + C.filters.map(function (f) { return '<button class="tab" data-f="' + f[0] + '" aria-pressed="' + (f[0] === filter) + '">' + f[1] + '</button>'; }).join('') + '</div>' : '') +
      '<div class="list" data-list><p class="empty">Loading…</p></div>';
    $$('[data-f]').forEach(function (b) { b.onclick = function () { list(key, b.getAttribute('data-f')); }; });
    fetchCol(key).then(function (items) {
      var shown = items.filter(function (it) { return !C.filters || filter === 'all' || it.data[C.filterKey] === filter; }).sort(C.sort);
      var L = $('[data-list]');
      if (!L) return;
      if (!shown.length) { L.innerHTML = '<p class="empty">Nothing here yet.</p>'; return; }
      L.innerHTML = shown.map(function (it) {
        var d = it.data, t = C.thumb(d), q = C.quick && C.quick(it);
        return '<div class="row" data-slug="' + esc(it.slug) + '" role="link" tabindex="0">' + (t ? '<img class="row__img" alt="" src="' + esc(imgSrc(t)) + '">' : '<span class="row__ph" aria-hidden="true">' + (C.ph ? C.ph(d) : C.icon) + '</span>') +
          '<div class="row__main"><div class="row__t">' + esc(d[C.titleKey] || it.slug) + '</div><div class="row__s">' + esc(C.sub(d)) + '</div></div>' +
          '<div class="row__act">' + (q ? '<button class="btn btn--ghost btn--sm" data-quick>' + q.label + '</button>' : '') + '<button class="btn btn--blue btn--sm" data-open>Edit</button></div></div>';
      }).join('');
      $$('.row', L).forEach(function (r) {
        var slug = r.getAttribute('data-slug'), open = function () { location.hash = '#c/' + key + '/' + slug; };
        r.addEventListener('click', function (e) { if (!e.target.closest('[data-quick]')) open(); });
        r.addEventListener('keydown', function (e) { if (e.key === 'Enter') open(); });
        var qb = $('[data-quick]', r);
        if (qb) qb.onclick = function () {
          var it = items.filter(function (x) { return x.slug === slug; })[0], q = C.quick(it);
          qb.disabled = true; qb.textContent = 'Saving…';
          var data = Object.assign({}, it.data, q.patch);
          api('/api/content/' + key + '/' + slug, { method: 'PUT', json: { data: data, body: it.body } }).then(function () { it.data = data; toast(it.data[C.titleKey] + ' marked adopted. The site updates in about 2 minutes.'); list(key, filter); })
            .catch(function (e) { toast(e.message); qb.disabled = false; qb.textContent = q.label; });
        };
      });
    }).catch(function (e) { var L = $('[data-list]'); if (L) L.innerHTML = '<p class="empty msg err">' + esc(e.message) + '</p>'; });
  }

  // ---------- editor ----------
  function editor(key, slug) {
    var C = COLS[key];
    main().innerHTML = '<p class="empty">Loading…</p>';
    fetchCol(key).then(function (items) {
      var it = slug ? items.filter(function (x) { return x.slug === slug; })[0] : null;
      if (slug && !it) { main().innerHTML = '<p class="empty">This ' + esc(C.one) + ' wasn\'t found. <a href="#c/' + key + '">Back</a></p>'; return; }
      var data = JSON.parse(JSON.stringify(it ? it.data : C.defaults()));
      data.body = it ? it.body : '';
      var uploads = {}, upN = 0;
      function addUpload(dataUrl, name) { var id = 'upload:' + (++upN) + ':' + name; uploads[id] = { id: id, name: name, base64: dataUrl }; S.preview[id] = dataUrl; return id; }

      main().innerHTML = '<a class="back" href="#c/' + key + '">← ' + esc(C.label) + '</a><div class="head"><div><h1>' + esc(it ? (it.data[C.titleKey] || slug) : 'New ' + C.one) + '</h1></div>' + (it && key === 'pawsome' ? '<a class="btn btn--ghost btn--sm" target="_blank" rel="noopener" href="../pawsome-pooches/' + esc(slug) + '/">View on site ↗</a>' : '') + '</div>' +
        '<form novalidate data-form>' + C.groups.map(function (g) { return '<section class="card"><h2>' + esc(g[0]) + '</h2><div class="grid">' + g[1].map(fieldHtml).join('') + '</div></section>'; }).join('') +
        '<div class="actions"><button class="btn btn--go" type="submit">💾 Save' + (it ? ' changes' : '') + '</button>' + (it ? '<button class="btn btn--danger" type="button" data-del>Delete</button>' : '') + '<span class="msg" data-msg role="status"></span></div></form>';

      function fieldHtml(f) {
        var id = 'f-' + f.k.replace(/\./g, '-'), v = f.k === 'body' ? data.body : get(data, f.k), cls = 'f' + (f.wide || ['images', 'markdown'].indexOf(f.type) > -1 ? ' wide' : '');
        var lab = '<label for="' + id + '">' + esc(f.label) + (f.req ? ' <span class="req">*</span>' : '') + '</label>';
        var hint = f.hint ? '<p class="hint">' + esc(f.hint) + '</p>' : '';
        var hide = f.show && !f.show(data) ? ' hidden' : '';
        var t = f.type || 'string', inner;
        if (t === 'string') inner = lab + '<input type="text" id="' + id + '" data-k="' + f.k + '" value="' + esc(v || '') + '">';
        else if (t === 'number') inner = lab + '<input type="number" id="' + id + '" data-k="' + f.k + '" step="' + (f.step || '1') + '" min="0" value="' + esc(v == null ? '' : v) + '">';
        else if (t === 'date') inner = lab + '<input type="date" id="' + id + '" data-k="' + f.k + '" value="' + esc(v || '') + '">';
        else if (t === 'text') inner = lab + '<textarea id="' + id + '" data-k="' + f.k + '">' + esc(v || '') + '</textarea>';
        else if (t === 'markdown') inner = lab + '<textarea class="big" id="' + id + '" data-k="' + f.k + '">' + esc(v || '') + '</textarea>';
        else if (t === 'select') inner = lab + '<select id="' + id + '" data-k="' + f.k + '"><option value="">Choose…</option>' + f.options.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === v ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
        else if (t === 'bool') inner = '<label class="switch"><input type="checkbox" data-k="' + f.k + '"' + (v ? ' checked' : '') + '> ' + esc(f.label) + '</label>';
        else if (t === 'chips1' || t === 'chips') inner = '<span class="lbl" id="' + id + '">' + esc(f.label) + (f.req ? ' <span class="req">*</span>' : '') + '</span><div class="chips" role="group" aria-labelledby="' + id + '">' + f.options.map(function (o) {
          var on = t === 'chips' ? (v || []).indexOf(o[0]) > -1 : v === o[0];
          return '<label class="chip"><input type="' + (t === 'chips' ? 'checkbox' : 'radio') + '" name="' + id + '" data-k="' + f.k + '" value="' + esc(o[0]) + '"' + (on ? ' checked' : '') + '><span>' + esc(o[1]) + '</span></label>'; }).join('') + '</div>';
        else if (t === 'tags') inner = lab + '<div class="tagsbox" data-tags="' + f.k + '"></div>';
        else if (t === 'images' || t === 'image') inner = '<span class="lbl">' + esc(f.label) + (f.req ? ' <span class="req">*</span>' : '') + '</span><div class="photos" data-imgs="' + f.k + '" data-multi="' + (t === 'images') + '"></div>';
        else if (t === 'file') inner = lab + '<div class="fileline" data-file="' + f.k + '"></div>';
        return '<div class="' + cls + '" data-field="' + f.k + '"' + hide + '>' + inner + hint + '</div>';
      }

      var form = $('[data-form]'), msg = $('[data-msg]');
      form.addEventListener('input', function () { dirty = true; });
      form.addEventListener('change', function (e) {
        dirty = true;
        var el = e.target, k = el.getAttribute('data-k'); if (!k) return;
        readField(k, el);
        C.groups.forEach(function (g) { g[1].forEach(function (f) { if (f.show) { var w = $('[data-field="' + f.k + '"]'); if (w) w.hidden = !f.show(data); } }); });
      });
      function readField(k, el) {
        var f = findField(k), t = f.type || 'string', v;
        if (t === 'bool') v = el.checked;
        else if (t === 'number') v = el.value === '' ? '' : Number(el.value);
        else if (t === 'chips') v = $$('input[data-k="' + k + '"]:checked').map(function (x) { return x.value; });
        else v = el.value;
        if (k === 'body') data.body = v; else set(data, k, v);
      }
      function findField(k) { var r; C.groups.forEach(function (g) { g[1].forEach(function (f) { if (f.k === k) r = f; }); }); return r; }

      // tags
      $$('[data-tags]').forEach(function (box) {
        var k = box.getAttribute('data-tags');
        function draw() {
          var arr = get(data, k) || [];
          box.innerHTML = arr.map(function (t, i) { return '<span class="t">' + esc(t) + '<button type="button" data-i="' + i + '" aria-label="Remove ' + esc(t) + '">✕</button></span>'; }).join('') + '<input type="text" placeholder="Type and press Enter" aria-label="Add">';
          $$('button', box).forEach(function (b) { b.onclick = function () { arr.splice(+b.getAttribute('data-i'), 1); set(data, k, arr); dirty = true; draw(); }; });
          var inp = $('input', box);
          inp.onkeydown = function (e) { if ((e.key === 'Enter' || e.key === ',') && inp.value.trim()) { e.preventDefault(); arr.push(inp.value.trim().replace(/,$/, '')); set(data, k, arr); dirty = true; draw(); $('input', box).focus(); } };
          inp.onblur = function () { if (inp.value.trim()) { arr.push(inp.value.trim()); set(data, k, arr); dirty = true; draw(); } };
        }
        draw();
      });
      // images
      $$('[data-imgs]').forEach(function (box) {
        var k = box.getAttribute('data-imgs'), multi = box.getAttribute('data-multi') === 'true';
        function val() { var v = get(data, k); return multi ? (v || []).map(function (x) { return typeof x === 'string' ? x : x && x.image; }).filter(Boolean) : (v ? [v] : []); }
        function put(arr) { set(data, k, multi ? arr : (arr[0] || '')); dirty = true; draw(); }
        function draw() {
          var arr = val();
          box.innerHTML = arr.map(function (p, i) {
            return '<div class="ph' + (multi ? ' is-list' : '') + '"><img alt="" src="' + esc(imgSrc(p)) + '">' + (multi ? '<span class="tag">' + (i ? i + 1 : 'Main') + '</span>' : '') +
              '<span class="tools">' + (multi && i ? '<button type="button" data-l="' + i + '" aria-label="Move left">←</button>' : '') + (multi && i < arr.length - 1 ? '<button type="button" data-r="' + i + '" aria-label="Move right">→</button>' : '') + '<button type="button" data-x="' + i + '" aria-label="Remove photo">✕</button></span></div>';
          }).join('') + ((multi || !arr.length) ? '<label class="add-ph"><input type="file" accept="image/*" ' + (multi ? 'multiple ' : '') + 'hidden>＋<br>Add photo' + (multi ? 's' : '') + '</label>' : '<label class="add-ph"><input type="file" accept="image/*" hidden>Replace photo</label>');
          $$('[data-x]', box).forEach(function (b) { b.onclick = function () { arr.splice(+b.getAttribute('data-x'), 1); put(arr); }; });
          $$('[data-l]', box).forEach(function (b) { b.onclick = function () { var i = +b.getAttribute('data-l'); arr.splice(i - 1, 0, arr.splice(i, 1)[0]); put(arr); }; });
          $$('[data-r]', box).forEach(function (b) { b.onclick = function () { var i = +b.getAttribute('data-r'); arr.splice(i + 1, 0, arr.splice(i, 1)[0]); put(arr); }; });
          var inp = $('input[type=file]', box);
          inp.onchange = function () {
            var files = Array.prototype.slice.call(inp.files || []);
            Promise.all(files.map(shrink)).then(function (rs) { var ids = rs.map(function (r) { return addUpload(r.dataUrl, r.name); }); put(multi ? arr.concat(ids) : ids.slice(0, 1)); }).catch(function (e) { toast(e.message); });
          };
        }
        draw();
      });
      // file (receipt)
      $$('[data-file]').forEach(function (box) {
        var k = box.getAttribute('data-file');
        function draw() {
          var v = get(data, k);
          box.innerHTML = (v ? (uploads[v] ? '<span>📎 New file ready to save</span>' : '<a href="' + esc(imgSrc(v)) + '" target="_blank" rel="noopener">📎 View current file</a>') + ' <button type="button" class="btn btn--ghost btn--sm" data-rm>Remove</button>' : '') +
            '<label class="btn btn--ghost btn--sm"><input type="file" accept="image/*,application/pdf" hidden>' + (v ? 'Replace' : 'Upload') + '</label>';
          var rm = $('[data-rm]', box); if (rm) rm.onclick = function () { set(data, k, ''); dirty = true; draw(); };
          var inp = $('input', box);
          inp.onchange = function () { var f = inp.files[0]; if (!f) return; shrink(f).then(function (r) { set(data, k, addUpload(r.dataUrl, f.type === 'application/pdf' ? 'receipt.pdf' : 'receipt.jpg')); dirty = true; draw(); }).catch(function (e) { toast(e.message); }); };
        }
        draw();
      });

      form.onsubmit = function (e) {
        e.preventDefault();
        $$('[aria-invalid]', form).forEach(function (x) { x.removeAttribute('aria-invalid'); });
        var missing = [];
        C.groups.forEach(function (g) { g[1].forEach(function (f) {
          if (!f.req || (f.show && !f.show(data))) return;
          var v = f.k === 'body' ? data.body : get(data, f.k);
          if (v == null || v === '' || (Array.isArray(v) && !v.length)) { missing.push(f.label); var el = $('[data-field="' + f.k + '"] input, [data-field="' + f.k + '"] select, [data-field="' + f.k + '"] textarea', form); if (el) el.setAttribute('aria-invalid', 'true'); }
        }); });
        if (missing.length) { msg.className = 'msg err'; msg.textContent = 'Please fill in: ' + missing.join(', ') + '.'; return; }
        var body = data.body; var out = JSON.parse(JSON.stringify(data)); delete out.body;
        if (key === 'pawsome' && typeof out.count === 'number' && out.count <= 1) delete out.count;
        var newSlug = slug || (C.slugFrom ? C.slugFrom(out) : slugify(out[C.titleKey]));
        var used = {}; JSON.stringify(out, function (k2, v2) { if (typeof v2 === 'string' && uploads[v2]) used[v2] = uploads[v2]; return v2; });
        $('button[type=submit]', form).disabled = true; msg.className = 'msg'; msg.textContent = 'Saving…';
        api('/api/content/' + key + '/' + newSlug, { method: 'PUT', json: { data: out, body: body, isNew: !slug, uploads: Object.keys(used).map(function (u) { return used[u]; }) } }).then(function (j) {
          // keep showing the new photos until the site finishes publishing them
          mapPreviews(out, j.data);
          dirty = false;
          var items2 = S.cache[key] || []; var ex = items2.filter(function (x) { return x.slug === newSlug; })[0];
          if (ex) { ex.data = j.data; ex.body = body; } else items2.push({ slug: newSlug, data: j.data, body: body });
          toast('Saved! The website updates in about 2 minutes.');
          location.hash = '#c/' + key;
        }).catch(function (err) { msg.className = 'msg err'; msg.textContent = err.message; $('button[type=submit]', form).disabled = false; });
      };
      var del = $('[data-del]');
      if (del) del.onclick = function () {
        if (!confirm('Delete "' + (it.data[C.titleKey] || slug) + '" from the website? This can\'t be undone here.')) return;
        del.disabled = true;
        api('/api/content/' + key + '/' + slug, { method: 'DELETE' }).then(function () { S.cache[key] = (S.cache[key] || []).filter(function (x) { return x.slug !== slug; }); dirty = false; toast('Deleted. The website updates in about 2 minutes.'); location.hash = '#c/' + key; })
          .catch(function (e) { msg.className = 'msg err'; msg.textContent = e.message; del.disabled = false; });
      };
    }).catch(function (e) { main().innerHTML = '<p class="empty msg err">' + esc(e.message) + '</p>'; });
  }
  // After saving, the server swaps "upload:…" ids for real paths. Point those paths at the local preview until the site publishes them.
  function mapPreviews(sent, saved) {
    (function walk(a, b) {
      if (typeof a === 'string' && typeof b === 'string' && a !== b && S.preview[a]) S.preview[b] = S.preview[a];
      else if (a && b && typeof a === 'object') Object.keys(a).forEach(function (k) { walk(a[k], b[k]); });
    })(sent, saved);
  }

  // ---------- submissions ----------
  var SLOC = { 'mdas-doral': 'MDAS · Doral', 'mdas-medley': 'MDAS · Medley', broward: 'Broward shelter', rescue: 'Rescue', foster: 'In foster', family: 'Family rehoming', other: 'Other' };
  var SYN = { yes: 'Yes', no: 'No', some: 'Some / depends', unknown: 'Not sure' };
  var photoUrls = {};
  function submissions(tab) {
    tab = tab || 'pending';
    main().innerHTML = '<div class="head"><div><h1>📥 Submitted pups</h1><p>Pups sent through the "Submit a pup" form. Nothing goes on the site until you approve it.</p></div><a class="btn btn--ghost btn--sm" href="../pawsome-pooches/submit/" target="_blank" rel="noopener">See the form ↗</a></div><div class="tabs" data-tabs></div><div data-subs><p class="empty">Loading…</p></div>';
    loadSubs().then(function (list) {
      var c = { pending: 0, approved: 0, rejected: 0 }; list.forEach(function (s) { c[s.status] = (c[s.status] || 0) + 1; });
      $('[data-tabs]').innerHTML = [['pending', 'To review'], ['approved', 'Approved'], ['rejected', 'Rejected']].map(function (t) { return '<button class="tab" data-t="' + t[0] + '" aria-pressed="' + (tab === t[0]) + '">' + t[1] + ' (' + c[t[0]] + ')</button>'; }).join('');
      $$('[data-t]').forEach(function (b) { b.onclick = function () { submissions(b.getAttribute('data-t')); }; });
      var items = list.filter(function (s) { return s.status === tab; });
      var box = $('[data-subs]');
      box.innerHTML = items.length ? items.map(subCard).join('') : '<p class="empty">' + (tab === 'pending' ? 'No new submissions. 🐶' : 'Nothing here yet.') + '</p>';
      items.forEach(function (s) { wireSub(s, tab); });
    }).catch(function (e) { $('[data-subs]').innerHTML = '<p class="empty msg err">' + esc(e.message) + '</p>'; });
  }
  function subCard(s) {
    var d = s.dog, p = s.submitter, photos = '';
    for (var i = 0; i < s.photoCount; i++) photos += '<figure data-i="' + i + '"' + (i === 0 ? ' class="main"' : '') + '><img alt="Photo ' + (i + 1) + '" data-ph="' + s.id + '/' + i + '"><figcaption>' + (i ? i + 1 : 'Main') + '</figcaption></figure>';
    var social = String(p.social || '').replace(/^@/, '');
    return '<article class="card" id="s-' + s.id + '"><div class="sub"><div><div class="photos" data-photos>' + (photos || '<p class="hint">Photos removed.</p>') + '</div>' + (s.status === 'pending' && s.photoCount > 1 ? '<p class="hint">Tap a photo to make it the main one.</p>' : '') + '</div><div>' +
      '<p><span class="pill ' + (s.status === 'approved' ? 'ok' : s.status === 'rejected' ? 'bad' : 'warn') + '">' + s.status + '</span><span class="pill">' + esc(SLOC[d.locationType] || d.locationType) + '</span><span class="pill">' + esc(d.needs === 'both' ? 'Adopt or foster' : d.needs === 'foster' ? 'Needs foster' : 'Needs adopter') + '</span></p>' +
      '<h2>' + esc(d.name) + '</h2><p class="hint">Submitted ' + esc(new Date(s.createdAt).toLocaleString()) + '</p>' +
      '<dl class="facts"><dt>Breed</dt><dd>' + esc(d.breed) + '</dd><dt>Age</dt><dd>' + esc(d.age) + '</dd><dt>Sex</dt><dd>' + esc(d.sex) + '</dd><dt>Spayed/neutered</dt><dd>' + SYN[d.fixed] + '</dd><dt>Vaccines</dt><dd>' + SYN[d.vaccinated] + '</dd><dt>Microchip</dt><dd>' + SYN[d.microchipped] + '</dd><dt>Heartworm neg.</dt><dd>' + SYN[d.heartworm] + '</dd>' +
      '<dt>Good with</dt><dd>Dogs: ' + SYN[d.goodWithDogs] + ' · Cats: ' + SYN[d.goodWithCats] + ' · Kids: ' + SYN[d.goodWithKids] + '</dd><dt>Where</dt><dd>' + esc([d.orgName, SLOC[d.locationType], d.city].filter(Boolean).join(', ')) + '</dd>' + (d.animalId ? '<dt>Shelter ID</dt><dd>' + esc(d.animalId) + '</dd>' : '') + '</dl>' +
      '<div class="private"><h3>Submitted by (private)</h3><dl class="facts"><dt>Name</dt><dd>' + esc(p.firstName + ' ' + p.lastName) + '</dd><dt>Social</dt><dd><a href="https://www.instagram.com/' + encodeURIComponent(social) + '/" target="_blank" rel="noopener">@' + esc(social) + '</a></dd><dt>Phone</dt><dd><a href="tel:' + esc(String(p.phone).replace(/[^\d+]/g, '')) + '">' + esc(p.phone) + '</a></dd><dt>Email</dt><dd><a href="mailto:' + esc(p.email) + '">' + esc(p.email) + '</a></dd></dl></div>' +
      (s.status === 'pending' ?
        '<div class="grid"><div class="f wide"><label for="n-' + s.id + '">Name on the site</label><input type="text" id="n-' + s.id + '" value="' + esc(d.name) + '"></div>' +
        '<div class="f wide"><label for="t-' + s.id + '">One-line intro</label><input type="text" id="t-' + s.id + '" maxlength="220" placeholder="e.g. A goofy, gentle pit mix who loves car rides"></div>' +
        '<div class="f wide"><label for="b-' + s.id + '">Story</label><textarea id="b-' + s.id + '">' + esc(d.about) + '</textarea></div>' +
        '<label class="switch wide"><input type="checkbox" id="u-' + s.id + '"> Mark as urgent</label></div>' +
        '<div class="actions" style="position:static"><button class="btn btn--go" data-approve>✓ Approve &amp; publish</button><button class="btn btn--danger" data-reject>Reject</button><span class="msg" data-msg role="status"></span></div>'
        : s.status === 'approved' ? '<p class="msg ok">Published' + (s.published ? ': <a href="' + esc(s.published.url) + '" target="_blank" rel="noopener">view on site</a>' : '') + '</p><p class="hint">Edit it or mark it adopted under Pawsome Pooches.</p>'
        : '<div class="actions" style="position:static"><button class="btn btn--ghost" data-delete>Delete for good</button><span class="msg" data-msg role="status"></span></div>') +
      '</div></div></article>';
  }
  function wireSub(s, tab) {
    var el = document.getElementById('s-' + s.id); if (!el) return;
    $$('img[data-ph]', el).forEach(function (img) {
      var k = img.getAttribute('data-ph'); if (photoUrls[k]) { img.src = photoUrls[k]; return; }
      api('/admin/photo/' + k).then(function (b) { photoUrls[k] = URL.createObjectURL(b); img.src = photoUrls[k]; }).catch(function () {});
    });
    var order = []; for (var i = 0; i < s.photoCount; i++) order.push(i);
    var box = $('[data-photos]', el);
    if (s.status === 'pending') $$('figure', el).forEach(function (f) {
      f.onclick = function () { var i = +f.getAttribute('data-i'); order = [i].concat(order.filter(function (x) { return x !== i; })); order.forEach(function (x, n) { var fig = $('figure[data-i="' + x + '"]', box); box.appendChild(fig); fig.classList.toggle('main', n === 0); $('figcaption', fig).textContent = n ? n + 1 : 'Main'; }); };
    });
    var msg = $('[data-msg]', el), ap = $('[data-approve]', el), rj = $('[data-reject]', el), dl = $('[data-delete]', el);
    if (ap) ap.onclick = function () {
      ap.disabled = rj.disabled = true; msg.className = 'msg'; msg.textContent = 'Publishing…';
      api('/admin/approve/' + s.id, { method: 'POST', json: { name: $('#n-' + s.id).value, tagline: $('#t-' + s.id).value, story: $('#b-' + s.id).value, urgent: $('#u-' + s.id).checked, photoOrder: order } })
        .then(function () { delete S.cache.pawsome; toast('Published! It will be on Pawsome Pooches in about 2 minutes.'); submissions(tab); })
        .catch(function (e) { msg.className = 'msg err'; msg.textContent = e.message; ap.disabled = rj.disabled = false; });
    };
    if (rj) rj.onclick = function () {
      if (!confirm('Reject "' + s.dog.name + '"? The photos will be deleted.')) return;
      rj.disabled = ap.disabled = true;
      api('/admin/reject/' + s.id, { method: 'POST', json: {} }).then(function () { toast('Rejected.'); submissions(tab); }).catch(function (e) { msg.className = 'msg err'; msg.textContent = e.message; rj.disabled = ap.disabled = false; });
    };
    if (dl) dl.onclick = function () {
      if (!confirm('Delete this submission for good?')) return;
      api('/admin/delete/' + s.id, { method: 'POST', json: {} }).then(function () { submissions(tab); }).catch(function (e) { msg.className = 'msg err'; msg.textContent = e.message; });
    };
  }

  // ---------- donations ----------
  function donations() {
    main().innerHTML = '<div class="head"><div><h1>💛 Donations</h1><p>Your payment handles, the amounts people can pick, and whether the Donate button shows on the site.</p></div></div><div data-don><p class="empty">Loading…</p></div>';
    api('/api/settings').then(function (st) {
      var d = st.donate || {}; var methods = d.methods || []; var tiers = d.tiers || [];
      var PH = { paypal: 'your paypal.me name', venmo: 'your Venmo @username', zelle: 'email or phone for Zelle', cashapp: 'your Cash App $tag' };
      $('[data-don]').innerHTML = '<form data-dform novalidate>' +
        '<section class="card"><h2>Donate button</h2><label class="switch"><input type="checkbox" data-show' + (d.showButton ? ' checked' : '') + '> Show the Donate button on the website</label><p class="hint">When no payment option is turned on below, the pop-up says "Online giving opens soon".</p></section>' +
        '<section class="card"><h2>Payment options</h2><p class="hint">Type the handle and turn it on. The first one turned on with ⭐ becomes the big orange button.</p>' +
        methods.map(function (m, i) { return '<div class="method"><b>' + esc(m.name) + '</b><input type="text" data-h="' + i + '" value="' + esc(m.handle || '') + '" placeholder="' + esc(PH[m.type] || 'handle') + '" aria-label="' + esc(m.name) + ' handle"><label class="switch"><input type="checkbox" data-v="' + i + '"' + (m.verified ? ' checked' : '') + '> On</label><label class="switch" title="Main button"><input type="radio" name="primary" data-p="' + i + '"' + (m.primary ? ' checked' : '') + '> ⭐</label></div>'; }).join('') + '</section>' +
        '<section class="card"><h2>Amounts</h2><p class="hint">What each amount pays for. Leave the amount empty for "Any". The selected one is picked by default.</p>' +
        tiers.map(function (t, i) { return '<div class="tier-row" style="margin-bottom:8px"><input type="text" data-ta="' + i + '" value="' + esc(t.amount) + '" placeholder="Any" aria-label="Amount"><input type="text" data-te="' + i + '" value="' + esc(t.emoji) + '" aria-label="Emoji"><input type="text" data-tl="' + i + '" value="' + esc(t.label) + '" aria-label="What it pays for"><label class="switch"><input type="radio" name="deftier" data-td="' + i + '"' + (t.default ? ' checked' : '') + '> Default</label></div>'; }).join('') + '</section>' +
        '<section class="card"><h2>Adoption emails</h2><div class="f"><label for="pe">"Email us about [pup]" goes to</label><input type="email" id="pe" value="' + esc((st.pawsome && st.pawsome.email) || '') + '"></div></section>' +
        '<div class="actions"><button class="btn btn--go" type="submit">💾 Save</button><span class="msg" data-msg role="status"></span></div></form>';
      var f = $('[data-dform]'), msg = $('[data-msg]', f);
      f.addEventListener('input', function () { dirty = true; });
      f.onsubmit = function (e) {
        e.preventDefault();
        methods.forEach(function (m, i) { m.handle = $('[data-h="' + i + '"]').value.trim(); m.verified = $('[data-v="' + i + '"]').checked && !!m.handle; m.primary = $('[data-p="' + i + '"]').checked; });
        if (methods.some(function (m) { return $('[data-v="' + methods.indexOf(m) + '"]').checked && !m.handle; })) { msg.className = 'msg err'; msg.textContent = 'Add a handle for each option you turned on.'; return; }
        tiers.forEach(function (t, i) { t.amount = $('[data-ta="' + i + '"]').value; t.emoji = $('[data-te="' + i + '"]').value; t.label = $('[data-tl="' + i + '"]').value; t.default = $('[data-td="' + i + '"]').checked; });
        $('button[type=submit]', f).disabled = true; msg.className = 'msg'; msg.textContent = 'Saving…';
        api('/api/settings', { method: 'PUT', json: { donate: { methods: methods, tiers: tiers, showButton: $('[data-show]').checked }, pawsome: { email: $('#pe').value } } })
          .then(function () { dirty = false; msg.className = 'msg ok'; msg.textContent = 'Saved! The website updates in about 2 minutes.'; $('button[type=submit]', f).disabled = false; })
          .catch(function (er) { msg.className = 'msg err'; msg.textContent = er.message; $('button[type=submit]', f).disabled = false; });
      };
    }).catch(function (e) { $('[data-don]').innerHTML = '<p class="empty msg err">' + esc(e.message) + '</p>'; });
  }

  // ---------- profile & security ----------
  function profile() {
    main().innerHTML = '<p class="empty">Loading…</p>';
    loadMe().then(function (me) {
      var photo = me.photo || '';
      main().innerHTML = '<div class="head"><div><h1>⚙️ Profile &amp; security</h1><p>Your login, your details and two-step sign-in.</p></div></div>' +
        '<section class="card"><h2>Profile</h2><form data-prof novalidate><div class="grid">' +
        '<div class="f wide"><span class="lbl">Photo</span><div class="me-photo"><span class="avatar avatar--lg" data-ph></span><label class="btn btn--ghost btn--sm"><input type="file" accept="image/*" hidden data-phin>Choose photo</label><button type="button" class="btn btn--ghost btn--sm" data-phrm>Remove</button></div></div>' +
        '<div class="f"><label for="p-name">Your name</label><input type="text" id="p-name" value="' + esc(me.name) + '" autocomplete="name"></div>' +
        '<div class="f"><label for="p-user">Username <span class="req">*</span></label><input type="text" id="p-user" value="' + esc(me.username) + '" autocomplete="username" autocapitalize="off" spellcheck="false"><p class="hint">You\'ll sign in with this. Letters, numbers, dots or dashes.</p></div>' +
        '<div class="f"><label for="p-mail">Email</label><input type="email" id="p-mail" value="' + esc(me.email) + '" autocomplete="email"></div>' +
        '</div><div class="actions" style="position:static"><button class="btn btn--go" type="submit">💾 Save profile</button><span class="msg" data-m0 role="status"></span></div></form></section>' +
        '<section class="card"><h2>Two-step sign-in</h2><div data-2fa></div></section>' +
        '<section class="card"><h2>Change password</h2><form data-pw class="grid" novalidate><div class="f"><label for="cur">Current password</label><input type="password" id="cur" autocomplete="current-password"></div><div class="f"><label for="np">New password</label><input type="password" id="np" autocomplete="new-password"><p class="hint">At least 10 characters.</p></div><div class="wide"><button class="btn btn--blue" type="submit">Change password</button> <span class="msg" data-m1 role="status"></span></div></form></section>' +
        '<section class="card"><h2>Website connection</h2><p class="hint">Only needed if saving ever says the connection expired. Paste a new GitHub token (Contents: Read and write for bentleys-playhouse).</p><form data-gh class="grid" novalidate><div class="f wide"><label for="gt">New GitHub token</label><input type="password" id="gt" autocomplete="off"></div><div class="wide"><button class="btn btn--ghost" type="submit">Reconnect</button> <span class="msg" data-m2 role="status"></span></div></form></section>' +
        '<section class="card"><h2>Sign out</h2><p class="hint">Signs this browser out of the admin.</p><button class="btn btn--danger" data-out>Sign out</button></section>';
      function drawPhoto() { $('[data-ph]').innerHTML = photo ? '<img alt="" src="' + esc(photo) + '">' : esc(((me.name || me.username || '?')[0] || '?').toUpperCase()); $('[data-phrm]').hidden = !photo; }
      drawPhoto();
      $('[data-phin]').onchange = function () {
        var f = this.files[0]; if (!f) return;
        var url = URL.createObjectURL(f), img = new Image();
        img.onload = function () { var c = document.createElement('canvas'), z = 240, k = Math.max(z / img.naturalWidth, z / img.naturalHeight); c.width = c.height = z; var w = img.naturalWidth * k, h = img.naturalHeight * k; c.getContext('2d').drawImage(img, (z - w) / 2, (z - h) / 2, w, h); photo = c.toDataURL('image/jpeg', 0.85); URL.revokeObjectURL(url); drawPhoto(); };
        img.onerror = function () { toast('Please choose a JPG or PNG photo.'); }; img.src = url;
      };
      $('[data-phrm]').onclick = function () { photo = ''; drawPhoto(); };
      $('[data-prof]').onsubmit = function (e) {
        e.preventDefault(); var m = $('[data-m0]'); m.className = 'msg'; m.textContent = 'Saving…';
        api('/auth/profile', { method: 'POST', json: { username: $('#p-user').value, name: $('#p-name').value, email: $('#p-mail').value, photo: photo } })
          .then(function () { m.className = 'msg ok'; m.textContent = 'Saved.'; loadMe(); }).catch(function (er) { m.className = 'msg err'; m.textContent = er.message; });
      };
      twoFactor(me);
      $('[data-pw]').onsubmit = function (e) { e.preventDefault(); var m = $('[data-m1]'); m.className = 'msg'; m.textContent = 'Saving…'; api('/auth/password', { method: 'POST', json: { current: $('#cur').value, password: $('#np').value } }).then(function () { m.className = 'msg ok'; m.textContent = 'Password changed.'; $('#cur').value = $('#np').value = ''; }).catch(function (er) { m.className = 'msg err'; m.textContent = er.message; }); };
      $('[data-gh]').onsubmit = function (e) { e.preventDefault(); var m = $('[data-m2]'); m.className = 'msg'; m.textContent = 'Checking…'; api('/auth/github', { method: 'POST', json: { githubToken: $('#gt').value } }).then(function () { m.className = 'msg ok'; m.textContent = 'Connected.'; $('#gt').value = ''; }).catch(function (er) { m.className = 'msg err'; m.textContent = er.message; }); };
      $('[data-out]').onclick = function () { api('/auth/logout', { method: 'POST', json: {} }).catch(function () {}).then(function () { S.session = null; store(SKEY, null); gate(); }); };
    }).catch(function (e) { main().innerHTML = '<p class="empty msg err">' + esc(e.message) + '</p>'; });
  }
  function showCodes(box, codes, intro) {
    box.innerHTML = '<p class="msg ok">' + intro + '</p><p>Save these backup codes somewhere safe (like your password manager or a note). Each one works <b>once</b> if you ever lose your phone.</p>' +
      '<ul class="codes">' + codes.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>' +
      '<div class="btn-line"><button type="button" class="btn btn--ghost btn--sm" data-copy>Copy codes</button><button type="button" class="btn btn--ghost btn--sm" data-dl>Download as a file</button><button type="button" class="btn btn--go btn--sm" data-done>I saved them</button></div>';
    var text = "Bentley's Playhouse admin backup codes\n" + codes.join('\n') + '\n';
    $('[data-copy]', box).onclick = function () { (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { toast('Copied.'); }, function () { toast('Copy didn\'t work. Please write them down.'); }); };
    $('[data-dl]', box).onclick = function () { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' })); a.download = 'bentleys-playhouse-backup-codes.txt'; a.click(); };
    $('[data-done]', box).onclick = function () { loadMe().then(twoFactor); };
  }
  function twoFactor(me) {
    var box = $('[data-2fa]'); if (!box) return;
    if (me.twoFactor) {
      box.innerHTML = '<p><span class="pill ok">On</span> When you sign in, you\'ll also type a 6-digit code from your authenticator app.</p><p class="hint">Backup codes left: <b>' + me.recoveryLeft + '</b></p>' +
        '<div class="grid"><div class="f"><label for="p2">Your password (to make changes)</label><input type="password" id="p2" autocomplete="current-password"></div></div>' +
        '<div class="btn-line"><button type="button" class="btn btn--ghost btn--sm" data-newcodes>Make new backup codes</button><button type="button" class="btn btn--danger btn--sm" data-off>Turn off two-step sign-in</button><span class="msg" data-m3 role="status"></span></div>';
      $('[data-newcodes]', box).onclick = function () { api('/auth/recovery', { method: 'POST', json: { password: $('#p2').value } }).then(function (j) { showCodes(box, j.recoveryCodes, 'New backup codes made. The old ones no longer work.'); }).catch(function (er) { var m = $('[data-m3]'); m.className = 'msg err'; m.textContent = er.message; }); };
      $('[data-off]', box).onclick = function () { if (!confirm('Turn off two-step sign-in? Your account will be less protected.')) return; api('/auth/2fa-disable', { method: 'POST', json: { password: $('#p2').value } }).then(function () { toast('Two-step sign-in is off.'); loadMe().then(twoFactor); }).catch(function (er) { var m = $('[data-m3]'); m.className = 'msg err'; m.textContent = er.message; }); };
      return;
    }
    box.innerHTML = '<p><span class="pill warn">Off</span> Add a second step to signing in: after your password, you type a 6-digit code from an app on your phone. Even if someone learns your password, they can\'t get in.</p>' +
      '<button type="button" class="btn btn--go" data-start>Turn on two-step sign-in</button>';
    $('[data-start]', box).onclick = function () {
      api('/auth/2fa-start', { method: 'POST', json: {} }).then(function (j) {
        box.innerHTML = '<ol class="steps"><li>On your phone, open an authenticator app. Google Authenticator, Microsoft Authenticator and 1Password all work. If you have none, install <b>Google Authenticator</b> (free).</li>' +
          '<li>In the app, tap <b>+</b> and scan this code:<div class="qr" data-qr></div><details><summary>Can\'t scan? Type this key instead</summary><code class="key">' + esc(j.secret.replace(/(.{4})/g, '$1 ').trim()) + '</code></details></li>' +
          '<li>Type the 6-digit code the app shows:<div class="code-row"><input type="text" id="c1" inputmode="numeric" autocomplete="one-time-code" maxlength="6" aria-label="6-digit code"><button type="button" class="btn btn--go" data-confirm>Turn on</button></div><p class="msg" data-m4 role="status"></p></li></ol>';
        drawQr($('[data-qr]', box), j.uri);
        $('#c1').focus();
        $('[data-confirm]', box).onclick = function () {
          var m = $('[data-m4]'); m.className = 'msg'; m.textContent = 'Checking…';
          api('/auth/2fa-confirm', { method: 'POST', json: { code: $('#c1').value } }).then(function (r) { showCodes(box, r.recoveryCodes, '✓ Two-step sign-in is on.'); }).catch(function (er) { m.className = 'msg err'; m.textContent = er.message; });
        };
      }).catch(function (er) { toast(er.message); });
    };
  }
  function drawQr(el, text) {
    function go() { var q = window.qrcode(0, 'M'); q.addData(text); q.make(); el.innerHTML = q.createSvgTag({ cellSize: 5, margin: 2, scalable: true }); }
    if (window.qrcode) return go();
    var sc = document.createElement('script'); sc.src = 'qr.js'; sc.onload = go;
    sc.onerror = function () { el.innerHTML = '<p class="hint">The code picture couldn\'t load. Use "Type this key instead" below.</p>'; };
    document.head.appendChild(sc);
  }


  // ---------- manage users (several admins, like Fénix) ----------
  function fmtDate(iso) { if (!iso) return '–'; var d = new Date(iso); return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
  function modal(html) {
    var d = document.createElement('dialog'); d.className = 'modal'; d.innerHTML = '<div class="modal__in">' + html + '</div>';
    document.body.appendChild(d); d.showModal();
    d.addEventListener('close', function () { d.remove(); });
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
    $$('[data-close]', d).forEach(function (b) { b.onclick = function () { d.close(); }; });
    return d;
  }
  function manageUsers() {
    main().innerHTML = '<div class="head"><div><h1>👥 Manage users</h1><p>Everyone who can sign in to this admin. Each person gets their own username and password.</p></div><button class="btn btn--go" data-new>＋ New admin</button></div><div data-users><p class="empty">Loading…</p></div>';
    $('[data-new]').onclick = function () { userForm(null); };
    api('/auth/users').then(function (j) {
      var box = $('[data-users]'); if (!box) return;
      box.innerHTML = '<div class="card ut-wrap"><table class="ut"><thead><tr><th>Username</th><th>Display name</th><th>Email</th><th>Status</th><th>2FA</th><th>Created</th><th>Actions</th></tr></thead><tbody>' +
        j.users.map(function (u) {
          var you = u.id === j.me;
          return '<tr data-id="' + esc(u.id) + '"><td data-l="Username"><b>' + esc(u.username || '(not set)') + '</b>' + (you ? ' <span class="pill">You</span>' : '') + '</td><td data-l="Display name">' + esc(u.name || '–') + '</td><td data-l="Email">' + esc(u.email || '–') + '</td>' +
            '<td data-l="Status"><span class="pill ' + (u.active ? 'ok' : 'bad') + '">' + (u.active ? 'Active' : 'Off') + '</span></td>' +
            '<td data-l="2FA"><span class="pill ' + (u.twoFactor ? 'ok' : 'warn') + '">' + (u.twoFactor ? 'On' : 'Off') + '</span></td>' +
            '<td data-l="Created">' + esc(fmtDate(u.createdAt)) + '</td>' +
            '<td data-l="Actions"><div class="ut-act"><button class="btn btn--ghost btn--sm" data-a="edit">✏️ Edit</button>' +
            (u.twoFactor ? '<button class="btn btn--ghost btn--sm" data-a="2fa-off">Disable 2FA</button>' : '<button class="btn btn--ghost btn--sm" data-a="2fa-on">🔐 Enable 2FA</button>') +
            (you ? '' : '<button class="btn btn--ghost btn--sm" data-a="toggle">' + (u.active ? '⏸ Deactivate' : '▶ Activate') + '</button><button class="btn btn--danger btn--sm" data-a="del" aria-label="Delete ' + esc(u.username) + '">🗑</button>') +
            '</div></td></tr>';
        }).join('') + '</tbody></table></div>';
      $$('tr[data-id]', box).forEach(function (tr) {
        var u = j.users.filter(function (x) { return x.id === tr.getAttribute('data-id'); })[0], you = u.id === j.me;
        $$('[data-a]', tr).forEach(function (b) {
          b.onclick = function () {
            var a = b.getAttribute('data-a');
            if (a === 'edit') return you ? (location.hash = '#profile') : userForm(u);
            if (a === '2fa-on') return you ? (location.hash = '#profile') : userTwoFactor(u);
            if (a === '2fa-off') {
              if (you) { location.hash = '#profile'; return; }
              if (!confirm('Turn off two-step sign-in for ' + u.username + '?')) return;
              return api('/auth/users/' + u.id + '/2fa-disable', { method: 'POST', json: {} }).then(function () { toast('Two-step sign-in is off for ' + u.username + '.'); manageUsers(); }).catch(function (e) { toast(e.message); });
            }
            if (a === 'toggle') {
              if (u.active && !confirm('Turn off ' + u.username + '\'s account? They\'ll be signed out and can\'t sign in until you turn it back on.')) return;
              return api('/auth/users/' + u.id + '/active', { method: 'POST', json: { active: !u.active } }).then(function () { manageUsers(); }).catch(function (e) { toast(e.message); });
            }
            if (a === 'del') {
              if (!confirm('Delete ' + u.username + '\'s account for good?')) return;
              return api('/auth/users/' + u.id, { method: 'DELETE', json: {} }).then(function () { toast('Deleted.'); manageUsers(); }).catch(function (e) { toast(e.message); });
            }
          };
        });
      });
    }).catch(function (e) { var b = $('[data-users]'); if (b) b.innerHTML = '<p class="empty msg err">' + esc(e.message) + '</p>'; });
  }
  function userForm(u) {
    var d = modal('<button class="modal__x" data-close aria-label="Close">✕</button><h2>' + (u ? 'Edit ' + esc(u.username) : 'New admin') + '</h2>' +
      '<form novalidate class="grid" style="margin-top:14px"><div class="f wide"><label for="nu-user">Username <span class="req">*</span></label><input type="text" id="nu-user" value="' + esc(u ? u.username : '') + '" autocomplete="off" autocapitalize="off" spellcheck="false"></div>' +
      '<div class="f wide"><label for="nu-name">Display name</label><input type="text" id="nu-name" value="' + esc(u ? u.name : '') + '" autocomplete="off"></div>' +
      '<div class="f wide"><label for="nu-mail">Email <span class="hint">(optional)</span></label><input type="email" id="nu-mail" value="' + esc(u ? u.email : '') + '" autocomplete="off"></div>' +
      '<div class="f wide"><label for="nu-pw">' + (u ? 'New password' : 'Password <span class="req">*</span>') + '</label><input type="password" id="nu-pw" autocomplete="new-password"><p class="hint">' + (u ? 'Leave blank to keep their current password.' : 'At least 10 characters. Share it with them privately; they can change it in Profile &amp; security.') + '</p></div>' +
      '<p class="msg err wide" data-m role="alert"></p><div class="btn-line wide"><button class="btn btn--go" type="submit">' + (u ? 'Save' : 'Create admin') + '</button><button class="btn btn--ghost" type="button" data-close>Cancel</button></div></form>');
    $('#nu-user', d).focus();
    $('form', d).onsubmit = function (e) {
      e.preventDefault(); var m = $('[data-m]', d); m.textContent = '';
      var body = { username: $('#nu-user', d).value, name: $('#nu-name', d).value, email: $('#nu-mail', d).value, password: $('#nu-pw', d).value };
      if (!u && body.password.length < 10) { m.textContent = 'Please give them a password with at least 10 characters.'; return; }
      $('button[type=submit]', d).disabled = true;
      api(u ? '/auth/users/' + u.id : '/auth/users', { method: 'POST', json: body }).then(function () { d.close(); toast(u ? 'Saved.' : 'Admin created.'); manageUsers(); })
        .catch(function (er) { m.textContent = er.message; $('button[type=submit]', d).disabled = false; });
    };
  }
  function userTwoFactor(u) {
    var d = modal('<button class="modal__x" data-close aria-label="Close">✕</button><h2>Two-step sign-in for ' + esc(u.username) + '</h2><div data-2fabox><p class="empty">Loading…</p></div>');
    var box = $('[data-2fabox]', d);
    api('/auth/users/' + u.id + '/2fa-start', { method: 'POST', json: {} }).then(function (j) {
      box.innerHTML = '<p class="hint" style="margin:8px 0 12px">Do this with ' + esc(u.name || u.username) + ' next to you, using their phone.</p><ol class="steps"><li>On their phone, open an authenticator app (like Google Authenticator) and tap <b>+</b>.</li>' +
        '<li>Scan this code:<div class="qr" data-qr></div><details><summary>Can\'t scan? Type this key instead</summary><code class="key">' + esc(j.secret.replace(/(.{4})/g, '$1 ').trim()) + '</code></details></li>' +
        '<li>Type the 6-digit code their app shows:<div class="code-row"><input type="text" data-c inputmode="numeric" autocomplete="one-time-code" maxlength="6" aria-label="6-digit code"><button type="button" class="btn btn--go" data-ok>Turn on</button></div><p class="msg" data-m role="status"></p></li></ol>';
      drawQr($('[data-qr]', box), j.uri);
      $('[data-ok]', box).onclick = function () {
        var m = $('[data-m]', box); m.className = 'msg'; m.textContent = 'Checking…';
        api('/auth/users/' + u.id + '/2fa-confirm', { method: 'POST', json: { code: $('[data-c]', box).value } }).then(function (r) {
          showCodes(box, r.recoveryCodes, '✓ Two-step sign-in is on for ' + esc(u.username) + '. Give them these backup codes.');
          $('[data-done]', box).onclick = function () { d.close(); manageUsers(); };
        }).catch(function (er) { m.className = 'msg err'; m.textContent = er.message; });
      };
    }).catch(function (e) { box.innerHTML = '<p class="msg err">' + esc(e.message) + '</p>'; });
  }

  // ---------- start ----------
  if (!API) { app.innerHTML = '<div class="gate"><div class="gate__card"><h1>Admin not connected</h1><p>content/site.json → pawsome.submitEndpoint is empty.</p></div></div>'; return; }
  S.session = load(SKEY);
  if (S.session) { api('/auth/status').then(function (st) { if (st.session) { shell(); route(); } else { S.session = null; store(SKEY, null); gate(); } }).catch(function () { gate(); }); }
  else gate();
})();
