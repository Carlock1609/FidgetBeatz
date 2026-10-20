"use client";

/**
 * Focus mode (addendum A3): hides all chrome; also requests real fullscreen and a screen wake
 * lock where the browser allows it. iPhone Safari has no element fullscreen for web pages, so
 * there focus mode is in-page only — the feature checks below simply skip it.
 */
import { useCallback, useEffect, useRef } from "react";
import { useBoardDispatch, useBoardState } from "@/features/soundboard/board-provider";
import { isDialogOpen } from "@/lib/utils/dom";

interface WakeLockSentinelLike {
  release(): Promise<void>;
}
type WakeLockNavigator = Navigator & {
  wakeLock?: { request(type: "screen"): Promise<WakeLockSentinelLike> };
};

/** Returns focus mode state plus enter/exit/toggle actions; wires Esc and fullscreen sync. */
export function useFocusMode() {
  const { settings } = useBoardState();
  const dispatch = useBoardDispatch();
  const focus = settings.focusMode;
  const wakeLock = useRef<WakeLockSentinelLike | null>(null);
  const enteredFullscreen = useRef(false);

  const setFocus = useCallback(
    (focusMode: boolean) => dispatch({ type: "updateSettings", settings: { focusMode } }),
    [dispatch],
  );

  /** Must be called from a click handler: fullscreen requires a user gesture. */
  const enter = useCallback(() => {
    setFocus(true);
    const root = document.documentElement;
    if (!document.fullscreenElement && typeof root.requestFullscreen === "function") {
      root
        .requestFullscreen({ navigationUI: "hide" })
        .then(() => {
          enteredFullscreen.current = true;
        })
        .catch(() => undefined);
    }
  }, [setFocus]);

  const exit = useCallback(() => {
    setFocus(false);
    if (document.fullscreenElement && typeof document.exitFullscreen === "function") {
      void document.exitFullscreen().catch(() => undefined);
    }
    enteredFullscreen.current = false;
  }, [setFocus]);

  // Esc exits (when not in real fullscreen the browser doesn't consume it); leaving
  // fullscreen through the browser UI also leaves focus mode.
  useEffect(() => {
    if (!focus) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDialogOpen()) exit();
    };
    const onFullscreenChange = () => {
      if (!document.fullscreenElement && enteredFullscreen.current) exit();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [focus, exit]);

  // Keep the screen awake while focused; the browser drops the lock when the tab hides, so
  // re-acquire on return.
  useEffect(() => {
    const nav = navigator as WakeLockNavigator;
    if (!focus || !nav.wakeLock) return;
    let cancelled = false;
    const acquire = () => {
      if (document.hidden) return;
      nav.wakeLock
        ?.request("screen")
        .then((lock) => {
          if (cancelled) void lock.release();
          else wakeLock.current = lock;
        })
        .catch(() => undefined);
    };
    acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", acquire);
      void wakeLock.current?.release().catch(() => undefined);
      wakeLock.current = null;
    };
  }, [focus]);

  const toggle = useCallback(() => (focus ? exit() : enter()), [focus, enter, exit]);
  return { focus, enter, exit, toggle };
}
