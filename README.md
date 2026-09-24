# bambiui

A local-first design system playground built with Next.js, Tailwind CSS v4, and Base UI.

## Design studio

- Edit 27 global tokens:
  - Surface colors (background, foreground, muted, border)
  - Brand and status roles (primary, secondary, success, warning, danger and info, each with an on-color)
  - Radius, padding, gap, margin, font size and border width
  - A shared `sm`/`md`/`lg` control height scale
- Components follow one API contract (`variant`, `size`, `tone`, `disabled`, `loading`, `label`, `description`, `error`, …). See [docs/component-api.md](docs/component-api.md).
- Customize Button, Input, Card, Badge, Switch, and Checkbox independently. Component tokens inherit global values until overridden; reset an override to reconnect it.
- **Design** view: compare component variants, sizes and states, or switch to **Scenario** to try a workspace settings form built with all six components. Preview surfaces follow your background and foreground tokens; editor chrome stays independent.
- **Develop** view: inspect React usage, props/defaults, live token inheritance and overrides, and the full-system CSS variable export. Examples reference this project's components, not a published package.
- Both views share the selected component and token inspector. Switching views or preview contexts preserves mounted demo state; the compact mobile-width canvas setting is retained.
- Changes are saved in this browser using localStorage. No account, server storage, or cross-device sync is included.
- Export CSS custom properties or a versioned JSON backup. CSS exports contain variables, not component markup or styles; consume the variables in your own components.
- Import a JSON backup to restore a system. Imports are validated before replacing your draft. Version 1 backups and saved drafts are upgraded to version 2 automatically: their values are kept and the new tokens get their defaults.

Select a component in the sidebar to edit its tokens, or use **Global tokens** to change the shared foundations. Changes apply immediately. Color inputs accept six-digit hex values; numeric controls use pixels.

## Color builder

Open **Global tokens → Color builder**. Enter a six-digit brand color or choose a preset, then **Generate palettes**. Generation previews two recipes without changing your system. **Apply light colors** or **Apply dark colors** replaces the 17 global color tokens only; dimensions and component overrides stay intact. This does not switch the editor theme.

The dependency-free engine uses OKLCH scales and reduces chroma to fit the sRGB gamut. Primary and neutral colors follow the source; success, warning, danger and info keep semantic green, amber, red and blue families. Source colors are kept separate from adjusted usage tones. Each recipe includes 12-step scales and solid, on-solid, hover, active, subtle, on-subtle, outline and focus roles.

Generated recipes check normal text at 4.5:1 and boundaries/focus at 3:1 on their specified surfaces, using final hex colors. Raw scale stops do **not** guarantee arbitrary contrast pairs. The current-system report also checks modeled component mixes and enabled states, including overrides. It reports finite color pairs, **not full WCAG compliance**. Existing component interaction styles can still fail; integrating the generated interaction roles and completing accessibility verification is the next stage.

The builder retains its source and recipes only while the page stays open. CSS/JSON studio exports keep the applied tokens, not both palettes or the source. Generate a separate reproducible recipe from the CLI when needed:

```bash
node --experimental-strip-types scripts/generate-palette.mjs '#e8673c'
```

The CLI writes `bambiui.color-recipe` version 1 JSON to stdout, including the original source and both palettes. It is **not** a studio backup and cannot be imported through the existing design-system importer. No network service or new package is used.

## Icons and social images

The logo artwork lives in `app/studio/brand.ts`. The Apple touch icon, the web manifest icons, and the Open Graph and Twitter images are generated from it at build time. `app/icon.svg` (the output of `brandSvg()`) and `app/favicon.ico` (a 16/32/48 px render) are static files; regenerate them when the artwork changes.

Social images need an absolute URL. Set `NEXT_PUBLIC_SITE_URL` to the production domain, for example `https://bambiui.com`. Cloudflare Pages builds fall back to the deployment URL (`CF_PAGES_URL`).

## Token and color tests

Run with Node.js 22.6+ (Node.js 22.13+ recommended):

```bash
node --experimental-strip-types --test app/studio/tokens.test.mjs app/studio/color-engine.test.mjs app/studio/color-audit.test.mjs
```

The tests cover inheritance, component isolation, CSS/JSON compatibility, invalid imports, deterministic palette generation, gamut and semantic hue preservation, contrast thresholds, modeled component mixes and CLI output.

## Studio smoke tests

After building, run `node scripts/studio-smoke.mjs` with Node.js 22+ and Google Chrome installed. The dependency-free harness checks view/context state retention, token inheritance, preview colors, keyboard tabs, palette generation/application, manual contrast warnings, CSS/JSON exports and the narrow-screen layout. Add `--screenshots` to capture light/dark palette previews in `.next/color-review/`. It serves `out/` locally and uses a temporary browser profile; your regular browser data is not used. Set `CHROME_PATH` to override the default macOS Chrome executable.

See [docs/roadmap.md](docs/roadmap.md) for staged scope, validation results and remaining accessibility work.

## Development

```bash
npm run dev
```

The application runs at [http://localhost:3000](http://localhost:3000) by default.

## Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
```
