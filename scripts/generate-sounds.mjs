#!/usr/bin/env node
/**
 * FidgetBeatz sound generator.
 *
 * Renders the bundled one-shot library procedurally (no third-party samples), so every asset is
 * project-owned and released as CC0. Output is deterministic: a seeded PRNG drives all noise, so
 * re-running produces byte-identical files.
 *
 * Writes:
 *   public/sounds/<category>/<id>.wav   16-bit PCM, 44.1 kHz, mono, peak-normalized to -1 dBFS
 *   data/sounds/inventory.json          one license record per file (docs/sound-licensing.md)
 *
 * The app-facing catalog (data/sounds/catalog.ts) is maintained by hand; a unit test checks that
 * it, the inventory, and the files on disk agree.
 *
 * Usage: node scripts/generate-sounds.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SR = 44100;
const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------
// DSP primitives
// ---------------------------------------------------------------------------

let rngState = 1;
/** Seeded mulberry32 PRNG — keeps output reproducible. */
function rand() {
  rngState |= 0;
  rngState = (rngState + 0x6d2b79f5) | 0;
  let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const noise = () => rand() * 2 - 1;
const buf = (sec) => new Float32Array(Math.round(sec * SR));
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const NOTE = { C: 0, Db: 1, D: 2, Eb: 3, E: 4, F: 5, Gb: 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
/** "C4" / "Eb2" → Hz */
function hz(name) {
  const m = /^([A-G]b?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`bad note ${name}`);
  return midi(12 * (Number(m[2]) + 1) + NOTE[m[1]]);
}

/** RBJ biquad, processed in place. */
function biquad(x, type, freq, q = 0.707) {
  const w = (TAU * Math.min(freq, SR * 0.45)) / SR;
  const cos = Math.cos(w);
  const alpha = Math.sin(w) / (2 * q);
  let b0, b1, b2;
  const a0 = 1 + alpha;
  const a1 = -2 * cos;
  const a2 = 1 - alpha;
  if (type === "lp") [b0, b1, b2] = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2];
  else if (type === "hp") [b0, b1, b2] = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2];
  else [b0, b1, b2] = [alpha, 0, -alpha]; // band-pass, constant 0 dB peak
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const x0 = x[i];
    const y0 = (b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
    x[i] = y0;
  }
  return x;
}

/** Time-varying low-pass (state-variable filter); cutoff(t) in Hz. */
function sweepLp(x, cutoff, q = 1) {
  let low = 0,
    band = 0;
  const damp = 1 / q;
  for (let i = 0; i < x.length; i++) {
    const f = 2 * Math.sin((Math.PI * Math.min(cutoff(i / SR), SR * 0.2)) / SR);
    const high = x[i] - low - damp * band;
    band += f * high;
    low += f * band;
    x[i] = low;
  }
  return x;
}

/** Time-varying band-pass (state-variable filter). */
function sweepBp(x, center, q = 2) {
  let low = 0,
    band = 0;
  const damp = 1 / q;
  for (let i = 0; i < x.length; i++) {
    const f = 2 * Math.sin((Math.PI * Math.min(center(i / SR), SR * 0.2)) / SR);
    const high = x[i] - low - damp * band;
    band += f * high;
    low += f * band;
    x[i] = band;
  }
  return x;
}

/** PolyBLEP band-limited sawtooth step for phase p in [0,1) and increment dt. */
function blep(p, dt) {
  if (p < dt) {
    const t = p / dt;
    return t + t - t * t - 1;
  }
  if (p > 1 - dt) {
    const t = (p - 1) / dt;
    return t * t + t + t + 1;
  }
  return 0;
}

/** Render an oscillator whose frequency may vary over time. */
function osc(len, freq, shape = "sine", phase0 = 0) {
  const out = new Float32Array(len);
  let p = phase0;
  for (let i = 0; i < len; i++) {
    const f = typeof freq === "function" ? freq(i / SR) : freq;
    const dt = f / SR;
    let v;
    switch (shape) {
      case "saw":
        v = 2 * p - 1 - blep(p, dt);
        break;
      case "square": {
        v = p < 0.5 ? 1 : -1;
        v += blep(p, dt);
        v -= blep((p + 0.5) % 1, dt);
        break;
      }
      case "tri":
        v = 1 - 4 * Math.abs(p - 0.5);
        break;
      default:
        v = Math.sin(TAU * p);
    }
    out[i] = v;
    p += dt;
    p -= Math.floor(p);
  }
  return out;
}

/** Exponential pitch glide from f0 toward f1 with time constant tau. */
const glide = (f0, f1, tau) => (t) => f1 + (f0 - f1) * Math.exp(-t / tau);

/** Multiply by an envelope function env(t). */
function env(x, fn) {
  for (let i = 0; i < x.length; i++) x[i] *= fn(i / SR);
  return x;
}
/** Attack/decay envelope: linear attack then exponential decay. */
const ad = (attack, decay) => (t) => (t < attack ? t / attack : Math.exp(-(t - attack) / decay));
/** Attack / hold / release envelope for pads and drones. */
const ahr = (attack, hold, release) => (t) =>
  t < attack ? t / attack : t < attack + hold ? 1 : Math.max(0, 1 - (t - attack - hold) / release);

function mix(len, ...parts) {
  const out = new Float32Array(len);
  for (const [sig, gain = 1, offset = 0] of parts) {
    const start = Math.round(offset * SR);
    for (let i = 0; i < sig.length && i + start < len; i++) out[i + start] += sig[i] * gain;
  }
  return out;
}
const noiseBuf = (len) => Float32Array.from({ length: len }, noise);
const sat = (x, drive) => x.map((v) => Math.tanh(v * drive));

/** 808-style metallic source: six detuned square waves. */
function metallic(len, scale = 1) {
  const freqs = [205.3, 304.4, 369.6, 522.7, 540, 800].map((f) => f * scale);
  return mix(len, ...freqs.map((f) => [osc(len, f, "square", rand()), 1 / 6]));
}

