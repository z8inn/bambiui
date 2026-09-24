import assert from "node:assert/strict";
import test from "node:test";
import {
  componentIds,
  defaultSystem,
  exportCSS,
  parseDesignSystem,
  resolveComponent,
  STORAGE_KEY,
  toCSSVariables,
  tokenFields,
} from "./tokens.ts";

const freshSystem = () => structuredClone(defaultSystem);
const parse = (system) => parseDesignSystem(JSON.stringify(system));
const numericRanges = {
  radius: [0, 48],
  paddingX: [0, 64],
  paddingY: [0, 64],
  gap: [0, 64],
  margin: [0, 48],
  fontSize: [10, 32],
  borderWidth: [0, 6],
};
const colorKeys = [
  "background",
  "foreground",
  "primary",
  "onPrimary",
  "border",
];
const kebab = (key) =>
  key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

function deepFreeze(value) {
  for (const child of Object.values(value)) {
    if (child && typeof child === "object") deepFreeze(child);
  }
  return Object.freeze(value);
}

test("public defaults and storage key match the contract", () => {
  assert.deepEqual(componentIds, [
    "button",
    "input",
    "card",
    "badge",
    "switch",
    "checkbox",
  ]);
  assert.equal(STORAGE_KEY, "bambiui.design-system.v1");
  assert.deepEqual(defaultSystem, {
    version: 1,
    name: "Untitled system",
    global: {
      background: "#ffffff",
      foreground: "#27272a",
      primary: "#e8673c",
      onPrimary: "#ffffff",
      border: "#e4e4e7",
      radius: 8,
      paddingX: 16,
      paddingY: 10,
      gap: 8,
      margin: 0,
      fontSize: 14,
      borderWidth: 1,
    },
    components: {
      button: {},
      input: {},
      card: {},
      badge: {},
      switch: {},
      checkbox: {},
    },
  });
  assert.equal(new Set(Object.values(defaultSystem.components)).size, 6);
});

test("field metadata describes each token exactly once with exact ranges", () => {
  assert.deepEqual(
    tokenFields.map(({ key }) => key).sort(),
    Object.keys(defaultSystem.global).sort(),
  );
  for (const field of tokenFields) {
    assert.equal(typeof field.label, "string");
    assert.ok(field.label.length > 0);
    if (colorKeys.includes(field.key)) {
      assert.equal(field.type, "color");
      assert.equal(field.min, undefined);
      assert.equal(field.max, undefined);
    } else {
      assert.equal(field.type, "number");
      assert.deepEqual([field.min, field.max], numericRanges[field.key]);
    }
  }
});

for (const id of componentIds) {
  test(`${id}: resolve inherits the correct globals and merges overrides`, () => {
    const system = freshSystem();
    system.global.onPrimary = "#123456";
    const { primary, onPrimary, ...expected } = system.global;
    if (["button", "switch", "checkbox"].includes(id)) {
      expected.background = primary;
      expected.foreground = onPrimary;
    }
    assert.deepEqual(resolveComponent(system, id), expected);
    system.components[id] = {
      background: "#abcdef",
      foreground: "#fedcba",
      paddingX: 0,
      radius: 2.5,
    };
    assert.deepEqual(resolveComponent(system, id), {
      ...expected,
      ...system.components[id],
    });
    assert.equal("primary" in resolveComponent(system, id), false);
    assert.equal("onPrimary" in resolveComponent(system, id), false);
  });
}

test("CSS map includes every global and component token with correct references and px units", () => {
  const variables = toCSSVariables(defaultSystem);
  assert.equal(Object.keys(variables).length, 12 + 6 * 10);
  for (const [key, value] of Object.entries(defaultSystem.global)) {
    assert.equal(
      variables[`--ds-${kebab(key)}`],
      typeof value === "number" ? `${value}px` : value,
    );
  }
  for (const id of componentIds) {
    for (const key of Object.keys(resolveComponent(defaultSystem, id))) {
      let source = key;
      if (["button", "switch", "checkbox"].includes(id)) {
        if (key === "background") source = "primary";
        if (key === "foreground") source = "onPrimary";
      }
      assert.equal(
        variables[`--${id}-${kebab(key)}`],
        `var(--ds-${kebab(source)})`,
      );
    }
  }
});

test("CSS overrides are literal, including zero and values equal to globals", () => {
  const system = freshSystem();
  for (const id of componentIds)
    system.components[id] = resolveComponent(system, id);
  for (const id of componentIds) {
    system.components[id].radius = 0;
    system.components[id].borderWidth = 0.5;
  }
  const variables = toCSSVariables(system);
  for (const id of componentIds) {
    for (const [key, value] of Object.entries(system.components[id])) {
      assert.equal(
        variables[`--${id}-${kebab(key)}`],
        typeof value === "number" ? `${value}px` : value,
      );
    }
  }
  delete system.components.button.background;
  assert.equal(
    toCSSVariables(system)["--button-background"],
    "var(--ds-primary)",
  );
});

test("CSS export is exactly the variable map in :root, with no component rules or name interpolation", () => {
  const system = freshSystem();
  system.name = "*/ } body { color: red; }";
  system.components.card = { gap: 2.5 };
  const expected = Object.entries(toCSSVariables(system)).map(
    ([key, value]) => `  ${key}: ${value};`,
  );
  assert.equal(exportCSS(system), `:root {\n${expected.join("\n")}\n}\n`);
});

