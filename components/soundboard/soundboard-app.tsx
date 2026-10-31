"use client";

/**
 * The single client boundary. Everything that touches pointer events, Web Audio or
 * localStorage lives beneath this component (docs/architecture.md §4).
 */
import { Minimize2, Volume2, VolumeX } from "lucide-react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { useEffect, useRef, type CSSProperties } from "react";
import { PadEditor } from "@/components/editor/pad-editor";
import { PresetChips } from "@/components/presets/preset-chips";
import { ProfileSwitcher } from "@/components/profiles/profile-switcher";
import { AppFooter } from "@/components/shell/app-footer";
import { StorageNotice } from "@/components/shell/storage-notice";
import { Slider } from "@/components/ui/slider";
import { getPreset } from "@/data/presets";
import {
  BoardProvider,
  useBoardDispatch,
  useBoardState,
} from "@/features/soundboard/board-provider";
import { selectActiveProfile, selectVisiblePads } from "@/features/soundboard/board-reducer";
import { AudioEngineProvider, useAudioEngine } from "@/hooks/use-audio-engine";
import { useFocusMode } from "@/hooks/use-focus-mode";
import { cn } from "@/lib/utils/cn";
import { PadGrid } from "./pad-grid";
import { FocusLevelLine, SoundDisplay } from "./sound-display";
import { EditBar, TopBar } from "./top-bar";

/** App entry: providers plus the shell. */
export function SoundboardApp({ whatsNew }: { whatsNew: string[] }) {
  return (
    <MotionConfig reducedMotion="user">
      <AudioEngineProvider>
        <BoardProvider>
          <Shell whatsNew={whatsNew} />
        </BoardProvider>
      </AudioEngineProvider>
    </MotionConfig>
  );
}

/** Keeps the engine in sync with the board: preload what's on screen, apply volume. */
function useAudioSync() {
  const engine = useAudioEngine();
  const state = useBoardState();
  const pads = selectVisiblePads(state);
  const soundKey = pads.map((p) => p.soundId ?? "").join("|");

  useEffect(() => {
    if (!state.hydrated) return;
    void engine.preload(soundKey.split("|").filter(Boolean));
  }, [engine, soundKey, state.hydrated]);

  useEffect(() => {
    engine.setMasterVolume(state.settings.masterVolume);
  }, [engine, state.settings.masterVolume]);
}

function VolumeControl() {
  const { settings } = useBoardState();
  const dispatch = useBoardDispatch();
  const muted = settings.masterVolume === 0;
  return (
    <div className="flex items-center gap-1.5">
      {muted ? (
        <VolumeX className="size-4 text-muted" aria-hidden />
      ) : (
        <Volume2 className="size-4 text-muted" aria-hidden />
      )}
      <Slider
        className="w-24 sm:w-32"
        aria-label="Volume"
        min={0}
        max={100}
        step={1}
        value={[Math.round(settings.masterVolume * 100)]}
        onValueChange={([v]) =>
          dispatch({ type: "updateSettings", settings: { masterVolume: (v ?? 0) / 100 } })
        }
      />
    </div>
  );
}

const chrome = {
  initial: { opacity: 0, y: -6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.2 },
};

/**
 * Switching modes unmounts the control that was pressed (Edit, Save, Focus mode, Exit), which
 * would drop keyboard focus to `<body>`. Move it to the matching control in the new mode.
 * Programmatic focus after a pointer press shows no focus ring, so touch users see no change.
 */
function useFocusOnModeChange(editing: boolean, focus: boolean) {
  const previous = useRef({ editing, focus });
  useEffect(() => {
    const was = previous.current;
    previous.current = { editing, focus };
    let selector: string;
    if (focus !== was.focus) selector = focus ? "[data-exit-focus]" : "[data-focus-toggle]";
    else if (editing !== was.editing) selector = editing ? "[data-pad-id]" : "[data-edit-toggle]";
    else return;
    document.querySelector<HTMLElement>(selector)?.focus();
  }, [editing, focus]);
}

function Shell({ whatsNew }: { whatsNew: string[] }) {
  const state = useBoardState();
  const profile = selectActiveProfile(state);
  const { focus, enter, exit } = useFocusMode();
  useAudioSync();

  const accent = getPreset(profile.basePresetId)?.accent ?? "orange";
  const editing = state.mode === "edit";
  const showChrome = !focus;
  useFocusOnModeChange(editing, focus);

  return (
    <div
      className={cn(
        "stage flex h-dvh flex-col overflow-hidden short-landscape:flex-row",
        focus
          ? "p-[max(8px,env(safe-area-inset-top))_max(8px,env(safe-area-inset-right))_max(8px,env(safe-area-inset-bottom))_max(8px,env(safe-area-inset-left))]"
          : "px-[max(16px,env(safe-area-inset-left))] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] md:px-6",
      )}
      style={{ "--accent": `var(--pad-${accent})` } as CSSProperties}
      data-app-root
    >
      <AnimatePresence initial={false}>
        {showChrome && (
          <motion.header
            key="chrome"
            {...chrome}
            className="mx-auto flex w-full max-w-[960px] shrink-0 flex-col gap-2.5 short-landscape:mr-4 short-landscape:w-[300px] short-landscape:overflow-y-auto"
          >
            {editing ? <EditBar /> : <TopBar onFocus={enter} />}
            {!editing && (
              <>
                <div className="flex h-11 items-center justify-between gap-3">
                  <ProfileSwitcher />
                  <VolumeControl />
                </div>
                <SoundDisplay />
                <PresetChips />
              </>
            )}
          </motion.header>
        )}
      </AnimatePresence>

      <main
        className={cn(
          "mx-auto min-h-0 w-full flex-1",
          focus ? "max-w-none" : "max-w-[960px] py-3 short-landscape:py-2",
        )}
        aria-label="Soundboard"
      >
        {/* The visible wordmark heading lives in the play-mode top bar only. */}
        {(focus || editing) && <h1 className="sr-only">FidgetBeatz</h1>}
        <PadGrid />
      </main>

      {showChrome && (
        <div className="mx-auto w-full max-w-[960px] shrink-0 short-landscape:hidden">
          <AppFooter whatsNew={whatsNew} />
        </div>
      )}

      {focus && (
        <>
          {state.settings.focusLevelLine && <FocusLevelLine />}
          <button
            type="button"
            onClick={exit}
            aria-label="Exit focus mode"
            data-exit-focus
            className="fixed right-[max(12px,env(safe-area-inset-right))] bottom-[max(12px,env(safe-area-inset-bottom))] z-30 grid size-11 place-items-center rounded-full border border-border bg-surface-1/80 text-text opacity-40 transition-opacity outline-none hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-focus active:opacity-100"
          >
            <Minimize2 className="size-5" />
          </button>
        </>
      )}

      <PadEditor />
      <StorageNotice />
    </div>
  );
}
