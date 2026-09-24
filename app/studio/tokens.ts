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
  // Base surfaces
  background: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  // Brand roles
  primary: string;
  onPrimary: string;
  secondary: string;
  onSecondary: string;
  // Status roles
  success: string;
  onSuccess: string;
  warning: string;
  onWarning: string;
  danger: string;
  onDanger: string;
  info: string;
  onInfo: string;
  // Shape and spacing
  radius: number;
  paddingX: number;
  paddingY: number;
  gap: number;
  margin: number;
  fontSize: number;
  borderWidth: number;
  // Size scale shared by every sizeable control
  controlHeightSm: number;
  controlHeightMd: number;
  controlHeightLg: number;
};

/** Tokens every component can override. All other tokens are system-wide roles. */
export const componentTokenKeys = [
  "background",
  "foreground",
  "border",
  "radius",
  "paddingX",
  "paddingY",
  "gap",
  "margin",
  "fontSize",
  "borderWidth",
] as const satisfies readonly (keyof TokenValues)[];

export type ComponentTokens = Pick<
  TokenValues,
  (typeof componentTokenKeys)[number]
>;

export type DesignSystem = {
  version: 2;
  name: string;
  global: TokenValues;
  components: Record<ComponentId, Partial<ComponentTokens>>;
};

export const STORAGE_KEY = "bambiui.design-system.v1";

export const defaultSystem: DesignSystem = {
  version: 2,
  name: "Untitled system",
  global: {
    background: "#ffffff",
    foreground: "#27272a",
    muted: "#f4f4f5",
    mutedForeground: "#63636b",
    border: "#e4e4e7",
    primary: "#e8673c",
    onPrimary: "#ffffff",
    secondary: "#f1ede8",
    onSecondary: "#27272a",
    success: "#1a7f45",
    onSuccess: "#ffffff",
    warning: "#a15c00",
    onWarning: "#ffffff",
    danger: "#d2393f",
    onDanger: "#ffffff",
    info: "#2563c9",
    onInfo: "#ffffff",
    radius: 8,
    paddingX: 16,
    paddingY: 10,
    gap: 8,
    margin: 0,
    fontSize: 14,
    borderWidth: 1,
    controlHeightSm: 32,
    controlHeightMd: 36,
    controlHeightLg: 44,
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

export type TokenField = {
  key: keyof TokenValues;
  label: string;
  type: "color" | "number";
  min?: number;
  max?: number;
};

const color = (key: keyof TokenValues, label: string): TokenField => ({
  key,
  label,
  type: "color",
});

export const tokenFields: TokenField[] = [
  color("background", "Background"),
  color("foreground", "Foreground"),
  color("muted", "Muted"),
  color("mutedForeground", "Muted foreground"),
  color("border", "Border"),
  color("primary", "Primary"),
  color("onPrimary", "On primary"),
  color("secondary", "Secondary"),
  color("onSecondary", "On secondary"),
  color("success", "Success"),
  color("onSuccess", "On success"),
  color("warning", "Warning"),
  color("onWarning", "On warning"),
  color("danger", "Danger"),
  color("onDanger", "On danger"),
  color("info", "Info"),
  color("onInfo", "On info"),
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
  {
    key: "controlHeightSm",
    label: "Control height sm",
    type: "number",
    min: 16,
    max: 80,
  },
  {
    key: "controlHeightMd",
    label: "Control height md",
    type: "number",
    min: 16,
    max: 80,
  },
  {
    key: "controlHeightLg",
    label: "Control height lg",
    type: "number",
    min: 16,
    max: 80,
  },
];

/** Global keys that existed in schema v1; v1 files are migrated by filling in the rest. */
const v1GlobalKeys = [
  "background",
  "foreground",
  "primary",
  "onPrimary",
  "border",
  "radius",
  "paddingX",
  "paddingY",
  "gap",
  "margin",
  "fontSize",
  "borderWidth",
] as const;

export function isComponentKey(
  key: keyof TokenValues,
): key is keyof ComponentTokens {
  return (componentTokenKeys as readonly string[]).includes(key);
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
  const tokens = {} as Record<keyof ComponentTokens, string | number>;
  for (const key of componentTokenKeys) {
    tokens[key] = system.global[inheritedKey(id, key)];
  }
  return { ...(tokens as ComponentTokens), ...system.components[id] };
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
    for (const key of componentTokenKeys) {
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
  if (value.version !== 1 && value.version !== 2) {
    throw new Error("system.version must be 1 or 2");
  }
  if (typeof value.name !== "string" || value.name.length > 80) {
    throw new Error("system.name must be a string of at most 80 characters");
  }
  if (value.version === 1) {
    // v1 predates the extended roles and size scale: accept only v1 keys, then
    // fill the new ones from the defaults.
    requireObject(value.global, "global");
    requireKnownKeys(value.global, v1GlobalKeys, "global");
    for (const key of v1GlobalKeys) {
      if (!Object.prototype.hasOwnProperty.call(value.global, key)) {
        throw new Error(`global.${key} is required`);
      }
    }
    value.global = { ...defaultSystem.global, ...value.global };
    value.version = 2;
  }
  validateTokens(value.global, "global", false);
  requireObject(value.components, "components");
  requireKnownKeys(value.components, componentIds, "components");
  for (const id of componentIds) {
    validateTokens(value.components[id], `components.${id}`, true);
  }
  return value as DesignSystem;
}
