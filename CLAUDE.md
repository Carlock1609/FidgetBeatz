# CLAUDE.md — Working rules for this repository

This file tells Claude Code how to work on FidgetBeatz. Read it at the start of every session.

## Before doing anything

1. Inspect the repo state (`git status`, `package.json`, existing `app/`, `docs/`). Preserve working code and decisions; don't re-scaffold over them.
2. Read `docs/roadmap.md` to find the current stage, then the docs relevant to the task:
   - Audio work → `docs/audio-system.md`, `docs/sound-licensing.md`
   - Profiles/presets → `docs/profiles-and-presets.md`
   - Any UI → `docs/figma-handoff.md`, `docs/design-system.md`
   - Stats/version → `docs/decisions/0006-visitor-stats-and-version.md`
   - Anything structural → `docs/architecture.md`, `docs/decisions/`
3. Requirements: `docs/product-spec.md` plus `docs/product-spec-addendum.md` (the addendum wins on conflicts). These docs are the source of truth for how we meet them.
4. Visuals: the published Figma file linked in `docs/figma-handoff.md`. Use the Figma connector if it's available. Treat any Figma-generated code as reference only.

## Non-negotiables

- **Phase 1 scope only.** Phase 1 includes: soundboard, sound display (LCD), focus mode, edit mode, presets, profiles, version chip, live stats. No layer mixer/recording/export (Phase 2), song mode, accounts, database, cloud storage, or API routes. Don't add "hooks for later" either.
- **Stats are the only external runtime dependency** (ADR 0006). They load after first paint, never block audio, and degrade to an offline state.
- **No paid services or runtime third-party audio APIs.** Sounds are bundled files in `public/sounds/`.
- **License gate:** never add an audio file unless its source, author, and license are recorded in the inventory and the license permits bundling, redistribution, and commercial use. If unsure, don't add it — flag it.
- **Audio latency first.** Trigger sounds on `pointerdown`, from pre-decoded buffers. Never `await` a fetch or a React state update before calling `source.start()`.
- **Static-exportable.** Keep the app deployable with `output: 'export'` until an ADR says otherwise.
- **No new dependency** without a one-line justification in the PR/commit and, if significant, an ADR.
- **Honest reporting.** Never say something is tested, working, or verified unless you ran the command and saw it pass. Report incomplete requirements explicitly.

## How to work

- Build in the stages in `docs/roadmap.md`. A stage is done when its behavior is verified, not when its files exist.
- After each meaningful change run: `npm run lint && npm run typecheck && npm run test`. Run `npm run test:e2e` when touching user flows. Run `npm run build` before declaring a stage complete.
- Update docs in the same change as the code they describe. If implementation diverges from a doc, fix the doc (or write an ADR) — never leave them inconsistent.
- Add an ADR in `docs/decisions/` for any decision that would surprise a new contributor.
- JSDoc every exported function, hook, and module; comments explain intent and non-obvious behavior, not syntax. JSDoc must match real behavior (don't document `@throws` that can't happen).

## Code conventions (summary — full version in docs/development.md)

- TypeScript strict; no `any` without a comment explaining why.
- Server Components by default; `"use client"` only on the smallest interactive subtree.
- State: `useReducer` + context for the board. No global state library unless an ADR justifies it.
- Feature logic in `features/` and `lib/`; presentational components in `components/`.
- Filenames: `kebab-case.ts(x)`; components `PascalCase`; hooks `useThing`.

## Asking questions

Make routine decisions yourself and note them. Ask only when a choice is expensive to reverse and genuinely ambiguous (e.g. changing the stored data schema, dropping a required feature).
