# FidgetBeatz — Complete Product and Technical Specification

## 1. Project Overview

I want to build **FidgetBeatz**, a mobile-first, interactive beat-making application that allows users to create beats by tapping customizable sound buttons.

The concept is simple:

**When you fidget, make a beat.**

The application should feel like a musical playground rather than a traditional digital audio workstation. Users should be able to open the app, tap a few buttons, experiment with sounds, and start making beats immediately without needing musical experience.

The initial release should focus on a polished, responsive soundboard with customizable buttons, sound assignments, presets, and locally saved profiles.

The long-term vision is to evolve FidgetBeatz into a more interactive musical experience with recording capabilities, guided songs, and rhythm-game mechanics.

### Primary Goals

- Build a beautiful, modern, mobile-first experience.
- Make sound playback feel immediate and responsive.
- Allow users to customize their soundboard without unnecessary complexity.
- Provide multiple predefined soundboard layouts for different musical styles.
- Persist user preferences without requiring accounts or authentication.
- Keep development, API usage, hosting, and asset costs as close to zero as reasonably possible.
- Establish a clean, documented, maintainable technical foundation.
- Make future features possible without implementing them prematurely.

## 2. Development Approach

I will use Claude Code to implement the application.

Treat this document as the initial product and architecture specification. Before implementing anything, inspect the existing repository, understand its current state, and determine whether it already contains code, dependencies, design decisions, or configuration worth preserving.

If the repository is empty, establish the project from scratch.

If a project already exists, do not unnecessarily overwrite working code or recreate existing infrastructure.

Before implementation:

1. Review the requirements and identify any important technical decisions.
2. Research suitable, low-cost audio sources and verify their licenses and API terms.
3. Establish the initial application architecture and design direction.
4. Create the project documentation and development standards.
5. Implement the application incrementally, validating functionality as you go.

Do not stop after creating documentation, a plan, or a scaffold. The goal is to build the actual working application as well as its supporting technical documentation.

Use good judgment when making routine implementation decisions. Ask for clarification only when a genuinely important requirement cannot reasonably be determined.

# 3. Technology Stack

The application should be frontend-first, with an emphasis on modern React practices, beautiful UI, responsive interactions, maintainable code, and low operating costs.

### Core stack

- **React:** Component-driven UI development.
- **Next.js:** App Router, routing, layouts, and server-side capabilities when needed.
- **TypeScript:** Strict typing throughout the application.
- **Node.js:** Server-side runtime for Next.js API functionality when necessary.
- **Tailwind CSS:** Responsive styling and design-system implementation.
- **shadcn/ui:** Accessible, customizable UI primitives.
- **Motion for React:** Animations, transitions, and layout interactions.
- **Lucide React:** Consistent iconography.
- **Web Audio API:** Browser-native audio playback and sound scheduling.
- **Vitest:** Unit and integration testing.
- **React Testing Library:** Component behavior testing.
- **Playwright:** End-to-end testing of important user flows.
- **ESLint and Prettier:** Code quality and consistent formatting.

Use current stable, mutually compatible versions of these technologies when setting up the project. Avoid unnecessary dependencies.

### CSS and design framework

I want you to make the UI framework decisions based on modern design expectations rather than simply choosing the most familiar option.

My preference is Tailwind CSS with shadcn/ui and Motion for React because they provide a flexible foundation for highly customized interfaces, polished animations, and responsive interactions.

Do not make the application look like a generic shadcn/ui template. Treat the design system as a custom product experience.

Use CSS transitions and animations for simple interactions, and Motion for React for more advanced animations, sequencing, drag interactions, and layout transitions.

Do not introduce a heavy UI framework if it limits the desired aesthetic or adds unnecessary complexity.

# 4. Cost Optimization and Audio Asset Strategy

Keeping costs low is a core technical requirement.

I do not want to introduce paid APIs, subscriptions, database services, or unnecessary backend infrastructure when free alternatives can achieve the same result.

Before selecting an external service, library, or API, evaluate its cost, limitations, licensing, commercial terms, reliability, and whether it is actually necessary.

Document the selected approach and any relevant limitations.

## 4.1 Preferred audio architecture

The recommended approach is to use a curated collection of downloadable, properly licensed audio assets stored within the application.

Use the browser's built-in Web Audio API to play those sounds.

