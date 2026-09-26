import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { defaultSystem, exportCSS, parseDesignSystem, resolveComponent, toCSSVariables } from "./tokens.ts";
import { colorScaleStops, contrastRatio, deriveRoleColors, generateColorScale, generatePalette, mixColors, paletteRoles } from "./color-engine.ts";

const seeds = ["#000000", "#ffffff", "#808080", "#010101", "#fefefe", "#ff0000", "#00ff00", "#0000ff", "#ffff00", "#00ffff", "#ff00ff", "#e8673c", "#123456", "#faf0ff"];
const channels = (hex) => hex.slice(1).match(/../g).map((s) => parseInt(s, 16) / 255);
const luminance = (hex) => channels(hex).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
const meets = (a, b, threshold) => assert.ok(ratio(a, b) >= threshold, `${a} / ${b}: ${ratio(a, b)} < ${threshold}`);
const hue = (hex) => {
  const [r, g, b] = channels(hex).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return (Math.atan2(0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s) * 180 / Math.PI + 360) % 360;
};
const hueDistance = (a, b) => Math.abs((a - b + 540) % 360 - 180);

function checkPalette(palette) {
  for (const mode of ["light", "dark"]) {
    const { tokens, roles } = palette[mode];
    assert.equal(Object.keys(tokens).length, 17);
    assert.deepEqual(Object.keys(roles), [...paletteRoles]);
    for (const bg of [tokens.background, tokens.muted]) {
      meets(tokens.foreground, bg, 4.5);
      meets(tokens.mutedForeground, bg, 4.5);
      meets(tokens.border, bg, 3);
      meets(tokens.primary, bg, 3);
      meets(roles.primary.onSubtle, bg, 4.5);
      for (const role of paletteRoles) {
        const colors = roles[role];
        for (const state of ["solid", "hover", "active"]) meets(colors[state], bg, 3);
        meets(colors.outline, bg, 3);
        meets(colors.focus, bg, 3);
      }
    }
    for (const role of paletteRoles) {
      const colors = roles[role];
      assert.equal(tokens[role], colors.solid);
      assert.equal(tokens[`on${role[0].toUpperCase()}${role.slice(1)}`], colors.onSolid);
      for (const state of ["solid", "hover", "active"]) meets(colors.onSolid, colors[state], 4.5);
      assert.equal(colors.subtle, mixColors(colors.solid, tokens.background, mode === "dark" ? 0.18 : 0.1));
      meets(colors.onSubtle, colors.subtle, 4.5);
      meets(colors.onSubtle, tokens.background, 4.5);
      assert.deepEqual(colors, deriveRoleColors(colors.solid, colors.onSolid, tokens.background, mode, tokens.muted));
      assert.equal(Object.keys(colors).length, 8);
      for (const value of Object.values(colors)) assert.match(value, /^#[0-9a-f]{6}$/);
      assert.notEqual(colors.solid, "#ffffff");
      assert.notEqual(colors.solid, "#000000");
    }
    for (const value of Object.values(tokens)) assert.match(value, /^#[0-9a-f]{6}$/);
  }
  assert.deepEqual(Object.keys(palette.scales), [...paletteRoles, "neutral"]);
  for (const scale of Object.values(palette.scales)) {
    assert.equal(scale.length, 12);
    assert.equal(new Set(scale).size, 12);
    scale.forEach((color, i) => {
      assert.match(color, /^#[0-9a-f]{6}$/);
      if (i) assert.ok(luminance(scale[i - 1]) > luminance(color));
    });
  }
}

for (const seed of seeds) test(`accessible, deterministic palette: ${seed}`, () => {
  const palette = generatePalette(seed);
  assert.equal(palette.source, seed);
  assert.deepEqual(palette, generatePalette(seed));
  checkPalette(palette);
  for (const [role, expected] of Object.entries({ success: 145, warning: 80, danger: 25, info: 255 })) {
    for (const mode of ["light", "dark"]) {
      for (const state of ["solid", "hover", "active", "onSubtle", "outline", "focus"]) {
        assert.ok(hueDistance(hue(palette[mode].roles[role][state]), expected) < 4, `${role} ${state} hue`);
      }
    }
    assert.ok(hueDistance(hue(palette.scales[role][6]), expected) < 2);
  }
});

test("role scales use their own input color and ascending light-to-dark stops", () => {
  for (const source of seeds) {
    const scale = generateColorScale(source);
    assert.deepEqual(Object.keys(scale).map(Number), colorScaleStops);
    for (const stop of colorScaleStops) assert.match(scale[stop], /^#[0-9a-f]{6}$/);
    for (let i = 1; i < colorScaleStops.length; i++) {
      assert.ok(luminance(scale[colorScaleStops[i - 1]]) > luminance(scale[colorScaleStops[i]]));
    }
    assert.deepEqual(generateColorScale(source), scale);
  }
  assert.notDeepEqual(generateColorScale("#ff0000"), generateColorScale("#0000ff"));
  assert.throws(() => generateColorScale("#fff"), /six-digit hex/);
});

test("strict six-digit hex validation across public helpers", () => {
  for (const value of [null, undefined, 123456, {}, "", "red", "123456", "#fff", "#12345678", " #123456", "#123456\n", "#gg0000"]) {
    assert.throws(() => generatePalette(value), /six-digit hex/);
    assert.throws(() => contrastRatio(value, "#ffffff"), /six-digit hex/);
    assert.throws(() => contrastRatio("#ffffff", value), /six-digit hex/);
    assert.throws(() => mixColors(value, "#ffffff", 0.5), /six-digit hex/);
    assert.throws(() => mixColors("#ffffff", value, 0.5), /six-digit hex/);
  }
});

test("brand source remains the light primary fill when dark ink and boundaries are accessible", () => {
  const palette = generatePalette("#e8673c");
  assert.equal(palette.light.tokens.primary, palette.source);
  assert.equal(palette.light.tokens.onPrimary, "#291b15");
  meets(palette.light.tokens.onPrimary, palette.light.tokens.primary, 4.5);
  assert.notEqual(palette.light.roles.primary.hover, palette.light.tokens.primary);
  assert.notEqual(palette.light.roles.primary.active, palette.light.roles.primary.hover);
  meets(palette.light.roles.primary.onSubtle, palette.light.tokens.background, 4.5);
  meets(palette.light.roles.primary.onSubtle, palette.light.tokens.muted, 4.5);
  checkPalette(palette);
});

test("source is normalized without replacing the user's chromatic seed", () => {
  const p = generatePalette("#FaF0FF");
  assert.equal(p.source, "#faf0ff");
  assert.deepEqual(p, generatePalette("#faf0ff"));
  assert.notEqual(p.light.tokens.primary, p.source);
  assert.ok(hueDistance(hue(p.light.tokens.primary), hue(p.source)) < 4);
});

test("sRGB mix quantizes before contrast checks; thresholds are not rounded", () => {
  assert.equal(mixColors("#ffffff", "#000000", 0.5), "#808080");
  assert.equal(mixColors("#abcdef", "#123456", 1), "#abcdef");
  assert.equal(mixColors("#abcdef", "#123456", 0), "#123456");
  assert.equal(mixColors("#010101", "#000000", 0.5), "#010101");
  for (const weight of [-1, 1.001, Infinity, NaN, "0.5", undefined]) {
    assert.throws(() => mixColors("#ffffff", "#000000", weight), RangeError);
  }
  assert.equal(contrastRatio("#000000", "#ffffff"), 21);
  assert.equal(contrastRatio("#123456", "#123456"), 1);
  for (const [fail, pass, threshold] of [["#777777", "#767676", 4.5], ["#959595", "#949494", 3]]) {
    assert.ok(contrastRatio(fail, "#ffffff") < threshold);
    assert.ok(contrastRatio(pass, "#ffffff") >= threshold);
    assert.equal(contrastRatio(fail, "#ffffff"), ratio(fail, "#ffffff"));
  }
});

test("results, themes and scale arrays are independent", () => {
  const original = generatePalette("#e8673c");
  const changed = generatePalette("#e8673c");
  changed.light.tokens.primary = "#000000";
  changed.light.roles.primary.solid = "#000000";
  changed.scales.primary[0] = "#000000";
  assert.deepEqual(generatePalette("#e8673c"), original);
  assert.deepEqual(changed.dark, original.dark);
  assert.deepEqual(changed.scales.neutral, original.scales.neutral);
  assert.notDeepEqual(original.scales.primary, generatePalette("#2563eb").scales.primary);
  assert.notDeepEqual(original.scales.neutral, generatePalette("#2563eb").scales.neutral);
});

test("achromatic seeds remain neutral, chromatic scales preserve hue", () => {
  for (const seed of ["#000000", "#808080", "#ffffff"]) {
    for (const color of generatePalette(seed).scales.primary) {
      const [r, g, b] = channels(color);
      assert.equal(r, g);
      assert.equal(g, b);
    }
  }
  for (const seed of ["#ff0000", "#00ff00", "#0000ff", "#e8673c"]) {
    for (const color of generatePalette(seed).scales.primary.slice(2, 10)) {
      assert.ok(hueDistance(hue(seed), hue(color)) < 3);
    }
  }
});

test("applied palettes round-trip through the existing schema without losing overrides or dimensions", () => {
  for (const mode of ["light", "dark"]) {
    const palette = generatePalette("#e8673c");
    const system = structuredClone(defaultSystem);
    const theme = system.themes[mode];
    theme.global.radius = 17;
    theme.global.fontSize = 19;
    theme.components.button.background = "#123456";
    theme.components.card.paddingX = 0;
    const applied = structuredClone(system);
    applied.themes[mode] = { ...theme, source: palette.source, global: { ...theme.global, ...palette[mode].tokens } };
    const restored = parseDesignSystem(JSON.stringify(applied));
    assert.deepEqual(restored, applied);
    const restoredTheme = restored.themes[mode];
    assert.equal(restoredTheme.source, palette.source);
    assert.equal(restoredTheme.global.radius, 17);
    assert.equal(restoredTheme.global.fontSize, 19);
    assert.deepEqual(restoredTheme.components, theme.components);
    assert.equal(resolveComponent(restoredTheme, "button").background, "#123456");
    assert.equal(resolveComponent(restoredTheme, "card").paddingX, 0);
    assert.ok(exportCSS(restored).includes(`--ds-primary: ${palette[mode].tokens.primary};`));
    assert.ok(exportCSS(restored).includes("--button-background: #123456;"));
    assert.deepEqual(theme.global, { ...defaultSystem.themes[mode].global, radius: 17, fontSize: 19 });
  }
});

test("CLI emits a deterministic source-preserving recipe, not a studio backup", () => {
  const script = fileURLToPath(new URL("../../scripts/generate-palette.mjs", import.meta.url));
  const run = (...args) => spawnSync(process.execPath, ["--experimental-strip-types", script, ...args], { encoding: "utf8", timeout: 10000 });
  const valid = run("#E8673C");
  assert.equal(valid.status, 0, valid.stderr);
  assert.deepEqual(JSON.parse(valid.stdout), { format: "bambiui.color-recipe", version: 1, ...generatePalette("#e8673c") });
  assert.throws(() => parseDesignSystem(valid.stdout));
  for (const args of [[], ["#fff"], ["#ffffff", "#000000"]]) {
    const result = run(...args);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /Usage:|six-digit hex/);
  }
});

test("manual role derivation preserves exact values and tolerates impossible pairs", () => {
  for (const mode of ["light", "dark"]) {
    const colors = deriveRoleColors("#AbCdEf", "#777777", "#000000", mode);
    assert.equal(colors.solid, "#AbCdEf");
    assert.equal(colors.onSolid, "#777777");
    assert.equal(colors.hover, colors.solid);
    assert.equal(colors.active, colors.solid);
    assert.ok(ratio(colors.onSolid, colors.hover) < 4.5);
    for (const solid of seeds) {
      const result = deriveRoleColors(solid, "#FFFFFF", "#ffffff", mode, "#eeeeee");
      assert.equal(result.solid, solid);
      assert.equal(result.onSolid, "#FFFFFF");
      for (const state of ["hover", "active"]) {
        meets(result[state], result.onSolid, 4.5);
        meets(result[state], "#ffffff", 3);
        meets(result[state], "#eeeeee", 3);
      }
    }
  }
});

test("cached derivation preserves pre-optimization results and isolates every returned object", () => {
  const fixtures = [
    {
      args: ["#AbCdEf", "#777777", "#000000", "light", "#ffffff"],
      expected: { solid: "#AbCdEf", onSolid: "#777777", hover: "#AbCdEf", active: "#AbCdEf", subtle: "#111518", onSubtle: "#6181a0", outline: "#6a8aa9", focus: "#6a8aa9" },
    },
    {
      args: ["#AbCdEf", "#777777", "#000000", "dark", "#ffffff"],
      expected: { solid: "#AbCdEf", onSolid: "#777777", hover: "#AbCdEf", active: "#AbCdEf", subtle: "#1f252b", onSubtle: "#91b2d3", outline: "#6a8aa9", focus: "#6a8aa9" },
    },
    {
      args: ["#e8673c", "#ffffff", "#ffffff", "light", "#eeeeee"],
      expected: { solid: "#e8673c", onSolid: "#ffffff", hover: "#a23200", active: "#822600", subtle: "#fdf0ec", onSubtle: "#a23200", outline: "#d8582c", focus: "#d8582c" },
    },
    {
      args: ["#e8673c", "#ffffff", "#ffffff", "dark", "#eeeeee"],
      expected: { solid: "#e8673c", onSolid: "#ffffff", hover: "#000000", active: "#000000", subtle: "#fbe4dc", onSubtle: "#000000", outline: "#d8582c", focus: "#d8582c" },
    },
  ];
  for (const { args, expected } of fixtures) {
    const first = deriveRoleColors(...args);
    assert.deepEqual(first, expected);
    for (const key of Object.keys(first)) first[key] = "#123456";
    const hit = deriveRoleColors(...args);
    assert.notEqual(hit, first);
    assert.deepEqual(hit, expected);
    for (const key of Object.keys(hit)) delete hit[key];
    assert.deepEqual(deriveRoleColors(...args), expected);
  }
  // Churn beyond the bounded cache; eviction must not affect numeric results.
  for (let i = 0; i < 257; i++) {
    deriveRoleColors(`#${i.toString(16).padStart(6, "0")}`, "#ffffff", "#ffffff", "light");
  }
  for (const { args, expected } of fixtures) assert.deepEqual(deriveRoleColors(...args), expected);
});

test("cache keys retain exact inputs and validation precedes lookup", () => {
  const args = ["#AbCdEf", "#FFFFFF", "#000000", "light", "#ffffff"];
  const expected = deriveRoleColors(...args);
  const lowercase = deriveRoleColors("#abcdef", "#ffffff", ...args.slice(2));
  assert.equal(lowercase.solid, "#abcdef");
  assert.equal(lowercase.onSolid, "#ffffff");
  assert.deepEqual(deriveRoleColors(...args), expected);
  for (const index of [0, 1, 2, 4]) {
    for (const invalid of [null, 123456, "#fff", "red", { toJSON: () => args[index] }]) {
      const invalidArgs = [...args];
      invalidArgs[index] = invalid;
      assert.throws(() => deriveRoleColors(...invalidArgs), /six-digit hex/);
    }
  }
  assert.deepEqual(
    deriveRoleColors(...args.slice(0, 4)),
    deriveRoleColors(...args.slice(0, 4), args[2]),
  );
});

test("default runtime role variables match the generated recipe in both themes", () => {
  const palette = generatePalette("#e8673c");
  for (const mode of ["light", "dark"]) {
    const theme = defaultSystem.themes[mode];
    assert.equal(theme.source, palette.source);
    const css = toCSSVariables(theme, mode);
    for (const role of paletteRoles) {
      for (const [key, suffix] of Object.entries({ hover: "hover", active: "active", subtle: "subtle", onSubtle: "on-subtle", outline: "outline", focus: "focus" })) {
        assert.equal(css[`--ds-${role}-${suffix}`], palette[mode].roles[role][key]);
      }
    }
  }
});

test("component CSS contract derives override states from their actual surfaces", () => {
  for (const mode of ["light", "dark"]) {
    const theme = structuredClone(defaultSystem.themes[mode]);
    theme.components.button.background = "#AbCdEf";
    theme.components.button.foreground = "#777777";
    theme.components.badge.background = "#123456";
    theme.components.badge.foreground = "#ffffff";
    theme.components.card.background = "#123456";
    theme.components.card.foreground = "#ffffff";
    const original = structuredClone(theme);
    const css = toCSSVariables(theme, mode);
    const button = deriveRoleColors("#AbCdEf", "#777777", theme.global.background, mode, theme.global.muted);
    assert.equal(css["--button-hover"], button.hover);
    assert.equal(css["--button-active"], button.active);
    assert.equal(css["--button-background"], "#AbCdEf");
    for (const tone of ["neutral", "primary", "success", "warning", "danger", "info"]) {
      const solid = tone === "neutral" ? "#ffffff" : theme.global[tone];
      const ink = tone === "neutral" ? "#123456" : theme.global[`on${tone[0].toUpperCase()}${tone.slice(1)}`];
      const colors = deriveRoleColors(solid, ink, "#123456", mode);
      assert.equal(css[`--badge-${tone}-subtle`], colors.subtle);
      assert.equal(css[`--badge-${tone}-on-subtle`], colors.onSubtle);
      assert.equal(css[`--badge-${tone}-outline`], colors.outline);
    }
    meets(css["--card-description"], "#123456", 4.5);
    meets(css["--card-filled-description"], theme.global.muted, 4.5);
    for (const [key, value] of Object.entries({
      "--ds-control-inset": "2px", "--ds-checkbox-inset": "6px",
      "--ds-spinner-duration": "800ms", "--ds-card-icon-border-width": "1px",
    })) assert.equal(css[key], value);
    assert.ok(css["--ds-switch-thumb-shadow"]);
    assert.deepEqual(theme, original);
  }
});

test("deterministic RGB grid exercises gamut edges and all role pairs", () => {
  for (const r of [0, 64, 128, 192, 255]) {
    for (const g of [0, 64, 128, 192, 255]) {
      for (const b of [0, 64, 128, 192, 255]) {
        checkPalette(generatePalette(`#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`));
      }
    }
  }
});
