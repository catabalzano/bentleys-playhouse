# Pawsome Pooches submissions service

A small Cloudflare Worker that receives the "Submit a pup" form, keeps submissions (and the submitter's
contact details) private in Cloudflare KV, and publishes approved pups to the site in one commit.

- Form: https://bentleysplayhouse.org/pawsome-pooches/submit/
- Review queue: https://bentleysplayhouse.org/admin/submissions/ (sign in with the same GitHub token as /admin)

## One-time setup
1. `npm install`
2. `npx wrangler login` (opens Cloudflare in the browser)
3. `npx wrangler kv namespace create SUBMISSIONS` and paste the id into `wrangler.toml`
4. `npx wrangler deploy` → copy the `*.workers.dev` URL into `content/site.json → pawsome.submitEndpoint`
5. Optional spam check: create a Turnstile widget for bentleysplayhouse.org, put the site key in
   `pawsome.turnstileSiteKey` and run `npx wrangler secret put TURNSTILE_SECRET`.

Nothing secret lives in this folder. Admin actions use the reviewer's own GitHub token.

Deployed automatically by .github/workflows/deploy-submissions-worker.yml when worker/ changes.