This means the core experience does not need to make a network request to a sound provider every time a user presses a button.

Benefits include:

- No per-play API charges.
- No dependency on a third-party service during playback.
- Lower playback latency.
- More predictable behavior.
- Fewer API rate-limit concerns.
- Easier testing and debugging.
- Greater control over the sounds included in the application.

For Phase 1, prioritize free audio assets that can legally be bundled and redistributed with the application.

### Potential audio sources

Research these options and choose the best combination for the initial release.

**Kenney Audio Assets**

Website: https://kenney.nl/assets

Kenney offers free audio asset packs under CC0 licensing, including interface sounds and other sound effects. Review individual asset-pack details and included license files before using them.

**Freesound**

Website: https://freesound.org/

Freesound offers a broad collection of community-uploaded sounds. However, individual recordings may have different licenses and attribution requirements.

The Freesound API has separate terms governing API usage, including restrictions on commercial use. Do not assume that the API can be used commercially for free.

Use Freesound as an optional source for discovering sounds or obtaining individually licensed assets. If appropriate, download and curate specific assets rather than making live API calls during normal soundboard use.

**Other sources**

Research additional reputable sources offering free, downloadable, redistributable drum hits, bass sounds, percussion, piano samples, synthesizer sounds, and other musical assets.

Prioritize CC0 or similarly permissive licenses where possible.

Do not use sounds simply because they can be streamed or previewed publicly. Verify that the intended use, redistribution, and commercial use are permitted.

## 4.2 Audio API requirements

A paid audio API is not a requirement for Phase 1.

If an API appears beneficial, compare it against the local asset approach and explain the specific value it adds.

Evaluate:

- Whether API access is free.
- Whether an API key is required.
- Whether the API permits commercial use.
- Rate limits and usage restrictions.
- Whether sound files can be downloaded and bundled.
- Attribution and redistribution requirements.
- Whether sounds are hosted externally or locally.
- Network latency and service availability.
- Whether the provider can change its terms or pricing.
- Whether the application would be dependent on the provider for core functionality.

Do not expose private API credentials in client-side code. If a future API requires a secret key, access it through an appropriate server-side route and environment variable.

Do not create an API proxy simply to make the application appear more sophisticated.

## 4.3 Sound asset inventory and licensing

Maintain an inventory of the audio assets included in the project.

For each asset, track the following where applicable:

- Sound identifier.
- Display name.
- Sound category.
- Original source URL.
- Creator or author.
- License name and URL.
- Attribution requirements.
- Whether commercial use is permitted.
- Whether redistribution is permitted.
- Local file path.
- Relevant notes or restrictions.

Create a documented process for adding new sounds.

Never bundle an asset if its licensing status is unclear. Flag uncertain assets for review rather than silently assuming they are safe to use.

Prefer a small, high-quality collection of sounds that works well together over a huge collection of inconsistent or unnecessary files.

## 4.4 Keep operating costs minimal

Use these defaults unless a demonstrated technical requirement justifies something else:

- No authentication in Phase 1.
- No database in Phase 1.
- No paid audio API.
- No paid analytics service.
- No third-party account system.
- No separate backend server.
- No recurring external requests for local sound playback.
- No cloud storage for user profiles.
- No unnecessary background jobs or server functions.

Use browser local storage for profiles and settings.

Keep external hosting and deployment costs separate from audio API costs. Review current hosting limits and terms before deployment, especially if the application will eventually be monetized.

Do not assume that a free hosting plan permits commercial use.

# 5. Phase 1 — Core Soundboard

The first release should deliver a complete, functional beat-making experience.

## 5.1 Soundboard layout

Create a grid of interactive sound buttons.

The layout should adapt to different screen sizes, with mobile usability as the primary consideration.

Requirements:

- Buttons should be large enough to tap comfortably.
- The number of columns should adapt to screen width and the active preset.
- The interface should support rapid, repeated interactions.
- Each button should have a clear visual identity.
- Users should immediately understand which sounds are assigned to which buttons.
- Button layouts should be configurable rather than hardcoded into a single arrangement.

Use sensible default layouts and button counts. Do not overload the initial interface with too many controls.

## 5.2 Sound playback

When a user taps a button, its assigned sound should play immediately.

The playback system should support:

