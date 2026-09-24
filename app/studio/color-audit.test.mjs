import assert from "node:assert/strict";
import test from "node:test";
import { auditSystemColors } from "./color-audit.ts";
import { contrastRatio, generatePalette, mixColors } from "./color-engine.ts";
import { componentIds, defaultSystem } from "./tokens.ts";

const fresh = () => structuredClone(defaultSystem);
const byId = (system = fresh()) => new Map(auditSystemColors(system).map((c) => [c.id, c]));

function pair(check, foreground, background, minimum = 4.5) {
  assert.ok(check);
  assert.equal(check.foreground, foreground);
  assert.equal(check.background, background);
  assert.equal(check.minimum, minimum);
  assert.equal(check.ratio, contrastRatio(foreground, background));
  assert.equal(check.passes, check.ratio >= minimum);
}

test("known ratios and unrounded threshold decisions", () => {
  const system = fresh();
  system.global.foreground = "#000000";
  const checks = byId(system);
  assert.equal(checks.get("global.foreground.background").ratio, 21);
  system.global.foreground = "#777777";
  const check = byId(system).get("global.foreground.background");
  assert.ok(Math.abs(check.ratio - 4.478089453577214) < 1e-12);
  assert.equal(check.passes, false);
  system.global.foreground = "#ffffff";
  assert.equal(byId(system).get("global.foreground.background").ratio, 1);
});

test("default diagnostics expose failures, are finite, deterministic and pure", () => {
  const system = fresh();
  const before = structuredClone(system);
  const checks = auditSystemColors(system);
  assert.deepEqual(system, before);
  assert.deepEqual(auditSystemColors(system), checks);
  assert.equal(new Set(checks.map((c) => c.id)).size, checks.length);
  assert.equal(checks.filter((c) => !c.component && c.minimum === 4.5).length, 17);
  for (const c of checks) {
    assert.ok(Number.isFinite(c.ratio) && c.ratio >= 1 && c.ratio <= 21);
    assert.ok(c.label.length > 0);
    assert.equal(c.passes, c.ratio >= c.minimum);
    assert.ok(!/disabled/i.test(c.label));
  }
  const indexed = byId(system);
  for (const id of ["global.onPrimary.primary", "global.primary.background", "global.border.background", "button.foreground", "input.boundary", "switch.unchecked.boundary", "checkbox.unchecked.boundary"]) {
    assert.equal(indexed.get(id).passes, false, id);
  }
  for (const id of componentIds) assert.ok(checks.some((c) => c.component === id));
});

test("equal component overrides fail text and non-text marks without changing globals", () => {
  const system = fresh();
  for (const id of componentIds) {
    system.components[id] = { foreground: "#123456", background: "#123456" };
  }
  const checks = byId(system);
  for (const id of componentIds) {
    const check = checks.get(`${id}.foreground`);
    assert.equal(check.ratio, 1);
    assert.equal(check.passes, false);
    assert.equal(check.minimum, ["switch", "checkbox"].includes(id) ? 3 : 4.5);
  }
  assert.deepEqual(auditSystemColors(system).filter((c) => !c.component),
    auditSystemColors(fresh()).filter((c) => !c.component));
});

test("placeholder uses current CSS ink; card description retains its mix on filled surface", () => {
  const system = fresh();
  system.components.input = { foreground: "#ff0000", background: "#123456" };
  system.components.card = { foreground: "#000000", background: "#ffffff" };
  system.global.muted = "#445566";
  const checks = byId(system);
  pair(checks.get("input.placeholder"), system.global.mutedForeground, "#123456");
  pair(checks.get("input.readonly.placeholder"), system.global.mutedForeground, "#445566");
  pair(checks.get("card.description"), "#4d4d4d", "#ffffff");
  pair(checks.get("card.filled.description"), "#4d4d4d", "#445566");
  pair(checks.get("card.filled.text"), "#000000", "#445566");
});

