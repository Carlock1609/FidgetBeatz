# Device validation

## Latest attempt — 2026-11-02

`npm run test:e2e` did not reach browser tests. The initial build could not fetch Google Fonts; the retry failed in Turbopack CSS processing with `binding to a port: Operation not permitted`. This is an environment blocker, not evidence of a device regression or a passing test. No physical-device checks have been performed in this session.

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

| Date       | Device / OS / browser   | Check                   | Result / observations           |
| ---------- | ----------------------- | ----------------------- | ------------------------------- |
| 2026-11-02 | Local build environment | Automated browser suite | Blocked before tests; see above |

Keep all physical-device boxes open until someone performs and records the checks. Audio-specific requirements also live in [audio-system.md](audio-system.md).