- Rapid repeated taps.
- Multiple overlapping sounds where appropriate.
- Independent sound assignments per button.
- Reusable audio resources where practical.
- Graceful handling of unavailable or failed audio assets.
- Appropriate browser audio initialization.
- Consistent behavior across supported mobile and desktop browsers.

Avoid creating a new network request every time a button is pressed when the sound is already available locally.

Evaluate Web Audio API techniques such as preloading, decoded audio buffers, and scheduled playback based on actual requirements.

Do not overengineer the audio system before testing the simplest suitable implementation.

## 5.3 Button visual states

Buttons should provide immediate visual feedback.

Include appropriate states for:

- Default.
- Hover, where supported.
- Keyboard focus.
- Pressed.
- Playing or triggered.
- Selected during editing.
- Disabled or unavailable, if applicable.

Use subtle lighting, scaling, glow, or color changes to make interactions feel satisfying.

Animations should never interfere with rapid tapping or delay sound playback.

# 6. Edit Mode and Customization

Provide a dedicated Edit Mode that allows users to customize their soundboard.

In Edit Mode, users should be able to:

- Add buttons.
- Remove buttons.
- Rearrange buttons using drag and drop.
- Assign sounds to individual buttons through a dropdown.
- Change button labels where appropriate.
- Preview assigned sounds.
- Save their changes to the active profile.
- Cancel or exit editing without accidentally losing work, where practical.

Use a suitable drag-and-drop approach that works on touchscreens and desktop devices.

Evaluate lightweight, actively maintained libraries before implementing custom drag-and-drop behavior.

Editing should feel distinct from normal playback mode so users do not accidentally rearrange buttons while trying to make beats.

Provide clear visual indicators when editing is enabled.

Use accessible alternatives for reordering where practical, such as move controls, rather than relying exclusively on drag gestures.

# 7. Sound Library and Categories

Provide a curated sound library organized into categories.

Potential categories include:

- Drums.
- Kicks.
- Snares.
- Hi-hats.
- Percussion.
- Bass.
- Piano.
- Synthesizers.
- Beatbox.
- Vocal effects.
- Ambient sounds.
- Experimental effects.

The initial collection does not need to be enormous. Prioritize sound quality, variety, and a coherent experience.

Each sound should have useful metadata, including an identifier, display name, category, and audio source.

Include additional metadata only when needed.

The sound-assignment dropdown should make it easy to identify, preview, and select sounds.

Do not require a remote API to populate the initial sound library.

If a searchable external sound catalog is considered later, implement it as an optional feature that does not break the core application when the provider is unavailable.

# 8. Presets

Provide approximately 10 default soundboard presets.

Potential presets:

1. Piano.
2. Beatbox.
3. Bass.
4. Classic Drums.
5. Electronic.
6. Hip-Hop.
7. Synthwave.
8. Percussion.
9. Lo-Fi.
10. Experimental.

Each preset should define its own sound assignments, button arrangement, labels, and relevant visual configuration.

Presets should be available through a clear selection interface, such as a dropdown or preset browser.

When a user switches presets, the soundboard should update immediately and consistently.

Provide a way to return to the original default configuration if users customize a preset and want to start over.

Avoid duplicating configuration unnecessarily. Use a reusable, typed preset definition rather than hardcoding separate implementations for each preset.

# 9. Local Profiles and Persistence

Users should be able to maintain up to five customizable soundboard profiles without creating an account.

Use browser local storage to persist profiles across browser sessions.

Each profile should contain its own soundboard configuration, including:

- Profile identifier.
- Profile name.
- Button arrangement.
- Sound assignments.
- Relevant button settings.
- Any other essential customization state.

Use a dropdown or similar control to switch between profiles.

Requirements:

- Support up to five profiles.
- Provide sensible default profile configurations.
- Allow users to customize and save their profiles.
- Allow users to rename profiles where appropriate.
- Ensure profile switching restores the correct layout and sounds.
- Preserve user settings when the browser is closed and reopened.
- Handle missing, malformed, or outdated stored data gracefully.
- Avoid overwriting valid user configurations unexpectedly.

Treat local storage as a persistence mechanism, not as a secure database.

Keep persistence logic separate from presentation components so the implementation can later be extended to support cloud synchronization.

Do not introduce authentication, accounts, or cloud storage in Phase 1.

# 10. Visual Design and User Experience

