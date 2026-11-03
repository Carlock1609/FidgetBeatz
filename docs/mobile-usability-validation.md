# Mobile usability and accessibility validation

## Automated results — 2026-11-02

- Added portrait (393 × 852) and landscape (852 × 393) regression checks to the existing phone WebKit/Chromium projects.
- Four new phone checks passed; two desktop cases skipped intentionally. Checks cover 12-pad Classic Drums and 16-pad Electronic, complete pad visibility, minimum 64 px pad dimensions, no horizontal document overflow, focus-mode exit, Edit Save/Cancel visibility and opening/closing the pad editor.
- Tested against the default Turbopack static export produced with the shared PostCSS pipeline in the separate release-readiness branch (PR #14). Application components are unchanged from main.
- Existing full-suite results on that pipeline: 69 passed, 12 platform-specific skips, including axe, keyboard focus/movement and reduced motion. Earlier failures from the unstyled Webpack diagnostic export were build artifacts, not confirmed app defects.
- These checks do not establish physical safe-area behavior, actual orientation changes, screen-reader usability or OS-level reduced-motion behavior.

## Manual iPhone 17 Pro Max pass — owner-reported pass, 2026-11-02

In Safari at https://fidgetbeatz.com, the owner responded “All looks good” to the requested orientation/editor/focus pass and separately to the VoiceOver/Reduce Motion request. Recorded as an overall reported pass, without detailed observations or an iOS version. These are owner checks, not agent-operated physical-device tests.

- [x] Rotate portrait ↔ landscape; all pads and controls remain reachable, including around the Dynamic Island/safe areas.
- [x] Open Edit, select a pad, scroll the picker, close it, Save/Cancel. No controls become inaccessible.
- [x] Enter/exit focus mode in both orientations.
- [x] Enable VoiceOver: navigate pads, open/close the editor and profile menu; names make sense and focus returns to the control used.
- [x] Enable Settings → Accessibility → Motion → Reduce Motion, reload and confirm pad flashes remain usable without scale/lift.

Physical Android/TalkBack testing remains pending. Automated axe checks are not a replacement for the manual screen-reader pass.

No product colors or Studio designs are changed in this task. Those remain a separate Figma/design discussion.