test("resolution and export are pure and return independent results", () => {
  const system = deepFreeze(freshSystem());
  const before = JSON.stringify(system);
  const resolved = resolveComponent(system, "button");
  resolved.radius = 48;
  const variables = toCSSVariables(system);
  variables["--ds-radius"] = "48px";
  exportCSS(system);
  assert.equal(JSON.stringify(system), before);
  assert.equal(resolveComponent(system, "button").radius, 8);
  assert.equal(toCSSVariables(system)["--ds-radius"], "8px");
});

test("parser round-trips defaults and complete overrides without sharing default objects", () => {
  const system = freshSystem();
  for (const id of componentIds)
    system.components[id] = resolveComponent(system, id);
  assert.deepEqual(parse(system), system);
  const parsed = parse(defaultSystem);
  assert.deepEqual(parsed, defaultSystem);
  parsed.global.radius = 48;
  parsed.components.button.radius = 48;
  assert.equal(defaultSystem.global.radius, 8);
  assert.deepEqual(defaultSystem.components.button, {});
});

test("parser accepts name length boundaries and rejects invalid names or versions", () => {
  for (const name of ["", "a".repeat(80)])
    assert.equal(parse({ ...freshSystem(), name }).name, name);
  for (const name of ["a".repeat(81), null, 1, {}, []]) {
    assert.throws(() => parse({ ...freshSystem(), name }), /system.name/);
  }
  for (const version of [0, 2, "1", null, true, undefined]) {
    assert.throws(() => parse({ ...freshSystem(), version }), /system.version/);
  }
});

test("parser rejects malformed JSON, invalid shapes, missing fields, and unknown keys", () => {
  assert.throws(() => parseDesignSystem("{"), SyntaxError);
  for (const value of [null, [], "text", 42, true])
    assert.throws(() => parse(value), /system/);
  for (const key of ["version", "name", "global", "components"]) {
    const system = freshSystem();
    delete system[key];
    assert.throws(() => parse(system));
  }
  for (const value of [null, [], 1, "tokens"]) {
    assert.throws(() => parse({ ...freshSystem(), global: value }), /global/);
    assert.throws(
      () => parse({ ...freshSystem(), components: value }),
      /components/,
    );
    const system = freshSystem();
    system.components.button = value;
    assert.throws(() => parse(system), /components.button/);
  }
  for (const key of Object.keys(defaultSystem.global)) {
    const system = freshSystem();
    delete system.global[key];
    assert.throws(() => parse(system), new RegExp(`global.${key}`));
  }
  for (const id of componentIds) {
    const system = freshSystem();
    delete system.components[id];
    assert.throws(() => parse(system), new RegExp(`components.${id}`));
  }
  for (const path of [
    [],
    ["global"],
    ["components"],
    ["components", "button"],
  ]) {
    for (const key of ["unknown", "__proto__", "constructor", "toString"]) {
      const system = freshSystem();
      const target = path.reduce((value, part) => value[part], system);
      Object.defineProperty(target, key, { value: {}, enumerable: true });
      assert.throws(() => parse(system), /Unknown field/);
    }
  }
  for (const key of ["primary", "onPrimary"]) {
    const system = freshSystem();
    system.components.button[key] = "#123456";
    assert.throws(() => parse(system), /Unknown field/);
  }
});

for (const key of colorKeys) {
  test(`${key}: parser only accepts six-digit hex colors globally and in overrides`, () => {
    const targets =
      key === "primary" || key === "onPrimary"
        ? ["global"]
        : ["global", ...componentIds];
    for (const target of targets) {
      const system = freshSystem();
      const tokens =
        target === "global" ? system.global : system.components[target];
      for (const valid of ["#000000", "#ffffff", "#aBcDeF"]) {
        tokens[key] = valid;
        assert.deepEqual(parse(system), system);
      }
      for (const invalid of [
        "#fff",
        "#ffffffff",
        "ffffff",
        "#gggggg",
        "red",
        "var(--ds-primary)",
        "rgb(0,0,0)",
        " #ffffff",
        "#ffffff\n",
        "#ffffff; color:red",
        null,
        123,
        true,
        {},
        [],
      ]) {
        tokens[key] = invalid;
        assert.throws(() => parse(system), /must be a #rrggbb color/);
      }
    }
  });
}

for (const [key, [min, max]] of Object.entries(numericRanges)) {
  test(`${key}: parser enforces finite numeric ranges globally and in every override`, () => {
    for (const target of ["global", ...componentIds]) {
      const system = freshSystem();
      const tokens =
        target === "global" ? system.global : system.components[target];
      for (const valid of [min, max, min + 0.5]) {
        tokens[key] = valid;
        assert.deepEqual(parse(system), system);
      }
      for (const invalid of [
        min - 0.1,
        max + 0.1,
        "10",
        null,
        true,
        {},
        [],
        NaN,
        Infinity,
        -Infinity,
      ]) {
        tokens[key] = invalid;
        assert.throws(() => parse(system), /must be a finite number/);
      }
      tokens[key] = "overflow-number";
      const text = JSON.stringify(system).replace('"overflow-number"', "1e400");
      assert.throws(() => parseDesignSystem(text), /must be a finite number/);
    }
  });
}
