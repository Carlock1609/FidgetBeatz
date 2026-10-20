import type { PresetDefinition, PresetId } from "@/types";
import { bass } from "./bass";
import { beatbox } from "./beatbox";
import { classicDrums } from "./classic-drums";
import { electronic } from "./electronic";
import { experimental } from "./experimental";
import { hipHop } from "./hip-hop";
import { loFi } from "./lo-fi";
import { percussion } from "./percussion";
import { piano } from "./piano";
import { synthwave } from "./synthwave";

/** Presets in picker order. Definitions are immutable; profiles copy from them. */
export const PRESETS: readonly PresetDefinition[] = [
  classicDrums,
  hipHop,
  electronic,
  loFi,
  synthwave,
  piano,
  bass,
  beatbox,
  percussion,
  experimental,
];

/** The preset shown before storage is read and used as the fallback for unknown ids. */
export const DEFAULT_PRESET_ID: PresetId = "classic-drums";

const byId = new Map(PRESETS.map((preset) => [preset.id, preset]));

/** Looks up a preset by id. */
export function getPreset(id: PresetId): PresetDefinition | undefined {
  return byId.get(id);
}
