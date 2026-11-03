# Roadmap

> Update the **Current stage** line and checkboxes as work is verified. Tick a box only when the behavior has been checked, not when files exist. Requirements: `product-spec.md` + `product-spec-addendum.md` (the addendum wins on conflicts).

**Current stage:** Phase 1 device validation and deployment follow-up; Phase 2 Studio feature/design discovery. Priorities revised 2026-11-02. Guided play is on hold.

**Working order:** validate mobile playback → resolve Studio behavior and mobile Figma references → build Studio recording/export → Phase 3 accounts and community. Deployment follow-ups remain tracked separately; the main site is already live.

## Phase 1 — Core soundboard

### Stage 1 — Foundation

- [x] Inspect repo; preserve anything existing
- [x] Scaffold Next.js (App Router, TS strict, Tailwind) with current stable versions
- [x] ESLint, Prettier, Vitest + RTL, Playwright; `npm run check` defined
- [x] Static export (`output: 'export'`) builds
- [x] Version injected at build (`NEXT_PUBLIC_APP_VERSION`, optional commit); `CHANGELOG.md` started
- [x] README commands verified (scripts run; a fresh clean-clone install not yet re-tested)

### Stage 2 — Visual design (from Figma)

- [ ] Record current Figma references and agree mobile Studio layouts in `figma-handoff.md`; the existing shipped soundboard is the baseline. Missing historical Figma references do not block device testing.
- [x] App shell: top bar, profile row, preset chips, footer (stats placeholders + version chip)
- [x] Sound display (LCD) component: idle and hit states, meter animation
- [x] Responsive pad grid; all pad states — phone portrait and desktop checked in a browser; the landscape-phone side rail is implemented but not yet checked on a device
- [x] Focus mode: toggle, full-bleed grid, ghosted exit, Fullscreen API where supported, Esc to exit — toggle/exit covered by E2E; Esc and real fullscreen implemented but only exercised manually on desktop Chromium
- [x] Reduced motion and focus states verified — 2026-10-19, by Playwright with `reducedMotion: 'reduce'` emulated (the `prefers-reduced-motion` media query): pads don't scale on hit or on a board change, and the selected/picked-up pad doesn't lift or scale; a control test confirms the hit scale without it. Found and fixed: Motion still rendered the pads' `scale(0.92)` entrance under reduced motion, so the play grid now fades only. Every Tab stop on the play view has a ≥ 2 px ring (desktop Chromium); menu items gained a ring. Not checked with a real screen reader or on a device with the OS setting on

### Stage 3 — Audio

- [x] Curate the initial CC0 library; inventory complete
- [x] `AudioEngine`: unlock, preload, play (with `when`), voice cap, choke, errors
- [x] Pads trigger on `pointerdown`; overlap works; the LCD updates after `start()`
- [ ] Manual device checklist (iOS Safari, Android Chrome, desktop); procedure and results in [device-testing.md](device-testing.md)

### Stage 4 — Customization

- [x] Edit Mode (draft / save / cancel), add / remove / relabel
- [x] Drag reorder + move buttons
- [x] Sound picker with categories and preview

### Stage 5 — Presets

- [x] ~10 presets; integrity test
- [x] Preset switching with accent change; reset to preset

### Stage 6 — Profiles and stats

