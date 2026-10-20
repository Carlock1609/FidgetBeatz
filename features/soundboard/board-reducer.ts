/**
 * Board state machine: profiles, the active board, edit-mode draft and device settings.
 *
 * Pure and framework-free — no storage, no audio. The provider persists the slices that matter
 * and the audio engine reacts to pad changes via effects.
 */
import { getSound } from "@/data/sounds/catalog";
import { CATEGORY_META } from "@/data/sounds/categories";
import { getPreset } from "@/data/presets";
import { createProfileFromPreset, padsFromPreset } from "@/lib/storage/defaults";
import type { LoadIssue } from "@/lib/storage/profile-store";
import { createId } from "@/lib/utils/ids";
import {
  LIMITS,
  type Pad,
  type PadColor,
  type PadId,
  type PresetId,
  type Profile,
  type ProfileId,
  type Settings,
  type SoundId,
  type StoredState,
} from "@/types";

export interface BoardState {
  mode: "play" | "edit";
  profiles: Profile[];
  activeProfileId: ProfileId;
  /** Working copy of the active profile's pads; non-null only in edit mode. */
  draft: Pad[] | null;
  selectedPadId: PadId | null;
  settings: Settings;
  /** False until stored state has been read on the client. */
  hydrated: boolean;
  /** A storage problem to surface once, non-blocking (see StorageNotice). */
  storageNotice: StorageNotice | null;
}

/** Storage problems the UI tells the user about. */
export type StorageNotice = LoadIssue | "save-failed";

export type BoardAction =
  | { type: "hydrate"; state: StoredState; issue?: LoadIssue | null }
  | { type: "setStorageNotice"; notice: StorageNotice | null }
  | { type: "selectProfile"; profileId: ProfileId }
  | { type: "createProfile"; name: string; presetId: PresetId }
  | { type: "renameProfile"; profileId: ProfileId; name: string }
  | { type: "deleteProfile"; profileId: ProfileId }
  | { type: "loadPreset"; presetId: PresetId }
  | { type: "resetToPreset" }
  | { type: "enterEdit" }
  | { type: "saveEdit" }
  | { type: "cancelEdit" }
  | { type: "selectPad"; padId: PadId | null }
  | { type: "addPad"; soundId?: SoundId | null }
  | { type: "removePad"; padId: PadId }
  | { type: "movePad"; from: number; to: number }
  | { type: "assignSound"; padId: PadId; soundId: SoundId | null }
  | { type: "relabelPad"; padId: PadId; label: string }
  | { type: "recolorPad"; padId: PadId; color: PadColor }
  | { type: "updateSettings"; settings: Partial<Settings> };

/** Initial state for the server render and first client paint (before storage is read). */
export function createInitialState(seed: StoredState): BoardState {
  return {
    mode: "play",
    profiles: seed.profiles,
    activeProfileId: seed.activeProfileId,
    draft: null,
    selectedPadId: null,
    settings: seed.settings,
    hydrated: false,
    storageNotice: null,
  };
}

/** Moves an item within an array (pure). */
export function arrayMove<T>(items: readonly T[], from: number, to: number): T[] {
  const next = items.slice();
  if (from < 0 || from >= next.length || to < 0 || to >= next.length) return next;
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item as T);
  return next;
}

function updateActiveProfile(state: BoardState, update: (p: Profile) => Profile): BoardState {
  return {
    ...state,
    profiles: state.profiles.map((p) =>
      p.id === state.activeProfileId ? { ...update(p), updatedAt: new Date().toISOString() } : p,
    ),
  };
}

function updateDraftPad(state: BoardState, padId: PadId, update: (pad: Pad) => Pad): BoardState {
  if (!state.draft) return state;
  return { ...state, draft: state.draft.map((pad) => (pad.id === padId ? update(pad) : pad)) };
}

function cleanName(name: string): string {
  return name.trim().slice(0, LIMITS.profileNameMax);
}

