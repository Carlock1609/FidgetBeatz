# 0007 — Layer mixer as event sequences; WAV export via offline rendering

- **Status:** Proposed (Phase 2 — not built in Phase 1)
- **Date:** 2026-10-18

> **2026-11-02 scope revision:** event recording and offline WAV rendering remain the proposed technical approach. The loop-only duration, mandatory count-in, save UI and panel layout below are historical proposals, not finalized requirements. [Studio discovery](../studio.md) and addendum A7 take precedence; the agreed model is now one shared project loop of any positive duration up to 60 seconds and up to 30 layers, including sparse hits. The historical 8-layer limit and bar-only duration below are superseded.

## Context

Users want to record loops, stack up to ~8 layers, then save and download the beat. Constraints: client-only, $0, simple UI, mobile-friendly.

## Options considered

1. **Record audio output** (MediaRecorder) per layer — large blobs; output format differs by browser (Safari quirks); layers can't be edited or re-mixed afterwards.
2. **Record trigger events** `{ soundId, time, gain }` per layer and replay them through the existing engine — tiny data; editable (mute, volume, quantize); deterministic export.
3. A third-party sequencer library — unnecessary weight for a basic loop recorder.

## Decision

Option 2.

- **Model:** `Beat { id, name, bpm, bars, layers: Layer[] }`, where `Layer { id, name, color, muted, gain, events: { soundId, t }[] }` and `t` is seconds from loop start.
- **Timing:** loop length = `bars × 4 × 60 / bpm`. A standard look-ahead scheduler (~25 ms timer, ~100 ms schedule window) calls `engine.play(id, { when })`. Optional quantize to 1/16.
- **Recording:** 1-bar count-in (metronome click), then hits are stamped with `context.currentTime − loopStart` modulo the loop length.
- **Limits:** 8 layers, 512 events per layer, voice cap shared with live play.
- **Save:** beats as JSON in IndexedDB (or localStorage if small), separate from profiles, versioned like profiles.
- **Export:** render with `OfflineAudioContext` using the same decoded buffers, then encode 16-bit PCM WAV in-house (~60 lines, no dependency). Download via a Blob URL. MP3 is optional later, via an encoder library after a license check.

## Consequences

- No backend, no cost. The Phase 1 engine needs only `play(id, { when })` and access to decoded buffers, which it already plans.
- Exported audio includes bundled sounds: keep the library CC0 so users needn't credit anyone.
- iOS download behavior needs device testing.
- UI: mixer panel (idle / count-in / recording / playing), layer row component, and Save/Export sheet. These are already sketched in the Figma brief.
