# Sound Sources and Licensing

> Status: **103 sounds bundled (2026-10-18), all project-synthesized and CC0.** No third-party audio is included yet. Licenses of any future third-party asset can change — re-verify at download time and record the date.

## 1. Rules

1. **Only bundle assets whose license permits redistribution inside an app and commercial use.** Even while the prototype is non-commercial, a future monetized version must not need a sound swap.
2. **Preferred license: CC0.** Accepted with attribution: CC BY. **Rejected:** CC BY-NC, CC BY-ND, "personal use only", "free for preview", unclear or missing licenses, and sources whose terms forbid redistributing raw files.
3. **No live third-party audio API in Phase 1.** Files are downloaded once, curated, and bundled (ADR 0001).
4. **Unclear = excluded.** Put it on the review list below; don't ship it.
5. Keep the source download (original filename + license file) in a private `assets-src/` folder or archive, not in `public/`.

## 2. Evaluated sources

| Source                                                             | License                            | Fit                                                             | Notes                                                                                                                                                                                                                         |
| ------------------------------------------------------------------ | ---------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Kenney** (kenney.nl/assets)                                      | CC0 across its audio packs         | ✅ Primary for UI-ish, digital, impact, and experimental sounds | Packs include Interface Sounds, UI Audio, Digital Audio, Impact Sounds, Music Jingles. Credit is optional. Few true musical one-shots (kicks, bass, piano) — supplement from elsewhere. Check the `License.txt` in each pack. |
| **Freesound** (freesound.org) — individual files                   | Per-sound: CC0, CC BY, or CC BY-NC | ✅ For hand-picked files, **CC0 or CC BY only**                 | Filter by license. Record the sound page URL and author. Never use CC BY-NC sounds.                                                                                                                                           |
| **Freesound API**                                                  | Separate API terms                 | ❌ Not for Phase 1                                              | Free API use is **non-commercial only**; commercial use requires a negotiated license with the operator (UPF/MTG). Also rate-limited and terms can change. Not needed if we bundle files.                                     |
| **OpenGameArt**                                                    | Per-item: CC0, CC BY, OGA-BY, GPL  | ⚠️ Case by case                                                 | Filter to CC0. Avoid GPL for assets (copyleft ambiguity in a web bundle).                                                                                                                                                     |
| **itch.io free asset packs**                                       | Varies per pack, often CC0         | ⚠️ Case by case                                                 | Read each pack's license; many CC0 drum/synth packs exist.                                                                                                                                                                    |
| **Self-made / synthesized**                                        | Owned by the project               | ✅ Good for bass, synth, beeps                                  | Render from a synth (e.g. a free DAW/plugin) and license as CC0 or project-owned. Record the tool and settings.                                                                                                               |
| Sites with custom "free" licenses (e.g. Mixkit, Pixabay, ZapSplat) | Custom licenses                    | ⚠️ Read carefully                                               | Many prohibit redistributing files as a standalone library or in a sound-playing app. Use only after a written check of the exact clause.                                                                                     |

**Recommended Phase 1 mix:** CC0 drum/percussion/bass/keys one-shots from Freesound (CC0 filter) and CC0 itch.io packs, Kenney for UI/digital/experimental textures, and synthesized sounds to fill gaps. Target ~60–90 sounds total.

## 3. Asset inventory

The machine-readable inventory lives in `data/sounds/inventory.json` and contains one record per bundled file. `data/sounds/catalog.test.ts` fails if a catalog entry has no file or no inventory record, if the name/category drift, or if a record doesn't allow commercial use and redistribution.

### Phase 1 library: synthesized in-house (ADR 0008)

Every Phase 1 sound is rendered from code by `scripts/generate-sounds.mjs` (`npm run sounds:generate`) — no samples, recordings or third-party packs. They are owned by the project and released as **CC0 1.0**, so there is no attribution, redistribution or commercial-use risk. Output is deterministic (seeded PRNG), 16-bit 44.1 kHz mono WAV, peak-normalized to −1 dBFS, with the transient at sample 0 (no leading silence).

| Category                       | Count | Category     | Count   |
| ------------------------------ | ----- | ------------ | ------- |
| kick                           | 5     | piano (keys) | 16      |
| snare (incl. claps, rim, snap) | 8     | synth        | 10      |
| hihat (incl. crash, ride)      | 7     | beatbox      | 9       |
| percussion                     | 13    | vocal        | 4       |
| bass                           | 13    | ambient      | 4       |
| fx                             | 14    | **total**    | **103** |

