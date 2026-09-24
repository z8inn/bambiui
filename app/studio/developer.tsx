"use client";

import { useMemo, useState, type ReactNode } from "react";
import { highlight } from "sugar-high";
import { Button } from "./controls";
import { snippets } from "./snippets";
import {
  exportCSS,
  toCSSVariables,
  type ComponentId,
  type DesignSystem,
} from "./tokens";
import styles from "./developer.module.css";

export type DeveloperViewProps = {
  selected: "overview" | ComponentId;
  system: DesignSystem;
};

type PropRow = readonly [prop: string, type: string, defaultValue: string, notes: string];

const size: PropRow = ["size", '"sm" | "md" | "lg"', '"md"', "Shared size scale; density for Card."];
const content: PropRow = ["children", "ReactNode", "—", "Component content."];
const className: PropRow = ["className", "string", "—", "Applied to the root; the field wrapper for labelled controls."];
const icons: PropRow = ["startIcon / endIcon", "ReactNode", "—", "Content before / after the label or value."];
const fields: readonly PropRow[] = [
  ["label", "ReactNode", "Required", "Visible accessible label."],
  ["hideLabel", "boolean", "false", "Visually hides the label, retaining its accessible name."],
  ["description / error", "ReactNode", "—", "Linked helper / error text. A truthy error marks the field invalid."],
  size,
  ["disabled / readOnly / required", "boolean", "false", "Disable interaction / prevent changes / require a value."],
  ["name", "string", "—", "Form submission name."],
  className,
];
const choices: readonly PropRow[] = [
  ...fields,
  ["labelPosition", '"start" | "end"', '"end"', "Side of the control on which the label appears."],
  ["checked / defaultChecked", "boolean", "Base UI defaults", "Controlled / initial uncontrolled checked state."],
  ["onCheckedChange", "Base UI callback", "—", "Receives the next checked state and event details."],
  ["value", "Base UI value prop", "Base UI default", "Form submission value, not the checked state."],
];

// Keep wrapper-specific defaults aligned with components/ and docs/component-api.md.
// Inherited props remain delegated to Base UI rather than inventing wrapper defaults.
const reference: Record<ComponentId, { name: string; props: readonly PropRow[]; note: string }> = {
  button: {
    name: "Button",
    props: [
      ["variant", '"primary" | "secondary" | "outline" | "ghost" | "destructive" | "link"', '"primary"', "Visual hierarchy."],
      size,
      ["disabled", "boolean", "false", "Blocks activation."],
      ["loading", "boolean", "false", "Blocks activation, keeps focus, sets aria-busy and replaces the start icon with a spinner."],
      ["fullWidth", "boolean", "false", "Stretches to container width."],
      ["iconOnly", "boolean", "false", "Square icon control; requires aria-label when true. Hides endIcon."],
      icons, content, className,
      ["render", "Base UI render prop", "—", "Base UI element composition."],
    ],
    note: "Also accepts Base UI Button props and native button attributes. An icon-only button must have an aria-label. No tone prop is defined.",
  },
  input: {
    name: "Input",
    props: [
      ...fields,
      ["type", '"text" | "email" | "password" | "number" | "search" | "tel" | "url"', '"text"', "Native input type."],
      ["placeholder", "string", "—", "Hint, not a replacement for label."],
      ["value / defaultValue", "Base UI Input value props", "—", "Controlled / initial uncontrolled value."],
      ["onValueChange", "Base UI callback", "—", "Receives the next value and event details."],
      icons,
    ],
    note: "Also accepts Base UI Input props except its className, size and type, which the wrapper replaces. Icons are decorative. No variant or tone prop is defined.",
  },
  switch: {
    name: "Switch",
    props: choices,
    note: "Also accepts Base UI Switch.Root props except className and children. The wrapper supplies the thumb and label; use label rather than children. No variant or tone prop is defined.",
  },
  checkbox: {
    name: "Checkbox",
    props: [...choices, ["indeterminate", "boolean", "Base UI default", "Displays a mixed-state indicator."]],
    note: "Also accepts Base UI Checkbox.Root props except className and children. The wrapper supplies the indicator and label; use label rather than children. No variant or tone prop is defined.",
  },
  badge: {
    name: "Badge",
    props: [
      ["variant", '"solid" | "subtle" | "outline"', '"outline"', "Fill style."],
      ["tone", '"neutral" | "primary" | "success" | "warning" | "danger" | "info"', '"neutral"', "Semantic color role."],
      size,
      ["dot", "boolean", "false", "Decorative leading status dot; provide meaningful text."],
      ["startIcon", "ReactNode", "—", "Leading icon content."],
      content, className,
    ],
    note: "Also accepts native span props. Badge has no endIcon, loading or disabled behavior.",
  },
  card: {
    name: "Card",
    props: [
      ["variant", '"outlined" | "elevated" | "filled"', '"outlined"', "Surface treatment."],
      size, content, className,
    ],
    note: "Also accepts native article props. Compose Card.Icon (span), Card.Header (div), Card.Title (strong, not a heading), Card.Description (p), Card.Content (div) and Card.Footer (div). Each part accepts its native element props. No tone prop is defined.",
  },
};

