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

## Icons and social images

The logo artwork lives in `app/studio/brand.ts`. The Apple touch icon, the web manifest icons, and the Open Graph and Twitter images are generated from it at build time. `app/icon.svg` (the output of `brandSvg()`) and `app/favicon.ico` (a 16/32/48 px render) are static files; regenerate them when the artwork changes.

Social images need an absolute URL. Set `NEXT_PUBLIC_SITE_URL` to the production domain, for example `https://bambiui.com`. Cloudflare Pages builds fall back to the deployment URL (`CF_PAGES_URL`).

## Token tests

Run with Node.js 22.6+ (Node.js 22.13+ recommended):

```bash
node --experimental-strip-types --test app/studio/tokens.test.mjs
```

The tests cover inheritance, component isolation, CSS export, JSON round-trips, and invalid import data.

## Studio smoke tests

After building, run `node scripts/studio-smoke.mjs` with Node.js 22+ and Google Chrome installed. The dependency-free harness checks view/context state retention, token inheritance, preview colors, keyboard tabs and the narrow-screen layout. It serves `out/` locally and uses a temporary browser profile; your regular browser data is not used. Set `CHROME_PATH` to override the default macOS Chrome executable.

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