/** Karplus–Strong plucked string. */
function pluck(len, freq, brightness = 0.5, decay = 0.996) {
  const period = Math.round(SR / freq);
  const line = Float32Array.from({ length: period }, noise);
  const out = new Float32Array(len);
  let idx = 0;
  let prev = 0;
  for (let i = 0; i < len; i++) {
    const cur = line[idx];
    const next = line[(idx + 1) % period];
    const avg = (cur * brightness + next * (1 - brightness)) * decay;
    line[idx] = avg * 0.5 + prev * 0.5;
    prev = avg;
    out[i] = cur;
    idx = (idx + 1) % period;
  }
  return out;
}

/** Additive piano-ish tone: inharmonic partials, two slightly detuned strings, hammer click. */
function pianoNote(len, f) {
  const partials = [];
  for (let n = 1; n <= 10; n++) {
    const fn = f * n * Math.sqrt(1 + 0.0004 * n * n);
    if (fn > 12000) break;
    const amp = 1 / Math.pow(n, 1.3);
    const tau = 1.4 / Math.pow(n, 0.7);
    for (const detune of [0.9995, 1.0005]) {
      partials.push([env(osc(len, fn * detune, "sine", rand()), ad(0.002, tau)), amp / 2]);
    }
  }
  const hammer = env(biquad(noiseBuf(len), "lp", 2500), ad(0.001, 0.008));
  return mix(len, ...partials, [hammer, 0.15]);
}

/** Two-operator FM electric piano (Rhodes-like). */
function epNote(len, f) {
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const index = 0.3 + 2.2 * Math.exp(-t / 0.25);
    const tine = 0.4 * Math.exp(-t / 0.03) * Math.sin(TAU * f * 14 * t);
    const mod = index * Math.sin(TAU * f * t) + tine;
    out[i] = Math.sin(TAU * f * t + mod) * ad(0.003, 1.1)(t);
  }
  return out;
}

/** Detuned saw stack for chords/pads. */
function sawStack(len, freqs, voices = 2, spreadCents = 8) {
  const parts = [];
  for (const f of freqs) {
    for (let v = 0; v < voices; v++) {
      const cents = voices === 1 ? 0 : -spreadCents + (2 * spreadCents * v) / (voices - 1);
      parts.push([
        osc(len, f * Math.pow(2, cents / 1200), "saw", rand()),
        1 / (freqs.length * voices),
      ]);
    }
  }
  return mix(len, ...parts);
}

/** Glottal pulse through three formant band-passes (vowel synthesis). */
function vowel(len, pitch, formants, vibrato = 5) {
  const src = osc(
    len,
    (t) =>
      (typeof pitch === "function" ? pitch(t) : pitch) *
      (1 + 0.01 * Math.sin(TAU * vibrato * t) * Math.min(1, t * 4)),
    "saw",
  );
  const parts = formants.map(([f, gain, q]) => {
    const copy = Float32Array.from(src);
    return [typeof f === "function" ? sweepBp(copy, f, q) : biquad(copy, "bp", f, q), gain];
  });
  return mix(len, ...parts);
}

// ---------------------------------------------------------------------------
// Instrument recipes
// ---------------------------------------------------------------------------

function kick({ f0, f1, pitchTau, decay, dur, click = 0.3, drive = 1.5, lp }) {
  const len = buf(dur).length;
  const body = env(osc(len, glide(f0, f1, pitchTau)), ad(0.001, decay));
  const clk = env(biquad(noiseBuf(len), "hp", 1500), ad(0.0005, 0.004));
  let out = sat(mix(len, [body, 1], [clk, click]), drive);
  if (lp) out = biquad(out, "lp", lp);
  return out;
}

function snare({
  tone = 185,
  toneDecay = 0.06,
  noiseDecay = 0.15,
  noiseAmt = 0.8,
  dur = 0.45,
  lp = 9000,
  drive = 1.2,
}) {
  const len = buf(dur).length;
  const body = env(
    mix(len, [osc(len, glide(tone * 1.4, tone, 0.02)), 0.7], [osc(len, tone * 1.78), 0.3]),
    ad(0.001, toneDecay),
  );
  const n = env(biquad(biquad(noiseBuf(len), "hp", 1200), "lp", lp), ad(0.001, noiseDecay));
  return sat(mix(len, [body, 0.7], [n, noiseAmt]), drive);
}

function clap({ dur = 0.45, center = 1200, tail = 0.16 }) {
  const len = buf(dur).length;
  const n = biquad(noiseBuf(len), "bp", center, 1.2);
  return env(n, (t) => {
    const bursts = [0, 0.011, 0.022, 0.034];
    let a = 0;
    for (const b of bursts.slice(0, -1))
      if (t >= b && t < b + 0.011) a = Math.exp(-(t - b) / 0.004);
    const last = bursts[bursts.length - 1];
    if (t >= last) a = Math.exp(-(t - last) / tail);
    return a;
  });
}

function hat({ decay, dur, scale = 1, hp = 7000, noiseAmt = 0.4 }) {
  const len = buf(dur).length;
  const src = mix(len, [metallic(len, scale), 1], [noiseBuf(len), noiseAmt]);
  return env(biquad(biquad(src, "bp", 10000, 0.8), "hp", hp), ad(0.0008, decay));
}

function tom(f, decay = 0.28, dur = 0.6) {
  const len = buf(dur).length;
  const body = env(osc(len, glide(f * 1.5, f, 0.06)), ad(0.001, decay));
  const n = env(biquad(noiseBuf(len), "bp", f * 4, 1), ad(0.001, 0.02));
  return sat(mix(len, [body, 1], [n, 0.25]), 1.3);
}

function hand(f, decay, dur = 0.4, slap = 0.2) {
  const len = buf(dur).length;
  const body = env(osc(len, glide(f * 1.25, f, 0.012)), ad(0.001, decay));
  const n = env(biquad(noiseBuf(len), "bp", 2200, 1.5), ad(0.0005, 0.008));
  return mix(len, [body, 1], [n, slap]);
}

const tonal = (len, freqs, shape, envFn) =>
  env(mix(len, ...freqs.map((f) => [osc(len, f, shape, rand()), 1 / freqs.length])), envFn);

function subBass(f) {
  const len = buf(0.9).length;
  const tone = mix(len, [osc(len, f), 1], [osc(len, f * 2), 0.25], [osc(len, f * 3), 0.08]);
  return sat(env(tone, ahr(0.005, 0.35, 0.5)), 1.6);
}

