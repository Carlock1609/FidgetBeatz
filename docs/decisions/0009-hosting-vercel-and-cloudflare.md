# 0009 — Hosting on Vercel, stats on Cloudflare, CI on GitHub Actions

- **Status:** Accepted (not deployed yet; see [deployment.md](../deployment.md))
- **Date:** 2026-10-31

## Context

ADR 0002 keeps the app a static export so it can go on any static host, and ADR 0006 put the visitor counter on Cloudflare Workers. A concrete host and a CI setup were still open. The owner already runs a similar project on Vercel plus Cloudflare and has a Cloudflare account.

## Options considered

1. **Vercel for the app, Cloudflare Worker for stats.** Matches the owner's other project; Git-based deploys with a preview per PR. Hobby is non-commercial only.
2. **Cloudflare Pages for both.** One account and commercial use allowed on the free plan, but a setup the owner doesn't already run.
3. **GitHub Pages.** Free, but no PR previews and it needs a base-path setup.

For CI: GitHub Actions (the repo is on GitHub, free for public repos) versus relying on Vercel's build alone (which skips lint, unit tests and E2E).

## Decision

- The app is hosted on **Vercel**, deployed by Vercel's GitHub integration: production from `main`, previews from PRs.
- The stats counter stays a **Cloudflare Worker**, deployed by hand with `wrangler`.
- **GitHub Actions** runs lint, format check, typecheck, unit tests, the stats service tests, the build and E2E on every PR and push to `main`. It does not deploy.
- **Dependabot** opens weekly update PRs for both npm packages and the Actions versions.
- Node is pinned to **24** in `.nvmrc`, with `engines` allowing 24 or later.

## Consequences

- `output: "export"` stays, so moving to another static host later is still a settings change.
- Vercel builds even when CI fails, so `main` must be protected by required status checks.
- Preview deployments show the stats offline state, because their origins aren't in `ALLOWED_ORIGINS`.
- Revisit the host before any monetization (Vercel Hobby terms), and revisit Worker auto-deploys if the service starts changing often.
