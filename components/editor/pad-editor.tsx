"use client";

import { ArrowLeft, ArrowRight, Play, Trash2 } from "lucide-react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useBoardDispatch, useBoardState } from "@/features/soundboard/board-provider";
import { useAudioEngine } from "@/hooks/use-audio-engine";
import { cn } from "@/lib/utils/cn";
import { LIMITS, PAD_COLORS, type SoundId } from "@/types";
import { SoundPicker } from "./sound-picker";

/**
 * Edit sheet for the selected pad: label, sound (with preview), color, position and removal.
 * Move buttons are the accessible alternative to drag and drop.
 */
export function PadEditor() {
  const state = useBoardState();
  const dispatch = useBoardDispatch();
  const engine = useAudioEngine();
  const pads = state.draft ?? [];
  const index = pads.findIndex((p) => p.id === state.selectedPadId);
  const pad = index === -1 ? undefined : pads[index];

  // Previews aren't on the tap hot path, so waiting for the decode here is fine.
  const preview = useCallback(
    (soundId: SoundId) => {
      void engine.unlock();
      void engine.preload([soundId]).then(() => engine.play(soundId));
    },
    [engine],
  );

  const close = () => dispatch({ type: "selectPad", padId: null });

  // Back to the pad being edited; if it was removed, to whatever now sits in its place.
  const returnFocus = () => {
    if (!pad) return null;
    const byId = document.querySelector<HTMLElement>(`[data-pad-id="${CSS.escape(pad.id)}"]`);
    if (byId) return byId;
    const all = document.querySelectorAll<HTMLElement>("[data-pad-id]");
    return all[Math.min(index, all.length - 1)] ?? null;
  };

  return (
    <Dialog
      open={state.mode === "edit" && pad !== undefined}
      onOpenChange={(open) => !open && close()}
    >
      {pad && (
        <DialogContent
          title="Edit pad"
          description={`Pad ${index + 1} of ${pads.length}`}
          returnFocus={returnFocus}
        >
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-xs text-muted" htmlFor="pad-label">
                Label ({pad.label.length}/{LIMITS.padLabelMax})
              </label>
              <input
                id="pad-label"
                value={pad.label}
                maxLength={LIMITS.padLabelMax}
                onChange={(e) =>
                  dispatch({ type: "relabelPad", padId: pad.id, label: e.target.value })
                }
                className="h-11 w-full rounded-control border border-border bg-surface-2 px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-focus"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs text-muted">Sound</span>
                {pad.soundId && (
                  <Button size="sm" variant="ghost" onClick={() => preview(pad.soundId!)}>
                    <Play />
                    Preview
                  </Button>
                )}
              </div>
              <SoundPicker
                value={pad.soundId}
                onChange={(soundId) => dispatch({ type: "assignSound", padId: pad.id, soundId })}
                onPreview={preview}
              />
            </div>

            <fieldset>
              <legend className="mb-1.5 text-xs text-muted">Color</legend>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Pad color">
                {PAD_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    role="radio"
                    aria-checked={pad.color === color}
                    aria-label={color}
                    data-color={color}
                    onClick={() => dispatch({ type: "recolorPad", padId: pad.id, color })}
                    className={cn(
                      "grid size-11 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-focus",
                    )}
                  >
                    <span
                      className={cn(
                        "size-7 rounded-full bg-(--pad) transition-shadow",
                        pad.color === color &&
                          "ring-2 ring-text ring-offset-2 ring-offset-surface-1",
                      )}
                    />
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Move pad earlier"
                  disabled={index === 0}
                  onClick={() => dispatch({ type: "movePad", from: index, to: index - 1 })}
                >
                  <ArrowLeft />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Move pad later"
                  disabled={index === pads.length - 1}
                  onClick={() => dispatch({ type: "movePad", from: index, to: index + 1 })}
                >
                  <ArrowRight />
                </Button>
              </div>
              <div className="flex gap-1.5">
                <Button
                  variant="danger"
                  disabled={pads.length <= LIMITS.minPads}
                  onClick={() => dispatch({ type: "removePad", padId: pad.id })}
                >
                  <Trash2 />
                  Remove
                </Button>
                <Button variant="accent" onClick={close}>
                  Done
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