test("all semantic badge mixes use overridden badge background, not global background", () => {
  const system = fresh();
  system.components.badge = { background: "#102030", foreground: "#abcdef" };
  const checks = byId(system);
  for (const tone of ["primary", "success", "warning", "danger", "info"]) {
    const ink = mixColors(system.global[tone], system.global.foreground, 0.6);
    pair(checks.get(`badge.${tone}.outline`), ink, "#102030");
    pair(checks.get(`badge.${tone}.subtle`), ink, mixColors(system.global[tone], "#102030", 0.12));
    assert.notEqual(checks.get(`badge.${tone}.subtle`).background,
      mixColors(system.global[tone], system.global.background, 0.12));
  }
  pair(checks.get("badge.neutral.solid"), "#102030", "#abcdef");
  pair(checks.get("badge.neutral.outline"), "#abcdef", "#102030");
  pair(checks.get("badge.neutral.subtle"), "#abcdef", mixColors("#abcdef", "#102030", 0.12));
});

test("enabled unchecked grayscale runs in encoded sRGB before group alpha", () => {
  const system = fresh();
  system.global.background = "#204060";
  for (const id of ["switch", "checkbox"]) {
    system.components[id] = { border: "#ff0000", background: "#00ff00", foreground: "#0000ff" };
  }
  const checks = byId(system);
  // Red grayscale = 54.213; green = 182.376; blue = 18.411 (0..255).
  // Half opacity over [32,64,96], rounded only after compositing.
  for (const id of ["switch", "checkbox"]) {
    pair(checks.get(`${id}.unchecked.boundary`), "#2b3b4b", "#204060", 3);
    pair(checks.get(`${id}.unchecked.fill`), "#6b7b8b", "#204060", 3);
    assert.match(checks.get(`${id}.unchecked.boundary`).label, /enabled unchecked boundary/);
  }
  pair(checks.get("switch.unchecked.thumb"), "#192939", "#6b7b8b", 3);
  assert.equal(checks.has("checkbox.unchecked.mark"), false);
});

test("opaque button hover brightness filters ink AND fill in sRGB", () => {
  const system = fresh();
  system.components.button = { foreground: "#ffffff", background: "#808080" };
  const checks = byId(system);
  pair(checks.get("button.primary.hover"), "#f0f0f0", "#787878");
  for (const [variant, ink, fill] of [
    ["secondary", system.global.onSecondary, system.global.secondary],
    ["destructive", system.global.onDanger, system.global.danger],
  ]) {
    pair(checks.get(`button.${variant}.hover`), mixColors(ink, "#000000", 0.94), mixColors(fill, "#000000", 0.94));
  }
  pair(checks.get("button.outline.hover"), system.global.foreground, system.global.muted);
});

test("absent borders never receive passing boundary checks", () => {
  const system = fresh();
  system.global.borderWidth = 0;
  system.global.border = "#000000";
  for (const id of componentIds) system.components[id].borderWidth = 0;
  const checks = auditSystemColors(system);
  assert.ok(!checks.some((c) => c.id.includes("boundary") || c.id.startsWith("global.border.")));
  assert.ok(checks.some((c) => c.id === "switch.unchecked.fill"));
  system.components.input.borderWidth = 1;
  assert.equal(byId(system).get("input.boundary").passes, true);
  assert.equal(byId(system).has("checkbox.boundary"), false);
});

test("generated global pairs pass independently of current component implementation failures", () => {
  const palette = generatePalette("#e8673c");
  for (const mode of ["light", "dark"]) {
    const system = fresh();
    Object.assign(system.global, palette[mode].tokens);
    const checks = auditSystemColors(system);
    const globals = checks.filter((c) => !c.component);
    assert.equal(globals.length, 19);
    assert.ok(globals.every((c) => c.passes), `${mode}: ${globals.filter((c) => !c.passes).map((c) => c.id)}`);
    const failures = checks.filter((c) => c.component && !c.passes);
    assert.ok(failures.length > 0, `${mode} must not claim current CSS compliance`);
    assert.ok(failures.some((c) => c.id.endsWith("unchecked.boundary")), mode);
  }
});