- [x] 5 profiles, persistence, validation, migrations, recovery
- [x] **6b:** Cloudflare Worker + Durable Object deployed at `stats.fidgetbeatz.com`; Vercel Production URL set and rebuilt; numeric live footer and CORS verified 2026-11-02 (deployment notes record local DNS caching).
- [x] Stats offline state; E2E with the stats endpoint blocked
- [x] Version sheet (version, build date, what's new)

### Stage 7 — Polish and testing

- [ ] Animation tuning; rapid-tap performance on a mid-range phone
- [x] Accessibility pass — 2026-10-19. axe (WCAG 2.2 A/AA + best practices, `@axe-core/playwright`) runs in the E2E suite on all three projects over the play view (Classic Drums, Bass, Piano), focus mode, Edit Mode, the pad editor sheet with the sound list, the discard confirm, the profile menu, new/rename/delete profile dialogs and the version sheet — no violations. Fixed: pad and version-chip names now contain their visible text (key hints moved outside the pad button); focusable shell behind open overlays (the shell is now `inert`); content outside landmarks (chrome is a `<header>`); no `h1` in edit/focus mode; buttons nested in `role="option"` in the sound list (now toggle buttons). Keyboard-only (desktop): pad shortcuts, Space on a focused pad, Enter to select in Edit Mode, M + arrows to move (with announcements), Esc closes the sheet and focus returns to the pad; dialogs and mode switches now return or move focus instead of dropping it to `<body>`. Contrast checked against `globals.css` (math, then measured in Chromium since axe can't resolve `color-mix`): muted text ≥ 5.3:1 everywhere; blue/violet pad labels were 4.1–4.3:1 and key hints ~2–4:1, now ≥ 5.2:1 (hover ≥ 4.8:1); also fixed accent-colored text, the danger button and the top glow. Not done: manual screen-reader pass (VoiceOver/TalkBack)
- [x] Full suite + build green

### Stage 8 — Release readiness

- [x] Docs and ADRs match the implementation; `docs/api.md` documents the stats endpoint contract
- [ ] Clean-clone setup verified (reproducibility check, not a handoff between assistants)
- [ ] Summary of shipped features and known limitations
- [x] CI and dependency updates: GitHub Actions (lint, format, typecheck, unit, stats service, build, E2E) and Dependabot, Node pinned to 24 (ADR 0009) — all three jobs passed on `main` (458ee25) on 2026-10-31, and Dependabot is opening PRs
- [x] App imported into Vercel and live at https://fidgetbeatz.com, `www` redirecting to it ([deployment.md](deployment.md) step 1) — checked 2026-10-31: 200 over HTTPS, `www` returns 308
- [x] Stats Worker deployed at `stats.fidgetbeatz.com`, `NEXT_PUBLIC_STATS_URL` set in Vercel, footer shows live numbers — verified 2026-11-02 (steps 2–3)
- [x] `main` protected by active ruleset 26414881: PR and all three CI checks required, force pushes/deletion blocked — API verified 2026-11-02 (step 4)

## Phase 1 definition of done

Everything in the original spec §22, plus the addendum: sound display, focus mode, version chip, live stats (or a graceful offline state).

## Phase 2 — Studio recording and export (discovery; not implemented)

Priority over guided play. See [studio.md](studio.md) and [ADR 0007](decisions/0007-layer-mixer-and-export.md).

- Dedicated mobile-first Studio page; layout to be explored with Figma references before implementation.
- Shared project loops of any positive duration up to 60 seconds; set duration upfront or establish it by stopping the first take. Timeline with hit markers and moving red playhead.
- Record layers while previous layers play; switch soundboard presets between takes.
- Up to 30 layers, including sparse one-hit layers; mute, volume, delete and re-record. Validate performance on real phones.
- Tempo/count-in; optional snap. All layers use the same project duration; stopping a later take does not shorten it.
- Automatic local project recovery; download mixed WAV. No accounts or cloud saving required.
- Configurable limits and expandable layout: design for at least 60 layers and longer future songs without changing the initial 30-layer/60-second defaults.
- Defer individual-note editing, clip trimming and arrangement tools.

## Phase 3 — Accounts, saved songs and community (not started)

- User accounts and profile features, distinct from today's browser-local soundboard profiles.
- Save editable songs to an account; reopen and edit across devices.
- Publish/share songs to a community page.
- Up/down voting and highlighted/top-voted songs.
- Define storage, costs, licensing, moderation and voting rules during feature discovery.

## On hold — Guided play

Pads light up to guide users through original or public-domain songs. No longer Phase 3; no implementation scheduled.

## Later (unscheduled)

User audio uploads and extra sound packs; cost and licensing review before implementation.
