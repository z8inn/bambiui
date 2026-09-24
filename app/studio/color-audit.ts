import type { ComponentId, DesignSystem } from "./tokens";
import { componentIds, resolveComponent } from "./tokens.ts";
import { contrastRatio, mixColors } from "./color-engine.ts";

export type ContrastCheck = {
  id: string;
  label: string;
  foreground: string;
  background: string;
  ratio: number;
  minimum: number;
  passes: boolean;
  component?: ComponentId;
};

const roles = [
  ["primary", "onPrimary"],
  ["secondary", "onSecondary"],
  ["success", "onSuccess"],
  ["warning", "onWarning"],
  ["danger", "onDanger"],
  ["info", "onInfo"],
] as const;

/** CSS filter functions operate on encoded sRGB, not WCAG linear luminance. */
function uncheckedColor(color: string, surface: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // Apply group opacity AFTER grayscale, retaining precision until final hex.
  return `#${[1, 3, 5].map((i) =>
    Math.round(gray * 0.5 + parseInt(surface.slice(i, i + 2), 16) * 0.5)
      .toString(16).padStart(2, "0"),
  ).join("")}`;
}

/**
 * Finite current-CSS diagnostics, NOT accessibility certification. Assumes valid
 * opaque #rrggbb system tokens, normal-size text (4.5), and non-text marks/visible
 * borders (3). Components sit on the global background; nested/custom backgrounds,
 * images, antialiasing, shadows, focus geometry, invalid and disabled states are
 * not modeled. A border pair is omitted when its resolved width is zero; neither
 * omission nor a passing color pair establishes that a control is identifiable.
 *
 * Constants mirror preview.module.css and components.module.css, not generated
 * palette role recipes. Mixes/filters are represented as final 8-bit sRGB colors
 * through the engine helpers; ratios are never rounded before pass/fail.
 */
