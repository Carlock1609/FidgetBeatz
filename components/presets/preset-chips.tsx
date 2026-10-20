"use client";

import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getPreset, PRESETS } from "@/data/presets";
import { useBoardDispatch, useBoardState } from "@/features/soundboard/board-provider";
import { selectActiveProfile, selectIsCustomized } from "@/features/soundboard/board-reducer";
import { cn } from "@/lib/utils/cn";
import type { PresetId } from "@/types";

/**
 * Horizontally scrolling preset chips. Picking a preset loads it into the active profile;
 * if the profile has custom changes, that is confirmed first. A reset chip appears when the
 * board has drifted from its preset.
 */
export function PresetChips() {
  const state = useBoardState();
  const dispatch = useBoardDispatch();
  const profile = selectActiveProfile(state);
  const customized = state.hydrated && selectIsCustomized(state);
  const [pending, setPending] = useState<PresetId | "reset" | null>(null);
  const activeChip = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeChip.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [profile.basePresetId]);

  const choose = (presetId: PresetId) => {
    if (presetId === profile.basePresetId && !customized) return;
    if (customized) setPending(presetId);
    else dispatch({ type: "loadPreset", presetId });
  };

  const pendingPreset = pending && pending !== "reset" ? getPreset(pending) : undefined;
  const base = getPreset(profile.basePresetId);

  return (
    <nav aria-label="Presets" className="-mx-4 md:-mx-6">
      <div className="no-scrollbar -my-2 flex gap-2 overflow-x-auto px-4 py-2 md:px-6">
        {customized && (
          <button
            type="button"
            onClick={() => setPending("reset")}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-dashed border-border px-3 text-xs font-semibold text-muted outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-focus"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Reset
          </button>
        )}
        {PRESETS.map((preset) => {
          const active = preset.id === profile.basePresetId;
          return (
            <button
              key={preset.id}
              ref={active ? activeChip : undefined}
              type="button"
              aria-pressed={active}
              title={preset.description}
              disabled={!state.hydrated}
              onClick={() => choose(preset.id)}
              className={cn(
                "h-9 shrink-0 rounded-full px-3.5 text-xs font-semibold whitespace-nowrap transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-focus",
                active
                  ? "bg-accent text-bg shadow-[0_0_18px_-4px_var(--accent)]"
                  : "border border-border bg-surface-1 text-muted hover:text-text",
              )}
            >
              {preset.name}
              {active && customized && <span className="ml-1 opacity-70">•</span>}
            </button>
          );
        })}
      </div>
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={
          pending === "reset"
            ? `Reset to ${base?.name ?? "preset"}?`
            : `Load ${pendingPreset?.name}?`
        }
        description={`Your custom pads on “${profile.name}” will be replaced.`}
        confirmLabel={pending === "reset" ? "Reset" : "Load preset"}
        destructive
        onConfirm={() => {
          if (pending === "reset") dispatch({ type: "resetToPreset" });
          else if (pending) dispatch({ type: "loadPreset", presetId: pending });
        }}
      />
    </nav>
  );
}
