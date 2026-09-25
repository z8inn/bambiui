# bambiui accessibility acceptance

## Stage 3 automated evidence

- 93 Node tests: schema/migration, independent themes, inheritance, generation, derived roles, manual-color fallbacks, export, CLI and finite color audit.
- 49 Chromium smoke checks: all six components in light/dark, computed color samples, hover/pressed and unchecked states, keyboard toggles, disabled/loading focus semantics, labels/descriptions/errors, accessibility-tree names, independent editor appearance, comparison state and responsive layout.
- Generated defaults: 127 modeled pairs per theme pass 4.5:1 normal-text / 3:1 non-text thresholds. This does not certify every rendered pixel, arbitrary nested surface, custom override or user-imported palette.
- Focus remains visible on invalid token drafts; decorative icons are hidden from names. Reduced-motion testing verifies animation/transition removal.
- Responsive checks: 375px; CSS document zoom at 200%; effective 720×500 layout viewport at DPR 2. The last two are simulations, not a native browser-zoom session.
- Screenshots reviewed for editor light/dark, dark export dialog, both preview themes, comparison and mobile layout. Repeat with `npm run build && node scripts/studio-smoke.mjs --screenshots`.

## Stage 4–5 additional automated evidence

- English/Turkish labels and accessible names are checked, and 375px reflow is exercised in both design themes and Design/Develop. Stage 5 checks generated palette → manual failing color pair → rendered preview/report → developer aliases → CSS/JSON in all eight language/theme/view combinations, plus real JSON file-input round-trip.
- `scripts/studio-visual-baseline.json` compares structural geometry and computed style in 16 desktop/mobile states. Optional screenshots were inspected for representative Turkish/dark and English/light states. Structural baselines and screenshots do not constitute pixel-perfect visual regression or manual assistive-technology testing.

## Manual acceptance still required

These checks have **not** been performed with a real screen reader/native browser zoom. Automated accessibility-tree inspection is not a substitute. Do not mark the stage's full accessibility gate passed until these results are recorded.

### VoiceOver + Safari / Chrome

- [ ] Navigate landmarks and headings. Skip-to-workspace reaches the main area; hidden context/theme panels are absent from reading order.
- [ ] Workspace and context tabs announce their names and selected state. Arrow keys move focus; Enter/Space activates. Focus is not lost on view/theme changes.
- [ ] Editor appearance, Design theme and language controls are distinguishable by their names in both English and Turkish. Language switching retains focus/context; Compare edit buttons announce exactly their visible labels.
- [ ] Input labels, helper text, required state and error messages are announced. Read-only controls remain focusable and unchanged; disabled controls cannot activate.
- [ ] Switch/Checkbox names and checked/mixed states are announced and respond to keyboard interaction. Decorative icons are not repeated in names.
- [ ] Loading buttons remain focusable and announce busy/unavailable state. Verify activation suppression in a consuming example with an actual action handler; the studio's static loading specimen has none.
- [ ] Contrast warning summaries and clipboard/generation feedback announce meaningful changes without excessive interruption.
- [ ] Export dialog announces title/description, contains focus, closes with Escape and restores focus to its trigger.

### Native zoom and layout

- [ ] Use browser-native 200% zoom, not CSS `zoom`, with a typical desktop window. All controls remain reachable and text stays readable; no clipped or obscured keyboard focus.
- [ ] Repeat Light/Dark/Compare, Components/Scenario and Develop in English and Turkish. Inspect both the main canvas and token inspector; local code/table scrolling is expected, page-wide horizontal scrolling is not.
- [ ] Check mobile Safari/Chrome at 375px and an increased system text size. Check both editor appearances and the export dialog.

### Color and interaction review

- [ ] Review focus visibility on real browser/OS combinations, especially controls near container edges and non-default component backgrounds.
- [ ] Check forced-colors/high-contrast OS settings and ensure state is not conveyed by color alone.
- [ ] Inspect imported/custom designs separately. Migration intentionally preserves legacy values—even when they fail contrast. Applying generated colors keeps component overrides; inspect their warnings too.

Record browser/OS, assistive technology, scenario, result and any issue before closing the manual acceptance gate. Full WCAG conformance is not claimed by this checklist or the automated report.
