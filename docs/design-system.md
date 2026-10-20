# Design System

> **Source of truth: the published Figma file** (see [figma-handoff.md](figma-handoff.md)). The values below are the **A + C Hybrid baseline**. When the Figma variables are extracted, replace these values and note the date.
>
> **Implemented (2026-10-18)** from this baseline: tokens live in `app/globals.css` (`:root` variables → Tailwind `@theme`), and pad states are CSS driven by data attributes (`data-hit`, `data-selected`, `data-dragging`, `data-missing`, `data-color`). No Figma values have been applied yet.

## 1. Direction

FidgetBeatz is a **glowing instrument in a dark room**. The pads are the hero; everything else stays quiet.

- **From A (Neon Stage):** a dark stage, matte color-coded pads that light up and bloom on hit, and one accent per preset tinting the background.
- **From C (Rubber Keypad):** a recessed green **LCD sound display** with a segmented level meter.
- **Color-coded pads:** every sound category has its own color, so the board reads at a glance.
- **Alternative:** a "Dark & Edgy" skin (harder edges, harsher neon, grain/scanlines) may replace the hybrid if the Figma file uses it. Layout, components and behavior are unchanged.

## 2. Tokens (baseline)

| Token                                      | Value                                | Use                                          |
| ------------------------------------------ | ------------------------------------ | -------------------------------------------- |
| `--bg`                                     | `#0B0B12`                            | Stage                                        |
| `--surface-1` / `--surface-2`              | `#151522` / `#1E1E2E`                | Toolbars, sheets / inputs, cards             |
| `--border`                                 | `#2A2A3D`                            | Hairlines                                    |
| `--text` / `--text-muted`                  | `#F4F4F8` / `#9A9AB3`                | Text                                         |
| `--accent`                                 | per preset (Classic Drums `#FF8A1F`) | Active chip, Save, wordmark, background glow |
| `--lcd-bg` / `--lcd-border` / `--lcd-text` | `#0F1411` / `#1E2A22` / `#9CFFB0`    | Sound display                                |
| `--focus`                                  | `#FFFFFF`                            | 2 px focus ring, 2 px offset                 |

### Pad colors (by category)

| Category        | Name    | Hex       |
| --------------- | ------- | --------- |
| Kick            | orange  | `#FF8A1F` |
| Snare           | magenta | `#FF3DCB` |
| Hi-hat          | yellow  | `#FFD60A` |
| Percussion      | lime    | `#9BFF3D` |
| Bass            | blue    | `#4D7CFF` |
| Keys            | violet  | `#A259FF` |
| Synth / FX      | cyan    | `#2EE6FF` |
| Vocal / Beatbox | pink    | `#FF6B8B` |

### Shape, space, type

| Token                           | Value                                                                                                             |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Pad radius                      | 22 px (phone) / 24 px (≥ md)                                                                                      |
| Control radius / display radius | 12 px / 16 px                                                                                                     |
| Grid gap / side padding         | 10 px / 16 px (phone); 14 px / 24 px (≥ md)                                                                       |
| Min pad / min touch target      | 64 px / 44 px                                                                                                     |
| Fonts                           | Sora 400/600/800 (UI) · JetBrains Mono 500 (captions, footer) · IBM Plex Mono 500 (LCD only), all via `next/font` |

## 3. Layout (phone portrait, 390 × 844)

| Zone          | Height   | Contents                                                            |
| ------------- | -------- | ------------------------------------------------------------------- |
| Top bar       | ~62 px   | Logo mark + wordmark · Focus toggle · Edit                          |
| Profile row   | 44 px    | Profile switcher · volume                                           |
| Sound display | ~92 px   | Preset + `PAD nn/nn` · last sound + category dot · 24-segment meter |
| Preset chips  | 36 px    | Horizontal scroll; active = accent fill                             |
| Pad grid      | flexible | 3 cols (12 pads) / 4 cols (16 pads)                                 |
| Footer        | ~40 px   | ● visitors now · page visits · version chip                         |

**Focus mode:** only the pad grid, edge to edge (safe areas respected), with a ghosted exit button bottom-right (44 px, 40% opacity, 100% on touch/hover).

**Landscape / tablet / desktop:** the grid is centered with a max width of 720–960 px; on landscape phones the toolbar becomes a side rail. Desktop shows keyboard hints (1–9, Q–P).

## 4. Pad states

| State                | Visual                                                                     |
| -------------------- | -------------------------------------------------------------------------- |
| Rest                 | Color 15% over `#12121C`, border 38%, label in pad color, soft drop shadow |
| Hover (fine pointer) | Slightly brighter face                                                     |
| Focus-visible        | 2 px white ring                                                            |
| Hit                  | Full color fill, dark label, white LED, 36 px glow, scale 0.96             |
| Selected (edit)      | Dashed 2 px white outline, lifted 3 px                                     |
| Dragging             | Scale 1.05, deep shadow                                                    |
| Missing sound        | Desaturated, striped overlay, warning icon, "Missing sound"                |
| Empty                | Dashed border, + icon                                                      |

The hit flash is driven by a ref and CSS (data attribute), **not** React state.

## 5. Sound display (LCD)

- Line 1 (10 px, 70% opacity): preset name · `PAD 05/12`.
- Line 2: last sound in caps at 24 px · category dot (pad color) + category name.
- Line 3: 24 segments, 8 px tall, 3 px gap; lit at 95% opacity, unlit at 14%.
- On hit, the meter jumps to 18–24 segments, falls to ~9 by 140 ms and ~2 by 320 ms. Drive it with CSS or a rAF loop, off the audio path.
- Idle: `TAP A PAD` · `READY`. Hidden in Edit mode.

## 6. Footer

- Visitors now: green glowing dot + `12 jamming now`.
- Page visits: `1,284 visits`, compact above 10K (`12.4K`).
- Version: an outlined pill `v0.1.0` that opens the version sheet.
- Offline: grey dot, `— jamming now`, `— visits`.

## 7. Motion

| Interaction           | Timing                                                      |
| --------------------- | ----------------------------------------------------------- |
| Pad hit               | ~50 ms on, ~300 ms fade                                     |
| Preset/profile switch | 250–350 ms with a light stagger                             |
| Edit mode enter/exit  | 200 ms                                                      |
| Focus mode enter/exit | 200 ms (fade chrome out, grid expands via layout animation) |
| Sheets/dialogs        | ~150 ms                                                     |

**Reduced motion:** no scale, stagger or slide; keep a brief brightness flash on hit and the meter (functional feedback).

## 8. Don'ts

- No default shadcn look or default fonts.
- No constant pulsing or looping animation.
- No heavy blur on many surfaces (it's expensive on phones).
- Never rely on color alone: pads always have labels.