/** The board reducer. Invalid actions (e.g. editing outside edit mode) return the same state. */
export function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case "hydrate":
      return {
        ...createInitialState(action.state),
        hydrated: true,
        storageNotice: action.issue ?? null,
      };

    case "setStorageNotice":
      return { ...state, storageNotice: action.notice };

    case "selectProfile":
      if (state.mode === "edit" || !state.profiles.some((p) => p.id === action.profileId)) {
        return state;
      }
      return { ...state, activeProfileId: action.profileId };

    case "createProfile": {
      const name = cleanName(action.name);
      if (state.mode === "edit" || !name || state.profiles.length >= LIMITS.maxProfiles) {
        return state;
      }
      const profile = createProfileFromPreset(action.presetId, name);
      return { ...state, profiles: [...state.profiles, profile], activeProfileId: profile.id };
    }

    case "renameProfile": {
      const name = cleanName(action.name);
      if (!name) return state;
      return {
        ...state,
        profiles: state.profiles.map((p) =>
          p.id === action.profileId ? { ...p, name, updatedAt: new Date().toISOString() } : p,
        ),
      };
    }

    case "deleteProfile": {
      if (state.mode === "edit" || state.profiles.length <= 1) return state;
      const profiles = state.profiles.filter((p) => p.id !== action.profileId);
      if (profiles.length === state.profiles.length) return state;
      const activeProfileId =
        state.activeProfileId === action.profileId ? profiles[0]!.id : state.activeProfileId;
      return { ...state, profiles, activeProfileId };
    }

    case "loadPreset": {
      const preset = getPreset(action.presetId);
      if (!preset || state.mode === "edit") return state;
      return updateActiveProfile(state, (p) => ({
        ...p,
        basePresetId: preset.id,
        columns: { ...preset.columns },
        pads: padsFromPreset(preset),
      }));
    }

    case "resetToPreset": {
      if (state.mode === "edit") return state;
      const active = state.profiles.find((p) => p.id === state.activeProfileId);
      const preset = active && getPreset(active.basePresetId);
      if (!preset) return state;
      return updateActiveProfile(state, (p) => ({
        ...p,
        columns: { ...preset.columns },
        pads: padsFromPreset(preset),
      }));
    }

    case "enterEdit": {
      if (state.mode === "edit") return state;
      const active = state.profiles.find((p) => p.id === state.activeProfileId);
      if (!active) return state;
      return { ...state, mode: "edit", draft: active.pads.map((pad) => ({ ...pad })) };
    }

    case "saveEdit": {
      if (state.mode !== "edit" || !state.draft) return state;
      const pads = state.draft;
      return {
        ...updateActiveProfile(state, (p) => ({ ...p, pads })),
        mode: "play",
        draft: null,
        selectedPadId: null,
      };
    }

    case "cancelEdit":
      if (state.mode !== "edit") return state;
      return { ...state, mode: "play", draft: null, selectedPadId: null };

    case "selectPad":
      if (state.mode !== "edit") return state;
      return { ...state, selectedPadId: action.padId };

    case "addPad": {
      if (!state.draft || state.draft.length >= LIMITS.maxPads) return state;
      const sound = getSound(action.soundId);
      const pad: Pad = {
        id: createId(),
        soundId: sound?.id ?? null,
        label: sound?.name.slice(0, LIMITS.padLabelMax) ?? "",
        color: sound ? CATEGORY_META[sound.category].color : "cyan",
      };
      return { ...state, draft: [...state.draft, pad], selectedPadId: pad.id };
    }

    case "removePad": {
      if (!state.draft || state.draft.length <= LIMITS.minPads) return state;
      const draft = state.draft.filter((pad) => pad.id !== action.padId);
      return {
        ...state,
        draft,
        selectedPadId: state.selectedPadId === action.padId ? null : state.selectedPadId,
      };
    }

    case "movePad":
      if (!state.draft) return state;
      return { ...state, draft: arrayMove(state.draft, action.from, action.to) };

    case "assignSound":
      return updateDraftPad(state, action.padId, (pad) => {
        const previous = getSound(pad.soundId);
        const next = getSound(action.soundId);
        // Keep custom labels; replace labels that were just the old sound's name (or empty).
        const labelWasDefault =
          !pad.label || pad.label === previous?.name.slice(0, LIMITS.padLabelMax);
        return {
          ...pad,
          soundId: next?.id ?? null,
          label: labelWasDefault ? (next?.name.slice(0, LIMITS.padLabelMax) ?? "") : pad.label,
          color: next ? CATEGORY_META[next.category].color : pad.color,
        };
      });

    case "relabelPad":
      return updateDraftPad(state, action.padId, (pad) => ({
        ...pad,
        label: action.label.slice(0, LIMITS.padLabelMax),
      }));

    case "recolorPad":
      return updateDraftPad(state, action.padId, (pad) => ({ ...pad, color: action.color }));

    case "updateSettings":
      return { ...state, settings: { ...state.settings, ...action.settings } };
  }
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/** The active profile (always present after hydrate; falls back to the first). */
export function selectActiveProfile(state: BoardState): Profile {
  return state.profiles.find((p) => p.id === state.activeProfileId) ?? state.profiles[0]!;
}

/** The pads currently on screen: the draft in edit mode, else the active profile's pads. */
export function selectVisiblePads(state: BoardState): Pad[] {
  return state.draft ?? selectActiveProfile(state).pads;
}

/** True when the edit draft differs from the saved pads. */
export function selectHasUnsavedChanges(state: BoardState): boolean {
  if (!state.draft) return false;
  return !samePads(state.draft, selectActiveProfile(state).pads, true);
}

/** True when the active profile no longer matches its base preset (drives reset/confirm). */
export function selectIsCustomized(state: BoardState): boolean {
  const profile = selectActiveProfile(state);
  const preset = getPreset(profile.basePresetId);
  if (!preset) return true;
  return !samePads(
    profile.pads,
    preset.pads.map((pad) => ({ ...pad, id: "" })),
    false,
  );
}

function samePads(a: readonly Pad[], b: readonly Pad[], compareIds: boolean): boolean {
  return (
    a.length === b.length &&
    a.every((pad, i) => {
      const other = b[i]!;
      return (
        (!compareIds || pad.id === other.id) &&
        pad.soundId === other.soundId &&
        pad.label === other.label &&
        pad.color === other.color
      );
    })
  );
}

/** Snapshot of what gets persisted (draft and UI-only fields are excluded). */
export function toStoredState(state: BoardState): StoredState {
  return {
    version: 1,
    activeProfileId: state.activeProfileId,
    profiles: state.profiles,
    settings: state.settings,
  };
}
