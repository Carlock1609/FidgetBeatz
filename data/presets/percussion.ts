import type { PresetDefinition } from "@/types";
import { pad } from "./define";

export const percussion: PresetDefinition = {
  id: "percussion",
  name: "Percussion",
  description: "Congas, bongos, shaker, cowbell, woodblock and friends.",
  columns: { base: 3, md: 4 },
  accent: "lime",
  pads: [
    pad("perc-conga-high-01"),
    pad("perc-conga-low-01"),
    pad("perc-bongo-high-01"),
    pad("perc-bongo-low-01"),
    pad("perc-shaker-01"),
    pad("perc-cowbell-01"),
    pad("perc-woodblock-01"),
    pad("perc-clave-01"),
    pad("perc-tambourine-01", "Tambo"),
    pad("perc-triangle-01"),
    pad("perc-tom-high-01", "Tom Hi"),
    pad("perc-tom-low-01", "Tom Lo"),
  ],
};
