# 0006 — Live visitor stats via an external counter; version from build

- **Status:** Accepted for the requirement; **provider choice pending**. The client and endpoint contract are implemented (`lib/stats`, `docs/api.md`, 2026-10-18); with no `NEXT_PUBLIC_STATS_URL` the footer shows the offline state.
- **Date:** 2026-10-18
- **Amends:** ADR 0002 (no backend in Phase 1)

## Context

The product now shows "visitors now" and "total page visits" in the footer, plus a version indicator. Visitor counts need server-side state; the app is otherwise static with no backend.

## Options considered

1. **Next.js Route Handlers + database** — breaks static export; adds hosting cost and a database.
2. **Privacy-friendly hosted analytics with a public counts API** — no code to run; may limit "live now" precision or require a paid tier; terms vary.
3. **Tiny serverless counter outside the Next app** (e.g. an edge function with a small key-value store or a single stateful object for presence) — free tiers usually cover low traffic; full control; we maintain ~100 lines.
4. **Drop the stats** — rejected; it's a product requirement.

## Decision

- Keep the Next.js app **static-exportable**. Stats come from an **external endpoint** (option 2 or 3) behind one small client module, `lib/stats/`.
- **Version:** read `package.json` version at build time into `NEXT_PUBLIC_APP_VERSION`, with an optional short commit in `NEXT_PUBLIC_APP_COMMIT`. No backend needed.
- **Selection criteria** for the provider: free tier covers expected traffic, commercial use allowed (or planned upgrade cost known), no personal data or tracking cookies, CORS support, and an uptime story. Record the chosen provider and its current terms here before implementing.

## Behavior requirements

- **Visitors now:** a heartbeat every ~30 s while the tab is visible; a visitor counts as active for ~60 s after the last beat. Stop beating when hidden.
- **Page visits:** increment once per page load (not per hit). Show compact numbers (1.2K, 3.4M).
- Fetch after first paint; never block audio or interaction. Refresh the display every ~30 s.
- On failure: show `— jamming now`, `— visits`, a grey dot, and retry with backoff. No console spam.
- Any endpoint URL goes in `NEXT_PUBLIC_STATS_URL` and is documented in `.env.example` and README.
- Write-protection: the counter should reject obviously abusive increments (rate limit per IP at the provider).

## Consequences

- First external runtime dependency. The core soundboard must work with it absent; there is an E2E test with the stats endpoint blocked.
- A privacy note in the app ("we count visits anonymously") is likely needed. Check before launch.
- `docs/api.md` documents the stats endpoint contract once one exists.

## Implementation notes (2026-10-18)

- The heartbeat response returns both counts, so there is no separate polling request: one `POST /visit` per load, then `POST /heartbeat` every 30 s while visible (`docs/api.md`).
- The version comes from `package.json` via `next.config.ts` `env`; the commit is `git rev-parse --short HEAD`, empty when unavailable. The build date is added as `NEXT_PUBLIC_BUILD_DATE`. "What's new" is read from `CHANGELOG.md` at build time by the page Server Component.
