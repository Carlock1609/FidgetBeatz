# FidgetBeatz

> **When you fidget, make a beat.**

FidgetBeatz is a mobile-first, browser-based beat-making playground. Tap colorful sound pads, mix overlapping sounds, switch between curated presets, and save up to five personal soundboards — no account, no install, no musical experience required.

> **Project status:** Phase 1 implemented (v0.1.0, 2026-10-18). Every script in the table below has been run. Still open: real-device audio testing (iOS Safari / Android Chrome), the first deployment (Vercel for the app, a Cloudflare Worker for stats; steps in [docs/deployment.md](docs/deployment.md)), and the Figma pass — see [docs/roadmap.md](docs/roadmap.md).

---

## Features (Phase 1)

- **Soundboard** — a responsive grid of large, tappable pads with instant, low-latency playback and overlapping sounds.
- **Edit Mode** — add, remove, relabel, and rearrange pads (drag-and-drop plus accessible move controls); assign and preview sounds from a categorized dropdown.
- **Presets** — ~10 curated layouts (Piano, Beatbox, Bass, Classic Drums, Electronic, Hip-Hop, Synthwave, Percussion, Lo-Fi, Experimental) with reset-to-default.
- **Profiles** — up to five named soundboards saved in the browser (localStorage), restored across sessions.
- **Sound display** — a green LCD-style readout of the last sound played, with a live level meter.
- **Focus mode** — hide everything but the pads; one tap brings the UI back.
- **Live stats + version** — "visitors now", total page visits, and the app version in the footer.
- **Near-zero running cost** — 103 bundled sounds, synthesized in-house and released CC0 ([ADR 0008](docs/decisions/0008-synthesized-sound-library.md)), played through the Web Audio API. No database, no auth, no paid APIs; the only external service is a small free visitor counter (ADR 0006).

Coming in Phase 2: a **layer mixer** (record up to 8 loop layers, then save and download as WAV). Later: guided song mode, accounts, cloud sync, sharing. See [docs/roadmap.md](docs/roadmap.md).

**Design:** the published Figma file is linked in [docs/figma-handoff.md](docs/figma-handoff.md).

## Tech stack

| Concern            | Choice                                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Framework          | Next.js (App Router) + React                                                                                            |
| Language           | TypeScript (strict)                                                                                                     |
| Styling            | Tailwind CSS, custom design tokens                                                                                      |
| UI primitives      | shadcn/ui (restyled — not the default look)                                                                             |
| Animation          | CSS transitions for simple states; Motion for React for layout, drag, and sequenced transitions                         |
| Icons              | Lucide React                                                                                                            |
| Audio              | Web Audio API (decoded `AudioBuffer`s, one-shot source nodes)                                                           |
| Drag and drop      | dnd-kit (sortable grid, touch + keyboard sensors) — see [ADR 0005](docs/decisions/0005-ui-and-interaction-libraries.md) |
| Runtime validation | Zod (stored profile data only)                                                                                          |
| Testing            | Vitest, React Testing Library, Playwright                                                                               |
| Quality            | ESLint, Prettier, `tsc --noEmit`                                                                                        |

Use current stable, mutually compatible versions when scaffolding. Record the resolved versions in `package.json`; don't pin versions in docs.

## Prerequisites

- Node.js — current Active LTS release
- npm (bundled with Node). If the project later switches to pnpm, update this section and the lockfile together.
- A modern browser for development; an iOS device (Safari) and an Android device (Chrome) for audio testing.

## Getting started

```bash
git clone <repo-url> fidgetbeatz
cd fidgetbeatz
npm install
npx playwright install chromium webkit   # once, for E2E tests
cp .env.example .env.local   # no variables are required in Phase 1
npm run dev                  # http://localhost:3000
```

> **Testing on a phone:** browsers only allow the Web Audio API and some APIs in a secure context. `localhost` counts, a LAN IP over plain HTTP may not. Use `next dev --experimental-https` (or a tunnel) when testing on a device over the network.

## Scripts (keep in sync with package.json)