The visual experience is one of the most important aspects of FidgetBeatz.

I want the application to look polished, modern, interactive, and memorable.

The design should take inspiration from colorful rhythm games, musical instruments, and color-memory games.

Guitar Hero and Simon-style interactions are useful references for visual feedback, but the application should have its own identity.

## 10.1 Design direction

Explore a cohesive visual language with:

- Distinctive sound-button colors.
- Smooth gradients where appropriate.
- Subtle glow and lighting effects.
- Layered surfaces and depth.
- Strong typography.
- Rounded corners and consistent spacing.
- Polished dropdowns and contextual controls.
- Smooth transitions between application states.
- Clear visual hierarchy.
- A focused soundboard layout.

Avoid excessive decoration, unnecessary panels, and cluttered controls.

The primary focus should remain on the sound buttons.

## 10.2 Interaction design

Consider the following effects:

- Buttons illuminate when tapped.
- Buttons briefly scale or animate when triggered.
- Different sound categories use distinct but cohesive colors.
- Switching presets animates the transition.
- Profile changes feel immediate and clear.
- Edit Mode provides visual feedback when buttons are moved.
- Sound assignment controls provide useful previews.
- Active interactions remain responsive during rapid tapping.

Use animation intentionally. Avoid constant motion that makes the interface distracting or tiring to use.

Respect reduced-motion preferences and maintain accessible focus states.

## 10.3 Responsive design

Design mobile-first.

The application must remain usable on:

- Mobile phones.
- Tablets.
- Desktop browsers.

Consider portrait and landscape layouts where appropriate.

Do not simply shrink the desktop interface to fit a phone.

Prioritize touch targets, available screen space, and easy access to sound buttons.

The soundboard should feel natural to use with one or both hands on mobile devices.

## 10.4 Visual quality standards

Do not settle for a generic starter template.

Pay attention to spacing, alignment, typography, visual consistency, empty states, loading states, and transitions.

Use a small, intentional design system rather than scattered styling decisions.

Avoid adding animation libraries or UI dependencies unless they materially improve the experience.

# 11. Technical Architecture

Use Next.js App Router with TypeScript.

Keep the architecture simple, modular, and appropriate for the actual requirements.

Suggested structure:

```text
fidgetbeatz/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── api/
│       └── [future-route-handlers]/
├── components/
│   ├── ui/
│   ├── soundboard/
│   ├── profiles/
│   └── presets/
├── features/
│   ├── audio/
│   ├── soundboard/
│   ├── profiles/
│   └── presets/
├── hooks/
├── lib/
│   ├── audio/
│   ├── storage/
│   └── utils/
├── data/
│   ├── sounds/
│   └── presets/
├── types/
├── public/
│   └── sounds/
├── tests/
├── docs/
│   └── decisions/
├── .env.example
├── README.md
├── package.json
└── tsconfig.json
```

This is a suggested structure, not a mandate to create empty folders. Adapt it to the implementation and avoid excessive nesting.

Keep the responsibilities of the major areas clear:

- `app/`: Routes, layouts, and application entry points.
- `components/`: Reusable UI components.
- `features/`: Feature-specific behavior and modules.
- `hooks/`: Reusable React hooks.
- `lib/audio/`: Audio loading and playback utilities.
- `lib/storage/`: Profile persistence and storage adapters.
- `data/`: Default sound metadata and presets.
- `types/`: Shared TypeScript types.
- `public/sounds/`: Properly licensed local audio assets.
- `tests/`: Automated tests.
- `docs/`: Architecture and development documentation.

Separate audio behavior, profile persistence, preset definitions, and UI presentation where doing so improves clarity and maintainability.

Avoid premature abstractions.

# 12. Backend and API Strategy

Although Node.js is part of the preferred technology stack, a separate backend server is not required for the initial release.

Next.js already supports server-side functionality through Route Handlers and can run on the Node.js runtime.

For Phase 1:

- Use the Next.js application as the primary application.
- Use browser-native APIs for audio playback.
- Use local storage for user profiles.
- Store default sound metadata and presets in the application.
- Use server-side routes only when an actual requirement exists.
- Avoid creating an Express or Fastify server without a concrete reason.
- Avoid adding a database or authentication system.

If a dedicated backend becomes necessary in a future phase, evaluate Fastify as a lightweight Node.js API framework with TypeScript support.

