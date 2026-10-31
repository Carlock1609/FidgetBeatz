# Deployment

> **Status (2026-10-31):** the app is live at **https://fidgetbeatz.com** on Vercel (step 1 done; `www` redirects to it). CI and Dependabot are running. **Still to do:** deploy the stats Worker at `stats.fidgetbeatz.com` (step 2; the config is ready), connect it (step 3) and protect `main` (step 4). Tick them off in [roadmap.md](roadmap.md) as they're done.

How FidgetBeatz gets from a commit to the web, following [ADR 0009](decisions/0009-hosting-vercel-and-cloudflare.md).

| Piece                       | Where                                        | How it deploys                                                                    |
| --------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------- |
| App (Next.js static export) | Vercel, at `fidgetbeatz.com`                 | Automatic: production on every push to `main`, a preview on every PR              |
| Stats counter               | Cloudflare Worker at `stats.fidgetbeatz.com` | By hand with `wrangler deploy`; it rarely changes                                 |
| Checks                      | GitHub Actions (`.github/workflows/ci.yml`)  | Every PR and every push to `main`                                                 |
| Dependency updates          | Dependabot (`.github/dependabot.yml`)        | Weekly PRs for both npm packages and the Actions versions; they go through CI too |

## What CI runs

Three jobs, matching the pre-merge checklist in [development.md](development.md):

- **Lint, typecheck, unit tests:** `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run test`.
- **Stats counter service:** `npm ci`, `npm run typecheck` and `npm test` in `services/stats-counter/`.
- **Build and E2E:** `npm run test:e2e`, which builds the static export and runs Playwright on mobile Chromium, mobile WebKit and desktop Chromium, axe checks included. Traces are uploaded as an artifact when it fails.

Node comes from `.nvmrc` (24). `package.json` `engines` allows 24 or later.

CI never deploys. Vercel builds the app itself from GitHub, and it builds even if CI fails, so branch protection (step 4) is what stops a broken PR from reaching `main`.

## First-time setup

Do these in order: the Worker needs the app's URL, and the app needs the Worker's URL.

### 1. Import the app into Vercel

1. In Vercel, **Add New → Project**, and import `Carlock1609/FidgetBeatz`. Install the Vercel GitHub app for that repo if asked.
2. **Framework preset:** Next.js. Leave the build command, output directory and install command on their defaults. Vercel handles `output: "export"` itself.
3. **Node.js version:** 24.x (Project Settings → Build and Deployment), to match `.nvmrc`.
4. Leave environment variables empty for now and deploy. The footer will show the offline state, which is expected.
5. Add the domain under Settings → Domains: `fidgetbeatz.com` connected to Production, and `www.fidgetbeatz.com` as a **308 redirect** to it (untick "Redirect apex domains to www").
6. In Cloudflare DNS (the domain's DNS lives there), add the two CNAME records Vercel shows: `@` and `www`, both pointing at the `…vercel-dns-….com` target Vercel gives. Set both to **DNS only** (grey cloud). Vercel serves its own HTTPS and CDN, and Cloudflare's proxy would get in the way of its certificates. Ignore Cloudflare's "proxying is required" banner for these two.

Check: open the URL, tap a few pads, and open the version chip. It should show `0.1.0` and the commit. The commit comes from `VERCEL_GIT_COMMIT_SHA` on Vercel.

> **Vercel Hobby is for non-commercial personal use only.** Move to a paid plan (or another host, see ADR 0002) before any monetization.

### 2. Deploy the stats Worker

Full details are in [services/stats-counter/README.md](../services/stats-counter/README.md#deploy). In short:

1. `services/stats-counter/wrangler.jsonc` already has what production needs: the `stats.fidgetbeatz.com` custom domain route (no `workers.dev` URL) and `ALLOWED_ORIGINS` set to `https://fidgetbeatz.com,https://www.fidgetbeatz.com`. Change them only if the domain changes. Don't create a `stats` DNS record by hand; the deploy does it.
2. Deploy:

   ```bash
   cd services/stats-counter
   npm install
   npx wrangler login
   npm run deploy
   ```

3. Run the `curl` smoke test from the service README against `https://stats.fidgetbeatz.com`. A brand-new certificate can take a few minutes, so retry an SSL error after a short wait.

### 3. Connect the app to the Worker

1. In Vercel, Settings → Environment Variables, add `NEXT_PUBLIC_STATS_URL` = `https://stats.fidgetbeatz.com`, for the **Production** environment only.
2. Redeploy production (Deployments → ⋯ → Redeploy). The value is baked in at build time, so the change does nothing until a new build.
3. Check: the footer shows "jamming now" and "visits" numbers instead of offline.

**Preview deployments** get a different URL for every PR, and those origins aren't in `ALLOWED_ORIGINS`, so previews show the offline state. That's intended. Don't set `NEXT_PUBLIC_STATS_URL` for the Preview environment unless you also allow its origin.

### 4. Protect `main`

After CI has run once on a PR (so GitHub knows the check names), in GitHub Settings → Rules → Rulesets, add a ruleset for `main`:

- Require a pull request before merging.
- Require status checks to pass: **Lint, typecheck, unit tests**, **Stats counter service** and **Build and E2E**.
- Block force pushes.

### 5. Record it

Tick the deployment items in [roadmap.md](roadmap.md), and update the status lines in this doc, the README, [api.md](api.md) and [ADR 0006](decisions/0006-visitor-stats-and-version.md).

## Day to day

- **App:** merge a PR into `main`; Vercel deploys it. Every PR gets a preview URL in a Vercel comment.
- **Rollback:** in Vercel, Deployments → pick the last good one → Promote to Production. Then fix forward with a PR.
- **Stats Worker:** after changing `services/stats-counter/`, merge it, then run `npm run deploy` from that folder. The app doesn't need a redeploy unless the Worker URL changes.
- **Changing the domain:** add the new origin to `ALLOWED_ORIGINS` and redeploy the Worker _before_ switching, or the footer goes offline in between. If the Worker's own address changes, update its `routes` entry and `NEXT_PUBLIC_STATS_URL`, then redeploy both.

## Not automated (on purpose)

- **Worker deploys from CI.** It would need a Cloudflare API token stored as a GitHub secret, for a service that changes rarely. Revisit if it starts changing often.
- **Lighthouse or bundle-size checks.** Not needed yet for Phase 1.
