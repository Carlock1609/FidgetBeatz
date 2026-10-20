# 0008 — Synthesize the Phase 1 sound library in-house

- **Status:** Accepted
- **Date:** 2026-10-18
- **Refines:** ADR 0001 (local audio assets)

## Context

ADR 0001 chose bundled, licensed audio over a live API. The suggested mix was CC0 files from Freesound, Kenney and itch.io. Each of those needs a manual, per-file license check and a download/trim/normalize pass. Kenney has few musical one-shots, and every downloaded file is one more license record that could be wrong. `sound-licensing.md` already lists "self-made / synthesized" as an approved source.

## Options considered

1. **Curate third-party CC0 files** — real recordings, but slow to vet, and the risk of a mislabeled license sits on every file.
2. **Synthesize everything from code** — no third-party rights at all. It's reproducible and easy to tweak (one script), and every sound has its transient at sample 0. Acoustic realism is limited (piano, voices).
3. **Mix:** synthesize now, add vetted recordings later.

## Decision

Option 3, starting with an all-synthesized library. `scripts/generate-sounds.mjs` renders 103 one-shots (drums, percussion, bass, keys, synths, beatbox, vocal formants, ambient and FX) using standard DSP: pitch-swept sines, filtered noise, 808-style metallic squares, Karplus–Strong strings, additive and FM keys, and formant filters. It writes the WAVs and their inventory records. All are released CC0 by the project. Musical presets stay in one key (C major / C minor) so any combination fits.

## Consequences

- Zero licensing risk and zero cost; `npm run sounds:generate` rebuilds the library byte-for-byte.
- Some sounds (piano, vocal, beatbox) are stylized rather than realistic. Replacing any one with a vetted recording only means a new file plus an inventory record (sound-licensing.md §4).
- The library is ~7.4 MB, above the 5 MB target. Only the active board is fetched up front, so first-load cost is ≈0.4–2 MB. If total size matters (e.g. offline caching), consider shortening the long pads/ambient sounds or a compressed format for them (audio-system.md §7).
