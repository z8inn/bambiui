export const componentIds = [
  "button",
  "input",
  "card",
  "badge",
  "switch",
  "checkbox",
] as const;

export type ComponentId = (typeof componentIds)[number];

export type TokenValues = {
  background: string;
  foreground: string;
  primary: string;
  onPrimary: string;
  border: string;
  radius: number;
  paddingX: number;
  paddingY: number;
  gap: number;
  margin: number;
  fontSize: number;
  borderWidth: number;
};

export type ComponentTokens = Omit<TokenValues, "primary" | "onPrimary">;

export type DesignSystem = {
  version: 1;
  name: string;
  global: TokenValues;
  components: Record<ComponentId, Partial<ComponentTokens>>;
};

export const STORAGE_KEY = "bambiui.design-system.v1";

export const defaultSystem: DesignSystem = {
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
};

export const tokenFields: {
  key: keyof TokenValues;
  label: string;
  type: "color" | "number";
  min?: number;
  max?: number;
}[] = [
  { key: "background", label: "Background", type: "color" },
  { key: "foreground", label: "Foreground", type: "color" },
  { key: "primary", label: "Primary", type: "color" },
  { key: "onPrimary", label: "On primary", type: "color" },
  { key: "border", label: "Border", type: "color" },
  { key: "radius", label: "Radius", type: "number", min: 0, max: 48 },
  {
    key: "paddingX",
    label: "Horizontal padding",
    type: "number",
    min: 0,
    max: 64,
  },
  {
    key: "paddingY",
    label: "Vertical padding",
    type: "number",
    min: 0,
    max: 64,
  },
  { key: "gap", label: "Gap", type: "number", min: 0, max: 64 },
  { key: "margin", label: "Margin", type: "number", min: 0, max: 48 },
  { key: "fontSize", label: "Font size", type: "number", min: 10, max: 32 },
  { key: "borderWidth", label: "Border width", type: "number", min: 0, max: 6 },
];

function isComponentKey(key: keyof TokenValues): key is keyof ComponentTokens {
  return key !== "primary" && key !== "onPrimary";
}

function inheritedKey(
  id: ComponentId,
  key: keyof ComponentTokens,
): keyof TokenValues {
  if (id === "button" || id === "switch" || id === "checkbox") {
    if (key === "background") return "primary";
    if (key === "foreground") return "onPrimary";
  }
  return key;
}

export function resolveComponent(
  system: DesignSystem,
  id: ComponentId,
): ComponentTokens {
  const { primary, onPrimary, ...tokens } = system.global;
  if (inheritedKey(id, "background") === "primary") {
    tokens.background = primary;
    tokens.foreground = onPrimary;
  }
  return { ...tokens, ...system.components[id] };
}

function kebabCase(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function cssValue(value: string | number): string {
  return typeof value === "number" ? `${value}px` : value;
}

export function toCSSVariables(system: DesignSystem): Record<string, string> {
  const variables: Record<string, string> = {};
  for (const { key } of tokenFields) {
    variables[`--ds-${kebabCase(key)}`] = cssValue(system.global[key]);
  }
  for (const id of componentIds) {
    for (const { key } of tokenFields) {
      if (!isComponentKey(key)) continue;
      const override = system.components[id][key];
      variables[`--${id}-${kebabCase(key)}`] =
        override === undefined
          ? `var(--ds-${kebabCase(inheritedKey(id, key))})`
          : cssValue(override);
    }
  }
  return variables;
}

export function exportCSS(system: DesignSystem): string {
  const declarations = Object.entries(toCSSVariables(system))
    .map(([key, value]) => `  ${key}: ${value};`)
    .join("\n");
  return `:root {\n${declarations}\n}\n`;
}

function requireObject(
  value: unknown,
  path: string,
): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${path} must be an object`);
  }
}

function requireKnownKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
  path: string,
): void {
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) throw new Error(`Unknown field: ${path}.${key}`);
  }
}

function validateTokens(value: unknown, path: string, partial: boolean): void {
  requireObject(value, path);
  const fields = partial
    ? tokenFields.filter(({ key }) => isComponentKey(key))
    : tokenFields;
  requireKnownKeys(
    value,
    fields.map(({ key }) => key),
    path,
  );
  for (const field of fields) {
    if (partial && !Object.prototype.hasOwnProperty.call(value, field.key))
      continue;
    const token = value[field.key];
    if (field.type === "color") {
      if (typeof token !== "string" || !/^#[0-9a-fA-F]{6}$/.test(token)) {
        throw new Error(`${path}.${field.key} must be a #rrggbb color`);
      }
    } else if (
      typeof token !== "number" ||
      !Number.isFinite(token) ||
      token < field.min! ||
      token > field.max!
    ) {
      throw new Error(
        `${path}.${field.key} must be a finite number from ${field.min} to ${field.max}`,
      );
    }
  }
}

export function parseDesignSystem(text: string): DesignSystem {
  const value: unknown = JSON.parse(text);
  requireObject(value, "system");
  requireKnownKeys(
    value,
    ["version", "name", "global", "components"],
    "system",
  );
  if (value.version !== 1) throw new Error("system.version must be 1");
  if (typeof value.name !== "string" || value.name.length > 80) {
    throw new Error("system.name must be a string of at most 80 characters");
  }
  validateTokens(value.global, "global", false);
  requireObject(value.components, "components");
  requireKnownKeys(value.components, componentIds, "components");
  for (const id of componentIds) {
    validateTokens(value.components[id], `components.${id}`, true);
  }
  return value as DesignSystem;
}
