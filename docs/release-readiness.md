# Release readiness

This replaces the historical assistant-to-assistant handoff concept. It records reproducible setup, shipped behavior and known limitations.

## Build pipeline

Tailwind now uses the Next.js-documented PostCSS plugin for both Turbopack and Webpack. The previous Turbopack-only loader prevented a correctly styled Webpack fallback; missing utilities caused misleading focus-ring and keyboard-grid failures. No design tokens or product colors changed.

- Default command remains `npm run build`; CI and Vercel continue to use Turbopack.
- Diagnostic alternative: `npm run build -- --webpack`, then `npx playwright test`.
- The shared pipeline passed the default local production build and the correctly styled Webpack browser suite (69 passed, 12 platform-specific skips).

## Fresh-clone verification — 2026-11-02

Verified source commit: `22fe7dd` on `codex/release-readiness`. A fresh clone at `/private/tmp/fidgetbeatz-release-check-20261102` had no reused node_modules or build output. Runtime: Node 24.22.2, matching `.nvmrc` major 24. Browser binaries were already installed on this machine, so browser installation itself was not reverified.

- Root `npm ci --no-audit --no-fund`: passed.
- `npm run check`: passed, 164 unit/component tests.
- `npm run format:check`: passed.
- Stats service `npm ci --no-audit --no-fund`, typecheck and tests: passed, 22 tests.
- `npm run test:e2e`: passed using the default Turbopack production build; 69 browser tests passed, 12 platform-specific skips.

For another machine: use Node 24, `npm ci`, `npm --prefix services/stats-counter ci`, `npx playwright install chromium webkit`, then the commands above and `npm run test:e2e`. Linux CI uses `npx playwright install --with-deps chromium webkit`.

## Shipped behavior

- Instant overlapping soundboard playback, 103 original bundled sounds, ten presets.
- Editable/reorderable pads and up to five browser-local soundboard profiles.
- Sound display, focus mode, keyboard shortcuts, reduced-motion support and accessible dialogs.
- Static app hosted on Vercel; optional Cloudflare stats service tracked separately.

## Known limitations

- No Studio, recording/export, accounts, cloud songs, voting or guided play implemented yet.
- Saved profiles belong to one browser/device and can be lost if site storage is cleared.
- Physical Android audio and manual screen-reader checks remain pending; automated checks do not establish audible latency.
- Physical-device results and deployment status must be tracked in their separate task PRs; this setup check does not close them.
- Build fetches Google Fonts and needs network access. The 103-sound library is about 7.4 MB, over the original 5 MB target; only the active board loads initially.
- npm reported dependency audit findings during installation; resolving dependency advisories is separate from this CSS/setup change. No automated major-version audit fixes were applied.
