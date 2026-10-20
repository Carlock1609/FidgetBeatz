# Profiles and Presets

> Status: **Implemented (Phase 1, 2026-10-18)** — `lib/storage/` (schema, defaults, `LocalProfileStore`) and `features/soundboard/board-reducer.ts`. Schema changes require a version bump and a migration (see §5).

## 1. Concepts

- **Sound** — an entry in the bundled catalog (`data/sounds`).
- **Pad** — one button on the board: which sound, label, color, position.
- **Preset** — an immutable, shipped board definition (e.g. "Lo-Fi"). Lives in code.
- **Profile** — one of up to five user-owned boards, saved in localStorage. A profile is _seeded from_ a preset and remembers which one, so it can be reset.

## 2. Types

```ts
type SoundId = string; // e.g. "kick-punchy-01"
type PadId = string; // stable within a profile (nanoid/crypto.randomUUID)
type PresetId = string; // e.g. "classic-drums"
type ProfileId = string;

type SoundCategory =
  | "kick"
  | "snare"
  | "hihat"
  | "percussion"
  | "bass"
  | "piano"
  | "synth"
  | "beatbox"
  | "vocal"
  | "ambient"
  | "fx";

interface Sound {
  id: SoundId;
  name: string;
  category: SoundCategory;
  file: string; // path under /sounds
  gain?: number; // 0–2, default 1
  playMode?: "poly" | "choke";
}

type PadColor = "magenta" | "orange" | "yellow" | "lime" | "cyan" | "blue" | "violet" | "pink";

interface Pad {
  id: PadId;
  soundId: SoundId | null; // null = empty pad
  label: string; // ≤ 16 chars, defaults to sound name
  color: PadColor; // defaults from sound category
}

interface PresetDefinition {
  id: PresetId;
  name: string;
  description: string;
  columns: { base: number; md?: number; lg?: number }; // responsive grid hint
  accent: PadColor; // theme accent for the preset
  pads: Omit<Pad, "id">[]; // order = grid order; ids generated on seed
}

interface Profile {
  id: ProfileId;
  name: string; // ≤ 24 chars
  basePresetId: PresetId; // for "Reset to preset"
  columns: PresetDefinition["columns"];
  pads: Pad[]; // 1–24 pads; array order = layout order
  updatedAt: string; // ISO timestamp
}

interface StoredState {
  version: 1;
  activeProfileId: ProfileId;
  profiles: Profile[]; // 1–5
  settings: { masterVolume: number; focusMode: boolean; focusLevelLine: boolean };
}
```

Layout is the **array order** of `pads` rendered into a CSS grid. No x/y coordinates in Phase 1 — simpler to validate and reorder.

## 3. Limits

| Limit          | Value      | Reason                                             |
| -------------- | ---------- | -------------------------------------------------- |
| Profiles       | 1–5        | Spec                                               |
| Pads per board | 1–24       | Touch targets stay ≥ 64 px on a phone at 4 columns |
| Profile name   | 1–24 chars | Fits the switcher                                  |
| Pad label      | 0–16 chars | Fits a pad                                         |

## 4. Presets (initial set)

| Id              | Name          | Pads | Columns (base/md) | Character                                              |
| --------------- | ------------- | ---- | ----------------- | ------------------------------------------------------ |
| `classic-drums` | Classic Drums | 12   | 3/4               | Acoustic kit: kick, snare, hats, toms, crash, ride     |
| `hip-hop`       | Hip-Hop       | 12   | 3/4               | Boom-bap kicks/snares, 808, vinyl hats, scratch        |
| `electronic`    | Electronic    | 16   | 4/4               | 909-style kit, claps, risers, stabs                    |
| `lo-fi`         | Lo-Fi         | 12   | 3/4               | Soft kicks, dusty snares, Rhodes chords, vinyl crackle |
| `synthwave`     | Synthwave     | 16   | 4/4               | Gated snare, analog bass, arps, pads                   |
| `piano`         | Piano         | 12   | 3/4               | One octave C–B (+ optional chord pads)                 |
| `bass`          | Bass          | 12   | 3/4               | Sub / synth / plucked bass notes in one key            |
| `beatbox`       | Beatbox       | 9    | 3/3               | Vocal kicks, snares, hats, clicks                      |
| `percussion`    | Percussion    | 12   | 3/4               | Congas, bongos, shakers, cowbell, woodblock            |
| `experimental`  | Experimental  | 16   | 4/4               | Glitches, digital blips, textures (Kenney-heavy)       |