function ScrollRegion({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.scroll} role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}

function ReactUsage({ selected }: { selected: ComponentId }) {
  const source = snippets[selected];
  const highlighted = useMemo(() => highlight(source), [source]);
  const [copyStatus, setCopyStatus] = useState<"idle" | "pending" | "success" | "error">("idle");

  async function copyReactCode() {
    if (copyStatus === "pending") return;
    setCopyStatus("pending");
    try {
      await navigator.clipboard.writeText(source);
      setCopyStatus("success");
    } catch {
      setCopyStatus("error");
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.codeHeading}>
        <h3>React usage</h3>
        <Button
          type="button"
          onClick={copyReactCode}
          disabled={copyStatus === "pending"}
          focusableWhenDisabled
          aria-busy={copyStatus === "pending"}
        >
          Copy React code
        </Button>
      </div>
      <p>Examples from snippets.ts. Imports refer to this project; this is not a published component package.</p>
      <p className={styles.copyStatus} role="status" aria-atomic="true">
        {copyStatus === "pending" && "Copying React code…"}
        {copyStatus === "success" && "React code copied to clipboard."}
        {copyStatus === "error" && "Could not copy React code. Select and copy the code below manually."}
      </p>
      <div className={styles.reactCode}>
        <ScrollRegion label={`${reference[selected].name} React usage`}>
          <pre className={styles.code}>
            <code dangerouslySetInnerHTML={{ __html: highlighted }} />
          </pre>
        </ScrollRegion>
      </div>
    </section>
  );
}

export function DeveloperView({ selected, system }: DeveloperViewProps) {
  const component = selected === "overview" ? null : reference[selected];
  const variables = toCSSVariables(system);
  const prefix = selected === "overview" ? "--ds-" : `--${selected}-`;
  const tokens = Object.entries(variables).filter(([name]) => name.startsWith(prefix));

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Developer reference</p>
        <h2>{component ? component.name : "System tokens"}</h2>
        <p>
          {component
            ? "React usage, component props and live token inheritance."
            : "Select a component in the studio to see its React usage and API reference."}
        </p>
        <p className={styles.systemName}>System: {system.name}</p>
      </header>

      {selected !== "overview" && component && (
        <>
          <ReactUsage key={selected} selected={selected} />
          <section className={styles.section}>
            <h3>Props and defaults</h3>
            <p>Wrapper API from the component sources and docs/component-api.md. A dash means no wrapper default; inherited Base UI defaults are identified separately.</p>
            <ScrollRegion label={`${component.name} props and defaults`}>
              <table className={styles.table}>
                <caption>{component.name} prop reference</caption>
                <thead><tr><th scope="col">Prop</th><th scope="col">Type</th><th scope="col">Default</th><th scope="col">Behavior</th></tr></thead>
                <tbody>
                  {component.props.map(([prop, type, defaultValue, notes]) => (
                    <tr key={prop}>
                      <th scope="row"><code>{prop}</code></th>
                      <td><code>{type}</code></td>
                      <td><code>{defaultValue}</code></td>
                      <td>{notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollRegion>
            <p>{component.note}</p>
          </section>
        </>
      )}

      <section className={styles.section}>
        <h3>{component ? "Token inheritance" : "Global token reference"}</h3>
        <p>
          {component
            ? "Live base aliases for this component. Overrides replace inheritance, even when equal to the global value. Variants, tones, sizes and states may use additional tokens; these are not computed element styles."
            : "Current global CSS variables. Numeric token values are exported in pixels."}
        </p>
        <ScrollRegion label={component ? `${component.name} token inheritance` : "Global token reference"}>
          <table className={styles.table}>
            <caption>{component ? `${component.name} base token aliases` : "Global CSS variables"}</caption>
            <thead><tr><th scope="col">{component ? "Alias CSS name" : "CSS name"}</th><th scope="col">Source</th><th scope="col">Resolved value</th></tr></thead>
            <tbody>
              {tokens.map(([name, declaration]) => {
                // Follow the exported declaration instead of duplicating token inheritance rules.
                const source = /^var\((--ds-[a-z-]+)\)$/.exec(declaration)?.[1];
                return (
                  <tr key={name}>
                    <th scope="row"><code>{name}</code></th>
                    <td>{source ? <><span>Inherited: </span><code>{source}</code></> : component ? "Component override" : "Global value"}</td>
                    <td><code>{source ? variables[source] : declaration}</code></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollRegion>
      </section>

      <section className={styles.section}>
        <h3>CSS variable export</h3>
        <p>Full-system export: global variables and aliases for every component, not only the selection. These are CSS variables, not full components. React implementations, component styles and preview system constants are not included.</p>
        <details className={styles.export}>
          <summary>Show full-system CSS variables</summary>
          <ScrollRegion label="Full-system CSS variable export">
            <pre className={styles.code}><code>{exportCSS(system)}</code></pre>
          </ScrollRegion>
        </details>
      </section>
    </div>
  );
}
