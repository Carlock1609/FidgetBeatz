# Development Guide

> Status: **In use (Phase 1).** `package.json` defines every command named here. `npm run test:e2e` builds the static export first, then serves `out/` on port 4173.

## 1. Workflow

1. Find the current stage in [roadmap.md](roadmap.md).
2. Read the docs for the area you're touching.
3. Make a small, reviewable change: code + tests + docs together.
4. Run `npm run check` (lint + typecheck + unit tests). Run `npm run test:e2e` for user-flow changes and `npm run build` before closing a stage.
5. Commit with a clear message (Conventional Commits recommended: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`).

A change is **not done** until it is verified by a command you actually ran or by a manual check you actually performed (and recorded).

## 2. TypeScript

- `strict: true`, plus `noUncheckedIndexedAccess` and `noImplicitOverride`.
- No `any`. If unavoidable (e.g. a vendor-prefixed browser API), use `unknown` + narrowing, or add `// eslint-disable-next-line` with a reason.
- Model domain concepts as types in `types/`. Prefer discriminated unions for actions and states.
- Branded ids are optional; if used, keep them consistent (`SoundId`, `PadId`, `ProfileId`).
- Validate **untrusted input at the boundary** (localStorage) with Zod; trust typed data inside the app.

## 3. React and Next.js

- Server Components by default. Add `"use client"` only to the smallest interactive subtree (`<SoundboardApp>` and below).
- Function components and hooks only.
- Board state: `useReducer` + one context in `features/soundboard`. Split context (state vs. dispatch) if re-render cost shows up. No Redux/Zustand unless an ADR justifies it.
- **Hot path rule:** a pad tap must not depend on React state updates. Play audio first; drive the visual flash via refs/CSS.
- Memoize only where profiling shows it matters (`React.memo` on `Pad` is expected to be worthwhile).
- Effects are for syncing with external systems (audio, storage), not for deriving state.

## 4. Components and styling

- Presentational components in `components/`; logic in hooks/reducers/`lib`.
- Use design tokens (CSS variables → Tailwind theme). No raw hex values in components.
- shadcn/ui components are copied into `components/ui` and **restyled** to the design system; don't ship the default look.
- Accessibility is required, not polish: semantic buttons, visible focus rings, labels on icon buttons, `prefers-reduced-motion` respected, color never the only signal.

## 5. Naming and files

| Thing      | Convention                                                      |
| ---------- | --------------------------------------------------------------- |
| Files      | `kebab-case.ts`, `kebab-case.tsx`                               |
| Components | `PascalCase`                                                    |
| Hooks      | `useCamelCase`, file `use-camel-case.ts`                        |
| Tests      | beside source: `thing.test.ts(x)`; e2e in `tests/e2e/*.spec.ts` |
| Sound ids  | `category-descriptor-nn` e.g. `kick-punchy-01`                  |
| Preset ids | `kebab-case` e.g. `classic-drums`                               |

## 6. Documentation standards

- JSDoc on every exported function, hook, class, and module. Explain **intent and behavior**, not types TypeScript already shows.
- Tags: `@param`, `@returns`, `@throws` (only if it really throws), `@example` for non-obvious APIs, `@deprecated` with a replacement.
- Inline comments for: audio timing, browser quirks, workarounds, migrations, non-obvious state. Not for restating code.
- When behavior changes, update JSDoc and the relevant `docs/*.md` in the same commit.
- Significant decisions → new ADR in `docs/decisions/` (copy the template).

## 7. Testing

| Layer      | Tool                                             | Covers                                                                                                             |
| ---------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Unit       | Vitest                                           | reducer actions, storage validation & migration, preset integrity, audio engine logic with a mocked `AudioContext` |
| Component  | React Testing Library                            | pad triggers call engine, edit mode add/remove/move, sound picker, profile switcher                                |
| End-to-end | Playwright (Chromium + WebKit, mobile viewports) | play flow, edit & save, preset switch, profile persistence across reload, corrupted storage recovery               |
| Manual     | Real devices                                     | audio latency & unlock on iOS Safari and Android Chrome                                                            |

Required test cases (Phase 1): sound assignment; playback initiation; rapid repeated taps; overlapping playback; add/remove pads; reorder (drag + keyboard/move buttons); save & restore profiles; switch presets; invalid stored data; unavailable sound; edit mode enter/save/cancel; responsive layout on a phone viewport.

Playwright can't hear audio. E2E tests assert the engine was **called** (via a test hook on `window`), and a manual device checklist (in `audio-system.md`) covers real playback. Record manual results in the PR.

Preset integrity test: every preset references existing sound ids, ids are unique, pad counts are within limits.

## 8. Dependencies

Before adding a package, check: is it needed, maintained, compatible with current React/Next, small, and permissively licensed? Prefer platform APIs. Note the justification in the commit; add an ADR for anything structural.

Expected Phase 1 runtime deps: `next`, `react`, `react-dom`, `tailwindcss` (+ its PostCSS/Vite plugin as required by the current version), shadcn/ui's peer deps (Radix primitives as used, `class-variance-authority`, `clsx`, `tailwind-merge`), `motion`, `lucide-react`, `@dnd-kit/*`, `zod`.

## 9. Pre-merge checklist

- [ ] `npm run lint`, `npm run typecheck`, `npm run test` pass
- [ ] `npm run test:e2e` passes (if user flows changed)
- [ ] `npm run build` passes (static export works)
- [ ] New/changed exports have accurate JSDoc
- [ ] Docs updated; ADR added if a decision changed
- [ ] New audio assets listed in the inventory with a verified license
- [ ] Checked on a phone-sized viewport; reduced-motion respected
