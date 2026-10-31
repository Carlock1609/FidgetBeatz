# Roadmap

> Update the **Current stage** line and checkboxes as work is verified. Tick a box only when the behavior has been checked, not when files exist. Requirements: `product-spec.md` + `product-spec-addendum.md` (the addendum wins on conflicts).

**Current stage:** Stage 7 — Polish and testing (Stages 1–6 implemented and verified by automated tests on 2026-10-18; open items below are unticked)

## Phase 1 — Core soundboard

### Stage 1 — Foundation

- [x] Inspect repo; preserve anything existing
- [x] Scaffold Next.js (App Router, TS strict, Tailwind) with current stable versions
- [x] ESLint, Prettier, Vitest + RTL, Playwright; `npm run check` defined
- [x] Static export (`output: 'export'`) builds
- [x] Version injected at build (`NEXT_PUBLIC_APP_VERSION`, optional commit); `CHANGELOG.md` started
- [x] README commands verified (scripts run; a fresh clean-clone install not yet re-tested)

### Stage 2 — Visual design (from Figma)

- [ ] Figma link recorded in `figma-handoff.md`; tokens extracted into `globals.css` / Tailwind and `design-system.md` — **no Figma link yet**; built from the design-system.md baseline tokens
- [x] App shell: top bar, profile row, preset chips, footer (stats placeholders + version chip)
- [x] Sound display (LCD) component: idle and hit states, meter animation
- [x] Responsive pad grid; all pad states — phone portrait and desktop checked in a browser; the landscape-phone side rail is implemented but not yet checked on a device
- [x] Focus mode: toggle, full-bleed grid, ghosted exit, Fullscreen API where supported, Esc to exit — toggle/exit covered by E2E; Esc and real fullscreen implemented but only exercised manually on desktop Chromium
- [x] Reduced motion and focus states verified — 2026-10-19, by Playwright with `reducedMotion: 'reduce'` emulated (the `prefers-reduced-motion` media query): pads don't scale on hit or on a board change, and the selected/picked-up pad doesn't lift or scale; a control test confirms the hit scale without it. Found and fixed: Motion still rendered the pads' `scale(0.92)` entrance under reduced motion, so the play grid now fades only. Every Tab stop on the play view has a ≥ 2 px ring (desktop Chromium); menu items gained a ring. Not checked with a real screen reader or on a device with the OS setting on

### Stage 3 — Audio

- [x] Curate the initial CC0 library; inventory complete
- [x] `AudioEngine`: unlock, preload, play (with `when`), voice cap, choke, errors
- [x] Pads trigger on `pointerdown`; overlap works; the LCD updates after `start()`
- [ ] Manual device checklist (iOS Safari, Android Chrome, desktop)

### Stage 4 — Customization

- [x] Edit Mode (draft / save / cancel), add / remove / relabel
- [x] Drag reorder + move buttons
- [x] Sound picker with categories and preview

### Stage 5 — Presets

- [x] ~10 presets; integrity test
- [x] Preset switching with accent change; reset to preset

### Stage 6 — Profiles and stats

- [x] 5 profiles, persistence, validation, migrations, recovery
- [ ] **6b:** stats provider chosen and recorded in ADR 0006; `lib/stats` client; visitors-now heartbeat; page-visit counter — client done and unit-tested; provider chosen (Cloudflare Workers Free + Durable Object) and `services/stats-counter/` built, unit-tested and checked locally against the app; **not deployed yet**
- [x] Stats offline state; E2E with the stats endpoint blocked
- [x] Version sheet (version, build date, what's new)

### Stage 7 — Polish and testing

- [ ] Animation tuning; rapid-tap performance on a mid-range phone
- [x] Accessibility pass — 2026-10-19. axe (WCAG 2.2 A/AA + best practices, `@axe-core/playwright`) runs in the E2E suite on all three projects over the play view (Classic Drums, Bass, Piano), focus mode, Edit Mode, the pad editor sheet with the sound list, the discard confirm, the profile menu, new/rename/delete profile dialogs and the version sheet — no violations. Fixed: pad and version-chip names now contain their visible text (key hints moved outside the pad button); focusable shell behind open overlays (the shell is now `inert`); content outside landmarks (chrome is a `<header>`); no `h1` in edit/focus mode; buttons nested in `role="option"` in the sound list (now toggle buttons). Keyboard-only (desktop): pad shortcuts, Space on a focused pad, Enter to select in Edit Mode, M + arrows to move (with announcements), Esc closes the sheet and focus returns to the pad; dialogs and mode switches now return or move focus instead of dropping it to `<body>`. Contrast checked against `globals.css` (math, then measured in Chromium since axe can't resolve `color-mix`): muted text ≥ 5.3:1 everywhere; blue/violet pad labels were 4.1–4.3:1 and key hints ~2–4:1, now ≥ 5.2:1 (hover ≥ 4.8:1); also fixed accent-colored text, the danger button and the top glow. Not done: manual screen-reader pass (VoiceOver/TalkBack)
- [x] Full suite + build green

### Stage 8 — Handoff

- [x] Docs and ADRs match the implementation; `docs/api.md` documents the stats endpoint contract
- [ ] Clean-clone setup verified
- [ ] Summary of shipped features and known limitations
- [ ] CI and dependency updates: GitHub Actions (lint, format, typecheck, unit, stats service, build, E2E) and Dependabot, Node pinned to 24 (ADR 0009) — workflow added 2026-10-31; **first run on GitHub not yet seen**
- [ ] App imported into Vercel and live on its production URL ([deployment.md](deployment.md) step 1)
- [ ] Stats Worker deployed with the production origin allowed, `NEXT_PUBLIC_STATS_URL` set in Vercel, footer shows live numbers (steps 2–3)
- [ ] `main` protected by required CI checks (step 4)

## Phase 1 definition of done

Everything in the original spec §22, plus the addendum: sound display, focus mode, version chip, live stats (or a graceful offline state).

## Phase 2 — Layer mixer and export (designed, not started)

Following [ADR 0007](decisions/0007-layer-mixer-and-export.md):

- Tempo, loop length, count-in, optional snap.
- Up to 8 layers with mute, volume and delete.
- Save beats locally; export WAV (MP3 optional).
- UI: mixer panel, layer rows, Save/Export sheet.

## Phase 3 — Guided song mode (not started)

Song = preset + timed pad sequence; pads light up in order. Original or public-domain melodies only.

## Later (unscheduled)

Cloud sync, accounts, sharing beats by link, community boards, user uploads, extra sound packs. Each needs a cost and licensing review first.
