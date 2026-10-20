# Figma Handoff

> **Figma file:** `<PASTE PUBLISHED FIGMA LINK HERE>`
> Fill this in before Stage 2. The Figma file is the visual source of truth; these docs describe behavior.
>
> **2026-10-18:** no link was available when Phase 1 was built, so the UI follows the A + C Hybrid baseline in `design-system.md`. When the link is added, compare each frame below against the running app and update tokens in `app/globals.css`.

## How to use the Figma file

1. **Preferred:** connect the Figma connector (MCP) in Claude Code. It can read the design context, screenshots and variable definitions straight from the file.
2. **Otherwise:** export screenshots of each frame into `docs/design/` and copy the variables (colors, type, radii, spacing) into `docs/design-system.md` by hand.
3. If Figma generated code (e.g. Figma Make), treat it as a **visual reference only**. Rebuild the components to this repo's architecture and standards rather than pasting generated code in.

## Extract into code

| From Figma               | Into the repo                                                                                 |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| Color variables          | CSS variables in `app/globals.css` → Tailwind theme                                           |
| Text styles              | `next/font` setup + type scale in `design-system.md`                                          |
| Radius / spacing         | Tailwind theme tokens                                                                         |
| Pad component variants   | `components/soundboard/pad.tsx` states (rest, hit, focus, selected, dragging, missing, empty) |
| Sound display            | `components/soundboard/sound-display.tsx`                                                     |
| Footer (stats + version) | `components/shell/app-footer.tsx`                                                             |
| Focus mode               | `components/soundboard/focus-mode-toggle.tsx` + layout state                                  |
| Mixer, export sheet      | Phase 2 — don't build yet                                                                     |

## Frame checklist (Phase 1)

- [ ] Play — idle
- [ ] Play — pad hit (LCD updated)
- [ ] Focus mode
- [ ] Edit mode + pad editor sheet
- [ ] Sound picker
- [ ] Profiles & presets
- [ ] Version sheet
- [ ] Stats offline state, missing-sound pad, "tap to start" audio prompt
- [ ] Tablet / desktop play (if present in Figma)

Any frame missing from Figma: follow `design-system.md` and note the gap in the PR.

## Rules

- Match Figma's tokens exactly; don't invent new colors.
- Where Figma conflicts with accessibility (contrast, 44 px targets, focus rings), accessibility wins. Note the deviation.
- Animations follow `design-system.md` timings even if the prototype differs.
