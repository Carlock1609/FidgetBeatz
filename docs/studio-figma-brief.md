# Studio Figma brief

Status: design exploration, not implementation approval. Prepared 2026-11-02. Use alongside [Studio discovery](studio.md).

## Paste into Figma

Design mobile-first interface concepts for FidgetBeatz, a playful tap-to-play soundboard adding a loop-recording Studio. Produce design frames and a clickable prototype; do not implement the app or generate a production codebase.

Visual direction: primarily black, white and neutral grays. Reserve expressive colors mainly for individual sound pads, with user-selectable colors. Avoid preset-wide colored glows, rainbow toolbars, glass effects and dense professional mixing-console chrome. Show clear resting, pressed, selected and unavailable pad states. Recording status/playhead may use a restrained functional red accent as an option; also show a neutral playhead alternative. Use labels/icons so state never relies only on color. Revisit the existing green LCD treatment as part of the monochrome exploration, rather than assuming it must stay green.

The supplied Ableton Note screenshot is a reference for a thin event strip above a large pad grid and visible pad-hit feedback. Keep FidgetBeatz's identity; do not copy Ableton's entire screen or add its effect knobs. Those knobs are outside our initial scope.

Design one persistent Studio workspace with two complementary views:

1. Record: compact top transport with Play/Stop/Record, elapsed/project time, selected/armed layer and a readable event strip; large pads below. Include an obvious Layers/Expand action. Compare a selected-layer strip with a small stacked overview, without squeezing 30 rows above the pads.
2. Layers: expanded timeline with one shared time ruler and playhead across layer rows. Layer names/controls remain readable while scrolling. Selecting a row offers its pad-event breakdown and mute, volume, delete/re-record actions. Include a prominent return to pads. Compare a full-height view against an expanding panel; explain the space tradeoff through the frames.
3. Recording focus: reduce nonessential chrome and maximize pads while retaining Stop/Record, elapsed time, armed-layer state and exit. Keep existing soundboard pad-only focus as a separate context; show the distinction.

All layers share a project loop longer than zero and up to 60 seconds initially. Users can set a duration before recording, or Stop on the first take establishes it. Later takes may stop early without changing project duration. Existing layers play during a new take. Show separate selected and armed states if those differ; entering Layers or selecting a row must not accidentally arm or replace a recording. Define or annotate whether arming while recording is disabled.

Use discrete hit markers at true timestamps, not fabricated audio waveforms or a solid region that makes silence appear occupied. A layer may contain hits from multiple pads. Show a 60-second project with a busy drum layer, an Accent layer containing only one rim hit at 0:16, and a later bass phrase. The Accent row is mostly empty with one readable marker and a summary “1 hit · 0:16”. At the corresponding playhead moment, the relevant pad flashes. Show an optional selected-layer expansion into per-pad lanes, with no drag-to-edit promise in this release. If audio tails are represented, distinguish them from trigger markers.

The initial limits are 30 layers and 60 seconds, configurable for expansion. Include a 30-layer normal case, a 60-layer stress case and a longer-song example to prove navigation/scale can expand. Do not show 60 tiny rows at once. Use scrolling and discoverable layer selection. Keep transport reachable; distinguish vertical layer scrolling from horizontal timeline navigation. Timeline zoom/scroll controls are a design exploration, not finalized first-release features.

Create portrait phone frames around 390 × 844, landscape phone frames around 844 × 390, and desktop adaptations. Maintain at least 44 px action targets, usable pads (target 64 px minimum), safe areas, readable labels and accessible focus/contrast. Minimize icon-only controls and hidden gestures. Test whether a sparse hit can still be discovered when the full minute fits on a small screen; include a visible hit-position summary or a way to inspect it.

Show these states: empty project, first take with unknown final duration, chosen-duration count-in, recording another layer, playback, stopped at 0:16, sparse-layer selected, muted layer, re-record confirmation, local draft recovery, download progress/error and recording interrupted by backgrounding. Local recovery and WAV download require no account. Show the record/stop boundary behavior distinctly from playback looping. A future phase adds microphone-recorded/imported custom sounds; do not add that workflow or community/accounts UI to this initial Studio prototype.

Deliver reusable components/tokens, named interaction states, and two layout alternatives with concise tradeoffs. Identify unresolved behavior rather than inventing decisions. We will choose and refine the design together before implementation.

## Questions to resolve during review

- Selected-layer strip versus small multilayer overview while playing pads?
- Full-height Layers view versus expanding panel on phone; what changes in landscape?
- Functional red playhead/record state versus a fully neutral chrome treatment?
- How can users inspect or record a hit late in a long loop without waiting through the whole loop? Seeking and recording-start rules still need agreement.
- What happens to in-progress recording when switching views, leaving Studio or backgrounding?
- Does the first release allow changing an established project duration, and how does it handle existing events and tails?
