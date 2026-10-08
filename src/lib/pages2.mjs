// Transparency (ledger), vet clinic directory, and the Miami-Dade Animal Services adoption block.
import { ctx, esc, href, asset, md, tag, previewNote, show, ext, button, breadcrumb, icon, fmtDate, slugify } from './core.mjs';

const usd = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const DAYS = [['mon', 'Monday'], ['tue', 'Tuesday'], ['wed', 'Wednesday'], ['thu', 'Thursday'], ['fri', 'Friday'], ['sat', 'Saturday'], ['sun', 'Sunday']];
function t12(hm) { let [h, m] = hm.split(':').map(Number); if (h === 12 && !m) return 'noon'; if ((h === 0 || h === 24) && !m) return 'midnight'; const ap = h >= 12 && h < 24 ? 'p.m.' : 'a.m.'; h = h % 12 || 12; return m ? `${h}:${String(m).padStart(2, '0')} ${ap}` : `${h} ${ap}`; }
const span = (ranges) => ranges.length ? ranges.map(([a, b]) => `${t12(a)}–${t12(b)}`).join(', ') : 'Closed';

// ================= TRANSPARENCY =================
export function transparency(fin) {
  const { rows, isExample, docs, settings, warnings } = fin;
  const cats = Object.fromEntries([...settings.expenseCategories, ...settings.incomeCategories].map((c) => [c.id, c.label]));
  const years = [...new Set(rows.map((r) => r.date.slice(0, 4)))].sort().reverse();
  const totalIn = rows.filter((r) => r.type === 'income').reduce((a, r) => a + r.amount, 0);
  const totalOut = rows.filter((r) => r.type === 'expense').reduce((a, r) => a + r.amount, 0);
  const byCat = {};
  rows.filter((r) => r.type === 'expense').forEach((r) => { byCat[r.category] = (byCat[r.category] || 0) + r.amount; });
  const catRows = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...catRows.map((c) => c[1]));
  const receiptHref = (r) => !r.receipt ? '' : /^https?:/.test(r.receipt) ? r.receipt : asset('finances/receipts/' + r.receipt);
  const latest = rows.find((r) => !r.hideDate)?.date;

  const head = `
<section class="page-head page-head--donate">
  <div class="wrap">
    ${breadcrumb([['Home', ''], ['Transparency', '']])}
    <h1 class="page-h">Where the Money Goes</h1>
    <p class="page-lede">Every dollar we spend is listed here with its receipt: food, spay and neuter surgeries, medical bills, toys, help for other rescues. You shouldn't have to wonder what your support did.</p>
  </div>
</section>`;
  const promises = `
<ul class="promises" role="list">
  <li>${icon('list', { size: 22 })}<div><strong>Every expense, itemized</strong><span>Date, what it was for, who was paid and which dog it helped.</span></div></li>
  <li>${icon('image', { size: 22 })}<div><strong>Receipts attached</strong><span>Tap “Receipt” on any line to see the original, with card and account numbers blacked out.</span></div></li>
  <li>${icon('shield', { size: 22 })}<div><strong>Donors stay private</strong><span>We list money received as totals. We never publish donors' names unless they ask us to.</span></div></li>
  <li>${icon('chat', { size: 22 })}<div><strong>Ask us anything</strong><span>If something doesn't add up, <a href="${href('contact/')}">ask</a>. We'll answer.</span></div></li>
</ul>`;

  if (!rows.length) {
    return head + `<div class="wrap">${promises}
      <div class="empty empty--wide"><img src="${asset('img/bentley-head.png')}" alt="" width="110" height="127" class="empty__bentley"><div><h2>Our First Report Is on Its Way</h2><p>We're gathering receipts and statements. Entries will appear here as soon as they're posted.</p>${button('Other ways to help', 'get-involved/', { variant: 'ghost', ic: 'hands' })}</div></div>
    </div>`;
  }

  return head + `
<div class="wrap fin" data-fin>
  ${promises}
  ${isExample ? `<aside class="example-banner" role="note">${icon('alert', { size: 22 })}<div><strong>Example entries.</strong> The amounts, clinics and dogs below are made up to show how this page works. They aren't real records and they never appear on the live site. Add your real entries to <code>content/finances/transactions.csv</code>.</div></aside>` : ''}
  ${warnings.length && ctx.mode === 'preview' ? previewNote('Ledger check: ' + warnings.map(esc).join(' · ')) : ''}

  <form class="fin-controls" onsubmit="return false" aria-label="Filter the ledger">
    <div class="field"><label for="fin-year">Year</label><select id="fin-year"><option value="">All years</option>${years.map((y) => `<option>${y}</option>`).join('')}</select></div>
    <div class="field"><label for="fin-type">Show</label><select id="fin-type"><option value="">Money in and out</option><option value="expense">Spending only</option><option value="income">Money received only</option></select></div>
    <div class="field"><label for="fin-cat">Category</label><select id="fin-cat"><option value="">All categories</option><optgroup label="Spending">${settings.expenseCategories.map((c) => `<option value="${c.id}">${esc(c.label)}</option>`).join('')}</optgroup><optgroup label="Money received">${settings.incomeCategories.map((c) => `<option value="${c.id}">${esc(c.label)}</option>`).join('')}</optgroup></select></div>
    <div class="field fin-search"><label for="fin-q">Search</label><input id="fin-q" type="search" placeholder="Dog's name, clinic, item…" autocomplete="off"></div>
  </form>

  <section class="fin-summary" aria-label="Totals for the current filter">
    <div class="tile"><span class="tile__label">Money received</span><span class="tile__value" data-in>${usd(totalIn)}</span></div>
    <div class="tile"><span class="tile__label">Money spent</span><span class="tile__value" data-out>${usd(totalOut)}</span></div>
    <div class="tile"><span class="tile__label">Entries</span><span class="tile__value" data-count>${rows.length}</span><span class="tile__sub"><span data-receipts>${rows.filter((r) => r.receipt).length}</span> with receipts</span></div>
  </section>

  <section class="fin-chart" aria-labelledby="chart-h">
    <h2 id="chart-h" class="section-h section-h--sm">Spending by Category</h2>
    <ul class="bars" role="list" data-bars>
      ${catRows.map(([id, v]) => `<li class="bar" data-cat="${id}" title="${esc(cats[id] || id)}: ${usd(v)}"><span class="bar__label">${esc(cats[id] || id)}</span><span class="bar__track"><span class="bar__fill" style="width:${(v / max * 100).toFixed(1)}%"></span></span><span class="bar__value">${usd(v)}</span></li>`).join('')}
    </ul>
    <p class="muted small bars-empty" hidden>No spending matches these filters.</p>
  </section>

  <section class="fin-ledger" aria-labelledby="ledger-h">
    <div class="section-head"><h2 id="ledger-h" class="section-h section-h--sm">Every Entry</h2>
      ${isExample ? '' : `<a class="arrow-link" href="${asset('finances/transactions.csv')}">${icon('download', { size: 18 })} Full ledger (CSV)</a>`}</div>
    <div class="table-scroll">
      <table class="ledger">
        <thead><tr><th scope="col">Date</th><th scope="col">What it was for</th><th scope="col">Category</th><th scope="col" class="num-col">Amount</th><th scope="col">Receipt</th></tr></thead>
        <tbody>
          ${rows.map((r) => `<tr data-year="${r.date.slice(0, 4)}" data-type="${r.type}" data-cat="${r.category}" data-amount="${r.amount}" data-receipt="${r.receipt ? 1 : 0}" data-search="${esc([r.description, r.party, r.dog, r.notes, cats[r.category]].join(' ').toLowerCase())}">
            <td data-label="Date">${r.hideDate ? '<span class="muted" title="Date kept private">—</span>' : `<time datetime="${r.date}">${fmtDate(r.date)}</time>`}</td>
            <td data-label="What it was for"><strong>${esc(r.description)}</strong>${r.party || r.dog ? `<span class="ledger__sub">${[r.party && esc(r.party), r.dog && `for ${esc(r.dog)}`].filter(Boolean).join(' · ')}</span>` : ''}${r.notes ? `<span class="ledger__sub">${esc(r.notes)}</span>` : ''}${isExample ? ' <span class="confirm-chip">Example</span>' : ''}</td>
            <td data-label="Category"><span class="cat-pill cat-pill--${r.type}">${esc(cats[r.category] || r.category)}</span></td>
            <td data-label="Amount" class="num-col amt amt--${r.type}">${r.type === 'income' ? '+' : '−'}${usd(r.amount)}</td>
            <td data-label="Receipt">${r.receipt ? `<a href="${esc(receiptHref(r))}" target="_blank" rel="noopener">Receipt<span class="visually-hidden"> for ${esc(r.description)} (opens in a new tab)</span></a>` : (r.type === 'income' ? '<span class="muted">Not applicable</span>' : '<span class="muted">Pending</span>')}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <p class="lib-count" role="status" aria-live="polite" data-fin-status></p>
    <p class="muted small">${latest ? `Last entry: <time datetime="${latest}">${fmtDate(latest)}</time>. ` : ''}Amounts in U.S. dollars.</p>
  </section>

  <section class="fin-docs" aria-labelledby="docs-h">
    <h2 id="docs-h" class="section-h section-h--sm">Statements & Reports</h2>
    ${docs.length ? `<ul class="link-list">${docs.map((d) => `<li><a href="${/^https?:/.test(d.file) ? esc(d.file) : asset('finances/statements/' + d.file)}" target="_blank" rel="noopener">${icon('book', { size: 20 })} <span>${esc(d.title)} <span class="muted small">· ${esc(d.kind || '')} · ${fmtDate(d.date)}</span></span></a></li>`).join('')}</ul>` : `<p class="muted">Monthly statements and yearly reports will be posted here.</p>`}
  </section>

  <section class="faq" aria-labelledby="fin-faq-h">
    <h2 id="fin-faq-h" class="section-h section-h--sm">About This Page</h2>
    <details class="acc"><summary><span>Why don't you list who donated?</span>${icon('arrow', { size: 20, cls: 'acc__chev' })}</summary><div class="acc__body prose"><p>Giving is personal. We record donations as totals (for example, “Individual donations (6 gifts)”) so supporters stay private, while the total still shows up in what we received.</p></div></details>
    <details class="acc"><summary><span>Why are parts of some receipts blacked out?</span>${icon('arrow', { size: 20, cls: 'acc__chev' })}</summary><div class="acc__body prose"><p>We hide card and account numbers, home addresses and other people's personal details. Amounts, dates, sellers and items stay visible.</p></div></details>
    <details class="acc"><summary><span>What does “Pending” mean in the receipt column?</span>${icon('arrow', { size: 20, cls: 'acc__chev' })}</summary><div class="acc__body prose"><p>The expense is recorded, and we're still scanning or redacting the receipt. It will be added.</p></div></details>
    <details class="acc"><summary><span>Is this an audited financial statement?</span>${icon('arrow', { size: 20, cls: 'acc__chev' })}</summary><div class="acc__body prose"><p>No. This is our own running record, shared openly. Any official filings or reports will be posted under Statements &amp; reports.</p></div></details>
  </section>
</div>`;
}

// ================= VET CLINIC DIRECTORY =================
function clinicCard(c, checked) {
  const is247 = c.hours === '24/7';
  const em = { yes: is247 ? 'Emergency care 24/7' : 'Emergency walk-ins while open', limited: 'Urgent visits, business hours only', no: 'No emergencies' }[c.emergency];
  const wi = { yes: 'Walk-ins welcome', appointment: 'Appointment only', no: 'No walk-ins', ask: 'Call to ask about walk-ins' }[c.walkIns];
  const map = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(c.name + ', ' + c.address);
  const tel = c.phone.replace(/[^\d]/g, '').replace(/^311/, '').slice(-10);
  const daysOpen = is247 ? 'Every day' : DAYS.filter(([k]) => c.hours[k].length).map(([, n]) => n.slice(0, 3)).join(', ');
  return `<article class="clinic clinic--${c.kind}" id="${c.id}" data-kind="${c.kind}" data-walkin="${c.walkIns}" data-hours='${esc(JSON.stringify(c.hours))}'>
    <header class="clinic__head">
      <div>
        <h3 class="clinic__name">${esc(c.name)}</h3>
        <p class="clinic__type">${esc(c.type)} · ${esc(c.area)}</p>
      </div>
      <p class="clinic__status" data-status>${is247 ? '<span class="status status--open">Open 24/7</span>' : ''}</p>
    </header>
    <ul class="clinic__flags" role="list">
      <li class="flag flag--em-${c.emergency}">${icon(c.emergency === 'yes' ? 'alert' : 'med', { size: 16 })} ${em}</li>
      <li class="flag flag--wi-${c.walkIns}">${icon('door', { size: 16 })} ${wi}</li>
      <li class="flag">${icon('clock', { size: 16 })} ${daysOpen}</li>
    </ul>
    <div class="clinic__body">
      <dl class="clinic__info">
        <div><dt>Phone</dt><dd><a href="tel:${tel}" class="clinic__phone">${esc(c.phone)}</a>${c.phoneNote ? ` <span class="muted small">(${esc(c.phoneNote)})</span>` : ''}</dd></div>
        <div><dt>Address</dt><dd>${esc(c.address)}<br><a href="${map}" target="_blank" rel="noopener">Directions<span class="visually-hidden"> to ${esc(c.name)} (opens in a new tab)</span></a></dd></div>
        <div><dt>Walk-ins</dt><dd>${esc(c.walkInNote)}</dd></div>
        ${c.eligibility ? `<div><dt>Who can use it</dt><dd>${esc(c.eligibility)}</dd></div>` : ''}
      </dl>
      <div class="clinic__hours">
        <h4 class="clinic__h">Hours</h4>
        ${is247 ? `<p class="hours247">${icon('clock', { size: 18 })} Open 24 hours, seven days</p>` : `<table class="hours"><tbody>${DAYS.map(([k, n]) => `<tr data-day="${k}"><th scope="row">${n.slice(0, 3)}</th><td>${span(c.hours[k])}</td></tr>`).join('')}</tbody></table>`}
        ${c.hoursNote ? `<p class="small muted">${esc(c.hoursNote)}</p>` : ''}
      </div>
    </div>
    ${c.confirm ? `<p class="clinic__confirm">${icon('phone', { size: 16 })} Please call to confirm. ${esc(c.confirm)}</p>` : ''}
    <footer class="clinic__foot"><a href="${esc(c.website)}" target="_blank" rel="noopener">Website<span class="visually-hidden"> for ${esc(c.name)} (opens in a new tab)</span>${icon('external', { size: 14, cls: 'icon-ext' })}</a><span class="muted small">Checked ${fmtDate(checked)} · <a href="${esc(c.source)}" target="_blank" rel="noopener">source<span class="visually-hidden"> (opens in a new tab)</span></a></span></footer>
  </article>`;
}

export function clinics(data) {
  const { clinics: list, checked } = data;
  const em = list.filter((c) => c.kind === 'emergency');
  const cl = list.filter((c) => c.kind === 'clinic');
  const yn = (v, map) => map[v] || v;
  return `
<section class="page-head page-head--help">
  <div class="wrap">
    ${breadcrumb([['Home', ''], ['Resources', 'resources/'], ['Vet clinic directory', '']])}
    <h1 class="page-h">Vet Clinic Directory</h1>
    <p class="page-lede">Where to take a dog in Miami-Dade, for everyday care and for emergencies. Hours change, so call before you go.</p>
  </div>
</section>
<div class="wrap" data-clinics>
  <a class="urgent-card" href="#emergency">
    <span class="urgent-card__icon">${icon('alert', { size: 30 })}</span>
    <span><strong>Is it an emergency?</strong><br>Go to an emergency hospital below, and call on the way so they're ready.</span>
    ${icon('arrow', { size: 24 })}
  </a>
  <div class="clinic-filters" role="group" aria-label="Filter clinics">
    <button type="button" class="chip" data-filter="all" aria-pressed="true">All (${list.length})</button>
    <button type="button" class="chip" data-filter="emergency" aria-pressed="false">${icon('alert', { size: 16 })} Emergency</button>
    <button type="button" class="chip" data-filter="clinic" aria-pressed="false">${icon('med', { size: 16 })} Everyday clinics</button>
    <button type="button" class="chip" data-filter="walkin" aria-pressed="false">${icon('door', { size: 16 })} Walk-ins welcome</button>
    <button type="button" class="chip" data-filter="open" aria-pressed="false">${icon('clock', { size: 16 })} Open now</button>
  </div>
  <p class="lib-count" role="status" aria-live="polite" data-clinic-status></p>

  <section class="clinic-group" id="emergency" aria-labelledby="em-h">
    <h2 id="em-h" class="section-h">Emergency Care</h2>
    <p class="muted">For injuries, poisoning, trouble breathing, collapse or anything that can't wait. Five of these are open 24/7; one takes emergency walk-ins until 9 PM. Expect to be seen in order of how urgent it is, and ask for a cost estimate if that's a concern.</p>
    <div class="clinic-grid">${em.map((c) => clinicCard(c, checked)).join('')}</div>
  </section>
  <section class="clinic-group" id="everyday" aria-labelledby="cl-h">
    <h2 id="cl-h" class="section-h">Everyday &amp; Low-Cost Clinics</h2>
    <p class="muted">For checkups, vaccines, microchips, spay/neuter and nonurgent problems. Not for emergencies.</p>
    <div class="clinic-grid">${cl.map((c) => clinicCard(c, checked)).join('')}</div>
  </section>
  <p class="empty clinic-empty" hidden>No clinics match. Try another filter.</p>

  <section class="clinic-group" aria-labelledby="glance-h">
    <h2 id="glance-h" class="section-h section-h--sm">All Clinics at a Glance</h2>
    <div class="table-scroll"><table class="glance">
      <thead><tr><th scope="col">Clinic</th><th scope="col">Kind</th><th scope="col">Emergencies</th><th scope="col">Walk-ins</th><th scope="col">Days open</th><th scope="col">Phone</th></tr></thead>
      <tbody>${list.map((c) => `<tr><th scope="row"><a href="#${c.id}">${esc(c.name)}</a><span class="ledger__sub">${esc(c.area)}</span></th><td>${c.kind === 'emergency' ? (c.hours === '24/7' ? '24/7 emergency hospital' : 'Emergency care, set hours') : 'Clinic'}</td><td>${yn(c.emergency, { yes: c.hours === '24/7' ? 'Yes, 24/7' : 'Yes', limited: 'Urgent only, business hours', no: 'No' })}</td><td>${yn(c.walkIns, { yes: 'Yes', appointment: 'Appointment only', no: 'No', ask: 'Call to ask' })}</td><td>${c.hours === '24/7' ? 'Every day, 24 hours' : DAYS.filter(([k]) => c.hours[k].length).map(([, n]) => n.slice(0, 3)).join(', ')}</td><td class="nowrap">${esc(c.phone)}</td></tr>`).join('')}</tbody>
    </table></div>
  </section>
  <p class="muted small">Listing a clinic here isn't an endorsement, and these clinics aren't partners of ${esc(ctx.site.name)}. Hours and policies were checked on ${fmtDate(checked)} from each clinic's website or the county's information pages. Spot something out of date? <a href="${href('contact/')}">Tell us</a>.</p>
</div>`;
}

// ================= MDAS BLOCK (Adopt & Foster) =================
export function mdasBlock(m, spotlight, dogCard) {
  return `<section class="mdas" id="mdas" aria-labelledby="mdas-h">
    <div class="mdas__head">
      <div>
        <p class="eyebrow">${tag('Public shelter', 'gold')}</p>
        <h3 id="mdas-h" class="section-h section-h--sm">Dogs Waiting at Miami-Dade Animal Services</h3>
        <p>Hundreds of dogs are waiting at the county shelter right now. Browse them on the shelter's adoption site, then visit in person to meet them.</p>
      </div>
      <div class="btn-row">${button('Browse dogs at MDAS', m.searchUrl, { externalLink: true, ic: 'search' })}${button('How MDAS adoption works', m.adoptionPage, { variant: 'ghost', externalLink: true })}</div>
    </div>
    ${spotlight.length ? `<h4 class="h-sm">Spotlight</h4><div class="dog-grid">${spotlight.map(dogCard).join('')}</div>` : ''}
    <div class="mdas__facts">
      <div><h4 class="h-sm">Adoption Fees</h4><ul>${m.fees.map((f) => `<li>${esc(f)}</li>`).join('')}</ul><p class="small">Includes: ${esc(m.included)}</p></div>
      <div><h4 class="h-sm">Where and When</h4><ul>${m.locations.map((l) => `<li><strong>${esc(l.name)}</strong><br>${esc(l.address)}<br><span class="muted">${esc(l.hours)}</span></li>`).join('')}</ul></div>
      <div><h4 class="h-sm">How It Works</h4><ol>${m.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>
    </div>
    <p class="muted small">Miami-Dade Animal Services is a county agency, not part of ${esc(ctx.site.name)}. Fees and hours checked ${fmtDate(m.checked)}; confirm on the MDAS site before you go.</p>
  </section>`;
}
