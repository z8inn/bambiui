"use client";

import { useId, useMemo, useState } from "react";
import { Button } from "./controls";
import {
  contrastRatio,
  generatePalette,
  paletteRoles,
  type ColorTokens,
  type GeneratedTheme,
  type PaletteMode,
} from "./color-engine";
import { auditSystemColors } from "./color-audit";
import type { ComponentId, DesignSystem } from "./tokens";
import styles from "./color-builder.module.css";

const presets = [
  { name: "Terracotta", color: "#e8673c" },
  { name: "Iris", color: "#7660d5" },
  { name: "Ocean", color: "#247db3" },
  { name: "Forest", color: "#287c60" },
  { name: "Graphite", color: "#27272a" },
];
const title = (text: string) => text[0].toUpperCase() + text.slice(1);
const validHex = (text: string) => /^#[\da-f]{6}$/i.test(text);
// Flooring avoids presenting a failing 4.499:1 pair as meeting a 4.5:1 target.
const ratioText = (ratio: number) => (Math.floor(ratio * 100) / 100).toFixed(2);

function ThemeRecipe({ mode, theme, current, onApply }: {
  mode: PaletteMode;
  theme: GeneratedTheme;
  current: DesignSystem["global"];
  onApply: (tokens: ColorTokens) => void;
}) {
  const matches = Object.entries(theme.tokens).every(
    ([key, value]) => current[key as keyof ColorTokens].toLowerCase() === value,
  );
  return (
    <section className={styles.recipe} aria-label={`${title(mode)} palette`}>
      <div className={styles.recipeHeading}>
        <h4>{title(mode)} palette</h4>
        {matches && <span className={styles.match}>Matches global colors</span>}
      </div>
      <div
        className={styles.sample}
        style={{ background: theme.tokens.background, color: theme.tokens.foreground, borderColor: theme.tokens.border }}
      >
        <strong>Your workspace</strong>
        <p style={{ color: theme.tokens.mutedForeground }}>A shared visual language.</p>
        <div className={styles.roleSamples}>
          {paletteRoles.map((role) => (
            <span key={role} style={{ background: theme.roles[role].solid, color: theme.roles[role].onSolid }}>
              {title(role)}
            </span>
          ))}
        </div>
      </div>
      <Button fullWidth onClick={() => onApply(theme.tokens)}>
        Apply {mode} colors
      </Button>
      <details className={styles.details}>
        <summary>{title(mode)} role recipes & contrast</summary>
        <p>Generated recipes, not current component styles. Hover, active, subtle and focus roles are prepared for the theme integration stage.</p>
        {paletteRoles.map((role) => {
          const colors = theme.roles[role];
          return (
            <div className={styles.roleRecipe} key={role}>
              <h5>{title(role)}</h5>
              <div className={styles.roleSamples}>
                {(["solid", "hover", "active"] as const).map((state) => (
                  <span key={state} style={{ background: colors[state], color: colors.onSolid }}>
                    {title(state)} {ratioText(contrastRatio(colors.onSolid, colors[state]))}:1
                  </span>
                ))}
                <span style={{ background: colors.subtle, color: colors.onSubtle }}>
                  Subtle {ratioText(contrastRatio(colors.onSubtle, colors.subtle))}:1
                </span>
              </div>
              <p>Text ≥ 4.5:1. Outline / focus ≥ 3:1 on this palette’s background and muted surface.</p>
              <dl className={styles.values}>
                {Object.entries(colors).map(([key, color]) => (
                  <div key={key}><dt>{key}</dt><dd><code>{color}</code></dd></div>
                ))}
              </dl>
            </div>
          );
        })}
      </details>
    </section>
  );
}

