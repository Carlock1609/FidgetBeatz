# Audio System

> Status: **Implemented (Phase 1, 2026-10-18)** in `lib/audio/audio-engine.ts` (13 unit tests). Real-device latency testing (iOS Safari, Android Chrome) is **still pending**. Findings so far are in §12.

## 1. Goals

1. **Immediate response** — sound starts on the same input event, no audible lag.
2. **Overlap** — rapid taps and multiple pads play simultaneously.
3. **Resilience** — a missing or broken file never breaks the board.
4. **Encapsulation** — UI calls `engine.play(id)`; everything else is hidden in `lib/audio`.

## 2. Design

One shared `AudioContext`, a cache of decoded `AudioBuffer`s, and a fresh `AudioBufferSourceNode` per play. Source nodes are cheap, single-use objects by design; the buffer is what's reused.

```
AudioContext
  └── masterGain ── (optional DynamicsCompressor limiter) ── destination
        ▲
  per play: AudioBufferSourceNode(buffer) → voiceGain(sound.gain) → masterGain
```

### Public API (planned)

```ts
interface AudioEngine {
  /** Resume the context; must be called from a user gesture. Idempotent. */
  unlock(): Promise<void>;
  /** Fetch + decode sounds not yet cached. Never rejects; failures are recorded per sound. */
  preload(ids: SoundId[]): Promise<void>;
  /** Play immediately (or at `when`, in context time). No-op + warning if not ready. */
  play(id: SoundId, opts?: { when?: number; gain?: number }): void;
  /** Ready | loading | error | idle for a sound — drives pad "unavailable" UI. */
  status(id: SoundId): SoundStatus;
  subscribe(listener: (e: EngineEvent) => void): () => void;
  setMasterVolume(v: number): void;
}
```

`play` is **synchronous**. It never awaits anything; if the buffer isn't decoded yet, it returns and (optionally) starts loading. This keeps the tap path free of promises.

## 3. Lifecycle

1. **Create lazily** — `AudioContext` is created on the first user gesture (not at module load), avoiding autoplay warnings.
2. **Unlock** — on the first `pointerdown` anywhere, call `context.resume()`. iOS Safari requires this to happen inside a user gesture handler. A first-tap sound may be dropped on some browsers; if so, show a brief "Tap to start" overlay the first time.
3. **Preload** — after unlock, preload the active board's sounds (typically 8–16 short files). Load other sounds lazily when assigned or previewed in the sound picker.
4. **Play** — `pointerdown` → `engine.play(id)` → `source.start(when ?? 0)`.
5. **Cleanup** — `source.onended` disconnects nodes. Buffers stay cached for the session (small one-shots; memory is fine). Suspend context on `visibilitychange: hidden`; resume on return.

## 4. Latency rules

- Trigger on **`pointerdown`**, never `click` (which waits for release).
- Set `touch-action: manipulation` on pads to remove double-tap-zoom delay; prevent default on `pointerdown` only where needed to stop text selection/long-press menus.
- No React state update, fetch, or `await` before `source.start()`.
- Create the context with `latencyHint: 'interactive'` (the default).
- Trim leading silence from every asset (≤ 5 ms before the transient). Silence at the start of a file is the most common "laggy" complaint.

## 5. Overlap and voice limiting

Each tap is a new voice. To prevent CPU spikes and clipping during frantic tapping:

- **Global cap** ~32 concurrent voices; when exceeded, stop the oldest.
- **Per-sound policy** (optional field on the sound): `poly` (default, overlap freely) or `choke` (retrigger stops the previous instance — good for open hi-hats and long bass notes).
- A master limiter (`DynamicsCompressorNode` with fast attack, high ratio) prevents harsh clipping when many sounds stack.

## 6. Error handling

| Failure                     | Behavior                                                                  |
| --------------------------- | ------------------------------------------------------------------------- |
| Fetch 404 / network         | status `error`; pad shows unavailable state; log once                     |
| `decodeAudioData` fails     | same as above                                                             |
| Unknown sound id in profile | pad keeps its slot, shows "missing sound", can be reassigned in Edit Mode |
| Context won't resume        | show non-blocking "Tap to enable sound" prompt                            |
| Web Audio unsupported       | static message; board still renders                                       |

Nothing in the engine throws to the UI during play.

## 7. Formats

