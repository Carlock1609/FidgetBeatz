import type { Sound, SoundCategory, SoundId } from "@/types";

/**
 * Builds a catalog entry; the file path is derived from category and id so the two can't drift.
 */
function s(
  id: SoundId,
  name: string,
  category: SoundCategory,
  opts: Pick<Sound, "gain" | "playMode"> = {},
): Sound {
  return { id, name, category, file: `/sounds/${category}/${id}.wav`, ...opts };
}

/**
 * The bundled sound catalog, in picker order.
 *
 * Every entry must have a WAV in `public/sounds/` and a license record in
 * `data/sounds/inventory.json`; `catalog.test.ts` enforces both. `gain` balances perceived
 * loudness between categories (files are peak-normalized, which favors thin sounds). `choke`
 * is used for long or ringing sounds so retriggers don't pile up.
 */
export const SOUNDS: readonly Sound[] = [
  // kick
  s("kick-punchy-01", "Punchy Kick", "kick"),
  s("kick-deep-01", "Deep Kick", "kick"),
  s("kick-boom-01", "Boom Bap Kick", "kick", { gain: 0.9 }),
  s("kick-909-01", "909 Kick", "kick", { gain: 0.9 }),
  s("kick-soft-01", "Soft Kick", "kick"),

  // snare
  s("snare-crisp-01", "Crisp Snare", "snare"),
  s("snare-fat-01", "Fat Snare", "snare"),
  s("snare-dusty-01", "Dusty Snare", "snare"),
  s("snare-gated-01", "Gated Snare", "snare"),
  s("snare-clap-01", "Clap", "snare"),
  s("snare-clap-909-01", "909 Clap", "snare"),
  s("snare-rim-01", "Rimshot", "snare"),
  s("snare-snap-01", "Finger Snap", "snare", { gain: 1.2 }),

  // hihat
  s("hihat-closed-01", "Closed Hat", "hihat", { gain: 0.8 }),
  s("hihat-open-01", "Open Hat", "hihat", { gain: 0.8, playMode: "choke" }),
  s("hihat-pedal-01", "Pedal Hat", "hihat", { gain: 0.8 }),
  s("hihat-vinyl-01", "Dusty Hat", "hihat", { gain: 0.8 }),
  s("hihat-909-01", "909 Hat", "hihat", { gain: 0.8 }),
  s("hihat-crash-01", "Crash", "hihat", { gain: 0.8 }),
  s("hihat-ride-01", "Ride", "hihat", { gain: 0.8 }),

  // percussion
  s("perc-tom-high-01", "High Tom", "percussion"),
  s("perc-tom-mid-01", "Mid Tom", "percussion"),
  s("perc-tom-low-01", "Low Tom", "percussion"),
  s("perc-conga-high-01", "High Conga", "percussion"),
  s("perc-conga-low-01", "Low Conga", "percussion"),
  s("perc-bongo-high-01", "High Bongo", "percussion"),
  s("perc-bongo-low-01", "Low Bongo", "percussion"),
  s("perc-shaker-01", "Shaker", "percussion"),
  s("perc-cowbell-01", "Cowbell", "percussion"),
  s("perc-woodblock-01", "Woodblock", "percussion"),
  s("perc-clave-01", "Clave", "percussion"),
  s("perc-tambourine-01", "Tambourine", "percussion"),
  s("perc-triangle-01", "Triangle", "percussion"),

  // bass
  s("bass-sub-c-01", "Sub C", "bass", { gain: 0.6, playMode: "choke" }),
  s("bass-sub-eb-01", "Sub Eb", "bass", { gain: 0.6, playMode: "choke" }),
  s("bass-sub-g-01", "Sub G", "bass", { gain: 0.6, playMode: "choke" }),
  s("bass-sub-bb-01", "Sub Bb", "bass", { gain: 0.6, playMode: "choke" }),
  s("bass-saw-c-01", "Synth Bass C", "bass", { playMode: "choke" }),
  s("bass-saw-eb-01", "Synth Bass Eb", "bass", { playMode: "choke" }),
  s("bass-saw-f-01", "Synth Bass F", "bass", { playMode: "choke" }),
  s("bass-saw-g-01", "Synth Bass G", "bass", { playMode: "choke" }),
  s("bass-saw-bb-01", "Synth Bass Bb", "bass", { playMode: "choke" }),
  s("bass-pluck-c-01", "Pluck Bass C", "bass", { gain: 1.3, playMode: "choke" }),
  s("bass-pluck-eb-01", "Pluck Bass Eb", "bass", { gain: 1.3, playMode: "choke" }),
  s("bass-pluck-g-01", "Pluck Bass G", "bass", { gain: 1.3, playMode: "choke" }),
  s("bass-808-c-01", "808 Bass", "bass", { gain: 0.7, playMode: "choke" }),

  // piano
  s("piano-c4-01", "Piano C4", "piano"),
  s("piano-d4-01", "Piano D4", "piano"),
  s("piano-e4-01", "Piano E4", "piano"),
  s("piano-f4-01", "Piano F4", "piano"),
  s("piano-g4-01", "Piano G4", "piano"),
  s("piano-a4-01", "Piano A4", "piano"),
  s("piano-b4-01", "Piano B4", "piano"),
  s("piano-c5-01", "Piano C5", "piano"),
  s("piano-chord-c-01", "C Chord", "piano"),
  s("piano-chord-f-01", "F Chord", "piano"),
  s("piano-chord-g-01", "G Chord", "piano"),
  s("piano-chord-am-01", "Am Chord", "piano"),
  s("piano-rhodes-cmaj7-01", "Keys Cmaj7", "piano", { playMode: "choke" }),
  s("piano-rhodes-am7-01", "Keys Am7", "piano", { playMode: "choke" }),
  s("piano-rhodes-dm7-01", "Keys Dm7", "piano", { playMode: "choke" }),
  s("piano-rhodes-g7-01", "Keys G7", "piano", { playMode: "choke" }),

  // synth
  s("synth-stab-cm-01", "Stab Cm", "synth"),
  s("synth-stab-fm-01", "Stab Fm", "synth"),
  s("synth-arp-c-01", "Arp Cm", "synth"),
  s("synth-arp-g-01", "Arp Gm", "synth"),
  s("synth-pad-cm-01", "Pad Cm", "synth", { gain: 0.85, playMode: "choke" }),
  s("synth-pad-ab-01", "Pad Ab", "synth", { gain: 0.85, playMode: "choke" }),
  s("synth-pad-bb-01", "Pad Bb", "synth", { gain: 0.85, playMode: "choke" }),
  s("synth-pad-eb-01", "Pad Eb", "synth", { gain: 0.85, playMode: "choke" }),
  s("synth-lead-c-01", "Lead C", "synth", { gain: 0.7 }),
  s("synth-lead-g-01", "Lead G", "synth", { gain: 0.7 }),

  // beatbox
  s("beatbox-kick-01", "B Kick", "beatbox"),
  s("beatbox-kick-02", "Throat Kick", "beatbox"),
  s("beatbox-snare-01", "Pf Snare", "beatbox"),
  s("beatbox-snare-02", "K Snare", "beatbox"),
  s("beatbox-hat-01", "Ts Hat", "beatbox", { gain: 0.85 }),
  s("beatbox-hat-02", "Tk Hat", "beatbox", { gain: 0.85 }),
  s("beatbox-hat-03", "Tss Open", "beatbox", { gain: 0.85 }),
  s("beatbox-click-01", "Tongue Click", "beatbox"),
  s("beatbox-hum-01", "Hum Bass", "beatbox", { playMode: "choke" }),

  // vocal
  s("vocal-ah-01", "Ah", "vocal"),
  s("vocal-oh-01", "Oh", "vocal"),
  s("vocal-ooh-01", "Ooh", "vocal", { gain: 0.75 }),
  s("vocal-hey-01", "Hey!", "vocal"),

  // ambient
  s("ambient-vinyl-01", "Vinyl Crackle", "ambient", { gain: 1.2, playMode: "choke" }),
  s("ambient-rain-01", "Rain", "ambient", { playMode: "choke" }),
  s("ambient-wind-01", "Wind Swell", "ambient", { playMode: "choke" }),
  s("ambient-drone-01", "Drone", "ambient", { playMode: "choke" }),

  // fx
  s("fx-riser-01", "Riser", "fx", { gain: 1.1, playMode: "choke" }),
  s("fx-downer-01", "Downer", "fx"),
  s("fx-laser-01", "Laser", "fx"),
  s("fx-zap-01", "Zap", "fx"),
  s("fx-glitch-01", "Glitch", "fx", { gain: 0.55 }),
  s("fx-glitch-02", "Stutter", "fx"),
  s("fx-blip-01", "Blip", "fx"),
  s("fx-blip-02", "Blip Up", "fx"),
  s("fx-crunch-01", "Crunch", "fx", { gain: 0.7 }),
  s("fx-scratch-01", "Scratch", "fx"),
  s("fx-reverse-01", "Reverse Swell", "fx", { playMode: "choke" }),
  s("fx-impact-01", "Impact", "fx", { gain: 0.8 }),
  s("fx-bubble-01", "Bubbles", "fx"),
  s("fx-coin-01", "Coin", "fx", { gain: 0.55 }),
];

const byId = new Map(SOUNDS.map((sound) => [sound.id, sound]));

/** Looks up a sound by id; `undefined` for unknown ids (e.g. from an older stored profile). */
export function getSound(id: SoundId | null | undefined): Sound | undefined {
  return id ? byId.get(id) : undefined;
}

/** All sounds grouped by category, in catalog order (drives the sound picker). */
export function soundsByCategory(): Map<SoundCategory, Sound[]> {
  const groups = new Map<SoundCategory, Sound[]>();
  for (const sound of SOUNDS) {
    const list = groups.get(sound.category) ?? [];
    list.push(sound);
    groups.set(sound.category, list);
  }
  return groups;
}
