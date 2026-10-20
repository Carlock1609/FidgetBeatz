# 0002 — No backend or route handlers in Phase 1; stay statically exportable

- **Status:** Accepted — amended by [ADR 0006](0006-visitor-stats-and-version.md) (an external stats counter is allowed; the Next app stays static)
- **Date:** 2026-10-18

## Context

The stack lists Node.js, and Next.js supports Route Handlers. Phase 1 features (playback, presets, local profiles) all run in the browser.

## Options considered

1. **Separate Node server (Express/Fastify)** — no requirement needs it; extra hosting and maintenance.
2. **Next.js Route Handlers** — available if needed, but no Phase 1 feature requires server logic or secrets.
3. **No server code; `output: 'export'`** — deploy anywhere static, near-zero cost, no lock-in.

## Decision

Option 3. Next.js is used for its React tooling, routing, layouts, fonts, and build. No API routes, middleware, or server actions in Phase 1. `docs/api.md` is not created.

## Consequences

- Features requiring the server (Image Optimization at request time, middleware) are unavailable; we don't need them. Images use `unoptimized` or are pre-sized.
- When a real server need appears (e.g. a keyed external API, cloud sync), add Route Handlers first; consider Fastify only if requirements outgrow them. Write a new ADR at that point.
- Hosting: free static tiers work. Note Vercel Hobby is non-commercial personal use only — revisit before monetizing.