function sawBass(f) {
  const len = buf(0.6).length;
  const src = sawStack(len, [f], 2, 7);
  const filtered = sweepLp(src, (t) => 250 + 2600 * Math.exp(-t / 0.12), 2.2);
  return sat(env(filtered, ad(0.003, 0.35)), 1.8);
}

function pluckBass(f) {
  const len = buf(0.7).length;
  return biquad(env(pluck(len, f * 2, 0.6, 0.995), ad(0.002, 0.3)), "lp", 1800);
}

function bass808(f) {
  const len = buf(1.4).length;
  return sat(env(osc(len, glide(f * 2.4, f, 0.025)), ad(0.002, 0.7)), 2.2);
}

function chord(notes, render, dur, gain = 0.6) {
  const len = buf(dur).length;
  return mix(len, ...notes.map((n) => [render(len, hz(n)), gain]));
}

function stab(notes) {
  const len = buf(0.55).length;
  const src = sawStack(len, notes.map(hz), 2, 10);
  return env(
    sweepLp(src, (t) => 600 + 5000 * Math.exp(-t / 0.08), 1.6),
    ad(0.002, 0.2),
  );
}

function arp(notes, step = 0.1) {
  const len = buf(step * notes.length + 0.25).length;
  const parts = notes.map((n, i) => {
    const l = buf(step + 0.25).length;
    const tone = mix(l, [osc(l, hz(n), "square"), 0.5], [osc(l, hz(n) * 1.003, "saw"), 0.5]);
    return [
      env(
        sweepLp(tone, (t) => 800 + 4000 * Math.exp(-t / 0.05)),
        ad(0.002, 0.08),
      ),
      0.9,
      i * step,
    ];
  });
  return mix(len, ...parts);
}

function pad(notes, dur = 2.2) {
  const len = buf(dur).length;
  const src = sawStack(len, notes.map(hz), 3, 12);
  const filtered = sweepLp(src, (t) => 900 + 600 * Math.sin(TAU * 0.4 * t), 0.9);
  return env(filtered, ahr(0.35, dur - 1.0, 0.65));
}

function lead(note) {
  const len = buf(0.8).length;
  const f = hz(note);
  const pitch = (t) => f * (1 + (t > 0.15 ? 0.008 * Math.sin(TAU * 6 * t) : 0));
  const src = mix(
    len,
    [osc(len, pitch, "square"), 0.5],
    [osc(len, (t) => pitch(t) * 1.004, "saw"), 0.5],
  );
  return env(biquad(src, "lp", 3800), ahr(0.01, 0.35, 0.4));
}

function beatboxNoise({ dur, attack, decay, type, freq, q = 1, pre = 0 }) {
  const len = buf(dur).length;
  const n = env(biquad(noiseBuf(len), type, freq, q), ad(attack, decay));
  if (!pre) return n;
  const pop = env(biquad(noiseBuf(len), "lp", 400), ad(0.001, 0.006));
  return mix(len, [n, 1], [pop, pre]);
}

function crackle(len, density, amount) {
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) if (rand() < density) out[i] = noise() * amount;
  return biquad(out, "bp", 3000, 0.7);
}

function bitcrush(x, bits, hold) {
  const steps = Math.pow(2, bits - 1);
  let held = 0;
  for (let i = 0; i < x.length; i++) {
    if (i % hold === 0) held = Math.round(x[i] * steps) / steps;
    x[i] = held;
  }
  return x;
}

/** Read `src` with a varying playback rate — used for the turntable scratch. */
function varispeed(src, rate, len) {
  const out = new Float32Array(len);
  let pos = src.length * 0.3;
  for (let i = 0; i < len; i++) {
    pos += rate(i / SR);
    pos = Math.max(0, Math.min(src.length - 2, pos));
    const i0 = Math.floor(pos);
    const frac = pos - i0;
    out[i] = src[i0] * (1 - frac) + src[i0 + 1] * frac;
  }
  return out;
}

// ---------------------------------------------------------------------------
// The library
// ---------------------------------------------------------------------------

