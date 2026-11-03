# Device validation

## Latest results — 2026-11-02

- [Audio validation PR #13](https://github.com/Carlock1609/FidgetBeatz/pull/13): four new lifecycle tests passed; 168 unit/component tests passed. Owner reported the requested iPhone 17 Pro Max Safari playback checks (first hit, rapid tapping, multi-touch, app switching and lock/unlock) “works great.” iOS version was not supplied; remaining manual checks stay open.
- [Release-readiness PR #14](https://github.com/Carlock1609/FidgetBeatz/pull/14): shared Tailwind PostCSS pipeline fixed the local build issue and the misleading failures from an unstyled Webpack export. Fresh Node 24 clone passed install, checks, default build and 69 browser tests (12 platform-specific skips); stats install/typecheck/22 tests passed.
- [Usability PR #15](https://github.com/Carlock1609/FidgetBeatz/pull/15): four new portrait/landscape phone regression checks passed (two desktop cases intentionally skipped). Physical safe-area, VoiceOver/TalkBack and OS reduced-motion checks remain separate.

Earlier attempts failed before browser testing because of font/network and Turbopack port permissions. These were followed by the successful builds above; they are no longer the latest test result.

The existing Playwright suite targets Pixel 7 Chromium, iPhone 15 WebKit and desktop Chromium. It covers trigger initiation, repeated hits, editing/persistence, focus mode, keyboard use, reduced motion and axe checks. Emulation cannot verify audible latency, real multi-touch or physical-device audio interruptions.

## Real-phone pass

Use the live https://fidgetbeatz.com site. Record device model, OS/browser version, date, pass/fail and observations for each item. Test at least iOS Safari and Android Chrome; include a mid-range Android phone for performance.

- [ ] Fresh load: first tap makes sound; subsequent taps feel immediate.
- [ ] Rapid taps for 30 seconds; no audible stutter or missed ready sounds.
- [ ] Two or more fingers on different pads; sounds overlap without accidental scrolling/zooming.
- [ ] Switch presets, play, edit/save a pad, reload; changes persist.
- [ ] Portrait and landscape: pads, menus, dialogs and exit controls remain reachable; check safe areas.
- [ ] Enter/exit focus mode; verify fullscreen behavior where supported.
- [ ] Background and return; lock/unlock the phone; audio resumes on interaction.
- [ ] iOS silent switch: record observed behavior; test headphones/speaker if available.
- [ ] VoiceOver/TalkBack: navigate pads and dialogs; names, focus return and dismiss controls work.
- [ ] OS reduced motion enabled: verify flashes remain usable without scale animations.

Desktop follow-up: Chrome/Firefox/Safari overlap and background/resume; listen for clipping while playing several pads.

## Result log

| Date       | Device / OS / browser | Check                   | Result / observations                             |
| ---------- | --------------------- | ----------------------- | ------------------------------------------------- |
| 2026-11-02 | Node 24 fresh clone   | Automated browser suite | 69 passed, 12 platform-specific skips; see PR #14 |

Keep all physical-device boxes open until someone performs and records the checks. Audio-specific requirements also live in [audio-system.md](audio-system.md).
