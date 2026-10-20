import type { PresetDefinition } from "@/types";
import { pad } from "./define";

export const experimental: PresetDefinition = {
  id: "experimental",
  name: "Experimental",
  description: "Glitches, blips, zaps, textures and strange voices.",
  columns: { base: 4, md: 4 },
  accent: "cyan",
  pads: [
    pad("fx-laser-01"),
    pad("fx-zap-01"),
    pad("fx-glitch-01"),
    pad("fx-glitch-02"),
    pad("fx-blip-01"),
    pad("fx-blip-02"),
    pad("fx-crunch-01"),
    pad("fx-downer-01"),
    pad("fx-bubble-01"),
    pad("fx-coin-01"),
    pad("fx-riser-01"),
    pad("fx-impact-01"),
    pad("ambient-drone-01"),
    pad("ambient-wind-01", "Wind"),
    pad("vocal-ooh-01"),
    pad("vocal-ah-01"),
  ],
};
