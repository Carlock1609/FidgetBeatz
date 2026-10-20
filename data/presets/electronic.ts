import type { PresetDefinition } from "@/types";
import { pad } from "./define";

export const electronic: PresetDefinition = {
  id: "electronic",
  name: "Electronic",
  description: "909-style drums, claps, synth stabs, arps and a riser.",
  columns: { base: 4, md: 4 },
  accent: "cyan",
  pads: [
    pad("kick-909-01", "Kick"),
    pad("snare-clap-909-01", "Clap"),
    pad("hihat-909-01", "Hat"),
    pad("hihat-open-01", "Open"),
    pad("kick-punchy-01", "Kick 2"),
    pad("snare-crisp-01", "Snare"),
    pad("hihat-closed-01", "Tick"),
    pad("perc-clave-01"),
    pad("synth-stab-cm-01"),
    pad("synth-stab-fm-01"),
    pad("synth-arp-c-01"),
    pad("synth-arp-g-01"),
    pad("bass-saw-c-01", "Bass C"),
    pad("bass-saw-g-01", "Bass G"),
    pad("fx-riser-01"),
    pad("fx-impact-01"),
  ],
};
