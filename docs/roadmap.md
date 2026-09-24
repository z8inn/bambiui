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

## 2. Accessible color generation — next

- Deterministic color engine separate from UI, using perceptual color scales.
- Preserve the input brand color; derive accessible usage tones rather than silently treating every brand input as safe.
- Generate primary and neutral scales; preserve semantic success/warning/danger/info color families.
- Generate light/dark surface, text, boundary and interaction roles.
- Verify actual foreground/background pairs, including compositing. Target 4.5:1 for normal text and 3:1 where non-text contrast is required.
- Allow manual edits with explicit contrast warnings.
- Gate: boundary-input tests, deterministic outputs, contrast tests and visual palette review.

## 3. Themes and component accessibility — planned

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
