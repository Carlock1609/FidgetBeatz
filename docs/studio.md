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
2. Mobile layout: how do users reach pads, timeline and layer controls without crowding the screen? Compare references before selecting a layout; tabs, sheets and collapsible areas are candidates, not decisions.
3. Define local recovery limits, clearing a project, navigation warnings and recovery failure behavior.
4. Define end-of-song audio tails, export volume and clipping, and interrupted/background recording behavior.
5. Define minimum controls for the first release and verify recording/export performance on real phones.

## Design preparation

Collect mobile music-making references and current Figma designs. A future Figma prompt should cover idle, count-in, recording, playback, layer management, recovery and export states, including portrait and landscape layouts. Do not build additional pages until the core recording model and layout are agreed.

## Next phases

Phase 3: accounts, richer user profiles, editable cloud-saved songs, community publishing, voting and highlights. Existing browser-local soundboard profiles are separate from user accounts. Guided play is on hold.
