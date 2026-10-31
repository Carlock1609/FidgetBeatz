# Architecture

> Status: **Implemented (Phase 1, v0.1.0, 2026-10-18).** Update this document whenever the implementation diverges.

## 1. Shape of the system

FidgetBeatz Phase 1 is a **client-side single-page experience delivered by Next.js**. There is no backend or database. The one external runtime call is the optional **visitor stats counter** (ADR 0006), which loads after first paint and is never on the audio path.

```
┌──────────────────────── Browser ────────────────────────┐
│                                                          │
│  Next.js page (Server Component shell, static HTML)      │
│     └── <SoundboardApp> ("use client" boundary)          │
│            ├── BoardProvider (useReducer + context)      │
│            │      ├── active profile / preset / mode     │
│            │      └── edit draft                         │
│            ├── UI components (pads, toolbar, editors)    │
│            │                                             │
│            ├── AudioEngine (lib/audio) ── Web Audio API  │
│            │      └── fetch → decode → AudioBuffer cache │
│            │                                             │
│            └── ProfileStore (lib/storage) ── localStorage│
│                                                          │
│  Static assets: /public/sounds/*.wav, JS/CSS bundles     │
└──────────────────────────────────────────────────────────┘
          ▲ served by any static host (no server code)
```

## 2. Directory layout

Create folders as they become needed; don't scaffold empty ones.

```
app/
  layout.tsx            Root layout, fonts, metadata, theme class
  page.tsx              Server Component; renders <SoundboardApp/>
  globals.css           Tailwind layers + design tokens (CSS variables)
components/
  ui/                   shadcn/ui primitives, restyled to the design system
  soundboard/           Pad, PadGrid, SoundDisplay (LCD), FocusModeToggle, Toolbar, ModeToggle
  shell/                AppFooter (stats + version chip), VersionSheet
  editor/               PadEditor, SoundPicker, EditToolbar
  profiles/             ProfileSwitcher, RenameProfileDialog
  presets/              PresetPicker
features/
  soundboard/           board reducer, actions, selectors, BoardProvider
lib/
  audio/                AudioEngine, buffer cache, unlock helper
  storage/              ProfileStore, schema (Zod), migrations
  stats/                Stats client: heartbeat, visit increment, polling, offline state (ADR 0006)
  utils/                small pure helpers (ids, clamp, cn)
hooks/                  useAudioEngine, usePadTrigger, useReducedMotion …
data/
  sounds/               sound catalog (typed) + licensing inventory
  presets/              preset definitions (typed)
types/                  shared domain types (Sound, Pad, Preset, Profile)
public/sounds/<category>/<sound-id>.wav
tests/                  e2e (Playwright); unit tests live beside source as *.test.ts(x)
services/
  stats-counter/        Visitor counter: Cloudflare Worker + Durable Object, own package.json (ADR 0006); not part of the app build
docs/                   this documentation
```

`features/presets` and `features/profiles` are not separate folders by default: presets are static data (`data/presets`) and profiles are persistence (`lib/storage`) plus board actions (`features/soundboard`). Split them out only if they grow real behavior of their own.

## 3. Module responsibilities

| Module                | Owns                                                                             | Must not                                        |
| --------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------- |
| `types/`              | Domain types shared everywhere                                                   | Import from anything else                       |
| `data/sounds`         | Sound catalog: id, name, category, file path, gain, license ref                  | Contain playback logic                          |
| `data/presets`        | Immutable preset definitions                                                     | Be mutated at runtime                           |
| `lib/audio`           | AudioContext lifecycle, loading/decoding, buffer cache, playback, voice limiting | Import React                                    |
| `lib/storage`         | Read/write/validate/migrate persisted state                                      | Import React or UI                              |
| `features/soundboard` | Board state machine (reducer), actions, selectors, provider                      | Touch `localStorage` or `AudioContext` directly |
| `hooks/`              | Bridge React ↔ `lib/*` (subscribe, effects, refs)                                | Hold business rules                             |
| `components/`         | Presentation and interaction wiring                                              | Contain storage or audio internals              |

`lib/audio` and `lib/storage` are framework-free TypeScript so they can be unit-tested without React and reused later (e.g. by a Phase 2 recorder or a cloud-sync adapter).

## 4. Client / server boundary

- `app/layout.tsx` and `app/page.tsx` are **Server Components**: static shell, metadata, fonts.
- `<SoundboardApp>` is the single `"use client"` entry. Everything that touches pointer events, `AudioContext`, or `localStorage` lives beneath it.
- Because stored profiles exist only in the browser, the first server-rendered paint shows the **default preset** layout. The client then hydrates, loads stored state, and swaps in the active profile. To avoid a visible jump, the grid renders a neutral skeleton until storage has been read (a single synchronous read on mount — fast).
- No Route Handlers in Phase 1 (see ADR 0002).

## 5. Core data flow

### Tap → sound (hot path)

```
pointerdown on <Pad>
  → usePadTrigger: engine.play(soundId)          // synchronous, first
  → pad visual: set data-active / restart CSS animation via ref (no React state)
  → engine emits a 'trigger' event → SoundDisplay subscribes and updates name + meter
    (its own small state; only the display re-renders, never the grid)
```

### Focus mode

