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
- [ ] Reduced motion and focus states verified — implemented (CSS + `MotionConfig reducedMotion="user"`, 2 px focus rings), not yet checked with a screen reader or OS reduced-motion setting

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
- [ ] **6b:** stats provider chosen and recorded in ADR 0006; `lib/stats` client; visitors-now heartbeat; page-visit counter — client, heartbeat and visit logic done and unit-tested; **provider not chosen/deployed**
- [x] Stats offline state; E2E with the stats endpoint blocked
- [x] Version sheet (version, build date, what's new)

### Stage 7 — Polish and testing

- [ ] Animation tuning; rapid-tap performance on a mid-range phone
- [ ] Accessibility pass
- [x] Full suite + build green

### Stage 8 — Handoff

- [x] Docs and ADRs match the implementation; `docs/api.md` documents the stats endpoint contract
- [ ] Clean-clone setup verified
- [ ] Summary of shipped features and known limitations

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