Exact sound assignments live in `data/presets/<id>.ts`. Musical presets stay in one key so any combination sounds good: Piano and Lo-Fi in **C major**, Bass, Synthwave and Electronic in **C minor**. Accents: Classic Drums orange, Hip-Hop yellow, Electronic cyan, Lo-Fi violet, Synthwave pink, Piano violet, Bass blue, Beatbox pink, Percussion lime, Experimental cyan. Electronic and Synthwave use 4 columns on phones too (16 pads).

### Adding a preset

1. Add `data/presets/<id>.ts` exporting a `PresetDefinition`.
2. Register it in `data/presets/index.ts` (the ordered list shown in the picker).
3. Run tests — the preset integrity test checks unique id, valid sound ids, pad limits.
4. Document it in the table above.

## 5. Storage

- **Key:** `fidgetbeatz:v1` (single JSON blob — atomic save, easy to migrate).
- **Read:** once, on client mount. Parse → `migrate()` → Zod `StoredStateSchema.safeParse()`.
- **Write:** on Save in Edit Mode, profile rename/switch/create/delete, and volume change (debounced ~300 ms). Writes are wrapped in try/catch.

### Validation and recovery

| Situation                              | Behavior                                                                                                   |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| No key                                 | Seed defaults (§6)                                                                                         |
| Invalid JSON                           | Back up raw value to `fidgetbeatz:backup:<timestamp>`, seed defaults, show a toast                         |
| Older `version`                        | Run migrations step by step (`migrations[1→2]`, …) then validate                                           |
| Newer `version` than app               | Don't overwrite; run on in-memory defaults and warn (user may have opened an older build)                  |
| Partially invalid                      | Salvage valid profiles; drop invalid pads/profiles; if `activeProfileId` dangles, select the first profile |
| Unknown `soundId` on a pad             | Keep the pad, mark it "missing sound" in the UI                                                            |
| `setItem` throws (quota, private mode) | Keep working in memory; show "Changes can't be saved in this browser" once                                 |

Never overwrite stored data that failed to parse without backing it up first.

localStorage is a convenience store, not a secure database: no secrets, nothing sensitive.

### Storage interface (for future cloud sync)

```ts
interface ProfileStore {
  load(): StoredState; // never throws; returns defaults on failure
  save(state: StoredState): void; // never throws; reports failure via callback/event
}
```

`LocalProfileStore` is the only Phase 1 implementation.

## 6. Default profiles

First run creates **three** profiles so users discover variety without clutter: _My Drums_ (`classic-drums`), _My Lo-Fi_ (`lo-fi`), _My Synthwave_ (`synthwave`). Users can create up to two more (each seeded from a chosen preset).

## 7. User operations

| Operation                | Behavior                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------- |
| Switch profile           | Instant; preloads that board's sounds; animates the grid                              |
| Load preset into profile | Confirm if the profile has unsaved/custom changes; replaces pads, sets `basePresetId` |
| Reset to preset          | Confirm; restores pads from `basePresetId`                                            |
| Create profile           | Disabled at 5; asks for name + starting preset                                        |
| Rename profile           | Inline dialog; validates length; trims whitespace                                     |
| Delete profile           | Confirm; disabled when only one remains                                               |
| Edit Mode → Save         | Draft becomes the profile; persisted                                                  |
| Edit Mode → Cancel       | Draft discarded (confirm if there are changes)                                        |

## 8. Implementation notes (2026-10-18)

- **Writes** are debounced 300 ms and flushed immediately on `pagehide` or when the tab is hidden. Only `profiles`, `activeProfileId` and `settings` trigger a save. The edit draft is never persisted.
- **Salvage** keeps every profile that validates after dropping invalid pads, and trims over-long pad labels instead of dropping the pad. Duplicate profile ids are dropped, settings fall back to the defaults, and a dangling `activeProfileId` selects the first profile. Any salvage or reset backs up the raw value to `fidgetbeatz:backup:<timestamp>` first.
- **Newer version** data puts the store in read-only mode (`writable: false`). The app runs on in-memory defaults and never overwrites the stored blob.
- **Notices** (`recovered`, `newer-version`, `storage-unavailable`, `save-failed`) show once as a dismissible banner. It auto-hides after 9 s.
- **Assigning a sound** replaces the pad label only if the label was empty or equal to the previous sound's name, so custom labels survive. The color follows the new sound's category; users can then recolor.
- **"Customized"** means the profile's pads (sound, label, color, order) differ from its base preset. That drives the Reset chip and the confirm dialog when loading a different preset.
- **Large boards:** boards with more than 16 pads use at least 4 columns on phones, so pads stay at least 64 px tall.
- **Tests:** `lib/storage/profile-store.test.ts` (10 tests), `features/soundboard/board-reducer.test.ts` (14 tests), and the preset integrity tests in `data/sounds/catalog.test.ts`.
