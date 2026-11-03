# Studio concept archive

These are saved design references for Figma and future implementation chats. They are not application components and are not served by the FidgetBeatz app.

## Files

- [studio-views.html](studio-views.html): standalone browser preview of the original concept, including its rendering wrapper and design-variant navigation. Open in a browser; it does not require the app development server. Styling/icon assets may need internet access.
- [studio-views.fragment.html](studio-views.fragment.html): original editable HTML/CSS/JavaScript fragment preserved from the conversation concept. It relies on the visualization host or a rendering wrapper; do not open it expecting the same complete preview.

Saved on 2026-11-02 from the concept the owner reviewed. The preview offers Record and Layers variants, Expand layer timeline / Return to pads navigation, a selected layer with a single hit at 0:16, pad-press feedback and simulated transport. The owner approved the navigation concept, not every layout dimension or simplified behavior.

## What the concept does not establish

- No audio playback, real recording, sample scheduling, WAV export, recovery or editable project persistence.
- Record/pad interactions only change illustrative markers. Layer state, event identities and transport are deliberately simplified. Do not copy them as a production audio/data model.
- No single-hit selection/deletion/retiming editor. Those were discussed after this snapshot; they belong in the next Figma design iteration.
- No measured mobile performance, validated 30/60-layer recording capacity, complete keyboard/screen-reader workflow or physical fullscreen behavior.
- Host design controls/state support may be unavailable outside the conversation. Only limited preview state is retained by the wrapper; this is not project saving.

The archived source is intentionally preserved, rather than expanded into a new Studio implementation. New design concepts should use separate versioned files so the reviewed reference remains recognizable.

## Figma handoff

1. Read [Studio discovery](../../../studio.md) and [the Figma brief](../../../studio-figma-brief.md). They supersede omissions or older assumptions in this preview.
2. Preserve one project with Pads focused on one selected layer and an expanded timeline overview of all layers. Selection/navigation is non-destructive.
3. Explore a focused per-layer hit editor: select/delete a bad hit, retime it via drag or precise alternatives, undo, and safely clear a layer. Keep Add hits and Replace take explicit.
4. Keep black/white/neutral chrome, color primarily on user-colorable pads, and reachable recording controls in focus mode.
5. Produce mobile portrait/landscape and desktop frames, dense/sparse hit examples, 30/60-layer stress layouts and a clickable Figma prototype. Resolve open behavior with the owner before implementation.

## Validation of this archive

Source copied byte-for-byte from the reviewed conversation fragment. Standalone wrapper generated for browser viewing. Opening the preview, switching into Layers and returning to Pads were checked in Chromium; the original conversation concept had also been checked for pressed-pad feedback and document overflow at 320 px. These are visual-reference checks, not product/device or audio tests.
