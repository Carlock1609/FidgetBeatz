"use client";

/**
 * React bridge for the AudioEngine: one engine per app, global unlock-on-gesture, page
 * visibility handling, and small subscription hooks. No business rules live here.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { getSound } from "@/data/sounds/catalog";
import { AudioEngine, type EngineEvent, type SoundStatus } from "@/lib/audio/audio-engine";
import type { SoundId } from "@/types";

const AudioEngineContext = createContext<AudioEngine | null>(null);

/**
 * Provides the shared AudioEngine. The engine is created on the client only and touches no
 * Web Audio API until the first user gesture.
 */
export function AudioEngineProvider({ children }: { children: ReactNode }) {
  const [engine] = useState(() => new AudioEngine({ resolveSound: getSound }));

  useEffect(() => {
    // iOS Safari has historically accepted only some gesture types (touchend/click) for
    // starting audio, so listen to several. unlock() is idempotent and cheap once running.
    const unlock = () => void engine.unlock();
    const events = ["pointerdown", "touchend", "click", "keydown"] as const;
    for (const type of events)
      window.addEventListener(type, unlock, { capture: true, passive: true });
    const onVisibility = () => engine.setPageHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      for (const type of events) window.removeEventListener(type, unlock, { capture: true });
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [engine]);

  return <AudioEngineContext.Provider value={engine}>{children}</AudioEngineContext.Provider>;
}

/** Returns the shared engine. Must be used under AudioEngineProvider. */
export function useAudioEngine(): AudioEngine {
  const engine = useContext(AudioEngineContext);
  if (!engine) throw new Error("useAudioEngine must be used within AudioEngineProvider");
  return engine;
}

/** Subscribes a callback to engine events for the component's lifetime. */
export function useEngineEvents(listener: (event: EngineEvent) => void): void {
  const engine = useAudioEngine();
  useEffect(() => engine.subscribe(listener), [engine, listener]);
}

/** Load status of one sound; re-renders only when that sound's status changes. */
export function useSoundStatus(soundId: SoundId | null): SoundStatus {
  const engine = useAudioEngine();
  const subscribe = useCallback(
    (onChange: () => void) =>
      engine.subscribe((e) => {
        if (e.type === "status" && e.soundId === soundId) onChange();
      }),
    [engine, soundId],
  );
  return useSyncExternalStore(
    subscribe,
    () => (soundId ? engine.status(soundId) : "idle"),
    () => "idle",
  );
}

/** Audio context state for prompts ("tap to enable sound", unsupported browsers). */
export function useAudioContextState(): AudioContextState | "unsupported" | "idle" {
  const engine = useAudioEngine();
  const subscribe = useCallback(
    (onChange: () => void) => engine.subscribe((e) => e.type === "context" && onChange()),
    [engine],
  );
  return useSyncExternalStore(
    subscribe,
    () => (engine.isUnsupported ? "unsupported" : engine.isRunning ? "running" : "idle"),
    () => "idle",
  );
}