Document the reasoning behind any decision to introduce separate backend infrastructure.

Do not create API endpoints merely because the project includes Node.js in its technology stack.

# 13. Modern React and TypeScript Standards

Follow current, well-established React and Next.js practices.

- Use functional React components and hooks.
- Use TypeScript throughout the application.
- Enable strict TypeScript settings.
- Prefer Server Components by default where appropriate.
- Use Client Components for interactive soundboard behavior, browser APIs, and client-side state.
- Keep client-side boundaries as small as practical.
- Avoid `any` unless there is a clearly justified reason.
- Use descriptive names for variables, components, functions, and types.
- Separate complex business logic from presentation.
- Use reusable hooks and services when they provide meaningful value.
- Keep state predictable and avoid unnecessary re-renders.
- Use appropriate error handling.
- Follow accessibility best practices.
- Avoid unnecessary global state management.
- Start with local state and context where appropriate.
- Introduce a state management library only if the application genuinely needs one.
- Avoid overengineering and unnecessary dependencies.

Use current framework conventions rather than outdated Next.js patterns.

Keep the implementation easy to understand, test, and extend.

# 14. Audio Implementation and Performance

Audio responsiveness is a critical part of the product.

A soundboard that looks beautiful but has noticeable playback delays will not meet the requirements.

Evaluate the Web Audio API and implement the simplest approach that satisfies the experience.

Consider:

- Audio preloading.
- Decoding audio assets in advance.
- Reusing decoded audio buffers.
- Scheduling playback accurately.
- Supporting overlapping sounds.
- Managing repeated playback without unnecessary resource creation.
- Handling failed asset loads.
- Avoiding memory leaks.
- Releasing resources where appropriate.
- Handling browser autoplay restrictions.
- Testing rapid interactions.
- Testing mobile browser compatibility.

Do not assume all audio assets need to be loaded simultaneously. Balance initial load time, memory usage, and playback responsiveness.

If a sound is not ready to play, handle that condition gracefully rather than allowing the interface to fail.

Keep audio implementation details encapsulated so that the playback strategy can evolve independently of the UI.

# 15. Technical Documentation Requirements

Technical documentation is mandatory and should be developed alongside the application.

Do not leave documentation until the project is complete.

Create and maintain the following documents as applicable.

## 15.1 README.md

Include:

- Project overview.
- Main features.
- Technology stack.
- Prerequisites.
- Installation instructions.
- Local development instructions.
- Build and test commands.
- Linting and formatting commands.
- Environment variable setup.
- Deployment guidance.
- Links to supporting documentation.

## 15.2 docs/architecture.md

Document:

- Application architecture.
- Major modules and their responsibilities.
- Component organization.
- Client and server boundaries.
- Data flow.
- Audio system integration.
- Profile persistence.
- Preset configuration.
- Important technical decisions.
- Future extension points.

## 15.3 docs/development.md

Document:

- Coding standards.
- Project conventions.
- TypeScript practices.
- Component development.
- Testing expectations.
- Documentation standards.
- Dependency management.
- How to add new features.
- How to validate changes before merging.

## 15.4 docs/audio-system.md

Document:

- Audio playback architecture.
- Web Audio API usage.
- Asset loading and decoding.
- Sound playback lifecycle.
- Overlapping playback behavior.
- Performance considerations.
- Browser restrictions.
- Error handling.
- Supported audio formats.
- Asset licensing and attribution.
- How to add new sounds.

## 15.5 docs/profiles-and-presets.md

Document:

- Profile data structure.
- Preset data structure.
- Local storage behavior.
- Profile creation and switching.
- Data validation.
- Handling invalid or outdated stored data.
- Default preset configuration.
- How to add a new preset.

## 15.6 docs/api.md

Create this document if API endpoints are implemented.

Include:

- Endpoint purpose.
- Request and response formats.
- Validation rules.
- Error handling.
- Authentication requirements, if any.
- Rate limits or external provider dependencies, if relevant.

Do not document nonexistent endpoints as implemented functionality.

## 15.7 docs/decisions/

Maintain Architecture Decision Records for significant technical decisions where useful.

Examples include:

- Why local audio assets were selected over a live sound API.
- Why Next.js Route Handlers are sufficient for the initial release.
- Why local storage is used instead of a database.
- Why a particular audio playback strategy was selected.

