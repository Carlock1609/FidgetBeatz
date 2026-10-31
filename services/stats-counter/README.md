# FidgetBeatz stats counter

The visitor counter behind the footer's "jamming now" and "visits" (ADR 0006). It implements [docs/api.md](../../docs/api.md) as a **Cloudflare Worker** plus one **SQLite-backed Durable Object**, on the Workers Free plan.

It is a separate package with its own `package.json`. The Next.js app doesn't import it and stays static-exportable.

## How it works

- `POST /visit` and `POST /heartbeat` both return `{ "now": number, "visits": number }`.
- The Worker answers CORS preflights and rejects bad requests itself: an unknown or missing `Origin` gets 403, a bad body gets 400, other paths get 404. Only valid requests reach the single global Durable Object, `StatsCounter`.
- **now** counts distinct tab ids seen in the last 60 s. The client sends a heartbeat every 30 s, so a tab can miss one beat and still count. Tabs are held in memory only.
- **visits** is the only value written to storage. Each IP adds at most one visit per minute. A visit over that limit still returns 200 with the counts and still marks the tab active; it just isn't counted.
- **Rate limit:** 60 requests per IP per minute across both endpoints, then 429 with `Retry-After: 60`. That allows about 30 open tabs behind one shared IP.
- **Privacy:** IPs are hashed (SHA-256) with a random salt that exists only in memory. The hashes are used for rate limiting, are never written to storage, and expire after about a minute. There are no cookies. Workers observability (request logs) is turned off in `wrangler.jsonc`.
- **Eviction:** if Cloudflare evicts the object, "now" restarts at zero and refills within one heartbeat interval (30 s). The visit total is kept.

| File             | Contents                                                          |
| ---------------- | ----------------------------------------------------------------- |
| `src/counter.ts` | Pure counter logic: presence window, visit dedupe, rate limits    |
| `src/http.ts`    | Routing, CORS, body validation, IP hashing                        |
| `src/index.ts`   | Cloudflare glue: Worker `fetch` handler and the Durable Object    |
| `src/*.test.ts`  | Vitest unit tests for `counter.ts` and `http.ts`                  |
| `wrangler.jsonc` | Worker config: Durable Object binding, migration, allowed origins |

## Develop and test

```bash
cd services/stats-counter
npm install
npm test            # unit tests (plain Node)
npm run typecheck
npm run dev         # local Worker + Durable Object on http://localhost:8787, no account needed
```

From the repo root, `npm run test:stats` runs the same unit tests (after `npm install` here).

To point the app at the local counter, run the app with `NEXT_PUBLIC_STATS_URL=http://localhost:8787 npm run dev`. `http://localhost:3000` is already in `ALLOWED_ORIGINS`.

## Deploy

You need a free Cloudflare account. Deploying publishes a public endpoint.

1. Set `ALLOWED_ORIGINS` in `wrangler.jsonc` to the app's production origin, comma-separated, with no trailing slash, for example `"https://fidgetbeatz.example,http://localhost:3000"`. Remove `localhost` if you don't want local dev builds counting against production.
2. Log in and deploy:

   ```bash
   cd services/stats-counter
   npx wrangler login
   npm run deploy
   ```

   Wrangler prints the URL, e.g. `https://fidgetbeatz-stats.<your-subdomain>.workers.dev`.

3. Smoke-test it, using your origin and URL:

   ```bash
   curl -s -X POST -H "Origin: https://fidgetbeatz.example" -H "content-type: application/json" -d '{"tab":"11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}' https://fidgetbeatz-stats.<your-subdomain>.workers.dev/heartbeat
   ```

   It should print `{"now":1,"visits":0}`.

4. Set `NEXT_PUBLIC_STATS_URL` to that URL in the static host's build environment (or `.env.local`), then rebuild the app. The value is baked in at build time.

## Free-tier budget

Checked 2026-10-19; details and sources are in ADR 0006. Each browser request costs one Worker request and one Durable Object request. Preflights are cached for a day and never reach the Durable Object.

- 100,000 Worker requests and 100,000 Durable Object requests per day. A visible tab sends about 2 requests a minute, so that is roughly 800 tab-hours a day.
- 100,000 SQLite rows written per day: one per counted visit.
- 13,000 GB-s of Durable Object duration per day. One object kept awake all day uses about 11,000 GB-s at 128 MB.

When a limit runs out, requests fail until 00:00 UTC. The footer then shows its offline state and retries with backoff. The soundboard is unaffected.
