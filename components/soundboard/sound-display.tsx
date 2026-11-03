"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getPreset } from "@/data/presets";
import { CATEGORY_META } from "@/data/sounds/categories";
import { getSound } from "@/data/sounds/catalog";
import { useBoardState } from "@/features/soundboard/board-provider";
import { selectActiveProfile, selectVisiblePads } from "@/features/soundboard/board-reducer";
import { useAudioContextState, useAudioEngine, useEngineEvents } from "@/hooks/use-audio-engine";
import type { EngineEvent } from "@/lib/audio/audio-engine";
import { cn } from "@/lib/utils/cn";

const SEGMENTS = 24;

/** Samples the output at 30 fps, with fast attack and a short visual release. */
export function useOutputMeter(onFrame: (level: number) => void) {
  const engine = useAudioEngine();
  useEffect(() => {
    let frame = 0;
    let last = 0;
    let level = 0;
    const draw = (now: number) => {
      if (now - last >= 1000 / 30) {
        const elapsed = (now - last) / 1000;
        last = now;
        const peak = engine.getOutputLevel();
        level = peak === 0 ? 0 : Math.max(peak, level * Math.exp(-elapsed / 0.165));
        onFrame(level * SEGMENTS);
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [engine, onFrame]);
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
  useOutputMeter(draw);

  const onEvent = useCallback((e: EngineEvent) => {
    if (e.type !== "trigger") return;
    setHit({ soundId: e.soundId, padIndex: e.padIndex });
  }, []);
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
  useOutputMeter(draw);
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