Each decision should explain the context, options considered, decision, and relevant trade-offs.

Keep documentation concise, useful, and consistent with the actual implementation.

# 16. JSDoc and Code Comments

Use JSDoc consistently throughout the codebase.

Document exported functions, reusable utilities, hooks, services, and non-obvious behavior.

TypeScript provides much of the type information automatically, so comments should explain intent and behavior rather than repeat obvious types.

Use appropriate JSDoc tags when helpful:

- `@param`
- `@returns`
- `@throws`
- `@example`
- `@deprecated`

Example:

```ts
/**
 * Plays a sound assigned to a soundboard button.
 *
 * Supports repeated interactions and overlapping playback
 * when supported by the configured audio implementation.
 *
 * @param soundId - Identifier of the sound to play.
 * @returns A promise that resolves when playback starts.
 * @throws If the sound cannot be loaded or playback cannot start.
 */
async function playSound(soundId: string): Promise<void> {
  // Implement the playback behavior.
}
```

The actual documentation must match the function's implemented behavior. If the function cannot throw a particular error or return a particular value, do not claim that it does.

### Inline comments

Add comments where they materially improve understanding, especially around:

- Complex logic.
- Audio scheduling.
- Browser-specific behavior.
- Performance optimizations.
- Non-obvious state management.
- Important edge cases.
- Workarounds for library limitations.
- Data migration or validation behavior.

Avoid comments that simply restate the next line of code.

Prefer readable code and descriptive naming over excessive commentary.

Documentation should be consistent and useful rather than mechanically adding meaningless comments to every line.

# 17. Testing and Quality Assurance

Testing should be introduced alongside implementation.

Recommended tooling:

- Vitest for unit and integration tests.
- React Testing Library for component behavior.
- Playwright for end-to-end testing.
- ESLint for code quality.
- Prettier for formatting.
- TypeScript checks for static validation.

Prioritize tests for:

- Sound assignment.
- Audio playback initiation.
- Repeated button interactions.
- Overlapping playback behavior where applicable.
- Adding and removing buttons.
- Rearranging buttons.
- Saving and restoring profiles.
- Switching between presets.
- Handling invalid stored data.
- Handling unavailable sounds.
- Edit Mode behavior.
- Responsive layout and important user flows.

Use mocks where necessary for browser APIs and audio behavior, but also validate actual playback in supported browsers.

Pay particular attention to mobile Safari and Chrome because browser audio restrictions and playback behavior may differ.

Do not claim that functionality has been tested unless the relevant tests have actually been run.

Fix important linting, type-checking, and test failures before considering the implementation complete.

# 18. Phase 2 — Recording

Recording is explicitly out of scope for Phase 1.

In Phase 2, explore recording user interactions and creating replayable beat sequences.

Potential functionality:

- Record button presses.
- Capture timing information.
- Replay a recorded sequence.
- Stop and restart playback.
- Save recordings locally.
- Potentially export or share creations.

Evaluate whether recording should capture the original audio output, the sequence of sound triggers, or both.

Prefer a sequence-based implementation if it satisfies the requirements without unnecessary complexity. Document the trade-offs before implementing.

Do not build recording infrastructure during Phase 1 unless a specific dependency requires it.

# 19. Phase 3 — Guided Song Mode

One feature that could differentiate FidgetBeatz is a guided mode where users play recognizable songs by following illuminated buttons.

The concept should work similarly to a simplified rhythm game.

Potential functionality:

- A library of preset songs.
- A predefined button layout and sound configuration for each song.
- A sequence of buttons that light up in order.
- A progress counter or indicator.
- Visual feedback for correct and incorrect presses.
- The ability to replay a sequence.
- Clear song progression.

Consider a simplified Guitar Hero or Simon-style experience, but retain FidgetBeatz's own design identity.

This feature should be designed after the core soundboard is stable.

Do not introduce song libraries, sequencing infrastructure, or rhythm-game mechanics into Phase 1.

# 20. Future Expansion

The architecture should allow future features without implementing them prematurely.

Potential future enhancements include:

- Cloud-synchronized profiles.
- User accounts.
- Sharing custom presets.
- Community-created soundboards.
- User-uploaded sound assets.
- Recorded beat sharing.
- Guided songs.
- Additional sound packs.
- Advanced timing and rhythm controls.
- Optional external sound discovery.

