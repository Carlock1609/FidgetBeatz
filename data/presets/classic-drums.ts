import type { PresetDefinition } from "@/types";
import { pad } from "./define";

export const classicDrums: PresetDefinition = {
  id: "classic-drums",
  name: "Classic Drums",
  description: "Acoustic-style kit: kicks, snares, hats, toms and cymbals.",
  columns: { base: 3, md: 4 },
  accent: "orange",
  pads: [
    pad("kick-punchy-01", "Kick"),
    pad("snare-crisp-01", "Snare"),
    pad("hihat-closed-01", "Hat"),
    pad("kick-deep-01", "Deep Kick"),
    pad("snare-rim-01", "Rim"),
    pad("hihat-open-01", "Open Hat"),
    pad("perc-tom-high-01", "Tom Hi"),
    pad("perc-tom-mid-01", "Tom Mid"),
    pad("perc-tom-low-01", "Tom Lo"),
    pad("hihat-pedal-01", "Pedal"),
    pad("hihat-crash-01"),
    pad("hihat-ride-01"),
  ],
};
