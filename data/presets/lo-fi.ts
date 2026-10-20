import type { PresetDefinition } from "@/types";
import { pad } from "./define";

export const loFi: PresetDefinition = {
  id: "lo-fi",
  name: "Lo-Fi",
  description: "Soft kicks, dusty snares, warm electric-piano chords and vinyl crackle.",
  columns: { base: 3, md: 4 },
  accent: "violet",
  pads: [
    pad("kick-soft-01", "Kick"),
    pad("snare-dusty-01", "Snare"),
    pad("hihat-vinyl-01", "Hat"),
    pad("snare-snap-01", "Snap"),
    pad("piano-rhodes-cmaj7-01", "Cmaj7"),
    pad("piano-rhodes-am7-01", "Am7"),
    pad("piano-rhodes-dm7-01", "Dm7"),
    pad("piano-rhodes-g7-01", "G7"),
    pad("bass-pluck-c-01", "Bass C"),
    pad("bass-pluck-g-01", "Bass G"),
    pad("ambient-vinyl-01", "Vinyl"),
    pad("ambient-rain-01"),
  ],
};
