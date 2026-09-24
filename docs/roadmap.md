# bambiui implementation stages

## Scope and product decisions

One design system, two working views: **Design** for visual decisions and **Develop** for implementation details. Switching views does not change the selected component, tokens or inspector scope. Design has **Components** and **Scenario** contexts. Existing local persistence remains unchanged; auth, server-side persistence and saving workflows are outside these stages.

UI copy remains English until the localization stage. Editor appearance stays independent of user-designed preview tokens.

## 1. Workspace and preview — implemented

- Shared navigation and token inspector across Design and Develop.
- Components context: collection or selected component variants, sizes and states.
- Scenario context: interactive workspace settings using the six existing components.
- Persistent mounted panels retain demo state across view/context switches.
- Specimen backgrounds and inherited text use global design tokens, not editor colors.
- Develop: existing React snippets with syntax highlighting and copy, props/defaults, live inherited/overridden token values, and full-system CSS variables.
- Export limitations remain explicit: no standalone component package or component style export.

### Validation

- ESLint, TypeScript through production build, and static export passed.
- Existing token tests: 43 passed.
- Headless Chrome smoke tests: 10 passed, including panel visibility, shared selection, demo state, scenario input/submit state, computed preview colors vs editor chrome, override/reset, keyboard activation, 375px layout, and browser errors.
- Smoke harness: `npm run build && node scripts/studio-smoke.mjs` (Node 22+, installed Chrome; override executable with `CHROME_PATH`). Uses a temporary browser profile, loopback static server and no new packages; cleans up on exit.

This is functional acceptance, not a complete visual or accessibility audit. Default palette contrast, unchecked control contrast, component variant color calculations and broader screen-reader/zoom testing remain for stages 2–3. Sidebar selection changes may recreate the selected specimen; switching view or context does not.

## 2. Accessible color generation — implemented

- Deterministic color engine separate from UI, using perceptual color scales.
- Preserve the input brand color; derive accessible usage tones rather than silently treating every brand input as safe.
- Generate primary and neutral scales; preserve semantic success/warning/danger/info color families.
- Generate light/dark surface, text, boundary and interaction roles.
- Verify actual foreground/background pairs, including compositing. Target 4.5:1 for normal text and 3:1 where non-text contrast is required.
- Allow manual edits with explicit contrast warnings.
- Gate: boundary-input tests, deterministic outputs, contrast tests and visual palette review.

### Implementation and validation

- `color-engine.ts`: dependency-free OKLCH generation with chroma-reduction gamut mapping, 12-step primary/secondary/neutral/semantic scales, and both light/dark recipes. Source remains separate from usage tones; semantic hues remain stable.
- `color-builder.tsx`: generation is separate from application. Apply merges only 17 global colors, preserving numeric tokens, component overrides, name and schema. Source/recipes remain mounted across scope/view changes, but are not persisted after reload.
- `color-audit.ts`: finite current-CSS checks, including manual overrides, badge/card mixes, button brightness and enabled unchecked grayscale/opacity. Ratios are not rounded before pass/fail. The report is not certification.
- CLI: `node --experimental-strip-types scripts/generate-palette.mjs '#e8673c'` emits a source-preserving `bambiui.color-recipe` v1 JSON artifact. It is intentionally distinct from the existing studio backup format.
- Unit coverage: 43 token tests, 22 engine/integration/CLI tests and 9 current-color audit tests.
- Browser coverage: 18 smoke checks, including the original workspace checks plus Generate/Apply isolation, invalid/stale sources, presets, source retention/resync, applied color preservation, live warnings, exports, computed recipe contrast and 375px expanded layout.
- Light/dark desktop/mobile screenshots reviewed. Independent numerical review additionally swept 4,096 deterministic seeds without generation failures, on-color contrast failures or adjacent state-color collisions.
- No dependencies or design-system schema changes. Explicit TypeScript extension imports are enabled under `noEmit` for native Node tests and CLI execution.

### Next-stage boundary

Applying a palette is not yet a persistent multi-theme switch. Generated hover/active/subtle/focus recipes are inspectable, but current components still use their existing CSS constants and mixes. Legacy defaults remain unchanged, and current unchecked controls can still fail contrast. Stage 3 must integrate the roles, address these component failures, and complete keyboard/screen-reader/zoom checks. Passing generated recipes does not imply arbitrary combinations or the entire application meet WCAG.

## 3. Themes and component accessibility — next

- Separate editor light/dark/system preference from design preview light/dark/comparison.
- Integrate generated role tokens; fix variant surface calculations and token bypasses.
- Distinguish unchecked, disabled and loading states.
- Verify keyboard, focus, names, errors, decorative icons, reduced motion and zoom.
- Gate: all six components in both themes; automated checks plus manual keyboard/screen-reader and 200% zoom review.

## 4. Localization — planned

- Typed Turkish/English dictionaries covering UI, notifications, errors and accessible names.
- Language selector and document language; locale-aware number/date formatting.
- Keep code identifiers, props and token keys stable.
- Gate: complete dictionaries, longer-copy layout checks, identical functionality, unchanged design state across languages.

## 5. Integration quality gate — planned

- End-to-end color generation, manual contrast warning, view/theme/language flows.
- Representative visual regression coverage.
- Preview, developer output and CSS/JSON export consistency; schema compatibility if theme data changes.
- Documentation aligned with implemented behavior.
- Gate: two languages × two preview themes × two views, build/lint/tests and no unresolved critical functional or accessibility findings.

## Stage review format

For each stage record completed work, commands/checks run, unresolved issues and the next-stage decision. Do not claim full accessibility compliance solely from passing automated tests.