Total size on disk: ~7.4 MB. That is above the original 5 MB library target, but only the active board is fetched (≈0.4–2 MB depending on preset); other sounds load when assigned or previewed. See `docs/audio-system.md` §7.

<details>
<summary>Full list (id · name · category · recipe)</summary>

| ID                      | Name          | Category   | Recipe                                       |
| ----------------------- | ------------- | ---------- | -------------------------------------------- |
| `kick-punchy-01`        | Punchy Kick   | kick       | sine sweep 180→55 Hz, click, soft clip       |
| `kick-deep-01`          | Deep Kick     | kick       | sine sweep 120→42 Hz, long decay             |
| `kick-boom-01`          | Boom Bap Kick | kick       | sine sweep 140→50 Hz, heavy saturation       |
| `kick-909-01`           | 909 Kick      | kick       | fast sweep 230→52 Hz with strong click       |
| `kick-soft-01`          | Soft Kick     | kick       | gentle sweep 100→48 Hz, low-passed           |
| `snare-crisp-01`        | Crisp Snare   | snare      | tone 190 Hz + band-limited noise             |
| `snare-fat-01`          | Fat Snare     | snare      | tone 160 Hz, long noise tail, saturated      |
| `snare-dusty-01`        | Dusty Snare   | snare      | low-passed snare with crackle                |
| `snare-gated-01`        | Gated Snare   | snare      | snare with held noise then hard gate (80s)   |
| `snare-clap-01`         | Clap          | snare      | four band-passed noise bursts                |
| `snare-clap-909-01`     | 909 Clap      | snare      | brighter clap, shorter tail                  |
| `snare-rim-01`          | Rimshot       | snare      | short 1.7 kHz + 480 Hz tones                 |
| `snare-snap-01`         | Finger Snap   | snare      | narrow band-passed noise burst               |
| `hihat-closed-01`       | Closed Hat    | hihat      | metallic squares, short decay                |
| `hihat-open-01`         | Open Hat      | hihat      | metallic squares, long decay                 |
| `hihat-pedal-01`        | Pedal Hat     | hihat      | very short, darker hat                       |
| `hihat-vinyl-01`        | Dusty Hat     | hihat      | noise hat, low-passed                        |
| `hihat-909-01`          | 909 Hat       | hihat      | bright noise-heavy hat                       |
| `hihat-crash-01`        | Crash         | hihat      | metallic + noise, 0.9 s decay                |
| `hihat-ride-01`         | Ride          | hihat      | low metallic with bell partial               |
| `perc-tom-high-01`      | High Tom      | percussion | sine sweep to 220 Hz                         |
| `perc-tom-mid-01`       | Mid Tom       | percussion | sine sweep to 160 Hz                         |
| `perc-tom-low-01`       | Low Tom       | percussion | sine sweep to 105 Hz                         |
| `perc-conga-high-01`    | High Conga    | percussion | pitched skin 340 Hz + slap                   |
| `perc-conga-low-01`     | Low Conga     | percussion | pitched skin 220 Hz + slap                   |
| `perc-bongo-high-01`    | High Bongo    | percussion | pitched skin 520 Hz                          |
| `perc-bongo-low-01`     | Low Bongo     | percussion | pitched skin 390 Hz                          |
| `perc-shaker-01`        | Shaker        | percussion | band-passed noise, soft attack               |
| `perc-cowbell-01`       | Cowbell       | percussion | two squares 540/800 Hz, band-passed          |
| `perc-woodblock-01`     | Woodblock     | percussion | short 1 kHz tone + click                     |
| `perc-clave-01`         | Clave         | percussion | short 2.5 kHz tone                           |
| `perc-tambourine-01`    | Tambourine    | percussion | jingle bursts of high noise + metal          |
| `perc-triangle-01`      | Triangle      | percussion | inharmonic sines around 1.3 kHz              |
| `bass-sub-c-01`         | Sub C         | bass       | sine sub bass at C2 with soft harmonics      |
| `bass-sub-eb-01`        | Sub Eb        | bass       | sine sub bass at Eb2 with soft harmonics     |
| `bass-sub-g-01`         | Sub G         | bass       | sine sub bass at G2 with soft harmonics      |
| `bass-sub-bb-01`        | Sub Bb        | bass       | sine sub bass at Bb2 with soft harmonics     |
| `bass-saw-c-01`         | Synth Bass C  | bass       | detuned saws at C2, enveloped low-pass       |
| `bass-saw-eb-01`        | Synth Bass Eb | bass       | detuned saws at Eb2, enveloped low-pass      |
| `bass-saw-f-01`         | Synth Bass F  | bass       | detuned saws at F2, enveloped low-pass       |
| `bass-saw-g-01`         | Synth Bass G  | bass       | detuned saws at G2, enveloped low-pass       |
| `bass-saw-bb-01`        | Synth Bass Bb | bass       | detuned saws at Bb2, enveloped low-pass      |
| `bass-pluck-c-01`       | Pluck Bass C  | bass       | Karplus–Strong string at C2 (one octave up)  |
| `bass-pluck-eb-01`      | Pluck Bass Eb | bass       | Karplus–Strong string at Eb2 (one octave up) |
| `bass-pluck-g-01`       | Pluck Bass G  | bass       | Karplus–Strong string at G2 (one octave up)  |
| `bass-808-c-01`         | 808 Bass      | bass       | pitched sine boom at C1→C2 glide, saturated  |
| `piano-c4-01`           | Piano C4      | piano      | additive piano note C4                       |
| `piano-d4-01`           | Piano D4      | piano      | additive piano note D4                       |
| `piano-e4-01`           | Piano E4      | piano      | additive piano note E4                       |
| `piano-f4-01`           | Piano F4      | piano      | additive piano note F4                       |
| `piano-g4-01`           | Piano G4      | piano      | additive piano note G4                       |
| `piano-a4-01`           | Piano A4      | piano      | additive piano note A4                       |
| `piano-b4-01`           | Piano B4      | piano      | additive piano note B4                       |
| `piano-c5-01`           | Piano C5      | piano      | additive piano note C5                       |
| `piano-chord-c-01`      | C Chord       | piano      | piano triad C E G                            |
| `piano-chord-f-01`      | F Chord       | piano      | piano triad A C F                            |
| `piano-chord-g-01`      | G Chord       | piano      | piano triad B D G                            |
| `piano-chord-am-01`     | Am Chord      | piano      | piano triad A C E                            |
| `piano-rhodes-cmaj7-01` | Keys Cmaj7    | piano      | FM electric piano Cmaj7, warm low-pass       |
| `piano-rhodes-am7-01`   | Keys Am7      | piano      | FM electric piano Am7                        |
| `piano-rhodes-dm7-01`   | Keys Dm7      | piano      | FM electric piano Dm7                        |
| `piano-rhodes-g7-01`    | Keys G7       | piano      | FM electric piano G7                         |
| `synth-stab-cm-01`      | Stab Cm       | synth      | saw chord C Eb G, filter snap                |
| `synth-stab-fm-01`      | Stab Fm       | synth      | saw chord F Ab C, filter snap                |
| `synth-arp-c-01`        | Arp Cm        | synth      | four-step arpeggio C Eb G C                  |
| `synth-arp-g-01`        | Arp Gm        | synth      | four-step arpeggio G Bb D G                  |
| `synth-pad-cm-01`       | Pad Cm        | synth      | detuned saw pad C Eb G                       |
| `synth-pad-ab-01`       | Pad Ab        | synth      | detuned saw pad Ab C Eb                      |
| `synth-pad-bb-01`       | Pad Bb        | synth      | detuned saw pad Bb D F                       |
| `synth-pad-eb-01`       | Pad Eb        | synth      | detuned saw pad Eb G Bb                      |
| `synth-lead-c-01`       | Lead C        | synth      | square/saw lead C5 with delayed vibrato      |
| `synth-lead-g-01`       | Lead G        | synth      | square/saw lead G4 with delayed vibrato      |
| `beatbox-kick-01`       | B Kick        | beatbox    | lip pop + low thump                          |
| `beatbox-kick-02`       | Throat Kick   | beatbox    | voiced 70 Hz pulse, low-passed               |
| `beatbox-snare-01`      | Pf Snare      | beatbox    | plosive pop + band noise                     |
| `beatbox-snare-02`      | K Snare       | beatbox    | short click + narrow noise                   |
| `beatbox-hat-01`        | Ts Hat        | beatbox    | high-passed breath noise                     |
| `beatbox-hat-02`        | Tk Hat        | beatbox    | two quick clicks                             |
| `beatbox-hat-03`        | Tss Open      | beatbox    | long high-passed breath                      |
| `beatbox-click-01`      | Tongue Click  | beatbox    | very short 1.8 kHz pop                       |
| `beatbox-hum-01`        | Hum Bass      | beatbox    | hummed 'mm' at 82 Hz                         |
| `vocal-ah-01`           | Ah            | vocal      | formant vowel /a/ at 220 Hz                  |
| `vocal-oh-01`           | Oh            | vocal      | formant vowel /o/ at 196 Hz                  |
| `vocal-ooh-01`          | Ooh           | vocal      | formant vowel /u/ at 262 Hz                  |
| `vocal-hey-01`          | Hey!          | vocal      | breath onset then gliding /e/→/i/            |
| `ambient-vinyl-01`      | Vinyl Crackle | ambient    | sparse clicks over soft hiss                 |
| `ambient-rain-01`       | Rain          | ambient    | low-passed noise with droplets               |
| `ambient-wind-01`       | Wind Swell    | ambient    | noise through a slowly sweeping band-pass    |
| `ambient-drone-01`      | Drone         | ambient    | C/G saw drone, breathing filter              |
| `fx-riser-01`           | Riser         | fx         | noise + saw sweeping up over 1.2 s           |
| `fx-downer-01`          | Downer        | fx         | sine dropping 1.2 kHz→80 Hz                  |
| `fx-laser-01`           | Laser         | fx         | square zap 2 kHz→200 Hz                      |
| `fx-zap-01`             | Zap           | fx         | FM blip with noise burst                     |
| `fx-glitch-01`          | Glitch        | fx         | random 20 ms square fragments                |
| `fx-glitch-02`          | Stutter       | fx         | gated tone repeating and accelerating        |
| `fx-blip-01`            | Blip          | fx         | short 1.3 kHz tone with octave               |
| `fx-blip-02`            | Blip Up       | fx         | two-step blip 880→1760 Hz                    |
| `fx-crunch-01`          | Crunch        | fx         | bit-crushed kick + noise (4 bit)             |
| `fx-scratch-01`         | Scratch       | fx         | vowel sample read back and forth (turntable) |
| `fx-reverse-01`         | Reverse Swell | fx         | reversed C-minor saw chord, exponential rise |
| `fx-impact-01`          | Impact        | fx         | sub boom 60→30 Hz + low noise burst          |
| `fx-bubble-01`          | Bubbles       | fx         | three rising sine chirps                     |
| `fx-coin-01`            | Coin          | fx         | square B5 → E6 pickup                        |

