# 0006 — Live visitor stats via an external counter; version from build

- **Status:** Accepted. Provider chosen 2026-10-19: **Cloudflare Workers Free plan + one SQLite-backed Durable Object**, in `services/stats-counter/`. The service is built and unit-tested but **not deployed yet**; until `NEXT_PUBLIC_STATS_URL` is set, the footer shows the offline state.
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

## Provider choice (2026-10-19)

**Chosen:** a Cloudflare Worker with one SQLite-backed Durable Object (option 3), in `services/stats-counter/`. It is a separate package with its own `package.json` and `wrangler.jsonc`, outside the Next.js app, which stays static-exportable. Deploy steps: `services/stats-counter/README.md`.

**Free-tier terms, checked 2026-10-19:**

| Resource                       | Workers Free limit                    | Our use                                                  |
| ------------------------------ | ------------------------------------- | -------------------------------------------------------- |
| Worker requests                | 100,000/day, 10 ms CPU each           | 1 per visit/heartbeat/preflight (~2/min per visible tab) |
| Durable Object requests        | 100,000/day                           | 1 per valid visit/heartbeat; preflights don't reach it   |
| Durable Object duration        | 13,000 GB-s/day                       | ≤ ~11,000 GB-s/day if one 128 MB object stays awake 24 h |
| SQLite rows written / read     | 100,000 / 5 million per day           | 1 write per counted visit; 1 read per object start       |
| Durable Object storage         | 5 GB total                            | One number                                               |
| Durable Object storage backend | Free plan supports SQLite-backed only | `new_sqlite_classes` migration                           |

Sources: Cloudflare's Durable Objects pricing page (updated 2026-10-18) and Workers limits page. When a free limit runs out, those operations fail until 00:00 UTC. The client then shows the offline state and backs off, and the soundboard is unaffected. Roughly 800 tab-hours of open, visible tabs a day fit in the free tier. Past that, Workers Paid starts at a small monthly minimum, so price it before launch traffic gets there.

**Commercial use:** neither the Self-Serve Subscription Agreement (updated 2025-09-12) nor the Developer Platform service-specific terms (updated 2026-09-28) restricts commercial use on the free plan. Cloudflare may limit or suspend use that burdens its network, and may change `workers.dev` subdomains with a week's notice. A custom domain route avoids the subdomain risk if that matters later. Re-check the terms before launch; they change.

**Against the selection criteria:**

- **Free tier covers expected traffic:** yes, for a small launch (see above).
- **Commercial use:** allowed, as above.
- **No personal data or tracking cookies:** no cookies. The tab id is random per page load. IPs are SHA-256-hashed with a salt that exists only in memory, used only for rate limiting, and dropped after about a minute. Only the visit total is stored. Workers observability (request logs) is off.
- **CORS:** handled in the Worker with an explicit `ALLOWED_ORIGINS` list. Other origins get 403.
- **Uptime:** Cloudflare's edge network. If the object is evicted, "now" refills within 30 s and the visit total survives. Any outage only affects the footer.

**Rejected alternatives:**

- **Workers KV:** the free plan allows only 1,000 writes a day and 1 write per second per key, which is too few for a shared visit counter or presence.
- **The Workers Rate Limiting binding:** its counters are per Cloudflare location and eventually consistent, and its free-plan availability isn't stated. The single Durable Object already sees every request, so it enforces the per-IP limit exactly.
- **Hosted analytics:** rejected because "live now" precision and commercial use vary by provider (option 2).

**Write protection:** each IP counts at most one visit a minute. Extra visits still return 200 with the counts; they just aren't counted, so a second tab behind the same IP doesn't show the footer as offline. Each IP gets 60 requests a minute across both endpoints, then 429. Requests without an allowed `Origin` are refused. Tab ids must match the client's id format. The tab and IP maps are capped at 50,000 entries each. None of this stops a determined attacker with many IPs; the counts are informational, so that is accepted.