export function ColorBuilder({ system, onApply }: {
  system: DesignSystem;
  onApply: (tokens: ColorTokens) => void;
}) {
  const id = useId();
  const [source, setSource] = useState(system.global.primary);
  const [palette, setPalette] = useState(() => generatePalette(system.global.primary));
  const [message, setMessage] = useState("");
  const valid = validHex(source);
  const stale = !valid || source.toLowerCase() !== palette.source;

  function generate(next: string) {
    setSource(next);
    setPalette(generatePalette(next));
    setMessage("Light and dark palettes generated. Review them before applying.");
  }

  return (
    <section className={styles.builder} aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`}>Color builder</h3>
      <p>Start with a brand color. Keep its hue; derive readable usage tones. Status colors stay green, amber, red and blue.</p>
      <label htmlFor={`${id}-source`}>Source brand color</label>
      <div className={styles.sourceInput}>
        <input
          type="color"
          aria-label="Source brand color picker"
          value={valid ? source : palette.source}
          onChange={(event) => { setSource(event.target.value); setMessage(""); }}
        />
        <input
          id={`${id}-source`}
          type="text"
          value={source}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={!valid}
          aria-describedby={`${id}-help`}
          onChange={(event) => { setSource(event.target.value); setMessage(""); }}
        />
      </div>
      <p id={`${id}-help`}>
        {valid ? "Six-digit hex. Your source stays separate from the adjusted primary color." : "Enter a six-digit hex color, such as #e8673c."}
      </p>
      <div className={styles.presets} aria-label="Brand color presets">
        {presets.map((preset) => (
          <Button key={preset.name} aria-label={`Generate ${preset.name} palette`} onClick={() => generate(preset.color)}>
            <span className={styles.swatch} style={{ background: preset.color }} aria-hidden="true" />
            {preset.name}
          </Button>
        ))}
      </div>
      <div className={styles.actions}>
        <Button disabled={!valid} onClick={() => generate(source)}>Generate palettes</Button>
        <Button onClick={() => generate(system.global.primary)}>Use current primary</Button>
      </div>
      <p role="status" className={styles.feedback}>{message}</p>
      <details className={styles.details} open>
        <summary>Generated from <code>{palette.source}</code></summary>
        {stale && <p className={styles.warning}>Source changed. Generate again to update these recipes; they still use {palette.source}.</p>}
        <p>Applying replaces all 17 global colors. Spacing and component overrides stay unchanged. This is not an editor theme switch.</p>
        {(["light", "dark"] as const).map((mode) => (
          <ThemeRecipe
            key={mode}
            mode={mode}
            theme={palette[mode]}
            current={system.global}
            onApply={(tokens) => {
              onApply(tokens);
              setMessage(`${title(mode)} global colors applied from ${palette.source}. Component overrides were kept. Check current contrast below.`);
            }}
          />
        ))}
      </details>
      <details className={styles.details}>
        <summary>12-step color scales</summary>
        <p>Light to dark. Scale stops are raw colors, not guaranteed text/background combinations.</p>
        {([...paletteRoles, "neutral"] as const).map((role) => (
          <div className={styles.scale} key={role}>
            <h4>{title(role)}</h4>
            <ol>
              {palette.scales[role].map((color, index) => (
                <li key={index}>
                  <span className={styles.swatch} style={{ background: color }} aria-hidden="true" />
                  <span>{index + 1}</span><code>{color}</code>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </details>
      <p>Source and generated recipes are kept while this page stays open, not after a reload. Existing CSS/JSON exports contain applied tokens only, not the source or both recipes.</p>
    </section>
  );
}

export function ContrastReport({ system, component }: { system: DesignSystem; component?: ComponentId }) {
  const checks = useMemo(() => auditSystemColors(system), [system]);
  const scoped = component ? checks.filter((check) => check.component === component) : checks;
  const failures = scoped.filter((check) => !check.passes);
  return (
    <section className={styles.report} aria-label="Current contrast checks">
      <h3>{component ? `${title(component)} contrast` : "Current system contrast"}</h3>
      <p role="status" aria-atomic="true">
        {failures.length > 0
          ? `${failures.length} of ${scoped.length} checked color pairs need attention.`
          : `All ${scoped.length} checked color pairs meet their targets.`}
      </p>
      <p>Selected color pairs on the global surface, including modeled mixes and enabled states. Not a complete accessibility audit; nested surfaces and other states still need review.</p>
      <details className={styles.details}>
        <summary>{failures.length ? `Review ${failures.length} contrast warnings` : "Review checked pairs"}</summary>
        <ul className={styles.checks} tabIndex={0} aria-label="Contrast pair results">
          {(failures.length ? failures : scoped).map((check) => (
            <li key={check.id} data-contrast-check={check.id}>
              <strong>{check.label}</strong>
              <span>{check.passes ? "Pass" : "Below target"}: {ratioText(check.ratio)}:1 / required {check.minimum}:1</span>
              <code>{check.foreground} on {check.background}</code>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
