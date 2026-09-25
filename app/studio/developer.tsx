"use client";

import { useMemo, useState, type ReactNode } from "react";
import { highlight } from "sugar-high";
import { Button } from "./controls";
import { snippets } from "./snippets";
import {

  toCSSVariables,
  tokenFields,
  componentTokenKeys,
  type ComponentId,
  type DesignSystem,
} from "./tokens";
import styles from "./developer.module.css";
import { developerCopy, type NoteKey } from "./developer-copy";
import type { PaletteMode } from "./color-engine";
import type { Locale } from "./locale";

export type DeveloperViewProps = {
  selected: "overview" | ComponentId;
  system: DesignSystem;
  mode: PaletteMode;
  cssOutput: string;
  locale: Locale;
};

type PropRow = readonly [prop: string, type: string, defaultValue: string, noteKey: NoteKey];

const size: PropRow = ["size", '"sm" | "md" | "lg"', '"md"', "size"];
const content: PropRow = ["children", "ReactNode", "—", "content"];
const className: PropRow = ["className", "string", "—", "className"];
const icons: PropRow = ["startIcon / endIcon", "ReactNode", "—", "icons"];
const fields: readonly PropRow[] = [
  ["label", "ReactNode", "Required", "label"],
  ["hideLabel", "boolean", "false", "hideLabel"],
  ["description / error", "ReactNode", "—", "description"],
  size,
  ["disabled / readOnly / required", "boolean", "false", "states"],
  ["name", "string", "—", "name"],
  className,
];
const choices: readonly PropRow[] = [
  ...fields,
  ["labelPosition", '"start" | "end"', '"end"', "labelPosition"],
  ["checked / defaultChecked", "boolean", "Base UI defaults", "checked"],
  ["onCheckedChange", "Base UI callback", "—", "onCheckedChange"],
  ["value", "Base UI value prop", "Base UI default", "value"],
];

// Keep wrapper-specific defaults aligned with components/ and docs/component-api.md.
// Inherited props remain delegated to Base UI rather than inventing wrapper defaults.
const reference: Record<ComponentId, { name: string; props: readonly PropRow[] }> = {
  button: {
    name: "Button",
    props: [
      ["variant", '"primary" | "secondary" | "outline" | "ghost" | "destructive" | "link"', '"primary"', "hierarchy"],
      size,
      ["disabled", "boolean", "false", "disabled"],
      ["loading", "boolean", "false", "loading"],
      ["fullWidth", "boolean", "false", "fullWidth"],
      ["iconOnly", "boolean", "false", "iconOnly"],
      icons, content, className,
      ["render", "Base UI render prop", "—", "render"],
    ],
  },
  input: {
    name: "Input",
    props: [
      ...fields,
      ["type", '"text" | "email" | "password" | "number" | "search" | "tel" | "url"', '"text"', "inputType"],
      ["placeholder", "string", "—", "placeholder"],
      ["value / defaultValue", "Base UI Input value props", "—", "inputValue"],
      ["onValueChange", "Base UI callback", "—", "onValueChange"],
      icons,
    ],
  },
  switch: {
    name: "Switch",
    props: choices,
  },
  checkbox: {
    name: "Checkbox",
    props: [...choices, ["indeterminate", "boolean", "Base UI default", "indeterminate"]],
  },
  badge: {
    name: "Badge",
    props: [
      ["variant", '"solid" | "subtle" | "outline"', '"outline"', "fill"],
      ["tone", '"neutral" | "primary" | "success" | "warning" | "danger" | "info"', '"neutral"', "tone"],
      size,
      ["dot", "boolean", "false", "dot"],
      ["startIcon", "ReactNode", "—", "startIcon"],
      content, className,
    ],
  },
  card: {
    name: "Card",
    props: [
      ["variant", '"outlined" | "elevated" | "filled"', '"outlined"', "surface"],
      size, content, className,
    ],
  },
};

function ScrollRegion({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.scroll} role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}

function ReactUsage({ selected, locale }: { selected: ComponentId; locale: Locale }) {
  const copy = developerCopy[locale];
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
        <h3>{copy.reactUsage}</h3>
        <Button
          type="button"
          onClick={copyReactCode}
          disabled={copyStatus === "pending"}
          focusableWhenDisabled
          aria-busy={copyStatus === "pending"}
        >
          {copy.copyReactCode}
        </Button>
      </div>
      <p>{copy.reactDescription}</p>
      <p className={styles.copyStatus} role="status" aria-atomic="true">
        {copyStatus === "pending" && copy.copying}
        {copyStatus === "success" && copy.copied}
        {copyStatus === "error" && copy.copyError}
      </p>
      <div className={styles.reactCode}>
        <ScrollRegion label={copy.usageRegion(reference[selected].name)}>
          <pre className={styles.code}>
            <code dangerouslySetInnerHTML={{ __html: highlighted }} />
          </pre>
        </ScrollRegion>
      </div>
    </section>
  );
}

