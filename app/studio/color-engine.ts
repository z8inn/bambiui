import type { TokenValues } from "./tokens";

export type PaletteMode = "light" | "dark";
export const paletteRoles = ["primary", "secondary", "success", "warning", "danger", "info"] as const;
export type PaletteRole = (typeof paletteRoles)[number];
export type ColorTokens = Pick<TokenValues,
  | "background" | "foreground" | "muted" | "mutedForeground" | "border"
  | "primary" | "onPrimary" | "secondary" | "onSecondary"
  | "success" | "onSuccess" | "warning" | "onWarning"
  | "danger" | "onDanger" | "info" | "onInfo"
>;
export type RoleColors = {
  solid: string; onSolid: string; hover: string; active: string;
  subtle: string; onSubtle: string; outline: string; focus: string;
};
export type GeneratedTheme = { tokens: ColorTokens; roles: Record<PaletteRole, RoleColors> };
export type GeneratedPalette = {
  source: string;
  scales: Record<PaletteRole | "neutral", string[]>;
  light: GeneratedTheme;
  dark: GeneratedTheme;
};

type RGB = [number, number, number];
type Family = { c: number; h: number };
const clamp = (n: number) => Math.max(0, Math.min(1, n));

function normalize(color: string): string {
  if (typeof color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(color)) {
    throw new TypeError("Expected a six-digit hex color (#rrggbb)");
  }
  return color.toLowerCase();
}
function rgb(color: string): RGB {
  const hex = normalize(color);
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as RGB;
}
function hex(channels: RGB): string {
  return `#${channels.map((n) => Math.round(clamp(n) * 255).toString(16).padStart(2, "0")).join("")}`;
}
const linear = (n: number) => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
const encoded = (n: number) => n <= 0.0031308 ? 12.92 * n : 1.055 * n ** (1 / 2.4) - 0.055;
function luminance(color: string): number {
  const [r, g, b] = rgb(color).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** WCAG contrast of opaque, final sRGB colors; no threshold rounding. */
export function contrastRatio(fg: string, bg: string): number {
  const a = luminance(fg), b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
/** Encoded sRGB compositing: weight is the foreground fraction, in [0, 1]. */
export function mixColors(fg: string, bg: string, weight: number): string {
  const a = rgb(fg), b = rgb(bg);
  if (!Number.isFinite(weight) || weight < 0 || weight > 1) {
    throw new RangeError("Color weight must be finite and between 0 and 1");
  }
  return hex(a.map((v, i) => v * weight + b[i] * (1 - weight)) as RGB);
}
function family(color: string): Family {
  const [r, g, b] = rgb(color).map(linear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const c = Math.hypot(a, bb);
  return { c: c < 0.000001 ? 0 : c, h: c < 0.000001 ? 0 : Math.atan2(bb, a) };
}
function toLinear(lightness: number, c: number, h: number): RGB {
  const a = c * Math.cos(h), b = c * Math.sin(h);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}
function tone(lightness: number, { c, h }: Family): string {
  const inGamut = (v: RGB) => v.every((n) => n >= 0 && n <= 1);
  let channels = toLinear(lightness, c, h);
  if (!inGamut(channels)) {
    // Reduce chroma, not individual channels, to retain the intended hue.
    let low = 0, high = c;
    for (let i = 0; i < 28; i++) {
      const mid = (low + high) / 2;
      if (inGamut(toLinear(lightness, mid, h))) low = mid;
      else high = mid;
    }
    channels = toLinear(lightness, low, h);
  }
  return hex(channels.map(encoded) as RGB);
}

function theme(mode: PaletteMode, families: Record<PaletteRole | "neutral", Family>): GeneratedTheme {
  const dark = mode === "dark";
  const background = tone(dark ? 0.14 : 0.985, families.neutral);
  const muted = tone(dark ? 0.22 : 0.95, families.neutral);
  const surfaces = [background, muted];
  const against = (color: string, backgrounds: string[], minimum: number) =>
    backgrounds.every((bg) => contrastRatio(color, bg) >= minimum);
  // Search toward the contrasting pole, checking every quantized candidate.
  const choose = (f: Family, start: number, predicate: (color: string) => boolean) => {
    for (let i = 0; i <= 1000; i++) {
      const color = tone(clamp(start + (dark ? 1 : -1) * i / 1000), f);
      if (predicate(color)) return color;
    }
    throw new Error("Unable to generate an accessible usage tone");
  };
  const roles = {} as Record<PaletteRole, RoleColors>;
  for (const role of paletteRoles) {
    const f = families[role];
    const onSolid = dark ? "#000000" : "#ffffff";
    const safeSolid = (color: string) => against(color, surfaces, 4.5) && contrastRatio(onSolid, color) >= 4.5;
    const solid = choose(f, dark ? 0.7 : 0.55, safeSolid);
    const hover = choose(f, dark ? 0.78 : 0.48, safeSolid);
    const active = choose(f, dark ? 0.85 : 0.41, safeSolid);
    const subtle = mixColors(solid, background, dark ? 0.18 : 0.1);
    const onSubtle = choose(f, dark ? 0.75 : 0.48, (color) => against(color, [subtle], 4.5));
    const outline = choose(f, dark ? 0.62 : 0.62, (color) => against(color, surfaces, 3));
    roles[role] = { solid, onSolid, hover, active, subtle, onSubtle, outline, focus: outline };
  }
  const foreground = choose(families.neutral, dark ? 0.92 : 0.22, (c) => against(c, surfaces, 4.5));
  const mutedForeground = choose(families.neutral, dark ? 0.7 : 0.55, (c) => against(c, surfaces, 4.5));
  const border = choose(families.neutral, 0.62, (c) => against(c, surfaces, 3));
  return { roles, tokens: {
    background, foreground, muted, mutedForeground, border,
    primary: roles.primary.solid, onPrimary: roles.primary.onSolid,
    secondary: roles.secondary.solid, onSecondary: roles.secondary.onSolid,
    success: roles.success.solid, onSuccess: roles.success.onSolid,
    warning: roles.warning.solid, onWarning: roles.warning.onSolid,
    danger: roles.danger.solid, onDanger: roles.danger.onSolid,
    info: roles.info.solid, onInfo: roles.info.onSolid,
  } };
}

/** Pure and dependency-free. Scales have 12 stops, ordered light to dark in both modes. */
export function generatePalette(source: string): GeneratedPalette {
  source = normalize(source);
  const seed = family(source);
  const semanticChroma = 0.12 + Math.min(seed.c, 0.3) * 0.2;
  const semantic = (degrees: number): Family => ({ c: semanticChroma, h: degrees * Math.PI / 180 });
  const families: Record<PaletteRole | "neutral", Family> = {
    primary: seed,
    secondary: { c: seed.c * 0.6, h: seed.h + Math.PI / 3 },
    neutral: { c: Math.min(seed.c * 0.08, 0.018), h: seed.h },
    success: semantic(145), warning: semantic(80), danger: semantic(25), info: semantic(255),
  };
  const stops = [0.985, 0.95, 0.9, 0.84, 0.76, 0.68, 0.6, 0.52, 0.44, 0.36, 0.26, 0.16];
  const scales = {} as GeneratedPalette["scales"];
  for (const role of [...paletteRoles, "neutral"] as const) {
    scales[role] = stops.map((l) => tone(l, families[role]));
  }
  return { source, scales, light: theme("light", families), dark: theme("dark", families) };
}