- **Primary: WAV (16-bit PCM, 44.1 kHz, mono unless stereo matters).** Decodes everywhere, no encoder delay/padding (MP3/AAC add silence at the start), and one-shots are small (a 0.5 s mono hit ≈ 44 KB).
- Normalize perceived loudness across the library (target peaks around −1 dBFS; balance by ear per category) and store a per-sound `gain` for fine-tuning.
- Long sounds (> ~3 s, e.g. ambient textures) may use a compressed format later. Ogg Vorbis isn't decodable on older Safari, so prefer AAC (`.m4a`) for any compressed asset, and verify decode on iOS before shipping it.
- Total initial library budget: aim for **< 5 MB**.

## 8. Testing

- Unit: engine with a mocked `AudioContext` (track `createBufferSource`/`start` calls, voice cap, choke, error states).
- E2E: expose `window.__fbAudioEvents` in test builds to assert triggers.
- **Manual device checklist** (record results in PR when audio code changes):
  - [ ] iOS Safari: first tap unlocks; subsequent taps instant; ring/silent switch behavior noted
  - [ ] Android Chrome: instant playback; 10+ rapid taps don't stutter
  - [ ] Desktop Chrome/Firefox/Safari: overlap, no clipping with 8 pads mashed
  - [ ] Backgrounding the tab and returning still plays
  - [ ] A deliberately broken file shows the unavailable state

> **iOS note:** Web Audio output may be muted when the hardware silent switch is on, depending on iOS version. Document observed behavior here once tested; don't rely on hacks.

## 9. Sound display and level meter

- The engine emits a `trigger` event `{ soundId, padIndex, time }` **after** `source.start()`. The LCD subscribes to it.
- Phase 1 meter: **trigger-driven**, meaning each hit sets the meter to 18–24 segments, then it decays via CSS/rAF. No `AnalyserNode` is needed, which avoids extra audio-graph work on phones.
- Optional later: a real level meter from an `AnalyserNode` on `masterGain`, sampled at ≤ 30 fps.

## 10. Phase 2 hooks (don't build yet)

- `play(id, { when })` must accept a future context time; the layer scheduler (ADR 0007) depends on it.
- Decoded buffers must be retrievable by id, so the WAV export can re-render them in an `OfflineAudioContext`.

## 11. Adding a sound

See [sound-licensing.md](sound-licensing.md#adding-a-new-sound). In short: verify license → trim/normalize → export WAV → place in `public/sounds/<category>/<id>.wav` → add catalog entry and inventory row → run tests.

## 12. Implementation findings (2026-10-18)

- **Pre-decode without a gesture.** In the first build, a buffer could only be decoded once the `AudioContext` existed, i.e. on the first tap. The first hit or two were dropped in desktop Chromium. The engine now decodes with a 1-frame `OfflineAudioContext(1, 1, 44100)`, which needs no user gesture. Decoded `AudioBuffer`s can be played by any context (the browser resamples if the live context runs at 48 kHz). The first tap then only creates and resumes the live context. Verified in the browser pane: the very first keypress after load played and updated the LCD.
- **Late-start window.** A tap that arrives while its sound is still loading is played if the decode finishes within 150 ms, and dropped otherwise. This is the only async path, and it applies only to sounds that aren't ready yet. It never affects ready sounds.
- **Unlock events.** `unlock()` is wired to `pointerdown`, `touchend`, `click` and `keydown` (capture, passive) on `window`, because older iOS versions only accept some of these as audio-unlocking gestures. `play()` also calls `resume()` if the context isn't running (for example after an iOS audio interruption).
- **Hit flash.** `flashPad()` sets `data-hit` on the button. It is removed 60 ms later, and the CSS transition fades it over ~300 ms. Nothing goes through React state.
- **Voice handling.** The cap is 32 voices, stealing the oldest. Stolen and choked voices fade over 8 ms before `stop()`, to avoid clicks. Choke is used for open hats, bass notes, pads, ambient beds and long FX.
- **E2E hook.** Rather than a `window.__fbAudioEvents` test hook, E2E tests assert the sound display's `data-last-sound` attribute. It is set only from the engine's `trigger` event, which fires after `source.start()`, so production builds need no test-only code.
- **Library size.** The library is 103 WAVs, ~7.4 MB in total. Only the active board is fetched up front (≈0.4–2 MB). This is over the §7 "< 5 MB" target. Left as is for now (ADR 0008).
- **Not yet measured.** Tap-to-sound latency on real phones, iOS silent-switch behavior, and backgrounding on iOS. Use the §8 device checklist.
