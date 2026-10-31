"use client";

import { Check, Maximize2, Pencil, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useBoardDispatch, useBoardState } from "@/features/soundboard/board-provider";
import { selectHasUnsavedChanges } from "@/features/soundboard/board-reducer";

/** The FidgetBeatz mark: three pads mid-hit. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect x="2" y="2" width="13" height="13" rx="4" fill="var(--accent)" />
      <rect x="17" y="2" width="13" height="13" rx="4" fill="var(--pad-cyan)" opacity="0.85" />
      <rect x="2" y="17" width="13" height="13" rx="4" fill="var(--pad-magenta)" opacity="0.85" />
      <rect
        x="17"
        y="17"
        width="13"
        height="13"
        rx="4"
        fill="none"
        stroke="var(--border)"
        strokeWidth="2"
      />
    </svg>
  );
}

function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark className="size-7" />
      <h1 className="text-lg font-extrabold tracking-tight">
        Fidget<span className="text-accent-text">Beatz</span>
      </h1>
    </div>
  );
}

/** Play-mode top bar: wordmark, focus toggle, edit. */
export function TopBar({ onFocus }: { onFocus: () => void }) {
  const dispatch = useBoardDispatch();
  const { hydrated } = useBoardState();
  return (
    <div className="flex h-[62px] items-center justify-between">
      <Wordmark />
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onFocus}
          aria-label="Focus mode"
          title="Focus mode"
          data-focus-toggle
        >
          <Maximize2 />
        </Button>
        <Button
          variant="outline"
          onClick={() => dispatch({ type: "enterEdit" })}
          disabled={!hydrated}
          aria-label="Edit pads"
          data-edit-toggle
        >
          <Pencil />
          Edit
        </Button>
      </div>
    </div>
  );
}

/** Edit-mode top bar: clearly marked, with Cancel (confirm if dirty) and Save. */
export function EditBar() {
  const dispatch = useBoardDispatch();
  const state = useBoardState();
  const dirty = selectHasUnsavedChanges(state);
  const [confirming, setConfirming] = useState(false);

  const cancel = () => (dirty ? setConfirming(true) : dispatch({ type: "cancelEdit" }));

  return (
    <div className="flex h-[62px] items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="shrink-0 rounded-full border border-dashed border-accent px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] whitespace-nowrap text-accent-text uppercase">
          Edit mode
        </span>
        <span className="hidden truncate text-xs text-muted sm:inline">
          {dirty ? "Unsaved changes" : "Tap a pad to edit · drag to move"}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button variant="ghost" onClick={cancel}>
          <X />
          Cancel
        </Button>
        <Button variant="accent" onClick={() => dispatch({ type: "saveEdit" })}>
          <Check />
          Save
        </Button>
      </div>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Discard your changes?"
        description="Your pad edits haven't been saved."
        confirmLabel="Discard"
        destructive
        onConfirm={() => dispatch({ type: "cancelEdit" })}
        returnFocus={() => document.querySelector<HTMLElement>("[data-edit-toggle]")}
      />
    </div>
  );
}
