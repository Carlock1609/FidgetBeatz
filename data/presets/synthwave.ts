import type { PresetDefinition } from "@/types";
import { pad } from "./define";

export const synthwave: PresetDefinition = {
  id: "synthwave",
  name: "Synthwave",
  description: "Gated snare, analog bass, lush pads and leads in C minor.",
  columns: { base: 4, md: 4 },
  accent: "pink",
  pads: [
    pad("kick-909-01", "Kick"),
    pad("snare-gated-01", "Gated"),
    pad("hihat-closed-01", "Hat"),
    pad("hihat-open-01", "Open"),
    pad("bass-saw-c-01", "Bass C"),
    pad("bass-saw-eb-01", "Bass Eb"),
    pad("bass-saw-g-01", "Bass G"),
    pad("bass-saw-bb-01", "Bass Bb"),
    pad("synth-pad-cm-01"),
    pad("synth-pad-ab-01"),
    pad("synth-pad-bb-01"),
    pad("synth-pad-eb-01"),
    pad("synth-lead-c-01"),
    pad("synth-lead-g-01"),
    pad("synth-arp-c-01"),
    pad("fx-reverse-01", "Swell"),
  ],
};
