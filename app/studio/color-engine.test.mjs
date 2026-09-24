import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { defaultSystem, exportCSS, parseDesignSystem, resolveComponent } from "./tokens.ts";
import { contrastRatio, generatePalette, mixColors, paletteRoles } from "./color-engine.ts";

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
      meets(tokens.primary, bg, 4.5);
      for (const role of paletteRoles) {
        const colors = roles[role];
        meets(colors.solid, bg, 3);
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

test("strict six-digit hex validation across public helpers", () => {
  for (const value of [null, undefined, 123456, {}, "", "red", "123456", "#fff", "#12345678", " #123456", "#123456\n", "#gg0000"]) {
    assert.throws(() => generatePalette(value), /six-digit hex/);
    assert.throws(() => contrastRatio(value, "#ffffff"), /six-digit hex/);
    assert.throws(() => contrastRatio("#ffffff", value), /six-digit hex/);
    assert.throws(() => mixColors(value, "#ffffff", 0.5), /six-digit hex/);
    assert.throws(() => mixColors("#ffffff", value, 0.5), /six-digit hex/);
  }
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
    system.global.radius = 17;
    system.global.fontSize = 19;
    system.components.button.background = "#123456";
    system.components.card.paddingX = 0;
    const applied = { ...system, global: { ...system.global, ...palette[mode].tokens } };
    const restored = parseDesignSystem(JSON.stringify(applied));
    assert.deepEqual(restored, applied);
    assert.equal(restored.global.radius, 17);
    assert.equal(restored.global.fontSize, 19);
    assert.deepEqual(restored.components, system.components);
    assert.equal(resolveComponent(restored, "button").background, "#123456");
    assert.equal(resolveComponent(restored, "card").paddingX, 0);
    assert.ok(exportCSS(restored).includes(`--ds-primary: ${palette[mode].tokens.primary};`));
    assert.ok(exportCSS(restored).includes("--button-background: #123456;"));
    assert.deepEqual(system.global, { ...defaultSystem.global, radius: 17, fontSize: 19 });
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

test("deterministic RGB grid exercises gamut edges and all role pairs", () => {
  for (const r of [0, 64, 128, 192, 255]) {
    for (const g of [0, 64, 128, 192, 255]) {
      for (const b of [0, 64, 128, 192, 255]) {
        checkPalette(generatePalette(`#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`));
      }
    }
  }
});
