"use client";

import { useEffect } from "react";

/** Overlays currently holding the app inert; nested overlays (menu → dialog) share it. */
let holds = 0;

/**
 * Makes the app shell (`[data-app-root]`) `inert` while the calling overlay is mounted.
 * Radix already traps focus and sets `aria-hidden` on the background, but that leaves
 * focusable controls inside an `aria-hidden` tree (axe `aria-hidden-focus`); `inert` removes
 * them from focus, pointer and the accessibility tree together. Overlays are portaled to
 * `<body>`, outside the root, so they stay interactive.
 */
export function useInertBackground(): void {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-app-root]");
    if (!root) return;
    // Deferred past the current effects so the overlay's focus scope can first read and move
    // focus: making the focused control's ancestor inert would otherwise blur it too early.
    let held = false;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      held = true;
      holds++;
      root.inert = true;
    });
    return () => {
      cancelled = true;
      if (!held) return;
      holds--;
      if (holds === 0) root.inert = false;
    };
  }, []);
}
