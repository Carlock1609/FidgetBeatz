import type { PresetDefinition } from "@/types";
import { pad } from "./define";

export const piano: PresetDefinition = {
  id: "piano",
  name: "Piano",
  description: "One octave of C major plus four chords that always fit together.",
  columns: { base: 3, md: 4 },
  accent: "violet",
  pads: [
    pad("piano-c4-01", "C"),
    pad("piano-d4-01", "D"),
    pad("piano-e4-01", "E"),
    pad("piano-f4-01", "F"),
    pad("piano-g4-01", "G"),
    pad("piano-a4-01", "A"),
    pad("piano-b4-01", "B"),
    pad("piano-c5-01", "C'"),
    pad("piano-chord-c-01", "C Chord"),
    pad("piano-chord-f-01", "F Chord"),
    pad("piano-chord-g-01", "G Chord"),
    pad("piano-chord-am-01", "Am Chord"),
  ],
};
