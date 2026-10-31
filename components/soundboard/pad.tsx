"use client";

import { AlertTriangle, GripVertical, Plus } from "lucide-react";
import { memo, useCallback, useEffect, useRef, type CSSProperties, type Ref } from "react";
import { getSound } from "@/data/sounds/catalog";
import { useAudioEngine, useSoundStatus } from "@/hooks/use-audio-engine";
import { cn } from "@/lib/utils/cn";
import type { Pad as PadModel } from "@/types";

const hitTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();
/** How long the pad stays fully lit before the CSS fade (~300 ms) takes over. */
const HIT_HOLD_MS = 60;

/**
 * Lights a pad by toggling `data-hit` directly on the element: no React render on the tap path.
 * Re-hitting while lit just extends the hold, so rapid taps stay bright.
 */
export function flashPad(element: HTMLElement | null): void {
  if (!element) return;
  element.setAttribute("data-hit", "");
  const pending = hitTimers.get(element);
  if (pending) clearTimeout(pending);
  hitTimers.set(
    element,
    setTimeout(() => element.removeAttribute("data-hit"), HIT_HOLD_MS),
  );
}

/** True when a pad points at a sound that is unknown or failed to load. */
export function useIsMissing(soundId: string | null): boolean {
  const status = useSoundStatus(soundId);
  return soundId !== null && (!getSound(soundId) || status === "error");
}

/**
 * Accessible name for a pad. It starts with the pad's visible text so it satisfies WCAG 2.5.3
 * (Label in Name): a missing pad shows "Missing sound" above its label.
 */
function padName(pad: PadModel, missing: boolean): string {
  if (missing) return `Missing sound, ${pad.label || "Pad"}`;
  return pad.label || "Empty pad";
}

function PadFace({
  pad,
  missing,
  editing,
}: {
  pad: PadModel;
  missing: boolean;
  editing?: boolean;
}) {
  const empty = pad.soundId === null;
  return (
    <>
      <span className="pad-led absolute top-3 left-3 size-2 rounded-full" aria-hidden />
      {editing && <GripVertical className="absolute top-2 right-2 size-4 opacity-50" aria-hidden />}
      <span className="flex h-full w-full flex-col items-start justify-end gap-1 p-3 text-left">
        {missing && <AlertTriangle className="size-4" aria-hidden />}
        {empty && <Plus className="size-5 opacity-60" aria-hidden />}
        <span className="line-clamp-2 text-[13px] leading-tight font-semibold tracking-wide uppercase sm:text-sm">
          {missing ? "Missing sound" : empty ? pad.label || "Empty" : pad.label}
        </span>
        {missing && pad.label && <span className="text-[10px] font-normal">{pad.label}</span>}
      </span>
    </>
  );
}

export interface PlayPadProps {
  pad: PadModel;
  index: number;
  /** Keyboard shortcut shown on fine-pointer devices. */
  hint?: string;
  /** Registers this pad's trigger so keyboard shortcuts can fire it. */
  onRegister: (index: number, trigger: (() => void) | null) => void;
}

/**
 * A playable pad. Sound starts on `pointerdown` (not click, which waits for release), from a
 * pre-decoded buffer, before any visual work. The key hint renders beside the button (the
 * parent must be `relative`) so the shortcut is exposed via `aria-keyshortcuts`, not the name.
 */
export const PlayPad = memo(function PlayPad({ pad, index, hint, onRegister }: PlayPadProps) {
  const engine = useAudioEngine();
  const ref = useRef<HTMLButtonElement>(null);
  const missing = useIsMissing(pad.soundId);

  const trigger = useCallback(() => {
    if (pad.soundId) engine.play(pad.soundId, { padIndex: index });
    flashPad(ref.current);
  }, [engine, pad.soundId, index]);

  useEffect(() => {
    onRegister(index, trigger);
    return () => onRegister(index, null);
  }, [index, trigger, onRegister]);

  return (
    <>
      <button
        ref={ref}
        type="button"
        data-color={pad.color}
        data-missing={missing || undefined}
        data-testid="pad"
        className={cn(
          "pad relative h-full w-full overflow-hidden rounded-[22px] md:rounded-[24px]",
          pad.soundId === null && "pad-empty",
        )}
        aria-label={padName(pad, missing)}
        aria-keyshortcuts={hint}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          trigger();
        }}
        onKeyDown={(e) => {
          if ((e.key === " " || e.key === "Enter") && !e.repeat) {
            e.preventDefault();
            trigger();
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <PadFace pad={pad} missing={missing} />
      </button>
      {hint && (
        <kbd
          className="pad-hint pointer-events-none absolute top-2 right-2.5 hidden font-mono text-[10px] pointer-fine:block"
          data-color={pad.color}
          aria-hidden
        >
          {hint}
        </kbd>
      )}
    </>
  );
});

export interface EditPadProps {
  pad: PadModel;
  selected: boolean;
  dragging: boolean;
  onSelect: () => void;
  style?: CSSProperties;
  buttonRef?: Ref<HTMLButtonElement>;
  /** dnd-kit listeners/attributes, spread onto the button. */
  dragProps?: Record<string, unknown>;
}

/** A pad in Edit Mode: tap selects it, drag (or M on the keyboard) moves it. */
export function EditPad({
  pad,
  selected,
  dragging,
  onSelect,
  style,
  buttonRef,
  dragProps,
}: EditPadProps) {
  const missing = useIsMissing(pad.soundId);
  return (
    <button
      ref={buttonRef}
      type="button"
      style={style}
      data-color={pad.color}
      data-missing={missing || undefined}
      data-selected={selected || undefined}
      data-dragging={dragging || undefined}
      data-testid="edit-pad"
      aria-pressed={selected}
      data-pad-id={pad.id}
      aria-label={`${padName(pad, missing)}. Edit pad`}
      className={cn(
        "pad relative h-full w-full overflow-hidden rounded-[22px] md:rounded-[24px]",
        pad.soundId === null && "pad-empty",
      )}
      {...dragProps}
      onClick={onSelect}
    >
      <PadFace pad={pad} missing={missing} editing />
    </button>
  );
}
