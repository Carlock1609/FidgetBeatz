"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getPreset } from "@/data/presets";
import { CATEGORY_META } from "@/data/sounds/categories";
import { getSound } from "@/data/sounds/catalog";
import { useBoardState } from "@/features/soundboard/board-provider";
import { selectActiveProfile, selectVisiblePads } from "@/features/soundboard/board-reducer";
import { useAudioContextState, useEngineEvents } from "@/hooks/use-audio-engine";
import type { EngineEvent } from "@/lib/audio/audio-engine";
import { cn } from "@/lib/utils/cn";

const SEGMENTS = 24;

/**
 * Trigger-driven level meter (docs/audio-system.md §9). Each hit jumps to 18–24 segments, then
 * decays exponentially (≈9 by 140 ms, ≈2–3 by 320 ms) in a rAF loop that writes to the DOM
 * directly and stops when idle. No AnalyserNode, nothing on the audio path.
 */
export function useTriggerMeter(onFrame: (level: number) => void) {
  const level = useRef(0);
  const frame = useRef<number | null>(null);
  const last = useRef(0);
  const draw = useRef(onFrame);
  useEffect(() => {
    draw.current = onFrame;
  }, [onFrame]);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  return useCallback(() => {
    const step = (now: number) => {
      const dt = (now - last.current) / 1000;
      last.current = now;
      level.current *= Math.exp(-dt / 0.165);
      if (level.current < 0.5) level.current = 0;
      draw.current(level.current);
      frame.current = level.current > 0 ? requestAnimationFrame(step) : null;
    };
    level.current = Math.max(level.current, 18 + Math.random() * 6);
    draw.current(level.current);
    if (frame.current === null) {
      last.current = performance.now();
      frame.current = requestAnimationFrame(step);
    }
  }, []);
}

/**
 * The green LCD readout: preset · pad position, last sound + category, and the level meter.
 * It updates from the engine's trigger event (emitted after `source.start()`), and only this
 * component re-renders on a hit — never the grid.
 */
export function SoundDisplay({ className }: { className?: string }) {
  const state = useBoardState();
  const profile = selectActiveProfile(state);
  const pads = selectVisiblePads(state);
  const contextState = useAudioContextState();
  const [hit, setHit] = useState<{ soundId: string; padIndex?: number } | null>(null);
  const segments = useRef<(HTMLSpanElement | null)[]>([]);

  const draw = useCallback((level: number) => {
    const lit = Math.round(level);
    segments.current.forEach((el, i) => {
      if (!el) return;
      if (i < lit) el.setAttribute("data-on", "");
      else el.removeAttribute("data-on");
    });
  }, []);
  const kick = useTriggerMeter(draw);

  const onEvent = useCallback(
    (e: EngineEvent) => {
      if (e.type !== "trigger") return;
      setHit({ soundId: e.soundId, padIndex: e.padIndex });
      kick();
    },
    [kick],
  );
  useEngineEvents(onEvent);

  // A new board starts idle again.
  const boardKey = `${profile.id}:${profile.basePresetId}`;
  const [shownBoard, setShownBoard] = useState(boardKey);
  if (shownBoard !== boardKey) {
    setShownBoard(boardKey);
    setHit(null);
  }

  const sound = hit ? getSound(hit.soundId) : undefined;
  const pad = hit?.padIndex !== undefined ? pads[hit.padIndex] : undefined;
  const presetName = getPreset(profile.basePresetId)?.name ?? "Custom";
  const position = hit?.padIndex !== undefined ? hit.padIndex + 1 : null;
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const status =
    contextState === "unsupported"
      ? "NO WEB AUDIO"
      : contextState === "running"
        ? "READY"
        : "TAP TO START";

  return (
    <section
      className={cn("lcd rounded-[16px] px-4 py-3 font-lcd", className)}
      aria-label="Sound display"
      data-testid="sound-display"
      data-last-sound={hit?.soundId ?? ""}
    >
      <div className="flex items-center justify-between text-[10px] tracking-[0.14em] uppercase opacity-70">
        <span className="truncate">{presetName}</span>
        <span>
          PAD {position ? pad2(position) : "--"}/{pad2(pads.length)}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-3" aria-live="polite">
        <span className="truncate text-[22px] leading-tight tracking-wide uppercase sm:text-2xl">
          {sound ? sound.name : "TAP A PAD"}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-[10px] tracking-[0.14em] uppercase">
          {sound ? (
            <>
              <span
                className="size-2 rounded-full bg-(--pad) shadow-[0_0_8px_var(--pad)]"
                data-color={pad?.color ?? CATEGORY_META[sound.category].color}
                aria-hidden
              />
              {CATEGORY_META[sound.category].label}
            </>
          ) : (
            status
          )}
        </span>
      </div>
      <div className="mt-2 flex gap-[3px]" aria-hidden>
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span
            key={i}
            ref={(el) => {
              segments.current[i] = el;
            }}
            className="lcd-seg h-2 flex-1 rounded-[2px]"
          />
        ))}
      </div>
    </section>
  );
}

/** Slim level line shown at the top edge in focus mode (settings.focusLevelLine). */
export function FocusLevelLine() {
  const bar = useRef<HTMLDivElement>(null);
  const draw = useCallback((level: number) => {
    if (bar.current) bar.current.style.transform = `scaleX(${Math.min(1, level / SEGMENTS)})`;
  }, []);
  const kick = useTriggerMeter(draw);
  const onEvent = useCallback((e: EngineEvent) => e.type === "trigger" && kick(), [kick]);
  useEngineEvents(onEvent);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-30 h-[3px]" aria-hidden>
      <div
        ref={bar}
        className="h-full origin-center bg-lcd-text shadow-[0_0_10px_var(--lcd-text)]"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}
