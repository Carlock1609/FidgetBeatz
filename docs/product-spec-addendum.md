# Product Spec Addendum — v1.1 (2026-10-18)

This addendum records requirements added after the original spec (`product-spec.md`). Where they conflict, **this addendum wins**. Each item names its phase.

## A1. Visual direction — Phase 1

- The visual source of truth is the **published Figma file** (link in [figma-handoff.md](figma-handoff.md)).
- Baseline direction: **A + C Hybrid**.
  - From A (Neon Stage): the dark stage, glowing color-coded pads, and the top bar with profile switcher and preset chips.
  - From C (Rubber Keypad): the green LCD **sound display**.
- A darker **"Dark & Edgy"** alternative was explored in Figma. If the Figma file uses it, build that; layout and features are identical either way.
- Pads stay **color-coded by sound category** in every direction.

## A2. Sound display (LCD) — Phase 1

- A recessed panel between the profile row and the preset chips.
- It shows: preset name, pad position (`PAD 05/12`), the last sound played (large, caps), a category dot in the pad's color, and a 24-segment level meter.
- The meter jumps on each hit and decays over about 300 ms. Idle state: `TAP A PAD` / `READY`.
- The display must never delay audio: it updates after `source.start()`, not before.

## A3. Focus mode — Phase 1

- A toggle hides all UI except the pad grid, which then fills the viewport (safe areas respected).
- Exit is a small, semi-transparent floating button in a corner; Esc also exits on desktop.
- Where the browser supports it (Android, desktop), focus mode also requests real fullscreen. iPhone Safari does not allow this for web pages, so there focus mode is in-page only.
- Optional: keep the screen awake while in focus mode, using the Screen Wake Lock API where available.
- Focus mode state is remembered per device in settings.

## A4. Version indicator — Phase 1

- A small `v0.1.0` chip in the footer.
- The version comes from `package.json` at build time (`NEXT_PUBLIC_APP_VERSION`), optionally with the short git commit.
- Tapping the chip opens a sheet with the version, build date, and a short "What's new" list (from `CHANGELOG.md`).

## A5. Live stats — Phase 1 (exception to the no-backend rule)

- The footer shows **visitors now** ("12 jamming now") and **total page visits** ("1,284 visits").
- These need a small external counter service. See [ADR 0006](decisions/0006-visitor-stats-and-version.md).
- The Next.js app itself stays static-exportable.
- Stats are non-essential. If the service is down or blocked, the footer shows an offline state and everything else works.
- No personal data is stored: no cookies for tracking, no IP storage beyond what the provider needs for counting.

## A6. Layer mixer, save and download — Phase 2

- Record pad hits as loop layers (up to 8), stacked on top of each other.
- Basic controls: tempo (BPM), loop length (1/2/4 bars), count-in, optional snap-to-beat. Per layer: mute, volume, delete.
- Save beats in the browser. Download as WAV (MP3 optional).
- Feasibility is confirmed: client-only, $0. See [ADR 0007](decisions/0007-layer-mixer-and-export.md).
- **Not built in Phase 1.** Phase 1 must not block it: the audio engine keeps `play(id, when)` scheduling.

## Updated Phase 1 definition of done (additions)

- Sound display works and stays in sync with hits.
- Focus mode toggles on and off and works on phone and desktop.
- The version chip shows the real build version.
- Stats show live numbers, or a graceful offline state.

## A7. Revised priorities and Studio scope — 2026-11-02

This section supersedes A6 and the original spec's Phase 2/3 ordering where they conflict.

- Phase 2 is a mobile-first Studio for loops of any positive duration up to 60 seconds, with up to 30 layers, local recovery and WAV download. See [studio.md](studio.md) for accepted scope and unresolved behavior.
- Accounts are not required for Studio. Existing profiles remain browser-local board configurations.
- Phase 3 covers accounts, editable cloud-saved songs, community sharing, voting and highlights.
- Guided play is on hold, with no scheduled phase.
- Existing soundboard design is the baseline; explore mobile Studio layouts in Figma before implementation. Missing historical Figma references are not a release blocker.
- Release readiness replaces the old handoff label. Setup verification and known limitations remain useful regardless of which assistant is used.

### A7 recording clarification

Users choose the project duration upfront or establish it by stopping the first recording (60-second maximum). All layers share that duration. Later takes may contain sparse hits or stop early without shortening the project: a 30-second drumline can accompany a layer containing only one sound at second 16. The complete project repeats; short layers do not repeat independently. Thirty layers is the product target, subject to real-phone performance validation, not a promise of 30 simultaneous voices. See Studio discovery for capture-boundary behavior and remaining design questions.

### A7 expandable limits

The initial 30-layer and 60-second caps must be configurable release defaults. Build project data, validation, recovery, playback/export and UI around configurable limits rather than hardcoded assumptions. Design layer navigation to accommodate at least 60 layers and timelines to accommodate longer future songs without a structural redesign. Increasing shipped caps requires performance and compatibility validation, especially on phones. See [Studio discovery](studio.md#expandable-limits-and-layout).
