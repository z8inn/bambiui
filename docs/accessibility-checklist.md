# bambiui accessibility acceptance

## Automated evidence

- Unit tests check inheritance, migration, generated contrast, derived roles and finite color-audit pairs. The default light/dark palettes pass 127 modeled pairs per theme at 4.5:1 normal-text and 3:1 non-text thresholds; manual overrides and imports can fail and are reported.
- Chromium smoke tests verify one visible Design preview with selectable theme, keyboard-accessible controls, accessible labels, invalid inputs, contrast warnings, export/import and responsive reflow at 375px. `node scripts/studio-smoke.mjs --screenshots` captures representative images for review. CDP accessibility-tree assertions are not a screen-reader session; viewport emulation is not browser-native zoom.

## Manual acceptance still required

Record browser/OS, assistive technology, scenario, result and issues before closing this gate.

### VoiceOver with Safari and Chrome

- [ ] Navigate landmarks and headings. Skip-to-workspace reaches main; hidden Develop view and inactive theme preview are absent from reading order.
- [ ] Workspace tabs announce their selected state. Arrow keys move focus; Enter/Space activates.
- [ ] Light and Dark theme controls announce their selected state in Design and Develop and identify the inspector's editing target; switching does not reset either preview's interactive state.
- [ ] Input labels, helper text, required state and errors are announced. Read-only controls stay focusable; disabled controls cannot activate.
- [ ] Switch/Checkbox names and checked/mixed states are announced; decorative icons do not duplicate names.
- [ ] Busy buttons remain focusable and cannot activate. Verify against a consuming example with an actual action handler; the studio's loading specimen has none.
- [ ] Contrast warnings and import/copy feedback announce meaningful changes without excessive interruption.
- [ ] Export dialog announces title and description, contains focus, closes on Escape and restores focus to its trigger.

### Native zoom and layout

- [ ] Use actual browser 200% zoom (not CSS zoom). All controls remain reachable and readable without obscured keyboard focus.
- [ ] Check Design in both Light and Dark, at desktop and mobile preview widths, and Develop. Local code/table scrolling is expected; page-wide horizontal scrolling is not.
- [ ] Check mobile Safari/Chrome at 375px and increased system text size, including Edit tokens / Back to preview (or code) focus navigation, the inspector, expanded Color builder and export dialog.

### Color and interaction review

- [ ] Verify focus visibility in Safari/Chrome on non-default backgrounds and near container edges.
- [ ] Test forced-colors/high-contrast settings; state is not conveyed by color alone.
- [ ] Review imported/custom values separately; migration preserves legacy colors and applying generated colors preserves component overrides.

Passing automated checks does not certify full WCAG conformance.