`mode: 'play' | 'edit'` plus `focus: boolean` in the board state. In focus mode the shell hides the top bar, LCD, chips and footer, and the grid becomes full-bleed. Where supported, `document.documentElement.requestFullscreen()` is called from the toggle's click, and a `fullscreenchange` listener keeps state in sync. An optional Screen Wake Lock is released on exit or when the tab is hidden. The setting persists in `settings.focusMode`.

### Stats and version

`lib/stats` starts after hydration: it sends one visit increment per page load, then a heartbeat every ~30 s while visible; each response carries the current counts, so there is no separate poll. Failures switch the footer to offline. The counter itself lives in `services/stats-counter/` (a Cloudflare Worker, deployed separately). The version is a build-time constant (`NEXT_PUBLIC_APP_VERSION`).

The hot path deliberately bypasses React state. Re-rendering on every tap would add latency and jank under rapid input. See `docs/audio-system.md`.

### Editing and persistence

```
UI action (e.g. move pad)
  → dispatch(action) → boardReducer → new state
  → Edit Mode: changes go to state.draft only
  → Save: draft → activeProfile; ProfileStore.save(state) (debounced)
  → Cancel: draft discarded
```

### Profile / preset switch

```
select profile/preset
  → dispatch → new active pads
  → effect: engine.preload(soundIdsOf(pads))   // decode what's now needed
  → grid animates layout change (Motion layout animation, reduced-motion aware)
```

## 6. Board state (summary)

```ts
interface BoardState {
  mode: "play" | "edit";
  profiles: Profile[]; // ≤ 5
  activeProfileId: ProfileId;
  draft: Pad[] | null; // non-null only in edit mode
  selectedPadId: PadId | null; // edit mode selection
  hydrated: boolean; // storage has been read
}
```

Full type definitions: `docs/profiles-and-presets.md`.

## 7. Key decisions

| ADR                                                    | Decision                                                                          |
| ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| [0001](decisions/0001-local-audio-assets.md)           | Bundle licensed audio locally instead of a live sound API                         |
| [0002](decisions/0002-no-backend-in-phase-1.md)        | No backend / route handlers; keep app statically exportable                       |
| [0003](decisions/0003-localstorage-for-profiles.md)    | localStorage + versioned schema for profiles                                      |
| [0004](decisions/0004-audio-playback-strategy.md)      | Pre-decoded AudioBuffers + one-shot source nodes, WAV one-shots                   |
| [0005](decisions/0005-ui-and-interaction-libraries.md) | Tailwind + restyled shadcn/ui + Motion + dnd-kit; no state library                |
| [0006](decisions/0006-visitor-stats-and-version.md)    | External counter for live stats; version from build; app stays static             |
| [0007](decisions/0007-layer-mixer-and-export.md)       | (Proposed, Phase 2) Layers as event sequences; WAV export via OfflineAudioContext |
| [0008](decisions/0008-synthesized-sound-library.md)    | Synthesize the Phase 1 sound library in-house (CC0, deterministic)                |

## 8. Extension points (not implemented in Phase 1)

| Future feature                 | Where it plugs in                                                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layer mixer + export (Phase 2) | Subscribe to `AudioEngine` trigger events; layers are event sequences replayed via `engine.play(id, { when })`; WAV export via OfflineAudioContext (ADR 0007) |
| Guided songs (Phase 3)         | A song = preset + timed pad sequence; drives pad highlight state; reuses engine scheduling                                                                    |
| Cloud sync                     | Second implementation of the `ProfileStore` interface                                                                                                         |
| More sound packs               | Additional entries in `data/sounds` + files; catalog already category-indexed                                                                                 |
| External sound discovery       | Optional, isolated feature behind a server route; core board must work without it                                                                             |

These are notes, not commitments. Don't build scaffolding for them now.

## 9. Implementation notes (2026-10-18)

Where the build differs from, or adds detail to, the plan above:

- **Components.** `components/soundboard/` holds `soundboard-app.tsx` (the client boundary and shell), `pad.tsx` (`PlayPad`, `EditPad`, `flashPad`), `pad-grid.tsx` (play grid with keyboard shortcuts; edit grid with dnd-kit), `sound-display.tsx` (LCD plus the focus-mode level line) and `top-bar.tsx` (play and edit bars). Focus-mode toggling lives in `hooks/use-focus-mode.ts`, not a separate component.
- **Board state** also holds `settings` (volume, focus mode, focus level line) and `storageNotice`, a one-time, non-blocking message about storage problems. The provider debounces saves by 300 ms and **flushes on `pagehide` / tab hidden**, so a reload right after a change doesn't lose it.
- **Hydration.** The reducer is seeded with default state for the server render. The grid and profile switcher show a skeleton until `hydrated` is true. Pad and profile ids are random, but they are never rendered as text, so the SSR markup matches.
- **Audio pre-decoding.** `AudioEngine` decodes with a 1-frame `OfflineAudioContext` before any user gesture. The first tap only has to create and resume the real context. See `docs/audio-system.md` §3.
- **Version info.** `next.config.ts` injects `NEXT_PUBLIC_APP_VERSION`, `NEXT_PUBLIC_APP_COMMIT` and `NEXT_PUBLIC_BUILD_DATE`. `app/page.tsx` (a Server Component, run at build time) reads `CHANGELOG.md` and passes "What's new" into the client app.
- **UI primitives** in `components/ui/` wrap the unified `radix-ui` package (Dialog, DropdownMenu, Slider, Slot) in the shadcn pattern: code copied in and restyled, with no CLI or generated theme.
