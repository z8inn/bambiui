# bambiui accessibility acceptance

## Automated evidence

- Unit tests check inheritance, migration, generated contrast, derived roles and finite color-audit pairs. The default light/dark palettes pass 127 modeled pairs per theme at 4.5:1 normal-text and 3:1 non-text thresholds; manual overrides and imports can fail and are reported.
- `node scripts/studio-smoke.mjs --screenshots` runs against the static export after `npm run build`, using Chromium/CDP and a disposable browser profile. Captures are written to `.next/color-review/`; screenshot capture alone is not visual acceptance.
- Route checks directly open all 14 URLs: `/`, `/develop`, and both `/<id>` and `/develop/<id>` for `button`, `input`, `card`, `badge`, `switch`, and `checkbox`. They check real navigation links with `aria-current="page"`, headings, inspector scope/visibility, Design/Develop selection and browser Back/Forward.
- Persistent-layout checks compare DOM identity and retain the same button count and input value across theme changes and client navigation. One theme pane contains all six mounted, expanded specimens; switching Light/Dark changes tokens rather than creating independent demo state.
- Canvas checks cover selection targeting, Fit, Reset zoom, zoom in/out, empty-background pointer panning, focused-canvas arrow scrolling and Enter activation of a demo button. This is limited keyboard coverage, not a complete keyboard accessibility audit. Canvas scaling is not browser zoom.
- Develop checks cover separation from the hidden canvas/inspector, copying React usage to the browser clipboard and selected-theme token references. Color checks retain both-theme preset application, override/geometry preservation, invalid input rejection, contrast warnings, CSS/JSON export, JSON import and reload persistence.
- At a 375px emulated viewport, checks exercise all six component navigation targets in Design and Develop, page-width overflow, inspector/preview focus links, theme selection and selected accessible names. CDP accessibility-tree assertions are not a screen-reader session; viewport emulation is not browser-native zoom.

Latest local validation (2026-09-25): production build, lint, 95 unit tests and smoke with screenshots passed. Manual gates below remain outstanding; automated success does not close them.

## Manual acceptance still required

Record browser/OS, assistive technology, scenario, result and issues before closing this gate.

### VoiceOver with Safari and Chrome

- [ ] Navigate landmarks and headings. Skip-to-workspace reaches main; the hidden workspace panel and the inspector in Develop are absent from reading order. There is only one theme pane, not an inactive second preview.
- [ ] Component and Design/Develop navigation announce links and the current page, not tabs. Tab reaches each link and Enter navigates. Verify all six component targets, direct opening, Back/Forward, focus placement and route-change announcements.
- [ ] Light and Dark theme controls announce their selected state in Design and Develop and identify the inspector's editing target in Design; switching retains the same interactive demo state across themes and routes.
- [ ] Explore all six expanded specimens. Canvas help, zoom output, Fit and Reset zoom are understandable; keyboard scrolling and zoom controls provide alternatives to pointer dragging. Specimen interactions and text selection do not initiate panning.
- [ ] Develop usage, prop references, token tables and local scroll regions are readable and keyboard reachable; Copy React code announces success or failure without moving focus unexpectedly.
- [ ] Input labels, helper text, required state and errors are announced. Read-only controls stay focusable; disabled controls cannot activate.
- [ ] Switch/Checkbox names and checked/mixed states are announced; decorative icons do not duplicate names.
- [ ] Busy buttons remain focusable and cannot activate. Verify against a consuming example with an actual action handler; the studio's loading specimen has none.
- [ ] Contrast warnings and import/copy feedback announce meaningful changes without excessive interruption.
- [ ] Export dialog announces title and description, contains focus, closes on Escape and restores focus to its trigger.

### Native zoom and layout

- [ ] Use actual browser 200% zoom (not CSS zoom). All controls remain reachable and readable without obscured keyboard focus.
- [ ] Check Design in both Light and Dark, at desktop and mobile preview widths, and Develop. Local code/table scrolling is expected; page-wide horizontal scrolling is not.
- [ ] Check mobile Safari/Chrome at 375px and increased system text size, including all six component navigation links in both views, Edit tokens / Back to preview focus navigation in Design, the inspector, expanded Color builder and export dialog.

### Color and interaction review

- [ ] Verify focus visibility in Safari/Chrome on non-default backgrounds and near container edges.
- [ ] Test forced-colors/high-contrast settings; state is not conveyed by color alone.
- [ ] Review imported/custom values separately; migration preserves legacy colors and applying generated colors preserves component overrides.

Manual VoiceOver sessions and real 200% browser zoom have not been completed. No WCAG conformance claim is made.
