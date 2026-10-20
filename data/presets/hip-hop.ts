import type { PresetDefinition } from "@/types";
import { pad } from "./define";

export const hipHop: PresetDefinition = {
  id: "hip-hop",
  name: "Hip-Hop",
  description: "Boom-bap kicks and snares, an 808, dusty hats and a scratch.",
  columns: { base: 3, md: 4 },
  accent: "yellow",
  pads: [
    pad("kick-boom-01", "Boom"),
    pad("snare-fat-01", "Snare"),
    pad("hihat-vinyl-01", "Hat"),
    pad("bass-808-c-01", "808"),
    pad("snare-clap-01"),
    pad("hihat-open-01", "Open Hat"),
    pad("kick-deep-01", "Kick 2"),
    pad("snare-snap-01", "Snap"),
    pad("perc-shaker-01"),
    pad("fx-scratch-01"),
    pad("vocal-hey-01"),
    pad("piano-rhodes-am7-01", "Keys"),
  ],
};
