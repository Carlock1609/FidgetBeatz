# Studio discovery

Status: scope agreed in conversation on 2026-11-02; not implemented. Behavior and mobile layout still need discovery before coding. The addendum and this discovery document override the older bar-based loop proposal in ADR 0007.

## Accepted direction

- Dedicated mobile-first Studio page for loops of any positive duration up to 60 seconds, including short 5- or 10-second loops. Zero is the timeline origin, not a playable duration.
- Pads plus a timeline showing recorded hit markers, elapsed time and a moving red playhead.
- Hear existing layers while recording another; switch presets between takes without changing recorded sounds.
- Up to 30 layers with mute, volume, delete and re-record; playback and WAV download.
- Tempo/count-in and optional snap; exact controls need design.
- Automatic local recovery of editable projects, with no account or server storage required.
- Record sound-trigger events and layer settings, then render the mix locally for export; a WAV is finished audio, not an editable project.
- Defer individual-note editing, clip trimming and advanced arrangement tools.

## Recording and loop behavior

- All layers share one project duration and timeline. The red playhead wraps to zero at the project end.
- Users can set a duration before recording, or let Stop on the first take establish it. Recording stops automatically at 60 seconds when no shorter duration was chosen.
- Once established, project duration stays fixed while adding layers. Stopping a later take ends capture without shortening the project or other layers.
- Layers contain only the hits actually recorded; silence needs no events. A 30-second drumline and a second layer with just one hit at second 16 are valid together. That hit occurs once each time the 30-second project repeats.
- Existing layers play during a new take. For the first version, capture one pass and stop capture at the project boundary; ongoing playback can loop without repeatedly recording extra hits. Distinguish take completion from stopping playback in the eventual UI.
- A short layer does not independently repeat within the project; independent layer lengths and repeat regions are deferred.
- Target 30 layers, including sparse accent/effect layers. Validate dense playback, local recovery and export on real phones before shipping. Layer count is separate from simultaneous audio voices; the existing engine's voice cap must be reviewed against realistic mixes.

## Expandable limits and layout

The initial 30-layer and 60-second limits are release defaults, not permanent architectural constraints.

- Define limits in a shared configuration rather than scattering fixed values through UI, validation, recording, recovery and export code. Derive labels, controls and boundary behavior from that configuration.
- Model project duration and layer collections independently of the initial caps. Version stored projects and preserve existing recovery data when limits change; report unsupported projects rather than silently truncating layers or events.
- Design the layer list to accommodate at least 60 layers through scrolling and, if measurements justify it, virtualization. Do not rely on showing every layer at once or on a fixed number of rows. Keep recording and transport controls reachable as the list grows.
- Design the timeline for longer future songs with scalable time labels and a path to horizontal scrolling/zoom. Current limits must not be baked into its width, marker placement or playhead calculations. The initial UI may remain simpler while the data and coordinate model support expansion.
- Treat duration, layer count, event count and simultaneous voices as separate constraints. Raising one must not implicitly change the others.
- Before increasing shipped limits, validate scheduling, playback, recovery storage and export memory/time on real phones. Configurability does not guarantee that every device can support arbitrary limits.
- During Figma exploration, include a 60-layer stress layout and a longer-song timeline example to demonstrate that the design can expand. These are design checks, not an increase to the first-release limits.

## Decisions still open

1. Define duration-input precision/minimum, whether established duration can be changed in the first release, and playhead positioning for recording a late accent.
2. Pads ↔ expanded timeline navigation is agreed. Resolve exact mobile proportions, expansion treatment and landscape layout in Figma.
3. Define local recovery limits, clearing a project, navigation warnings and recovery failure behavior.
4. Define end-of-song audio tails, export volume and clipping, and interrupted/background recording behavior.
5. Define minimum controls for the first release and verify recording/export performance on real phones.

## Visual direction and layout exploration — 2026-11-02

Requested direction: mostly black, white and neutral grays. Keep expressive color primarily on individual pads, with user-selectable pad colors (existing color choices remain a baseline; arbitrary color input is not yet a requirement). Exact tokens, contrasts and hit states will be agreed in Figma before implementation. Avoid preset-wide colored background glows in the proposed redesign. Small functional recording/playhead color is an exploration question, not a final token decision.

The supplied Ableton Note screenshot is inspiration for a compact event strip immediately above playable pads and visible hit feedback. It does not establish a complete multilayer layout and should not be copied wholesale.

Accepted navigation, with remaining presentation details for Figma review:

- One Studio workspace with two complementary views: Pads (focused on one selected layer) and Layers (expanded timeline of all layers). Use explicit “Expand layer timeline” and “Return to pads” actions. Switching views alone preserves the project, playhead and playback; selection is distinct from arming a recording.
- In Layers, selecting a row sets the layer that Pads will focus on when the user chooses “Return to pads”. Show its name and existing hits clearly. Selecting or navigating never erases events, records hits or replaces a take.
- Returning to Pads is the entry point for working on that layer. Supported initial controls remain mute, volume, delete and re-record. Whether recording an existing layer adds hits (overdub), replaces the take, or offers both is still an explicit product decision. Existing individual-hit movement/deletion and clip editing remain deferred.
- Record view dedicates a compact top region to Play/Stop/Record, elapsed/project time, selected/armed layer and its event overview. Pads retain most of the remaining space.
- A clearly labeled Layers/Expand action opens an expanded timeline view with aligned layer rows and one shared time ruler/playhead. Avoid a dropdown menu for inspecting 30–60 temporal rows. Compare an expanding panel against a full-height view in Figma before deciding.
- Use discrete hit markers at actual trigger times rather than a filled 60-second block or fabricated waveform. A layer with one hit at second 16 stays mostly empty; show the hit position and a readable summary such as “1 hit · 0:16”. Sound tails may outlast a trigger; any tail rendering must be visually distinct and based on actual audio duration.
- Selecting a layer reveals its pad/sound hit breakdown or inspector without expanding every layer at once. A layer can contain multiple pads; layer rows are not inherently one instrument or one color.
- Keep layer mute, volume, delete and re-record discoverable; distinguish selected, muted, playing and armed/recording states with labels/icons as well as color.
- Compare Studio focus mode (hide editing chrome but retain transport, timing, armed layer and exit) with the existing pad-only soundboard focus mode. Do not silently redefine the current mode; test the two contexts explicitly.
- Stress-test 30/60-layer scrolling, sparse events and dense event clusters; portrait and landscape must keep controls reachable and pad targets usable.

See [studio-figma-brief.md](studio-figma-brief.md) for the ready-to-use design prompt. These notes are design discovery only; the production UI is unchanged.

## Design preparation

Collect mobile music-making references and current Figma designs. A future Figma prompt should cover idle, count-in, recording, playback, layer management, recovery and export states, including portrait and landscape layouts. Do not build additional pages until the core recording model and layout are agreed.

## Next phases

Phase 3: accounts, richer user profiles, editable cloud-saved songs, community publishing, voting and highlights. Existing browser-local soundboard profiles are separate from user accounts. Phase 4 adds custom microphone-recorded/imported sounds that can be stored and reused in pads and Studio. Local versus cloud storage and editing details remain open. Guided play stays on hold and must follow custom sounds.
