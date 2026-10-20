# 0004 — Pre-decoded AudioBuffers, one-shot source nodes, WAV assets

- **Status:** Accepted (validate with device testing in Stage 3)
- **Date:** 2026-10-18

## Context

Taps must sound instantly, repeatedly, and overlapping, on iOS Safari and Android Chrome.

## Options considered

1. **`<audio>` elements / `new Audio()`** — simple, but inconsistent latency, poor overlap (one element = one voice), iOS restrictions on concurrent playback.
2. **Audio library (e.g. Howler, Tone.js)** — mature; but extra weight and abstraction for what is ~150 lines of Web Audio code. Tone.js is aimed at synthesis/sequencing we don't need yet.
3. **Raw Web Audio: one `AudioContext`, fetch + `decodeAudioData` into a buffer cache, new `AudioBufferSourceNode` per play** — lowest latency, natural overlap, full control, no dependency.

## Decision

Option 3, encapsulated in `lib/audio` behind a small `AudioEngine` API. Trigger on `pointerdown`. Preload the active board; lazy-load the rest. Global voice cap with oldest-voice stealing; optional per-sound choke. Master limiter. Assets are 16-bit 44.1 kHz WAV with leading silence trimmed (compressed formats add encoder delay).

## Consequences

- We own browser-quirk handling (unlock on gesture, suspend on hidden). Documented in `audio-system.md`.
- `play()` accepts an optional `when` time, so Phase 2/3 sequencing can reuse the engine without redesign.
- If device testing shows problems we can't solve cheaply, revisit Option 2 (Howler) with an ADR.
