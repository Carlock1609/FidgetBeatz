/**
 * Shared domain types for FidgetBeatz.
 *
 * This module imports nothing; every other layer may depend on it.
 * See docs/profiles-and-presets.md for the meaning of each concept.
 */

/** Catalog sound identifier, e.g. `kick-punchy-01`. */
export type SoundId = string;
/** Pad identifier, stable within a profile. */
export type PadId = string;
/** Preset identifier, e.g. `classic-drums`. */
export type PresetId = string;
/** Profile identifier. */
export type ProfileId = string;

export const SOUND_CATEGORIES = [
  "kick",
  "snare",
  "hihat",
  "percussion",
  "bass",
  "piano",
  "synth",
  "beatbox",
  "vocal",
  "ambient",
  "fx",
] as const;

export type SoundCategory = (typeof SOUND_CATEGORIES)[number];

/** One entry in the bundled sound catalog. */
export interface Sound {
  id: SoundId;
  name: string;
  category: SoundCategory;
  /** Public URL path, e.g. `/sounds/kick/kick-punchy-01.wav`. */
  file: string;
  /** Per-sound loudness trim, 0–2. Defaults to 1. */
  gain?: number;
  /** `choke`: retriggering stops the previous instance. Defaults to `poly`. */
  playMode?: "poly" | "choke";
}

export const PAD_COLORS = [
  "magenta",
  "orange",
  "yellow",
  "lime",
  "cyan",
  "blue",
  "violet",
  "pink",
] as const;

export type PadColor = (typeof PAD_COLORS)[number];

/** One button on the board. Layout is the array order of pads. */
export interface Pad {
  id: PadId;
  /** `null` means an empty pad. */
  soundId: SoundId | null;
  /** 0–16 characters; shown on the pad. */
  label: string;
  color: PadColor;
}

/** Responsive column hint for the grid. */
export interface GridColumns {
  base: number;
  md?: number;
  lg?: number;
}

/** An immutable, shipped board definition. */
export interface PresetDefinition {
  id: PresetId;
  name: string;
  description: string;
  columns: GridColumns;
  accent: PadColor;
  /** Order = grid order. Ids are generated when a profile is seeded. */
  pads: Omit<Pad, "id">[];
}

/** A user-owned board persisted in localStorage. */
export interface Profile {
  id: ProfileId;
  name: string;
  basePresetId: PresetId;
  columns: GridColumns;
  pads: Pad[];
  updatedAt: string;
}

export interface Settings {
  masterVolume: number;
  focusMode: boolean;
  /** Show the slim LCD level line while in focus mode. */
  focusLevelLine: boolean;
}

/** The single JSON blob stored under `fidgetbeatz:v1`. */
export interface StoredState {
  version: 1;
  activeProfileId: ProfileId;
  profiles: Profile[];
  settings: Settings;
}

export const LIMITS = {
  maxProfiles: 5,
  minPads: 1,
  maxPads: 24,
  profileNameMax: 24,
  padLabelMax: 16,
} as const;
