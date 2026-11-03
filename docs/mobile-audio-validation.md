# Mobile audio validation

Status: automated lifecycle coverage added; physical-device validation pending. This task is not complete until audible behavior has been checked on phones.

## Automated coverage

The AudioEngine tests cover predecoded first-hit initiation, repeated/overlapping hits, voice stealing, choke, background suspension/return, rejected resume recovery and visibility changes before initialization. These use a fake Web Audio context and do not measure audible latency or actual OS interruption behavior.

The existing Playwright suite runs mobile Chromium and WebKit emulation. Its LCD assertion follows source.start(), proving initiation rather than audible output.

## iPhone 17 Pro Max — owner test

Open https://fidgetbeatz.com in Safari. Record iOS version, date, speaker/headphone use and silent-switch/Action Button silent-mode setting. Leave results pending until observed.

| Check          | Procedure                                                                                        | Result  |
| -------------- | ------------------------------------------------------------------------------------------------ | ------- |
| First hit      | Fresh reload, wait for pads to load, tap a pad once. Does the first hit sound?                   | Pending |
| Rapid hits     | Tap alternating drum pads quickly for 30 seconds. Note missed sounds, stutter, delay or UI lag.  | Pending |
| Multi-touch    | Tap two or three different pads together. Confirm overlapping sound and no unwanted zoom/scroll. | Pending |
| Background     | Switch apps for 10 seconds, return, tap again. Repeat after locking/unlocking the phone.         | Pending |
| Silent mode    | Compare speaker playback with silent mode off/on; record actual behavior.                        | Pending |
| Preset changes | Switch drums → piano → drums, then repeat several taps after each board finishes loading.        | Pending |

Report each as pass/fail with observations. If a failure occurs, include the preset, pad and exact sequence; do not clear browser storage during investigation.

## Other devices

- Android Chrome (prefer a mid-range phone): same first-hit, rapid-hit, multi-touch and background checks — pending; no device currently confirmed.
- Desktop Chrome/Firefox/Safari: overlap, background/return and audible clipping checks — pending.

## Local execution

Run `npm run test` for engine coverage and `npm run test:e2e` for the production browser suite. The default Turbopack build has hit a local port-permission restriction in this environment. A separately recorded Webpack diagnostic build does not establish that the default production command passes.

## Verification results — 2026-11-02

- `npm run check`: passed, 168 unit/component tests including four new audio lifecycle regressions.
- `npm run build -- --webpack`: passed (diagnostic alternative; default Turbopack remains blocked by local port permissions).
- `npx playwright test` against that export: 67 passed, 12 intentionally skipped, 2 failed. Both failures are desktop keyboard accessibility checks (Focus mode ring detection and keyboard pad movement) and belong to the separate usability/accessibility task. Mobile Chromium and WebKit projects had no failures.
- This does not establish audible performance or physical-device behavior. iPhone 17 Pro Max owner checks and Android testing remain pending.
