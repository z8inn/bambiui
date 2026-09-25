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

### Stage 2 checkpoint (superseded where noted by stage 3)

- `color-engine.ts`: dependency-free OKLCH generation with chroma-reduction gamut mapping, 12-step primary/secondary/neutral/semantic scales, and both light/dark recipes. Source remains separate from usage tones; semantic hues remain stable.
- `color-builder.tsx`: generation is separate from application. Apply merges only 17 global colors, preserving numeric tokens, component overrides, name and schema. Source/recipes remain mounted across scope/view changes, but are not persisted after reload.
- `color-audit.ts`: finite current-CSS checks, including manual overrides, badge/card mixes, button brightness and enabled unchecked grayscale/opacity. Ratios are not rounded before pass/fail. The report is not certification.
- CLI: `node --experimental-strip-types scripts/generate-palette.mjs '#e8673c'` emits a source-preserving `bambiui.color-recipe` v1 JSON artifact. It is intentionally distinct from the existing studio backup format.
- Unit coverage: 43 token tests, 22 engine/integration/CLI tests and 9 current-color audit tests.
- Browser coverage: 18 smoke checks, including the original workspace checks plus Generate/Apply isolation, invalid/stale sources, presets, source retention/resync, applied color preservation, live warnings, exports, computed recipe contrast and 375px expanded layout.
- Light/dark desktop/mobile screenshots reviewed. Independent numerical review additionally swept 4,096 deterministic seeds without generation failures, on-color contrast failures or adjacent state-color collisions.
- No dependencies or design-system schema changes. Explicit TypeScript extension imports are enabled under `noEmit` for native Node tests and CLI execution.

### Next-stage boundary

At the stage 2 checkpoint, palette application was not a multi-theme switch and interaction recipes were not wired to components. Stage 3 below supersedes those limitations. Passing generated recipes still does not imply arbitrary combinations or the entire application meet WCAG.

## 3. Themes and component accessibility — implemented; manual acceptance pending

- Separate editor light/dark/system preference from design preview light/dark/comparison.
- Integrate generated role tokens; fix variant surface calculations and token bypasses.
- Distinguish unchecked, disabled and loading states.
- Verify keyboard, focus, names, errors, decorative icons, reduced motion and zoom.
- Gate: all six components in both themes; automated checks plus manual keyboard/screen-reader and 200% zoom review.

### Implemented

- Independent editor Light/Dark/System appearance, including live OS changes and portaled dialogs; no new preference persistence.
- Design Light/Dark/Compare with persistent per-theme demo instances and an explicit editing-theme target. Theme switches do not recolor or overwrite either theme.
- Normalized schema v3: `themes.light` and `themes.dark`, each with source/global/component values. Strict parsing; v1/v2 copy existing values independently into both themes without recoloring. v1 additions retain historical defaults. JSON exports include both themes and sources.
- Both-theme CSS export with color-scheme, 160 variables per theme (27 global, 60 component, 15 constants and 58 derived values). Developer reference separates derived values from manual overrides.
- Runtime and generated palettes use the same role derivation. Button hover/active no longer use brightness; unchecked controls no longer use grayscale/opacity; filled cards use their actual surface/ink; badge colors derive from their actual background and neutral outline honors explicit border overrides.
- Decorative icons hidden from names; invalid token focus ring independent of error styling; comparison labels aligned with accessible names; reduced-motion component styles.
- Per-theme generator drafts/source restoration. Application preserves the other theme, geometry and overrides. Import resets the generator workspace to imported sources.
- Bounded derivation cache with fresh results, endpoint-search cleanup, and memoized shared exports prevent unrelated editor interactions from repeating expensive manual-color searches.

### Validation and remaining gate

- 93 Node tests passed (56 tokens, 27 engine/integration/CLI, 10 audit).
- ESLint, TypeScript and production static build passed.
- 49 Chromium smoke checks passed: original workspace/builder flows plus appearance isolation/system changes, both-theme component contrast/states, keyboard/AX names, sources after reload, comparison targeting/state, derived exports, invalid focus, badge override/reset, reduced motion and responsive checks.
- Defaults pass 127 modeled color pairs per mode; user values and legacy palettes remain auditable, not silently corrected.
- Screenshots reviewed for editor/preview themes, comparison, dialog and mobile. Short/narrow layout viewports use a stacked layout to avoid squeezing the canvas between fixed sidebars.
- **Full manual acceptance remains open:** Chromium keyboard automation and AX-tree checks are not a real VoiceOver session. CSS zoom and effective viewport/DPR checks are not browser-native 200% zoom. See `docs/accessibility-checklist.md` for the required manual pass. No full WCAG claim.

**Transition decision:** implementation and automated checks are complete. Keep manual accessibility acceptance explicitly open; do not label the full stage gate passed until reviewed.

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
