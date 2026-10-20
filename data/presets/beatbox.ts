import type { PresetDefinition } from "@/types";
import { pad } from "./define";

export const beatbox: PresetDefinition = {
  id: "beatbox",
  name: "Beatbox",
  description: "Mouth-made kicks, snares, hats and clicks.",
  columns: { base: 3, md: 3 },
  accent: "pink",
  pads: [
    pad("beatbox-kick-01"),
    pad("beatbox-snare-01"),
    pad("beatbox-hat-01"),
    pad("beatbox-kick-02"),
    pad("beatbox-snare-02"),
    pad("beatbox-hat-02"),
    pad("beatbox-hum-01"),
    pad("beatbox-click-01", "Click"),
    pad("beatbox-hat-03"),
  ],
};
