# 0001 — Bundle licensed audio locally instead of using a live sound API

- **Status:** Accepted
- **Date:** 2026-10-18

## Context

FidgetBeatz plays a sound on every tap. Playback must be immediate, cost nothing per play, work offline-ish once loaded, and be legally safe if the app is ever monetized.

## Options considered

1. **Live sound API (e.g. Freesound API) at runtime** — huge catalog; but adds network latency to first use, rate limits, availability risk, attribution handling per sound, and Freesound's free API terms are non-commercial only (commercial use needs a negotiated license). Requires an API key, so also a server proxy.
2. **Paid sample API/subscription** — cost and lock-in for no Phase 1 benefit.
3. **Curated, downloaded, license-verified files bundled in `public/sounds`** — zero per-play cost, lowest latency, fully testable, licensing reviewed once per file.

## Decision

Option 3. Prefer CC0 sources (Kenney packs, CC0-filtered Freesound files, CC0 itch.io packs, self-synthesized sounds). Accept CC BY with an in-app credits screen. Reject NC/ND and unclear licenses. Track every file in `data/sounds/inventory.json`.

## Consequences

- Library size is limited to what we curate (fine — quality over quantity).
- Adding sounds requires a manual license check and a deploy.
- A future "discover sounds" feature can be added as an optional, isolated module; core playback never depends on it.