/** @type {{ id: string; name: string; category: string; recipe: string; render: () => Float32Array }[]} */
const SOUNDS = [
  // Kicks
  {
    id: "kick-punchy-01",
    name: "Punchy Kick",
    category: "kick",
    recipe: "sine sweep 180→55 Hz, click, soft clip",
    render: () => kick({ f0: 180, f1: 55, pitchTau: 0.035, decay: 0.18, dur: 0.5 }),
  },
  {
    id: "kick-deep-01",
    name: "Deep Kick",
    category: "kick",
    recipe: "sine sweep 120→42 Hz, long decay",
    render: () => kick({ f0: 120, f1: 42, pitchTau: 0.05, decay: 0.38, dur: 0.8, click: 0.15 }),
  },
  {
    id: "kick-boom-01",
    name: "Boom Bap Kick",
    category: "kick",
    recipe: "sine sweep 140→50 Hz, heavy saturation",
    render: () =>
      kick({ f0: 140, f1: 50, pitchTau: 0.04, decay: 0.25, dur: 0.6, drive: 2.4, click: 0.4 }),
  },
  {
    id: "kick-909-01",
    name: "909 Kick",
    category: "kick",
    recipe: "fast sweep 230→52 Hz with strong click",
    render: () =>
      kick({ f0: 230, f1: 52, pitchTau: 0.028, decay: 0.3, dur: 0.6, click: 0.6, drive: 1.8 }),
  },
  {
    id: "kick-soft-01",
    name: "Soft Kick",
    category: "kick",
    recipe: "gentle sweep 100→48 Hz, low-passed",
    render: () =>
      kick({
        f0: 100,
        f1: 48,
        pitchTau: 0.04,
        decay: 0.22,
        dur: 0.5,
        click: 0.05,
        lp: 350,
        drive: 1.2,
      }),
  },

  // Snares and claps
  {
    id: "snare-crisp-01",
    name: "Crisp Snare",
    category: "snare",
    recipe: "tone 190 Hz + band-limited noise",
    render: () => snare({ tone: 190, noiseDecay: 0.13, noiseAmt: 1 }),
  },
  {
    id: "snare-fat-01",
    name: "Fat Snare",
    category: "snare",
    recipe: "tone 160 Hz, long noise tail, saturated",
    render: () =>
      snare({
        tone: 160,
        toneDecay: 0.09,
        noiseDecay: 0.2,
        noiseAmt: 0.9,
        drive: 2,
        lp: 7000,
        dur: 0.5,
      }),
  },
  {
    id: "snare-dusty-01",
    name: "Dusty Snare",
    category: "snare",
    recipe: "low-passed snare with crackle",
    render: () => {
      const s = snare({ tone: 175, noiseDecay: 0.16, lp: 4200, drive: 1.5 });
      return mix(s.length, [s, 1], [crackle(s.length, 0.002, 0.6), 1]);
    },
  },
  {
    id: "snare-gated-01",
    name: "Gated Snare",
    category: "snare",
    recipe: "snare with held noise then hard gate (80s)",
    render: () => {
      const len = buf(0.4).length;
      const core = snare({ tone: 200, noiseDecay: 0.1, dur: 0.4 });
      const tail = env(biquad(biquad(noiseBuf(len), "hp", 900), "lp", 6000), (t) =>
        t < 0.26 ? 0.5 * Math.exp(-t / 0.6) : Math.max(0, 0.5 * (1 - (t - 0.26) / 0.015)),
      );
      return mix(len, [core, 1], [tail, 1]);
    },
  },
  {
    id: "snare-clap-01",
    name: "Clap",
    category: "snare",
    recipe: "four band-passed noise bursts",
    render: () => clap({}),
  },
  {
    id: "snare-clap-909-01",
    name: "909 Clap",
    category: "snare",
    recipe: "brighter clap, shorter tail",
    render: () => clap({ center: 1600, tail: 0.11, dur: 0.35 }),
  },
  {
    id: "snare-rim-01",
    name: "Rimshot",
    category: "snare",
    recipe: "short 1.7 kHz + 480 Hz tones",
    render: () => {
      const len = buf(0.15).length;
      return biquad(tonal(len, [1700, 480], "tri", ad(0.0005, 0.018)), "hp", 300);
    },
  },
  {
    id: "snare-snap-01",
    name: "Finger Snap",
    category: "snare",
    recipe: "narrow band-passed noise burst",
    render: () => {
      const len = buf(0.18).length;
      return mix(
        len,
        [env(biquad(noiseBuf(len), "bp", 2600, 3), ad(0.0005, 0.03)), 1],
        [env(osc(len, 1900), ad(0.0005, 0.01)), 0.2],
      );
    },
  },

  // Hi-hats and cymbals
  {
    id: "hihat-closed-01",
    name: "Closed Hat",
    category: "hihat",
    recipe: "metallic squares, short decay",
    render: () => hat({ decay: 0.04, dur: 0.15 }),
  },
  {
    id: "hihat-open-01",
    name: "Open Hat",
    category: "hihat",
    recipe: "metallic squares, long decay",
    render: () => hat({ decay: 0.32, dur: 0.6 }),
  },
  {
    id: "hihat-pedal-01",
    name: "Pedal Hat",
    category: "hihat",
    recipe: "very short, darker hat",
    render: () => hat({ decay: 0.018, dur: 0.08, hp: 5500 }),
  },
  {
    id: "hihat-vinyl-01",
    name: "Dusty Hat",
    category: "hihat",
    recipe: "noise hat, low-passed",
    render: () => biquad(hat({ decay: 0.05, dur: 0.18, noiseAmt: 1.2 }), "lp", 8000),
  },
  {
    id: "hihat-909-01",
    name: "909 Hat",
    category: "hihat",
    recipe: "bright noise-heavy hat",
    render: () => hat({ decay: 0.06, dur: 0.2, noiseAmt: 1, scale: 1.2 }),
  },
  {
    id: "hihat-crash-01",
    name: "Crash",
    category: "hihat",
    recipe: "metallic + noise, 0.9 s decay",
    render: () => hat({ decay: 0.8, dur: 1.6, hp: 4000, noiseAmt: 1.2, scale: 0.9 }),
  },
  {
    id: "hihat-ride-01",
    name: "Ride",
    category: "hihat",
    recipe: "low metallic with bell partial",
    render: () => {
      const len = buf(1.3).length;
      const body = hat({ decay: 0.6, dur: 1.3, hp: 3000, scale: 0.7, noiseAmt: 0.2 });
      return mix(len, [body, 1], [tonal(len, [1250, 2510], "sine", ad(0.001, 0.5)), 0.15]);
    },
  },

  // Percussion
  {
    id: "perc-tom-high-01",
    name: "High Tom",
    category: "percussion",
    recipe: "sine sweep to 220 Hz",
    render: () => tom(220, 0.22),
  },
  {
    id: "perc-tom-mid-01",
    name: "Mid Tom",
    category: "percussion",
    recipe: "sine sweep to 160 Hz",
    render: () => tom(160, 0.26),
  },
  {
    id: "perc-tom-low-01",
    name: "Low Tom",
    category: "percussion",
    recipe: "sine sweep to 105 Hz",
    render: () => tom(105, 0.32, 0.7),
  },
  {
    id: "perc-conga-high-01",
    name: "High Conga",
    category: "percussion",
    recipe: "pitched skin 340 Hz + slap",
    render: () => hand(340, 0.14),
  },
  {
    id: "perc-conga-low-01",
    name: "Low Conga",
    category: "percussion",
    recipe: "pitched skin 220 Hz + slap",
    render: () => hand(220, 0.18),
  },
  {
    id: "perc-bongo-high-01",
    name: "High Bongo",
    category: "percussion",
    recipe: "pitched skin 520 Hz",
    render: () => hand(520, 0.07, 0.25, 0.3),
  },
  {
    id: "perc-bongo-low-01",
    name: "Low Bongo",
    category: "percussion",
    recipe: "pitched skin 390 Hz",
    render: () => hand(390, 0.09, 0.25, 0.3),
  },
  {
    id: "perc-shaker-01",
    name: "Shaker",
    category: "percussion",
    recipe: "band-passed noise, soft attack",
    render: () =>
      beatboxNoise({ dur: 0.2, attack: 0.018, decay: 0.05, type: "bp", freq: 6500, q: 1.2 }),
  },
  {
    id: "perc-cowbell-01",
    name: "Cowbell",
    category: "percussion",
    recipe: "two squares 540/800 Hz, band-passed",
    render: () => {
      const len = buf(0.4).length;
      return biquad(tonal(len, [540, 800], "square", ad(0.001, 0.12)), "bp", 1000, 1.5);
    },
  },
  {
    id: "perc-woodblock-01",
    name: "Woodblock",
    category: "percussion",
    recipe: "short 1 kHz tone + click",
    render: () => {
      const len = buf(0.15).length;
      return mix(
        len,
        [env(osc(len, glide(1300, 1000, 0.005)), ad(0.0005, 0.035)), 1],
        [env(biquad(noiseBuf(len), "bp", 3000, 2), ad(0.0005, 0.004)), 0.3],
      );
    },
  },
  {
    id: "perc-clave-01",
    name: "Clave",
    category: "percussion",
    recipe: "short 2.5 kHz tone",
    render: () => {
      const len = buf(0.12).length;
      return env(osc(len, 2500), ad(0.0005, 0.03));
    },
  },
  {
    id: "perc-tambourine-01",
    name: "Tambourine",
    category: "percussion",
    recipe: "jingle bursts of high noise + metal",
    render: () => {
      const len = buf(0.4).length;
      const src = mix(len, [noiseBuf(len), 0.6], [metallic(len, 3), 0.4]);
      return env(
        biquad(src, "bp", 8500, 1.5),
        (t) => ad(0.002, 0.15)(t) * (0.7 + 0.3 * Math.sin(TAU * 38 * t)),
      );
    },
  },
  {
    id: "perc-triangle-01",
    name: "Triangle",
    category: "percussion",
    recipe: "inharmonic sines around 1.3 kHz",
    render: () => {
      const len = buf(1.2).length;
      return tonal(len, [1320, 3640, 7130], "sine", ad(0.001, 0.6));
    },
  },

  // Bass (C minor: C Eb F G Bb)
  ...[
    ["c", "C2"],
    ["eb", "Eb2"],
    ["g", "G2"],
    ["bb", "Bb2"],
  ].map(([k, n]) => ({
    id: `bass-sub-${k}-01`,
    name: `Sub ${n.slice(0, -1)}`,
    category: "bass",
    recipe: `sine sub bass at ${n} with soft harmonics`,
    render: () => subBass(hz(n)),
  })),
  ...[
    ["c", "C2"],
    ["eb", "Eb2"],
    ["f", "F2"],
    ["g", "G2"],
    ["bb", "Bb2"],
  ].map(([k, n]) => ({
    id: `bass-saw-${k}-01`,
    name: `Synth Bass ${n.slice(0, -1)}`,
    category: "bass",
    recipe: `detuned saws at ${n}, enveloped low-pass`,
    render: () => sawBass(hz(n)),
  })),
  ...[
    ["c", "C2"],
    ["eb", "Eb2"],
    ["g", "G2"],
  ].map(([k, n]) => ({
    id: `bass-pluck-${k}-01`,
    name: `Pluck Bass ${n.slice(0, -1)}`,
    category: "bass",
    recipe: `Karplus–Strong string at ${n} (one octave up)`,
    render: () => pluckBass(hz(n)),
  })),
  {
    id: "bass-808-c-01",
    name: "808 Bass",
    category: "bass",
    recipe: "pitched sine boom at C1→C2 glide, saturated",
    render: () => bass808(hz("C2")),
  },

  // Piano and keys (C major)
  ...["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"].map((n) => ({
    id: `piano-${n.toLowerCase()}-01`,
    name: `Piano ${n}`,
    category: "piano",
    recipe: `additive piano note ${n}`,
    render: () => chord([n], pianoNote, 1.6, 1),
  })),
  {
    id: "piano-chord-c-01",
    name: "C Chord",
    category: "piano",
    recipe: "piano triad C E G",
    render: () => chord(["C4", "E4", "G4"], pianoNote, 1.8),
  },
  {
    id: "piano-chord-f-01",
    name: "F Chord",
    category: "piano",
    recipe: "piano triad A C F",
    render: () => chord(["A3", "C4", "F4"], pianoNote, 1.8),
  },
  {
    id: "piano-chord-g-01",
    name: "G Chord",
    category: "piano",
    recipe: "piano triad B D G",
    render: () => chord(["B3", "D4", "G4"], pianoNote, 1.8),
  },
  {
    id: "piano-chord-am-01",
    name: "Am Chord",
    category: "piano",
    recipe: "piano triad A C E",
    render: () => chord(["A3", "C4", "E4"], pianoNote, 1.8),
  },
  {
    id: "piano-rhodes-cmaj7-01",
    name: "Keys Cmaj7",
    category: "piano",
    recipe: "FM electric piano Cmaj7, warm low-pass",
    render: () => biquad(chord(["C4", "E4", "G4", "B4"], epNote, 2, 0.5), "lp", 3200),
  },
  {
    id: "piano-rhodes-am7-01",
    name: "Keys Am7",
    category: "piano",
    recipe: "FM electric piano Am7",
    render: () => biquad(chord(["A3", "C4", "E4", "G4"], epNote, 2, 0.5), "lp", 3200),
  },
  {
    id: "piano-rhodes-dm7-01",
    name: "Keys Dm7",
    category: "piano",
    recipe: "FM electric piano Dm7",
    render: () => biquad(chord(["D4", "F4", "A4", "C5"], epNote, 2, 0.5), "lp", 3200),
  },
  {
    id: "piano-rhodes-g7-01",
    name: "Keys G7",
    category: "piano",
    recipe: "FM electric piano G7",
    render: () => biquad(chord(["G3", "B3", "D4", "F4"], epNote, 2, 0.5), "lp", 3200),
  },

  // Synths (C minor)
  {
    id: "synth-stab-cm-01",
    name: "Stab Cm",
    category: "synth",
    recipe: "saw chord C Eb G, filter snap",
    render: () => stab(["C4", "Eb4", "G4"]),
  },
  {
    id: "synth-stab-fm-01",
    name: "Stab Fm",
    category: "synth",
    recipe: "saw chord F Ab C, filter snap",
    render: () => stab(["F4", "Ab4", "C5"]),
  },
  {
    id: "synth-arp-c-01",
    name: "Arp Cm",
    category: "synth",
    recipe: "four-step arpeggio C Eb G C",
    render: () => arp(["C4", "Eb4", "G4", "C5"]),
  },
  {
    id: "synth-arp-g-01",
    name: "Arp Gm",
    category: "synth",
    recipe: "four-step arpeggio G Bb D G",
    render: () => arp(["G3", "Bb3", "D4", "G4"]),
  },
  {
    id: "synth-pad-cm-01",
    name: "Pad Cm",
    category: "synth",
    recipe: "detuned saw pad C Eb G",
    render: () => pad(["C3", "Eb3", "G3", "C4"]),
  },
  {
    id: "synth-pad-ab-01",
    name: "Pad Ab",
    category: "synth",
    recipe: "detuned saw pad Ab C Eb",
    render: () => pad(["Ab2", "C3", "Eb3", "Ab3"]),
  },
  {
    id: "synth-pad-bb-01",
    name: "Pad Bb",
    category: "synth",
    recipe: "detuned saw pad Bb D F",
    render: () => pad(["Bb2", "D3", "F3", "Bb3"]),
  },
  {
    id: "synth-pad-eb-01",
    name: "Pad Eb",
    category: "synth",
    recipe: "detuned saw pad Eb G Bb",
    render: () => pad(["Eb3", "G3", "Bb3", "Eb4"]),
  },
  {
    id: "synth-lead-c-01",
    name: "Lead C",
    category: "synth",
    recipe: "square/saw lead C5 with delayed vibrato",
    render: () => lead("C5"),
  },
  {
    id: "synth-lead-g-01",
    name: "Lead G",
    category: "synth",
    recipe: "square/saw lead G4 with delayed vibrato",
    render: () => lead("G4"),
  },

  // Beatbox
  {
    id: "beatbox-kick-01",
    name: "B Kick",
    category: "beatbox",
    recipe: "lip pop + low thump",
    render: () => {
      const len = buf(0.3).length;
      return biquad(
        mix(
          len,
          [kick({ f0: 120, f1: 60, pitchTau: 0.02, decay: 0.08, dur: 0.3, click: 0 }), 1],
          [env(biquad(noiseBuf(len), "lp", 900), ad(0.001, 0.015)), 0.8],
        ),
        "lp",
        1200,
      );
    },
  },
  {
    id: "beatbox-kick-02",
    name: "Throat Kick",
    category: "beatbox",
    recipe: "voiced 70 Hz pulse, low-passed",
    render: () => {
      const len = buf(0.3).length;
      return biquad(env(osc(len, glide(110, 70, 0.03), "saw"), ad(0.003, 0.08)), "lp", 500);
    },
  },
  {
    id: "beatbox-snare-01",
    name: "Pf Snare",
    category: "beatbox",
    recipe: "plosive pop + band noise",
    render: () =>
      beatboxNoise({
        dur: 0.3,
        attack: 0.005,
        decay: 0.09,
        type: "bp",
        freq: 2200,
        q: 0.8,
        pre: 0.8,
      }),
  },
  {
    id: "beatbox-snare-02",
    name: "K Snare",
    category: "beatbox",
    recipe: "short click + narrow noise",
    render: () =>
      beatboxNoise({
        dur: 0.18,
        attack: 0.001,
        decay: 0.035,
        type: "bp",
        freq: 2800,
        q: 2,
        pre: 0.4,
      }),
  },
  {
    id: "beatbox-hat-01",
    name: "Ts Hat",
    category: "beatbox",
    recipe: "high-passed breath noise",
    render: () => beatboxNoise({ dur: 0.18, attack: 0.003, decay: 0.045, type: "hp", freq: 5000 }),
  },
  {
    id: "beatbox-hat-02",
    name: "Tk Hat",
    category: "beatbox",
    recipe: "two quick clicks",
    render: () => {
      const one = beatboxNoise({
        dur: 0.06,
        attack: 0.0005,
        decay: 0.008,
        type: "bp",
        freq: 3200,
        q: 2,
      });
      const len = buf(0.15).length;
      return mix(len, [one, 1], [one, 0.7, 0.045]);
    },
  },
  {
    id: "beatbox-hat-03",
    name: "Tss Open",
    category: "beatbox",
    recipe: "long high-passed breath",
    render: () => beatboxNoise({ dur: 0.45, attack: 0.004, decay: 0.18, type: "hp", freq: 4500 }),
  },
  {
    id: "beatbox-click-01",
    name: "Tongue Click",
    category: "beatbox",
    recipe: "very short 1.8 kHz pop",
    render: () => {
      const len = buf(0.1).length;
      return mix(
        len,
        [env(osc(len, 1800), ad(0.0003, 0.008)), 1],
        [env(biquad(noiseBuf(len), "bp", 2500, 3), ad(0.0003, 0.004)), 0.5],
      );
    },
  },
  {
    id: "beatbox-hum-01",
    name: "Hum Bass",
    category: "beatbox",
    recipe: "hummed 'mm' at 82 Hz",
    render: () => {
      const len = buf(0.6).length;
      return env(
        vowel(len, 82, [
          [250, 1, 3],
          [600, 0.2, 4],
        ]),
        ahr(0.02, 0.3, 0.25),
      );
    },
  },

  // Vocal
  {
    id: "vocal-ah-01",
    name: "Ah",
    category: "vocal",
    recipe: "formant vowel /a/ at 220 Hz",
    render: () =>
      env(
        vowel(buf(0.8).length, 220, [
          [800, 1, 8],
          [1150, 0.5, 10],
          [2900, 0.2, 20],
        ]),
        ahr(0.04, 0.45, 0.3),
      ),
  },
  {
    id: "vocal-oh-01",
    name: "Oh",
    category: "vocal",
    recipe: "formant vowel /o/ at 196 Hz",
    render: () =>
      env(
        vowel(buf(0.8).length, 196, [
          [450, 1, 6],
          [800, 0.4, 8],
          [2830, 0.12, 20],
        ]),
        ahr(0.04, 0.45, 0.3),
      ),
  },
  {
    id: "vocal-ooh-01",
    name: "Ooh",
    category: "vocal",
    recipe: "formant vowel /u/ at 262 Hz",
    render: () =>
      env(
        vowel(buf(0.9).length, 262, [
          [325, 1, 5],
          [700, 0.3, 8],
          [2530, 0.08, 20],
        ]),
        ahr(0.08, 0.45, 0.35),
      ),
  },
  {
    id: "vocal-hey-01",
    name: "Hey!",
    category: "vocal",
    recipe: "breath onset then gliding /e/→/i/",
    render: () => {
      const len = buf(0.4).length;
      const v = env(
        vowel(len, glide(250, 300, 0.1), [
          [(t) => 500 - 150 * Math.min(1, t * 4), 1, 6],
          [(t) => 1800 + 500 * Math.min(1, t * 4), 0.6, 10],
          [2700, 0.2, 18],
        ]),
        (t) => (t < 0.03 ? 0 : ahr(0.02, 0.18, 0.15)(t - 0.03)),
      );
      const h = beatboxNoise({
        dur: 0.4,
        attack: 0.005,
        decay: 0.03,
        type: "bp",
        freq: 1800,
        q: 0.7,
      });
      return mix(len, [v, 1], [h, 0.4]);
    },
  },

  // Ambient
  {
    id: "ambient-vinyl-01",
    name: "Vinyl Crackle",
    category: "ambient",
    recipe: "sparse clicks over soft hiss",
    render: () => {
      const len = buf(2).length;
      const hiss = biquad(biquad(noiseBuf(len), "lp", 5000), "hp", 800);
      return env(mix(len, [crackle(len, 0.0015, 1), 1], [hiss, 0.05]), ahr(0.05, 1.7, 0.25));
    },
  },
  {
    id: "ambient-rain-01",
    name: "Rain",
    category: "ambient",
    recipe: "low-passed noise with droplets",
    render: () => {
      const len = buf(2).length;
      return env(
        mix(len, [biquad(noiseBuf(len), "lp", 2500), 0.5], [crackle(len, 0.004, 0.5), 1]),
        ahr(0.3, 1.2, 0.5),
      );
    },
  },
  {
    id: "ambient-wind-01",
    name: "Wind Swell",
    category: "ambient",
    recipe: "noise through a slowly sweeping band-pass",
    render: () => {
      const len = buf(2.2).length;
      return env(
        sweepBp(noiseBuf(len), (t) => 350 + 600 * Math.sin((Math.PI * t) / 2.2), 4),
        (t) => Math.sin((Math.PI * t) / 2.2),
      );
    },
  },
  {
    id: "ambient-drone-01",
    name: "Drone",
    category: "ambient",
    recipe: "C/G saw drone, breathing filter",
    render: () => {
      const len = buf(2.5).length;
      return env(
        sweepLp(
          sawStack(len, [hz("C2"), hz("G2"), hz("C3")], 2, 6),
          (t) => 400 + 500 * Math.sin(TAU * 0.3 * t) ** 2,
          1.2,
        ),
        ahr(0.5, 1.2, 0.8),
      );
    },
  },

  // FX
  {
    id: "fx-riser-01",
    name: "Riser",
    category: "fx",
    recipe: "noise + saw sweeping up over 1.2 s",
    render: () => {
      const len = buf(1.2).length;
      const n = sweepBp(noiseBuf(len), (t) => 400 * Math.pow(20, t / 1.2), 3);
      const s = biquad(
        osc(len, (t) => 200 * Math.pow(8, t / 1.2), "saw"),
        "lp",
        5000,
      );
      return env(
        mix(len, [n, 0.8], [s, 0.2]),
        (t) => Math.pow(t / 1.2, 2) * (t > 1.18 ? (1.2 - t) / 0.02 : 1),
      );
    },
  },
  {
    id: "fx-downer-01",
    name: "Downer",
    category: "fx",
    recipe: "sine dropping 1.2 kHz→80 Hz",
    render: () =>
      env(
        osc(buf(0.6).length, (t) => 80 + 1120 * Math.exp(-t / 0.12)),
        ad(0.002, 0.25),
      ),
  },
  {
    id: "fx-laser-01",
    name: "Laser",
    category: "fx",
    recipe: "square zap 2 kHz→200 Hz",
    render: () =>
      biquad(
        env(osc(buf(0.3).length, glide(2200, 180, 0.05), "square"), ad(0.001, 0.09)),
        "lp",
        6000,
      ),
  },
  {
    id: "fx-zap-01",
    name: "Zap",
    category: "fx",
    recipe: "FM blip with noise burst",
    render: () => {
      const len = buf(0.22).length;
      const out = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        const t = i / SR;
        out[i] =
          Math.sin(
            TAU * (900 - 2000 * t) * t + 6 * Math.exp(-t / 0.05) * Math.sin(TAU * 1400 * t),
          ) * ad(0.001, 0.06)(t);
      }
      return mix(len, [out, 1], [env(biquad(noiseBuf(len), "hp", 3000), ad(0.001, 0.01)), 0.3]);
    },
  },
  {
    id: "fx-glitch-01",
    name: "Glitch",
    category: "fx",
    recipe: "random 20 ms square fragments",
    render: () => {
      const len = buf(0.36).length;
      const seg = Math.round(0.02 * SR);
      const out = new Float32Array(len);
      for (let s = 0; s < len; s += seg) {
        const f = 200 + rand() * 2400;
        const on = rand() > 0.25;
        const frag = osc(seg, f, rand() > 0.5 ? "square" : "saw");
        for (let i = 0; i < seg && s + i < len; i++) out[s + i] = on ? frag[i] * 0.7 : 0;
      }
      return env(out, (t) => (t > 0.34 ? (0.36 - t) / 0.02 : 1));
    },
  },
  {
    id: "fx-glitch-02",
    name: "Stutter",
    category: "fx",
    recipe: "gated tone repeating and accelerating",
    render: () => {
      const len = buf(0.45).length;
      const tone = mix(len, [osc(len, 660, "square"), 0.5], [osc(len, 990, "tri"), 0.5]);
      return env(tone, (t) => (Math.sin(TAU * (12 * t + 25 * t * t)) > 0 ? 1 : 0) * (1 - t / 0.45));
    },
  },
  {
    id: "fx-blip-01",
    name: "Blip",
    category: "fx",
    recipe: "short 1.3 kHz tone with octave",
    render: () => tonal(buf(0.12).length, [1320, 660], "tri", ad(0.001, 0.03)),
  },
  {
    id: "fx-blip-02",
    name: "Blip Up",
    category: "fx",
    recipe: "two-step blip 880→1760 Hz",
    render: () =>
      env(
        osc(buf(0.18).length, (t) => (t < 0.06 ? 880 : 1760), "tri"),
        ad(0.001, 0.06),
      ),
  },
  {
    id: "fx-crunch-01",
    name: "Crunch",
    category: "fx",
    recipe: "bit-crushed kick + noise (4 bit)",
    render: () => {
      const k = kick({
        f0: 160,
        f1: 50,
        pitchTau: 0.03,
        decay: 0.15,
        dur: 0.35,
        click: 0.8,
        drive: 3,
      });
      return bitcrush(mix(k.length, [k, 1], [env(noiseBuf(k.length), ad(0.001, 0.05)), 0.4]), 4, 8);
    },
  },
  {
    id: "fx-scratch-01",
    name: "Scratch",
    category: "fx",
    recipe: "vowel sample read back and forth (turntable)",
    render: () => {
      const srcLen = buf(1).length;
      const src = mix(
        srcLen,
        [
          vowel(srcLen, 180, [
            [700, 1, 4],
            [1200, 0.5, 6],
          ]),
          1,
        ],
        [biquad(noiseBuf(srcLen), "bp", 1500, 1), 0.3],
      );
      const len = buf(0.42).length;
      return env(
        varispeed(src, (t) => 2.6 * Math.sin(TAU * 4.8 * t), len),
        (t) => Math.min(1, t / 0.005) * (t > 0.4 ? (0.42 - t) / 0.02 : 1),
      );
    },
  },
  {
    id: "fx-reverse-01",
    name: "Reverse Swell",
    category: "fx",
    recipe: "reversed C-minor saw chord, exponential rise",
    render: () => {
      const len = buf(1).length;
      const src = biquad(sawStack(len, ["C3", "Eb3", "G3"].map(hz), 2, 10), "lp", 2500);
      return env(src, (t) => Math.pow(t, 3) * (t > 0.98 ? (1 - t) / 0.02 : 1));
    },
  },
  {
    id: "fx-impact-01",
    name: "Impact",
    category: "fx",
    recipe: "sub boom 60→30 Hz + low noise burst",
    render: () => {
      const len = buf(1.2).length;
      const boom = env(osc(len, glide(70, 30, 0.2)), ad(0.002, 0.6));
      const n = env(biquad(noiseBuf(len), "lp", 1200), ad(0.001, 0.15));
      return sat(mix(len, [boom, 1], [n, 0.6]), 1.8);
    },
  },
  {
    id: "fx-bubble-01",
    name: "Bubbles",
    category: "fx",
    recipe: "three rising sine chirps",
    render: () => {
      const len = buf(0.4).length;
      const one = env(
        osc(buf(0.09).length, (t) => 400 + 9000 * t),
        ad(0.002, 0.03),
      );
      return mix(len, [one, 1, 0], [one, 0.8, 0.11], [one, 0.6, 0.23]);
    },
  },
  {
    id: "fx-coin-01",
    name: "Coin",
    category: "fx",
    recipe: "square B5 → E6 pickup",
    render: () =>
      biquad(
        env(
          osc(buf(0.35).length, (t) => (t < 0.06 ? hz("B5") : hz("E6")), "square"),
          (t) => (t < 0.06 ? 1 : Math.exp(-(t - 0.06) / 0.1)),
        ),
        "lp",
        7000,
      ),
  },
];

