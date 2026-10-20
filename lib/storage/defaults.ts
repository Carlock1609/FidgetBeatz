import { DEFAULT_PRESET_ID, getPreset } from "@/data/presets";
import { createId } from "@/lib/utils/ids";
import type { Pad, PresetDefinition, Profile, Settings, StoredState } from "@/types";

export const DEFAULT_SETTINGS: Settings = {
  masterVolume: 0.9,
  focusMode: false,
  focusLevelLine: true,
};

/** Profiles created on first run (docs/profiles-and-presets.md §6). */
const FIRST_RUN_PROFILES: { name: string; presetId: string }[] = [
  { name: "My Drums", presetId: "classic-drums" },
  { name: "My Lo-Fi", presetId: "lo-fi" },
  { name: "My Synthwave", presetId: "synthwave" },
];

/** Copies a preset's pads with fresh ids. */
export function padsFromPreset(preset: PresetDefinition): Pad[] {
  return preset.pads.map((pad) => ({ ...pad, id: createId() }));
}

/** Seeds a new profile from a preset. Falls back to the default preset for unknown ids. */
export function createProfileFromPreset(presetId: string, name: string): Profile {
  const preset = getPreset(presetId) ?? getPreset(DEFAULT_PRESET_ID)!;
  return {
    id: createId(),
    name,
    basePresetId: preset.id,
    columns: { ...preset.columns },
    pads: padsFromPreset(preset),
    updatedAt: new Date().toISOString(),
  };
}

/** The state a brand-new visitor starts with. */
export function createDefaultState(): StoredState {
  const profiles = FIRST_RUN_PROFILES.map(({ name, presetId }) =>
    createProfileFromPreset(presetId, name),
  );
  return {
    version: 1,
    activeProfileId: profiles[0]!.id,
    profiles,
    settings: { ...DEFAULT_SETTINGS },
  };
}
