# Bambi UI

A local-first design system playground built with Next.js, Tailwind CSS v4, and Base UI.

## Design studio

- Edit 27 global tokens:
  - Surface colors (background, foreground, muted, border)
  - Brand and status roles (primary, secondary, success, warning, danger and info, each with an on-color)
  - Radius, padding, gap, margin, font size and border width
  - A shared `sm`/`md`/`lg` control height scale
- Components follow one API contract (`variant`, `size`, `tone`, `disabled`, `loading`, `label`, `description`, `error`, …). See [docs/component-api.md](docs/component-api.md).
- Customize Button, Input, Card, Badge, Switch, and Checkbox independently. Component tokens inherit global values until overridden; reset an override to reconnect it.
- Preview interactive components individually, together, or in a compact mobile-width canvas. Editor chrome stays independent of your design tokens.
- Changes are saved in this browser using localStorage. No account, server storage, or cross-device sync is included.
- Export CSS custom properties or a versioned JSON backup. CSS exports contain variables, not component markup or styles; consume the variables in your own components.
- Import a JSON backup to restore a system. Imports are validated before replacing your draft. Version 1 backups and saved drafts are upgraded to version 2 automatically: their values are kept and the new tokens get their defaults.

Select a component in the sidebar to edit its tokens, or use **Global tokens** to change the shared foundations. Changes apply immediately. Color inputs accept six-digit hex values; numeric controls use pixels.

## Token tests

Run with Node.js 22.6+ (Node.js 22.13+ recommended):

```bash
node --experimental-strip-types --test app/studio/tokens.test.mjs
```

The tests cover inheritance, component isolation, CSS export, JSON round-trips, and invalid import data.

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