export function auditSystemColors(system: DesignSystem): ContrastCheck[] {
  const g = system.global;
  const checks: ContrastCheck[] = [];
  function add(id: string, label: string, foreground: string, background: string,
    minimum = 4.5, component?: ComponentId) {
    const ratio = contrastRatio(foreground, background);
    checks.push({ id, label, foreground, background, ratio, minimum,
      passes: ratio >= minimum, ...(component ? { component } : {}) });
  }

  // Seventeen global text/on-role/link pairs, independent of component quirks.
  for (const surface of ["background", "muted"] as const) {
    for (const ink of ["foreground", "mutedForeground"] as const) {
      add(`global.${ink}.${surface}`, `${ink} on ${surface}`, g[ink], g[surface]);
    }
  }
  for (const [role, onRole] of roles) {
    add(`global.${onRole}.${role}`, `${onRole} on ${role}`, g[onRole], g[role]);
    add(`global.${role}.background`, `${role} text on background`, g[role], g.background);
  }
  add("global.primary.muted", "Primary link on muted", g.primary, g.muted);
  if (g.borderWidth > 0) {
    for (const surface of ["background", "muted"] as const) {
      add(`global.border.${surface}`, `Global border on ${surface}`, g.border, g[surface], 3);
    }
  }

  for (const component of componentIds) {
    const c = resolveComponent(system, component);
    const choice = component === "switch" || component === "checkbox";
    add(`${component}.foreground`, choice
      ? `${component} checked ${component === "switch" ? "thumb" : "mark"} on fill`
      : `${component} resolved text on background`, c.foreground, c.background, choice ? 3 : 4.5, component);
    if (c.borderWidth > 0) {
      const state = choice ? "checked " : component === "badge" ? "neutral outline "
        : component === "card" ? "outlined " : component === "button" ? "primary " : "";
      add(`${component}.boundary`, `${component} ${state}border on global surface`,
        c.border, g.background, 3, component);
    }
    if (choice) {
      const fill = uncheckedColor(c.background, g.background);
      if (c.borderWidth > 0) {
        add(`${component}.unchecked.boundary`, `${component} enabled unchecked boundary on global surface`,
          uncheckedColor(c.border, g.background), g.background, 3, component);
      }
      add(`${component}.unchecked.fill`, `${component} enabled unchecked fill on global surface`,
        fill, g.background, 3, component);
      if (component === "switch") {
        add("switch.unchecked.thumb", "Switch enabled unchecked thumb on track",
          uncheckedColor(c.foreground, g.background), fill, 3, component);
      }
    }
    if (component === "input" || choice) {
      add(`${component}.label`, `${component} label on global surface`, g.foreground, g.background, 4.5, component);
      add(`${component}.description`, `${component} description on global surface`, g.mutedForeground, g.background, 4.5, component);
    }
  }

  const button = resolveComponent(system, "button");
  for (const [variant, ink, fill] of [
    ["primary", button.foreground, button.background],
    ["secondary", g.onSecondary, g.secondary],
    ["destructive", g.onDanger, g.danger],
  ]) {
    add(`button.${variant}.text`, `Button ${variant} text`, ink, fill, 4.5, "button");
    // brightness(.94) filters BOTH opaque ink and fill, not their WCAG luminance.
    add(`button.${variant}.hover`, `Button ${variant} hover text (brightness .94)`,
      mixColors(ink, "#000000", 0.94), mixColors(fill, "#000000", 0.94), 4.5, "button");
  }
  for (const variant of ["outline", "ghost"]) {
    add(`button.${variant}.text`, `Button ${variant} text on global surface`, g.foreground, g.background, 4.5, "button");
    add(`button.${variant}.hover`, `Button ${variant} hover text on muted`, g.foreground, g.muted, 4.5, "button");
  }
  if (button.borderWidth > 0) {
    add("button.outline.boundary", "Button outline border on global surface", g.border, g.background, 3, "button");
  }
  add("button.link.text", "Button link text on global surface", g.primary, g.background, 4.5, "button");

  const input = resolveComponent(system, "input");
  // Current ::placeholder uses mutedForeground directly, NOT the 70% text mix.
  // Assumes opaque placeholder rendering; browser-specific UA opacity is excluded.
  add("input.placeholder", "Input placeholder on resolved background", g.mutedForeground, input.background, 4.5, "input");
  add("input.readonly.text", "Read-only input text on muted", input.foreground, g.muted, 4.5, "input");
  add("input.readonly.placeholder", "Read-only input placeholder on muted", g.mutedForeground, g.muted, 4.5, "input");

  const card = resolveComponent(system, "card");
  const description = mixColors(card.foreground, card.background, 0.7);
  add("card.description", "Card description (70% foreground) on background", description, card.background, 4.5, "card");
  add("card.filled.text", "Filled card text on muted", card.foreground, g.muted, 4.5, "card");
  // Filled changes the painted surface, but the description STILL mixes with card-background.
  add("card.filled.description", "Filled card description (mix retains card background) on muted", description, g.muted, 4.5, "card");

  const badge = resolveComponent(system, "badge");
  for (const tone of ["neutral", "primary", "success", "warning", "danger", "info"] as const) {
    const role = roles.find(([name]) => name === tone);
    const fill = role ? g[role[0]] : badge.foreground;
    const onFill = role ? g[role[1]] : badge.background;
    const ink = role ? mixColors(fill, g.foreground, 0.6) : badge.foreground;
    add(`badge.${tone}.solid`, `Badge ${tone} solid text`, onFill, fill, 4.5, "badge");
    add(`badge.${tone}.subtle`, `Badge ${tone} subtle text (12% tone surface)`,
      ink, mixColors(fill, badge.background, 0.12), 4.5, "badge");
    // Outline keeps an OPAQUE badge-background, even when overridden.
    add(`badge.${tone}.outline`, `Badge ${tone} outline text on badge background`, ink, badge.background, 4.5, "badge");
  }
  return checks;
}
