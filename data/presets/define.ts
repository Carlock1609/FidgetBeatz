import { CATEGORY_META } from "@/data/sounds/categories";
import { getSound } from "@/data/sounds/catalog";
import type { Pad, SoundId } from "@/types";

/**
 * Preset pad shorthand: label and color default from the catalog, so presets list only what
 * differs. Unknown ids are kept as-is (with a neutral color) and caught by the integrity test.
 */
export function pad(soundId: SoundId, label?: string): Omit<Pad, "id"> {
  const sound = getSound(soundId);
  return {
    soundId,
    label: label ?? sound?.name ?? soundId,
    color: sound ? CATEGORY_META[sound.category].color : "cyan",
  };
}