All rows: source = FidgetBeatz procedural generator · author = FidgetBeatz project · license = CC0 1.0 · attribution not required · commercial use ✅ · redistribution ✅ · verified 2026-10-18.

</details>

### Pending review

| Candidate | Source | Issue |
| --------- | ------ | ----- |
| _none_    |        |       |

The researched sources in §2 (Kenney, Freesound CC0 files, CC0 itch.io packs) remain the approved way to add _recorded_ sounds later.

## 4. Adding a new sound

1. **Find** a candidate; confirm the license on the source page and in any bundled license file.
2. **Check** the rules in §1. If anything is unclear, add to _Pending review_ and stop.
3. **Download** the original; archive it with its license file and the date.
4. **Edit**: trim leading silence (≤ 5 ms before transient), trim tail, fade out 5–20 ms, convert to mono unless stereo matters, normalize, export 16-bit 44.1 kHz WAV.
5. **Name** `category-descriptor-nn.wav`; place in `public/sounds/<category>/`.
6. **Register** in `data/sounds/catalog.ts` (id, name, category, gain, playMode — the file path is derived from category + id) and `data/sounds/inventory.json` (full license record). For a synthesized sound, add a recipe to `scripts/generate-sounds.mjs` instead and re-run `npm run sounds:generate`, which rewrites the generated part of the inventory.
7. **Test**: `npm run test` (the catalog/inventory consistency test fails if a catalog entry has no inventory record or a file is missing).
8. **Listen** in the app next to sounds of the same category; adjust `gain`.

## 5. Attribution

If any CC BY asset is included, add an in-app **Credits** screen (or footer link) generated from the inventory, listing title, author, source link, and license. CC0 sounds are credited there as a courtesy.

## 6. Hosting terms (related, not audio)

The free Vercel Hobby tier is restricted to non-commercial personal use. Re-check the chosen host's terms before any monetization. See README → Deployment.
