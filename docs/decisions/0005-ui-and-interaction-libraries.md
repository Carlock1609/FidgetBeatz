# 0005 — UI, animation, drag-and-drop, and state libraries

- **Status:** Accepted
- **Date:** 2026-10-18

## Context

The spec prefers Tailwind + shadcn/ui + Motion and asks for touch-friendly drag-and-drop with accessible alternatives, without heavy frameworks or unnecessary state libraries.

## Options considered

- **Styling:** Tailwind (chosen) vs. CSS Modules vs. a component kit (MUI/Chakra — too opinionated visually).
- **Primitives:** shadcn/ui on Radix (chosen; code is copied in and fully restyleable) vs. building dialogs/menus from scratch (accessibility risk).
- **Animation:** CSS for per-tap feedback (cheapest, off the React path) + Motion for layout/stagger/drag polish (chosen) vs. Motion everywhere (unnecessary work on the hot path).
- **Drag and drop:** dnd-kit sortable (chosen — touch, pointer, and keyboard sensors; grid strategy; accessible announcements) vs. Motion `Reorder` (list-oriented, weak for 2D grids, no keyboard support) vs. custom (time sink).
- **State:** `useReducer` + context (chosen) vs. Zustand/Redux (no cross-tree complexity justifying it).
- **Validation:** Zod for stored data only.

## Decision

Tailwind with project tokens; shadcn/ui restyled to the design system; CSS for tap feedback, Motion for transitions; dnd-kit for grid reordering plus explicit move buttons; `useReducer` + context; Zod at the storage boundary; Lucide icons.

## Consequences

- dnd-kit and Motion both influence transforms during drag — let dnd-kit own transforms while dragging; use Motion layout animations only for non-drag reflows (preset switch, add/remove). Verify in Stage 4.
- Check dnd-kit's maintenance status and React compatibility at install time; if it has stalled, evaluate its successor or alternatives and update this ADR.
