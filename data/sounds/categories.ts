import type { PadColor, SoundCategory } from "@/types";

/** Display metadata per sound category. Colors follow docs/design-system.md (pad colors). */
export const CATEGORY_META: Record<SoundCategory, { label: string; color: PadColor }> = {
  kick: { label: "Kick", color: "orange" },
  snare: { label: "Snare", color: "magenta" },
  hihat: { label: "Hi-hat", color: "yellow" },
  percussion: { label: "Percussion", color: "lime" },
  bass: { label: "Bass", color: "blue" },
  piano: { label: "Keys", color: "violet" },
  synth: { label: "Synth", color: "cyan" },
  beatbox: { label: "Beatbox", color: "pink" },
  vocal: { label: "Vocal", color: "pink" },
  ambient: { label: "Ambient", color: "cyan" },
  fx: { label: "FX", color: "cyan" },
};