Any future feature that introduces storage, APIs, authentication, or additional operating costs should be evaluated separately.

Do not implement these features merely to anticipate future requirements.

# 21. Implementation Workflow

Build the application in functional, reviewable stages.

### Stage 1 — Repository and foundation

- Inspect the repository.
- Establish the Next.js and TypeScript setup if necessary.
- Configure Tailwind CSS and the chosen UI libraries.
- Establish linting, formatting, and testing.
- Create the initial documentation.
- Confirm that the project runs successfully.

### Stage 2 — Visual design

- Establish the design system.
- Implement the application shell.
- Build the responsive soundboard layout.
- Establish typography, colors, spacing, and button styles.
- Implement the foundational interaction states.
- Refine the design before expanding functionality.

### Stage 3 — Audio system

- Research and curate the initial sound assets.
- Verify licensing and attribution.
- Create sound metadata and asset mappings.
- Implement audio loading and playback.
- Support overlapping sounds where appropriate.
- Test playback responsiveness.

### Stage 4 — Customization

- Implement Edit Mode.
- Add and remove buttons.
- Implement drag-and-drop rearrangement.
- Add sound-assignment dropdowns.
- Support sound previews.
- Validate custom layouts.

### Stage 5 — Presets

- Create approximately 10 default presets.
- Define their sound assignments and layouts.
- Implement preset switching.
- Add reset-to-default functionality.

### Stage 6 — Profiles

- Implement five local profiles.
- Add profile switching.
- Persist custom layouts and assignments.
- Handle invalid or missing storage data.
- Verify persistence across reloads.

### Stage 7 — Polish and testing

- Refine animations and transitions.
- Test mobile and desktop layouts.
- Test accessibility.
- Verify audio behavior.
- Fix performance issues.
- Run linting, type checking, and automated tests.

### Stage 8 — Documentation and handoff

- Update all relevant documentation.
- Verify JSDoc and code comments.
- Document important architecture decisions.
- Confirm setup instructions work.
- Summarize implemented functionality and any remaining limitations.

Do not advance simply because a stage's files exist. Verify that its core functionality works.

# 22. Definition of Done for Phase 1

Phase 1 should be considered complete when:

- The application runs locally using documented instructions.
- The interface is polished and responsive.
- The soundboard works on supported mobile and desktop browsers.
- Buttons play their assigned sounds.
- Multiple sounds can overlap where intended.
- Edit Mode supports adding, removing, and rearranging buttons.
- Users can assign sounds through dropdowns.
- Approximately 10 default presets are available.
- Users can save and switch between five profiles.
- Profiles persist across browser sessions.
- Invalid or unavailable sounds are handled gracefully.
- The initial sound assets have documented licensing information.
- No unnecessary paid APIs or backend services are required.
- Core functionality has appropriate automated tests.
- Type checking, linting, and production builds have been validated.
- Technical documentation matches the implemented application.
- Important functions, utilities, hooks, and complex behavior have useful JSDoc or comments.

Report any incomplete requirements explicitly rather than claiming the project is finished.

# 23. Final Development Principles

Follow these principles throughout the project:

1. **Frontend quality first.** The UI and interactive experience are the primary differentiators.
2. **Keep costs low.** Prefer browser-native capabilities and free, properly licensed assets over paid APIs.
3. **Use modern practices.** Build with React, Next.js, TypeScript, and a maintainable architecture.
4. **Prioritize responsiveness.** Button interactions and audio playback must feel immediate.
5. **Make the experience beautiful.** Use purposeful animations, consistent styling, and polished visual feedback.
6. **Document continuously.** Maintain technical documentation, JSDoc, and meaningful inline comments.
7. **Test real behavior.** Verify the application rather than relying on successful compilation alone.
8. **Avoid overengineering.** Do not introduce backend services, databases, or libraries without a clear benefit.
9. **Build incrementally.** Keep each stage functional and validate it before expanding scope.
10. **Protect future flexibility.** Keep modules well separated without prematurely implementing future features.

The ultimate goal is to build **FidgetBeatz: a polished, mobile-first musical playground where users can fidget, experiment, and make beats**, supported by a modern, maintainable technical foundation and minimal ongoing costs.
