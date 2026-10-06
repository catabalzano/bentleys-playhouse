# Launch checklist (private)

Everything below is either missing, unverified, or a connection the site needs before it goes live. The preview marks each of these with "Needs confirmation" or a purple preview note.

## Brand assets
- [x] High-res logos installed. Main logo = circular Frenchie badge (black lettering; the white-lettering version is used in dark mode and the footer).
- [ ] **Photos you own:** a hero photo, Bentley, Cata, a few rescues, and 5 Instagram favorites. Instagram couldn't be read automatically, so no photos were taken from it.

## Our Story
- [x] Story written from your one-pager and the Fénix Animal Project About page (founded Aug 2022, Bentley, Romeo, Kiara, Fénix, Cata as volunteer journalist, community funding, Fénix launch).
- [x] The Frenchie in the logo is Bentley.
- [x] 10% partnerships pledge: left off the site (Cata's decision).
- [ ] Photos of Bentley, Romeo, Kiara, Fénix and Cata.

## Instagram feed
- [x] Behold JSON feed connected to @bentleysplayhouse (`https://feeds.behold.so/W2YGDyyPF85eLju0zHnb`, free plan = latest 6 posts) and set in `content/site.json → social.instagram.feedUrl`.

## Contact & services
- [x] Public email `bentleysplayhouseorg@gmail.com` published on the Contact page (for now).
- [ ] Phone: your Facebook lists 305-760-4510 (mobile). Not published. Add it only if you want it public.
- [ ] Which inquiries you handle (Contact page list) → `services.canHelpWithVerified`.
- [ ] Intake policy wording → `services.intakeStatus` + `intakeVerified`.
- [ ] Owner-surrender FAQ answer.

## Adoption & fostering
- [x] Adoption application (JotForm) and 7-step process: verified from your Facebook featured post.
- [ ] **Dog profiles.** Send details and photos for each current adoptable dog to build profiles.
- [ ] **Foster form:** YouTube links the Google Form's `/edit` address, which the public can't open. Confirm the `/viewform` link works signed-out → `foster.verified: true`.
- [ ] Describe your foster process (what you provide, vet arrangements).

## Donations (page stays "coming soon" until all are set)
- [ ] Exact donation destination(s) (e.g., PayPal giving link, Venmo/Cash App/Zelle handles). YouTube lists the services but not the handles.
- [ ] Amazon wishlist: the YouTube link goes to Amazon's generic wishlist page. Send the real list URL.
- [ ] Legal name, IRS status (e.g., 501(c)(3) determination), EIN, and tax-deductibility statement, only once confirmed. "Nonprofit organization" on Facebook doesn't confirm 501(c)(3).
- [ ] How donations are used (only confirmed uses).

## Transparency page
- [x] First real entry posted: domain registration, $8.68 (Namecheap, Oct 6, 2026), with redacted receipt.
- [ ] Keep adding entries and redacted receipts.
- [ ] Decide how often you'll update it (we can add an "Updated monthly" promise once you're sure you can keep it).
- [ ] Upload redacted monthly statements and list them in `content/finances/documents.json`.

## Vet clinic directory
- [ ] Call to confirm the entries marked "Please call to confirm": Thrive (hours from a directory), Miami Animal Clinic (walk-ins), ASPCA Liberty City (hours from the county page), VCA Alton Road (walk-ins).
- [ ] Only five true 24/7 ERs could be verified in Miami-Dade; the sixth emergency entry (Kendall Animal Medical Center) takes emergency walk-ins 8 AM–9 PM daily. Kendall Pointe Animal Hospital advertises 24/7 but its own site lists no hours; call to verify if you'd like it added.

## Integrations
- [ ] Form endpoints (Formspree or similar) for Contact and Get Involved → `content/site.json → forms`.
- [x] Domain bentleysplayhouse.org registered at Namecheap (Oct 6, 2026; auto-renew + privacy on).
- [x] Hosting: GitHub Pages (repo `catabalzano/bentleys-playhouse`, deploys automatically on every push to `main`). Local clone: `~/Documents/GitHub/bentleys-playhouse` (push with GitHub Desktop).
- [x] DNS at Namecheap (Oct 6, 2026): four A records `@` → 185.199.108.153 / .109.153 / .110.153 / .111.153, CNAME `www` → `catabalzano.github.io.`; parking redirect removed. Site live at bentleysplayhouse.org.
- [x] HTTPS certificate issued and "Enforce HTTPS" turned on (Oct 6, 2026). http:// and www now redirect to https://bentleysplayhouse.org.
- [ ] Decide on analytics (optional). If added, update the Privacy page.

## Content review
- [ ] Have MDAS (or a local attorney) confirm the Miami-Dade finder rules summary (`/resources/miami-dade-rules-for-finders/`).
- [ ] Re-check agency hours and phone numbers before launch. MDAS lists different weekend hours on two pages.
- [ ] Spanish translation (recommended for Miami): full translation of guides, forms and checklists, reviewed by a native speaker.

## Future options (not built, on purpose)
- Public lost-and-found database, user accounts, community posting: deliberately left out. Petco Love Lost and MDAS already cover lost-and-found matching.
- Newsletter sign-up, event calendar, online donations with recurring giving: add when you have the service set up.