// ---------------------------------------------------------------------------
// Post-processing and output
// ---------------------------------------------------------------------------

/** Peak-normalize to -1 dBFS, trim near-silent tail, and fade out the last 10 ms. */
function finalize(x) {
  let peak = 0;
  for (const v of x) peak = Math.max(peak, Math.abs(v));
  const scale = peak > 0 ? 0.891 / peak : 1;
  let end = x.length;
  while (end > 1 && Math.abs(x[end - 1] * scale) < 0.0005) end--;
  const out = x.slice(0, Math.max(end, Math.round(0.02 * SR)));
  const fade = Math.min(Math.round(0.01 * SR), out.length);
  for (let i = 0; i < out.length; i++) {
    out[i] *= scale;
    const fromEnd = out.length - i;
    if (fromEnd <= fade) out[i] *= fromEnd / fade;
  }
  return out;
}

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(s < 0 ? s * 0x8000 : s * 0x7fff), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const GENERATED_ON = "2026-10-18";
const assets = [];
let totalBytes = 0;
const ids = new Set();

for (const [index, sound] of SOUNDS.entries()) {
  if (ids.has(sound.id)) throw new Error(`duplicate id ${sound.id}`);
  ids.add(sound.id);
  rngState = 1000 + index; // per-sound seed: adding a sound never changes the others
  const file = `public/sounds/${sound.category}/${sound.id}.wav`;
  const bytes = wav(finalize(sound.render()));
  mkdirSync(join(ROOT, dirname(file)), { recursive: true });
  writeFileSync(join(ROOT, file), bytes);
  totalBytes += bytes.length;
  assets.push({
    id: sound.id,
    displayName: sound.name,
    category: sound.category,
    file,
    source: {
      name: "FidgetBeatz procedural generator",
      url: null,
      originalFilename: null,
      generator: "scripts/generate-sounds.mjs",
    },
    author: "FidgetBeatz project",
    license: { name: "CC0 1.0", url: "https://creativecommons.org/publicdomain/zero/1.0/" },
    attributionRequired: false,
    commercialUse: true,
    redistribution: true,
    modifications: "Synthesized from code; peak-normalized to -1 dBFS; 16-bit 44.1 kHz mono WAV",
    verifiedOn: GENERATED_ON,
    verifiedBy: "generator (project-owned)",
    notes: sound.recipe,
  });
}

writeFileSync(
  join(ROOT, "data/sounds/inventory.json"),
  JSON.stringify(
    {
      $comment:
        "One record per bundled audio file. Generated by scripts/generate-sounds.mjs for synthesized sounds; add hand-curated records (e.g. Freesound CC0) below them. Keep in sync with data/sounds/catalog.ts.",
      version: 1,
      assets,
    },
    null,
    2,
  ) + "\n",
);

console.log(
  `Generated ${assets.length} sounds, ${(totalBytes / 1024 / 1024).toFixed(2)} MB total.`,
);
