# bambiui implementation status

## Product decisions

The studio has one English-only, light editor interface. Design displays one preview at a time. Choose Light or Dark beside the responsive control to target manual token editing; the same switch remains available in Develop to inspect either theme's reference. There is no editor appearance switch, Compare mode or Scenario context; Develop focuses on code and token references.

The Color builder accepts one brand color. A valid six-digit hex value or preset immediately generates and applies both light and dark global color roles in a single update. Invalid/incomplete input does not change the saved system. Numeric values, component overrides and name remain untouched. Existing imported systems with different light/dark sources retain them until a new color is chosen; manual token edits still target the selected preview only.

The studio stores its schema-v3 system locally; v1/v2 migration copies historical values to both themes without recoloring. Both-theme CSS and v3 JSON exports remain unchanged. Auth, server persistence and account-based saving remain outside scope. The separate palette CLI still emits raw scales and roles when detailed recipes are needed.

## Implemented capabilities

- Six components with consistent APIs and interactive Design specimens directly on the selected theme's dotted background, without extra specimen cards. Actual Card specimens retain their own tokens. Mounted theme previews retain demo state when switching views or selecting the other theme.
- Inspector for 27 global tokens and optional per-component overrides. Contrast summary stays visible and failed checks are highlighted; details list modeled color pairs and warnings, including manual color failures. On narrow screens, jump links connect the workspace and inspector without adding tabs.
- OKLCH generation of accessible light/dark usage colors from one source, preserving the source in JSON. A safe light brand source can remain the exact primary fill with dark ink; links use derived accessible text ink. The logo color is the fresh system's source. Generated defaults pass 127 modeled color pairs per theme; manual or legacy values may not.
- Develop view with React examples, props/defaults, live aliases, derived values and full CSS. Code snippets are project examples, not a standalone component package.
- Export/import of CSS/JSON, with v1/v2 migration and v3 round-trip. Import resets the generator input to the imported source; token input drafts remount with the imported system.

## Validation and outstanding acceptance

- Run `npm run build`, `npm run lint`, `node --experimental-strip-types --test app/studio/*.test.mjs` and, after building, `node scripts/studio-smoke.mjs`.
- Smoke tests exercise the single visible theme preview, one-step generation and invalid input, selected-theme overrides, contrast warnings, view/theme retention, export/import, accessible names and responsive reflow. Optional `--screenshots` writes review images; there is no pixel regression suite. The old localization/appearance/structural-baseline tests are obsolete and have been replaced with checks of the current workflow.
- **Full accessibility acceptance remains open:** Chromium AX inspection and responsive reflow cannot replace VoiceOver and browser-native 200% zoom. Complete the manual checks in `docs/accessibility-checklist.md` before claiming full WCAG conformance.
