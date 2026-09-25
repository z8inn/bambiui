"use client";

import { useId, useMemo, useState } from "react";
import { Button } from "./controls";
import {
  contrastRatio,
  generatePalette,
  paletteRoles,
  type ColorTokens,
  type GeneratedTheme,
  type GeneratedPalette,
  type PaletteMode,
} from "./color-engine";
import { auditSystemColors } from "./color-audit";
import { colorBuilderCopy } from "./color-builder-copy";
import type { Locale } from "./locale";
import type { ComponentId, DesignSystem, ThemeTokens } from "./tokens";
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
const numberText = (value: number, locale: Locale) => new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US").format(value);
const ratioText = (ratio: number, locale: Locale) => new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(Math.floor(ratio * 100) / 100);
const minimumText = (minimum: number, locale: Locale) => numberText(minimum, locale);

function auditLabel(label: string, locale: Locale) {
  if (locale === "en") return label;
  return colorBuilderCopy.tr.auditPhrases.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), label);
}

type DraftMessage = { kind: "generated" } | { kind: "applied"; mode: PaletteMode; source: string } | null;

function ThemeRecipe({ mode, theme, current, onApply, locale }: {
  mode: PaletteMode;
  locale: Locale;
  theme: GeneratedTheme;
  current: ThemeTokens["global"];
  onApply: (tokens: ColorTokens) => void;
}) {
  const copy = colorBuilderCopy[locale];
  const modeLabel = copy.modes[mode];
  const matches = Object.entries(theme.tokens).every(
    ([key, value]) => current[key as keyof ColorTokens].toLowerCase() === value,
  );
  return (
    <section className={styles.recipe} aria-label={copy.palette(modeLabel)}>
      <div className={styles.recipeHeading}>
        <h4>{copy.palette(modeLabel)}</h4>
        {matches && <span className={styles.match}>{copy.matches}</span>}
      </div>
      <div
        className={styles.sample}
        style={{ background: theme.tokens.background, color: theme.tokens.foreground, borderColor: theme.tokens.border }}
      >
        <strong>{copy.workspace}</strong>
        <p style={{ color: theme.tokens.mutedForeground }}>{copy.visualLanguage}</p>
        <div className={styles.roleSamples}>
          {paletteRoles.map((role) => (
            <span key={role} style={{ background: theme.roles[role].solid, color: theme.roles[role].onSolid }}>
              {title(role)}
            </span>
          ))}
        </div>
      </div>
      <Button fullWidth onClick={() => onApply(theme.tokens)}>
        {copy.apply(mode)}
      </Button>
      <details className={styles.details}>
        <summary>{copy.recipes(modeLabel)}</summary>
        <p>{copy.derivation}</p>
        {paletteRoles.map((role) => {
          const colors = theme.roles[role];
          return (
            <div className={styles.roleRecipe} key={role}>
              <h5>{title(role)}</h5>
              <div className={styles.roleSamples}>
                {(["solid", "hover", "active"] as const).map((state) => (
                  <span key={state} style={{ background: colors[state], color: colors.onSolid }}>
                    {copy.states[state]} {ratioText(contrastRatio(colors.onSolid, colors[state]), locale)}:1
                  </span>
                ))}
                <span style={{ background: colors.subtle, color: colors.onSubtle }}>
                  {copy.states.subtle} {ratioText(contrastRatio(colors.onSubtle, colors.subtle), locale)}:1
                </span>
              </div>
              <p>{copy.textTargets(minimumText(4.5, locale), minimumText(3, locale))}</p>
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

export function ColorBuilder({ system, mode, onApply, locale }: {
  system: DesignSystem;
  mode: PaletteMode;
  locale: Locale;
  onApply: (tokens: ColorTokens, mode: PaletteMode, source: string) => void;
}) {
  const id = useId();
  const copy = colorBuilderCopy[locale];
  const [drafts, setDrafts] = useState<Record<PaletteMode, { source: string; palette: GeneratedPalette; message: DraftMessage }>>(() => ({
    light: { source: system.themes.light.source, palette: generatePalette(system.themes.light.source), message: null },
    dark: { source: system.themes.dark.source, palette: generatePalette(system.themes.dark.source), message: null },
  }));
  const { source, palette, message } = drafts[mode];

  function changeSource(next: string) {
    setDrafts((current) => ({ ...current, [mode]: { ...current[mode], source: next, message: null } }));
  }
  const valid = validHex(source);
  const stale = !valid || source.toLowerCase() !== palette.source;

  function generate(next: string) {
    setDrafts((current) => ({ ...current, [mode]: {
      source: next,
      palette: generatePalette(next),
      message: { kind: "generated" },
    } }));
  }

  return (
    <section className={styles.builder} aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`}>{copy.builder}</h3>
      <p>{copy.intro}</p>
      <label htmlFor={`${id}-source`}>{copy.source}</label>
      <div className={styles.sourceInput}>
        <input
          type="color"
          aria-label={copy.picker}
          value={valid ? source : palette.source}
          onChange={(event) => changeSource(event.target.value)}
        />
        <input
          id={`${id}-source`}
          type="text"
          value={source}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={!valid}
          aria-describedby={`${id}-help`}
          onChange={(event) => changeSource(event.target.value)}
        />
      </div>
      <p id={`${id}-help`}>
        {valid ? copy.validHex : copy.invalidHex}
      </p>
      <div className={styles.presets} aria-label={copy.presets}>
        {presets.map((preset) => (
          <Button key={preset.name} aria-label={copy.generatePreset(preset.name)} onClick={() => generate(preset.color)}>
            <span className={styles.swatch} style={{ background: preset.color }} aria-hidden="true" />
            {preset.name}
          </Button>
        ))}
      </div>
      <div className={styles.actions}>
        <Button disabled={!valid} onClick={() => generate(source)}>{copy.generate}</Button>
        <Button onClick={() => generate(system.themes[mode].global.primary)}>{copy.usePrimary}</Button>
        <Button onClick={() => generate(system.themes[mode].source)}>{copy.useSource(mode)}</Button>
      </div>
      <p role="status" className={styles.feedback}>{message?.kind === "generated" ? copy.generated : message?.kind === "applied" ? copy.applied(copy.modes[message.mode], message.source) : ""}</p>
      <details className={styles.details} open>
        <summary>{copy.generatedFrom} <code>{palette.source}</code></summary>
        {stale && <p className={styles.warning}>{copy.stale(palette.source)}</p>}
        <p>{copy.applyHelp}</p>
        {(["light", "dark"] as const).map((mode) => (
          <ThemeRecipe
            key={mode}
            mode={mode}
            locale={locale}
            theme={palette[mode]}
            current={system.themes[mode].global}
            onApply={(tokens) => {
              onApply(tokens, mode, palette.source);
              setDrafts((current) => ({ ...current, [mode]: {
                source: palette.source,
                palette,
                message: { kind: "applied", mode, source: palette.source },
              } }));
            }}
          />
        ))}
      </details>
      <details className={styles.details}>
        <summary>{copy.scales(numberText(12, locale))}</summary>
        <p>{copy.scalesHelp}</p>
        {([...paletteRoles, "neutral"] as const).map((role) => (
          <div className={styles.scale} key={role}>
            <h4>{title(role)}</h4>
            <ol>
              {palette.scales[role].map((color, index) => (
                <li key={index}>
                  <span className={styles.swatch} style={{ background: color }} aria-hidden="true" />
                  <span>{numberText(index + 1, locale)}</span><code>{color}</code>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </details>
      <p>{copy.backupHelp}</p>
    </section>
  );
}

export function ContrastReport({ theme, mode, component, locale }: { theme: ThemeTokens; mode: PaletteMode; component?: ComponentId; locale: Locale }) {
  const copy = colorBuilderCopy[locale];
  const checks = useMemo(() => auditSystemColors(theme, mode), [theme, mode]);
  const scoped = component ? checks.filter((check) => check.component === component) : checks;
  const failures = scoped.filter((check) => !check.passes);
  return (
    <section className={styles.report} aria-label={copy.currentChecks}>
      <h3>{copy.modes[mode]} · {component ? copy.componentContrast(title(component)) : copy.systemContrast}</h3>
      <p role="status" aria-atomic="true">
        {failures.length > 0
          ? copy.failures(numberText(failures.length, locale), numberText(scoped.length, locale))
          : copy.allPass(numberText(scoped.length, locale))}
      </p>
      <p>{copy.reportHelp}</p>
      <details className={styles.details}>
        <summary>{failures.length ? copy.reviewWarnings(numberText(failures.length, locale)) : copy.reviewPairs}</summary>
        <ul className={styles.checks} tabIndex={0} aria-label={copy.pairResults}>
          {(failures.length ? failures : scoped).map((check) => (
            <li key={check.id} data-contrast-check={check.id}>
              <strong>{auditLabel(check.label, locale)}</strong>
              <span>{check.passes ? copy.pass : copy.belowTarget}: {ratioText(check.ratio, locale)}:1 / {copy.required} {minimumText(check.minimum, locale)}:1</span>
              <code>{check.foreground} {copy.on} {check.background}</code>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