export function DeveloperView({ selected, system, mode, cssOutput, locale }: DeveloperViewProps) {
  const copy = developerCopy[locale];
  const component = selected === "overview" ? null : reference[selected];
  const theme = system.themes[mode];
  const variables = useMemo(() => toCSSVariables(theme, mode), [theme, mode]);
  const prefix = selected === "overview" ? "--ds-" : `--${selected}-`;
  const editableNames = new Set((selected === "overview" ? tokenFields.map(({ key }) => key) : [...componentTokenKeys])
    .map((key) => `${prefix}${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`));
  const tokens = Object.entries(variables).filter(([name]) => editableNames.has(name));
  const derived = Object.entries(variables).filter(([name]) => name.startsWith(prefix) && !editableNames.has(name));

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>{copy.developerReference}</p>
        <h2>{component ? component.name : copy.systemTokens}</h2>
        <p>
          {component
            ? copy.componentIntro
            : copy.overviewIntro}
        </p>
        <p className={styles.systemName}>{copy.system}: {system.name} · {copy.modeName[mode]} {copy.theme} · {copy.source} {system.themes[mode].source}</p>
      </header>

      {selected !== "overview" && component && (
        <>
          <ReactUsage key={selected} selected={selected} locale={locale} />
          <section className={styles.section}>
            <h3>{copy.propsAndDefaults}</h3>
            <p>{copy.propsDescription}</p>
            <ScrollRegion label={copy.propsRegion(component.name)}>
              <table className={styles.table}>
                <caption>{component.name} {copy.propReference}</caption>
                <thead><tr><th scope="col">{copy.prop}</th><th scope="col">{copy.type}</th><th scope="col">{copy.default}</th><th scope="col">{copy.behavior}</th></tr></thead>
                <tbody>
                  {component.props.map(([prop, type, defaultValue, noteKey]) => (
                    <tr key={prop}>
                      <th scope="row"><code>{prop}</code></th>
                      <td><code>{type}</code></td>
                      <td><code>{defaultValue === "Required" ? copy.required : defaultValue === "Base UI defaults" ? copy.baseUIDefaults : defaultValue === "Base UI default" ? copy.baseUIDefault : defaultValue}</code></td>
                      <td>{copy.notes[noteKey]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollRegion>
            <p>{copy.componentNotes[selected]}</p>
          </section>
        </>
      )}

      <section className={styles.section}>
        <h3>{component ? copy.tokenInheritance : copy.globalTokenReference}</h3>
        <p>
          {component
            ? copy.componentTokensDescription
            : copy.globalTokensDescription}
        </p>
        <ScrollRegion label={component ? copy.tokensRegion(component.name) : copy.globalTokenReference}>
          <table className={styles.table}>
            <caption>{component ? `${component.name} ${copy.baseTokenAliases}` : copy.globalCSSVariables}</caption>
            <thead><tr><th scope="col">{component ? copy.aliasCSSName : copy.cssName}</th><th scope="col">{copy.sourceColumn}</th><th scope="col">{copy.resolvedValue}</th></tr></thead>
            <tbody>
              {tokens.map(([name, declaration]) => {
                // Follow the exported declaration instead of duplicating token inheritance rules.
                const source = /^var\((--ds-[a-z-]+)\)$/.exec(declaration)?.[1];
                return (
                  <tr key={name}>
                    <th scope="row"><code>{name}</code></th>
                    <td>{source ? <><span>{copy.inherited}: </span><code>{source}</code></> : component ? copy.componentOverride : copy.globalValue}</td>
                    <td><code>{source ? variables[source] : declaration}</code></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollRegion>
      </section>

      {derived.length > 0 && (
        <section className={styles.section}>
          <h3>{copy.derivedColors}</h3>
          <p>{copy.derivedDescription(mode)}</p>
          <ScrollRegion label={copy.derivedThemeVariables}>
            <table className={styles.table}>
              <caption>{copy.modeName[mode]} {copy.runtimeVariables}</caption>
              <thead><tr><th scope="col">{copy.cssVariable}</th><th scope="col">{copy.valueColumn}</th></tr></thead>
              <tbody>{derived.map(([name, value]) => (
                <tr key={name}><th scope="row"><code>{name}</code></th><td><code>{value}</code></td></tr>
              ))}</tbody>
            </table>
          </ScrollRegion>
        </section>
      )}
      <section className={styles.section}>
        <h3>{copy.cssVariableExport}</h3>
        <p>{copy.exportBeforeCode}<code>{'data-ds-theme="dark"'}</code>{copy.exportAfterCode}</p>
        <details className={styles.export}>
          <summary>{copy.showFullSystem}</summary>
          <ScrollRegion label={copy.fullSystemExport}>
            <pre className={styles.code}><code>{cssOutput}</code></pre>
          </ScrollRegion>
        </details>
      </section>
    </div>
  );
}