| Command                           | Purpose                                                                                        |
| --------------------------------- | ---------------------------------------------------------------------------------------------- |
| `npm run dev`                     | Start the dev server                                                                           |
| `npm run build`                   | Production build                                                                               |
| `npm run start`                   | Serve the static export in `out/` (run `build` first)                                          |
| `npm run lint`                    | ESLint                                                                                         |
| `npm run format` / `format:check` | Prettier write / check                                                                         |
| `npm run typecheck`               | `tsc --noEmit`                                                                                 |
| `npm run test`                    | Vitest (unit + component)                                                                      |
| `npm run test:e2e`                | Build, then Playwright E2E (mobile Chromium, mobile WebKit, desktop Chromium)                  |
| `npm run test:stats`              | Unit tests for the stats counter service (run `npm install` in `services/stats-counter` first) |
| `npm run sounds:generate`         | Re-render the synthesized sound library + inventory                                            |
| `npm run check`                   | lint + typecheck + test — run before every merge                                               |

## Environment variables

| Variable                                             | Required | Purpose                                                                                                                                                                                                                          |
| ---------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_STATS_URL`                              | No       | Visitor counter endpoint (ADR 0006), e.g. the deployed `https://fidgetbeatz-stats.<subdomain>.workers.dev` or `http://localhost:8787` for the local counter. Empty = the footer shows the offline state. Baked in at build time. |
| `NEXT_PUBLIC_APP_VERSION` / `NEXT_PUBLIC_APP_COMMIT` | No       | Set automatically at build; override only for testing.                                                                                                                                                                           |

**Never** put a secret in a `NEXT_PUBLIC_*` variable — those are shipped to the browser.

## Deployment

Phase 1 has no server-side code, so the app stays **statically exportable** (`output: 'export'`) and deployable to any static host ([ADR 0002](docs/decisions/0002-no-backend-in-phase-1.md)).

- **Hosting:** the app goes on **Vercel** (production from `main`, a preview per PR) and the visitor counter on a **Cloudflare Worker** ([ADR 0009](docs/decisions/0009-hosting-vercel-and-cloudflare.md)). **Neither is deployed yet.** The first-time setup, in order, is in [docs/deployment.md](docs/deployment.md).
- **CI:** GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs lint, format check, typecheck, unit tests, the stats service tests, the build and E2E on every PR and push to `main`. Dependabot opens weekly update PRs.
- **Node:** 24, from `.nvmrc` (`engines` allows 24 or later).
- **Vercel Hobby** is free but limited to **non-commercial personal use**; any monetization requires a paid plan or another host.
- A custom domain is optional and is the only expected cost.

## Documentation

| Doc                                                                                      | Contents                                                |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| [docs/product-spec.md](docs/product-spec.md) + [addendum](docs/product-spec-addendum.md) | Requirements (the addendum wins on conflicts)           |
| [docs/figma-handoff.md](docs/figma-handoff.md)                                           | Figma link, how to extract tokens and components        |
| [docs/architecture.md](docs/architecture.md)                                             | Modules, boundaries, data flow, extension points        |
| [docs/development.md](docs/development.md)                                               | Coding standards, testing, workflow, definition of done |
| [docs/design-system.md](docs/design-system.md)                                           | Visual language, tokens, pad states, motion rules       |
| [docs/audio-system.md](docs/audio-system.md)                                             | Playback engine, loading, browser quirks, formats       |
| [docs/sound-licensing.md](docs/sound-licensing.md)                                       | Approved sources, asset inventory, adding sounds        |
| [docs/profiles-and-presets.md](docs/profiles-and-presets.md)                             | Data models, storage, validation, migrations            |
| [docs/roadmap.md](docs/roadmap.md)                                                       | Phases, stages, Phase 1 definition of done              |
| [docs/deployment.md](docs/deployment.md)                                                 | CI, Vercel and Worker setup, day-to-day deploys         |
| [docs/decisions/](docs/decisions/)                                                       | Architecture Decision Records                           |
| [CLAUDE.md](CLAUDE.md)                                                                   | Working rules for Claude Code in this repo              |

[docs/api.md](docs/api.md) documents the external stats endpoint contract, and [services/stats-counter](services/stats-counter/README.md) implements it. The app itself has no API routes.

## Credits and licensing

The code is released under the [MIT License](LICENSE).

All bundled sounds are generated by `scripts/generate-sounds.mjs` and released CC0 by the project. Each one has a license record in `data/sounds/inventory.json`, summarized in [docs/sound-licensing.md](docs/sound-licensing.md). The version sheet in the app says so too. Any third-party sound added later must follow the license gate in that doc.
