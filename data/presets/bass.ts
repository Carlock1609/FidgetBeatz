import type { PresetDefinition } from "@/types";
import { pad } from "./define";

export const bass: PresetDefinition = {
  id: "bass",
  name: "Bass",
  description: "Sub, synth and plucked bass notes, all in C minor.",
  columns: { base: 3, md: 4 },
  accent: "blue",
  pads: [
    pad("bass-sub-c-01"),
    pad("bass-sub-eb-01"),
    pad("bass-sub-g-01"),
    pad("bass-sub-bb-01"),
    pad("bass-saw-c-01", "Synth C"),
    pad("bass-saw-eb-01", "Synth Eb"),
    pad("bass-saw-f-01", "Synth F"),
    pad("bass-saw-g-01", "Synth G"),
    pad("bass-pluck-c-01", "Pluck C"),
    pad("bass-pluck-eb-01", "Pluck Eb"),
    pad("bass-pluck-g-01", "Pluck G"),
    pad("bass-808-c-01", "808"),
  ],
};
