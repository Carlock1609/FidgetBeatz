"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, type CSSProperties } from "react";
import { useBoardDispatch, useBoardState } from "@/features/soundboard/board-provider";
import { selectActiveProfile, selectVisiblePads } from "@/features/soundboard/board-reducer";
import { isDialogOpen } from "@/lib/utils/dom";
import { LIMITS, type GridColumns, type Pad } from "@/types";
import { EditPad, PlayPad } from "./pad";

/** Desktop keyboard layout: number row, then the letter rows (docs/design-system.md §3). */
export const PAD_KEYS = "1234567890qwertyuiopasdf".split("");

function gridStyle(columns: GridColumns, padCount: number): CSSProperties {
  // Big boards get an extra column on phones so pads stay ≥ 64 px tall.
  const base = padCount > 16 ? Math.max(columns.base, 4) : columns.base;
  const md = columns.md ?? base;
  return {
    "--cols": `repeat(${base}, minmax(0, 1fr))`,
    "--cols-md": `repeat(${Math.max(md, base)}, minmax(0, 1fr))`,
  } as CSSProperties;
}

const gridClass =
  "grid h-full grid-cols-(--cols) gap-2.5 [grid-auto-rows:minmax(64px,1fr)] md:grid-cols-(--cols-md) md:gap-3.5";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/** The pad grid for the current mode. Renders a neutral skeleton until storage is read. */
export function PadGrid() {
  const state = useBoardState();
  const pads = selectVisiblePads(state);
  const profile = selectActiveProfile(state);

  if (!state.hydrated) {
    return (
      <div className={gridClass} style={gridStyle({ base: 3, md: 4 }, 12)} aria-hidden>
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="rounded-[22px] border border-border/60 bg-surface-1/60" />
        ))}
      </div>
    );
  }

  return state.mode === "edit" ? (
    <EditGrid pads={pads} columns={profile.columns} selectedPadId={state.selectedPadId} />
  ) : (
    <PlayGrid key={`${profile.id}:${profile.basePresetId}`} pads={pads} columns={profile.columns} />
  );
}

function PlayGrid({ pads, columns }: { pads: Pad[]; columns: GridColumns }) {
  const triggers = useRef(new Map<number, () => void>());
  const register = useCallback((index: number, trigger: (() => void) | null) => {
    if (trigger) triggers.current.set(index, trigger);
    else triggers.current.delete(index);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (isDialogOpen()) return;
      const index = PAD_KEYS.indexOf(e.key.toLowerCase());
      const trigger = index === -1 ? undefined : triggers.current.get(index);
      if (trigger) {
        e.preventDefault();
        trigger();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className={gridClass} style={gridStyle(columns, pads.length)} data-testid="pad-grid">
      {pads.map((pad, index) => (
        <motion.div
          key={pad.id}
          className="min-h-0"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.28,
            delay: Math.min(index, 16) * 0.015,
            ease: [0.2, 0.8, 0.2, 1],
          }}
        >
          <PlayPad
            pad={pad}
            index={index}
            hint={PAD_KEYS[index]?.toUpperCase()}
            onRegister={register}
          />
        </motion.div>
      ))}
    </div>
  );
}

function SortablePad({ pad, selected }: { pad: Pad; selected: boolean }) {
  const dispatch = useBoardDispatch();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: pad.id,
  });
  return (
    <div
      className="min-h-0"
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
      }}
    >
      <EditPad
        pad={pad}
        selected={selected}
        dragging={isDragging}
        onSelect={() => dispatch({ type: "selectPad", padId: pad.id })}
        dragProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

function EditGrid({
  pads,
  columns,
  selectedPadId,
}: {
  pads: Pad[];
  columns: GridColumns;
  selectedPadId: string | null;
}) {
  const dispatch = useBoardDispatch();
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Long-press to drag on touch, so a quick tap still selects and the page can scroll.
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    // Enter/Space select a pad (click); M picks it up to move with the arrow keys.
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ["KeyM"], cancel: ["Escape"], end: ["KeyM", "Space", "Enter"] },
    }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = pads.findIndex((p) => p.id === active.id);
    const to = pads.findIndex((p) => p.id === over.id);
    dispatch({ type: "movePad", from, to });
  };

  const full = pads.length >= LIMITS.maxPads;
  const labelOf = (id: UniqueIdentifier) => pads.find((p) => p.id === id)?.label || "Pad";
  const positionOf = (id: UniqueIdentifier) => pads.findIndex((p) => p.id === id) + 1;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `Picked up ${labelOf(active.id)}.`,
          onDragOver: ({ active, over }) =>
            over ? `${labelOf(active.id)} is over position ${positionOf(over.id)}.` : undefined,
          onDragEnd: ({ active, over }) =>
            over
              ? `${labelOf(active.id)} dropped at position ${positionOf(over.id)}.`
              : `${labelOf(active.id)} dropped.`,
          onDragCancel: ({ active }) => `Move cancelled. ${labelOf(active.id)} returned.`,
        },
        screenReaderInstructions: {
          draggable:
            "Press M to pick up this pad, use the arrow keys to move it, and M again to drop it.",
        },
      }}
    >
      <SortableContext items={pads.map((p) => p.id)} strategy={rectSortingStrategy}>
        <div
          className={gridClass}
          style={gridStyle(columns, pads.length + 1)}
          data-testid="edit-grid"
        >
          {pads.map((pad) => (
            <SortablePad key={pad.id} pad={pad} selected={pad.id === selectedPadId} />
          ))}
          <button
            type="button"
            className="pad-empty flex min-h-0 flex-col items-center justify-center gap-1 rounded-[22px] text-sm font-semibold outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-40 md:rounded-[24px]"
            onClick={() => dispatch({ type: "addPad" })}
            disabled={full}
          >
            <Plus className="size-6" aria-hidden />
            {full ? `${LIMITS.maxPads} pads max` : "Add pad"}
          </button>
        </div>
      </SortableContext>
    </DndContext>
  );
}
