# Bentley's Playhouse website

A fast, static, multipage site generated from simple content files. There's no database, no login and nothing to patch, so it's cheap (often free) to host and hard to break.

## Why it's built this way

- **Content lives in plain files** (`content/`), separate from the layouts (`src/`). You edit words, dogs and links without touching design.
- **One command builds every page**, with clear URLs like `/get-help/found-a-dog/`, page titles, descriptions, social previews and a sitemap.
- **Free hosting** on Netlify or Cloudflare Pages. Connect the folder to a GitHub repo and every saved change rebuilds the site automatically.
- **Preview vs. live builds.** Anything marked unverified shows in the preview with a "Needs confirmation" tag and is left out of the live site.

## Build it

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run build        # preview build  → dist/       (shows "Needs confirmation" items)
npm run build:live   # live build     → dist/       (hides unverified items, allows search engines)
```

Netlify / Cloudflare Pages settings: **build command** `npm run build:live`, **publish directory** `dist`.

## Updating the site

| To change… | Edit this file | Notes |
|---|---|---|
| Contact email, donate link, form endpoints, adoption & foster links | `content/site.json` | Set `"verified": true` once you've confirmed a detail. |
| A Get Help guide | `content/guides/*.md` | `steps:` = the numbered "Do these first" list. Each `## Heading` in the body becomes an expandable section. Update `lastReviewed` when you check it. |
| A library article | `content/library/*.md` | Add a new file to add an article. `category` must match an id in `content/categories.json`. |
| Outside resources (agencies, clinics, hotlines) | `content/directory.json` | Re-check links and phone numbers every few months and update `checked`. |
| Checklists | `content/checklists/*.md` | Each group has a title and a list of items. |
| Adoptable dogs | `content/dogs/` | Copy `_template.md` to `luna.md`, fill it in, put the photo in `src/assets/img/dogs/`. Set `status: adopted` to hide a dog. Use `source: partner` for another rescue's dog. |
| Rescue stories | `content/stories/` | Copy `_template.md`. Share only with the adopter's permission. |
| Get Involved options | `content/involved.json` | `status`: `open`, `interest`, `soon` or `hidden`. Only mark `open` what you offer today. |
| FAQ | `content/faq.json` | |
| **Transparency ledger** (every expense and money received) | `content/finances/transactions.csv` | Open it in Excel or Google Sheets. One row per entry: `date` (2026-09-28), `type` (expense or income), `category` (an id from `content/finances/settings.json`, e.g. `vet-spay-neuter`), `description`, `amount`, `paid_to_or_from`, `dog`, `receipt` (file name), `notes`. Totals and the chart update automatically. |
| Receipts | `src/assets/finances/receipts/` | Photo or PDF of each receipt, named to match the `receipt` column. **Black out card/account numbers and home addresses first.** |
| Bank statements & reports | `src/assets/finances/statements/` + `content/finances/documents.json` | Redact account numbers. Record donations as totals, e.g. "Individual donations (6 gifts)", never donors' names. |
| Vet clinic directory | `content/clinics.json` | Hours per day in 24h time, or `"24/7"`. Re-check every few months and update `checked`. |
| Miami-Dade Animal Services adoption info | `content/mdas.json` | To spotlight one MDAS dog, add a file in `content/dogs/` with `source: mdas`, `animalId` and `inquiryUrl` (its 24Petconnect link). |
| Our Story, Adopt & Foster text | `content/pages/*.md` | `{{preview: …}}` notes appear only in the preview build. |
| Homepage Instagram feed | `content/site.json → social.instagram.feedUrl` | **Automatic:** sign up free at [behold.so](https://behold.so), connect @bentleysplayhouse, create a *JSON feed*, paste its URL here. The homepage then shows your latest 6 posts, updated on its own. **Manual fallback:** up to 5 photos in `content/instagram.json`. |
| Hero photo | `content/site.json → hero` | Until set, the doorway illustration shows. |
| Menu labels and form messages | `content/strings/en.json` | |

Text in `.md` files is [Markdown](https://www.markdownguide.org/cheat-sheet/): `**bold**`, `[link text](https://…)`, `- bullet`. Link to pages on this site with paths like `/get-help/lost-my-dog/`.

## The Transparency page

Until `transactions.csv` has real rows, the preview shows clearly labeled **example** entries so you can see the design; the live site shows a "first report is on its way" message instead. The build prints a warning for any row with a bad date, an unknown category or a missing receipt file. The live site also publishes the CSV itself so anyone can download the full ledger.

## Forms

Forms only send when a real endpoint is set. Until then they say so plainly and point people to Instagram. To switch one on:

1. Create a free form at [Formspree](https://formspree.io) (or Basin, or use Netlify Forms).
2. Paste its endpoint URL into `content/site.json → forms.contactEndpoint` / `forms.involvedEndpoint`.
3. Rebuild. A "thank you" appears only after the form service confirms it received the message.

Spam protection: a hidden honeypot field and a minimum fill time. Formspree adds its own filtering; turn on its reCAPTCHA if spam gets through.

## Adding Spanish

The site is ready for a second language: interface text lives in `content/strings/en.json`, and the language list is in `content/site.json → languages`. To launch Spanish properly, translate `strings/en.json` to `strings/es.json` and every guide, article, checklist and page, and have a native speaker review the guidance. The language switcher appears when `es` is enabled. (This last step needs a small build change to output `/es/` pages. Ask Claude to wire it up when translations are ready.)

## Privacy notes

- The flyer builder processes photos in the visitor's browser. Nothing is uploaded.
- Checklist ticks are stored only in the visitor's browser.
- There are no analytics or tracking scripts. If you add any, update the Privacy page.
