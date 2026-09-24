"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@base-ui/react/button";
import { Dialog } from "@base-ui/react/dialog";
import { Icon } from "./icons";
import { Preview } from "./preview";
import {
  componentIds,
  defaultSystem,
  exportCSS,
  parseDesignSystem,
  resolveComponent,
  STORAGE_KEY,
  tokenFields,
  type ComponentId,
  type ComponentTokens,
  type DesignSystem,
  type TokenValues,
} from "./tokens";

type Selection = "overview" | ComponentId;
type Scope = "global" | "component";
const title = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const presets = [
  { name: "Terracotta", color: "#e8673c" },
  { name: "Iris", color: "#7660d5" },
  { name: "Ocean", color: "#247db3" },
  { name: "Forest", color: "#287c60" },
  { name: "Graphite", color: "#27272a" },
];

function TokenControl({
  field,
  value,
  overridden,
  onChange,
  onReset,
}: {
  field: (typeof tokenFields)[number];
  value: string | number;
  overridden?: boolean;
  onChange: (value: string | number) => void;
  onReset: () => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const isColor = field.type === "color";
  const displayed = draft ?? String(value);
  const valid = isColor
    ? /^#[\da-f]{6}$/i.test(displayed)
    : displayed.trim() !== "" &&
      Number.isFinite(Number(displayed)) &&
      Number(displayed) >= field.min! &&
      Number(displayed) <= field.max!;
  return (
    <div className="token-control">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={`token-${field.key}`}
          className="text-[12px] text-zinc-600"
        >
          {field.label}
        </label>
        {overridden !== undefined && (
          <button
            type="button"
            className={`inherit-button ${overridden ? "is-override" : ""}`}
            aria-label={`Reset ${field.label.toLowerCase()} to global token`}
            disabled={!overridden}
            onClick={() => {
              setDraft(null);
              onReset();
            }}
            title={
              overridden
                ? "Reset to global token"
                : "Inherited from global tokens"
            }
          >
            <Icon name={overridden ? "reset" : "link"} size={11} />
            {overridden ? "Override" : "Global"}
          </button>
        )}
      </div>
      <div className={`token-input ${!valid ? "invalid" : ""}`}>
        {isColor && (
          <input
            type="color"
            aria-label={`${field.label} color picker`}
            value={String(value)}
            onChange={(event) => {
              setDraft(null);
              onChange(event.target.value);
            }}
          />
        )}
        <input
          id={`token-${field.key}`}
          type={isColor ? "text" : "number"}
          min={field.min}
          max={field.max}
          step="any"
          spellCheck={false}
          aria-invalid={!valid}
          aria-describedby={!valid ? `error-${field.key}` : undefined}
          value={displayed}
          onChange={(event) => {
            const next = event.target.value;
            setDraft(next);
            if (
              isColor
                ? /^#[\da-f]{6}$/i.test(next)
                : next.trim() !== "" &&
                  Number.isFinite(Number(next)) &&
                  Number(next) >= field.min! &&
                  Number(next) <= field.max!
            )
              onChange(isColor ? next : Number(next));
          }}
          onBlur={() => setDraft(null)}
        />
        <span>{isColor ? "HEX" : "px"}</span>
      </div>
      {!isColor && (
        <input
          className="token-range"
          type="range"
          aria-label={`${field.label} slider`}
          min={field.min}
          max={field.max}
          value={Number(value)}
          onChange={(event) => {
            setDraft(null);
            onChange(Number(event.target.value));
          }}
        />
      )}
      {!valid && (
        <p className="text-[10px] text-red-600" id={`error-${field.key}`}>
          {isColor
            ? "Use a six-digit hex color."
            : `Use a value from ${field.min} to ${field.max}.`}
        </p>
      )}
    </div>
  );
}

export default function Studio() {
  const [system, setSystem] = useState<DesignSystem>(defaultSystem);
  const [ready, setReady] = useState(false);
  const [selection, setSelection] = useState<Selection>("overview");
  const [scope, setScope] = useState<Scope>("global");
  const [query, setQuery] = useState("");
  const [compact, setCompact] = useState(false);
  const [view, setView] = useState<"preview" | "code">("preview");
  const [status, setStatus] = useState("Loading local draft…");
  const [notice, setNotice] = useState("");
  const [format, setFormat] = useState<"css" | "json">("css");
  const [copyStatus, setCopyStatus] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    // Read after hydration so the server and initial client render stay identical.
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setSystem(parseDesignSystem(saved));
        setStatus(saved ? "Saved locally" : "Local draft");
      } catch {
        setStatus("Local draft");
        setNotice(
          "Your saved draft could not be loaded. A fresh workspace is ready; export a backup before leaving.",
        );
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function update(next: DesignSystem) {
    setSystem(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setStatus("Saved locally");
    } catch {
      setStatus("Not saved");
      setNotice(
        "Browser storage is unavailable. Export your design system to keep a copy.",
      );
    }
  }

  function select(next: Selection) {
    setSelection(next);
    setScope(next === "overview" ? "global" : "component");
  }

  const component = selection === "overview" ? "button" : selection;
  const isGlobal = scope === "global";
  const values = isGlobal ? system.global : resolveComponent(system, component);
  const fields = tokenFields.filter(
    ({ key }) => isGlobal || (key !== "primary" && key !== "onPrimary"),
  );
  const overrideCount = Object.values(system.components).reduce(
    (count, tokens) => count + Object.keys(tokens).length,
    0,
  );
  const output =
    format === "css" ? exportCSS(system) : JSON.stringify(system, null, 2);

  function setToken(key: keyof TokenValues, value: string | number) {
    if (isGlobal)
      update({ ...system, global: { ...system.global, [key]: value } });
    else
      update({
        ...system,
        components: {
          ...system.components,
          [component]: { ...system.components[component], [key]: value },
        },
      });
  }

  function resetToken(key: keyof ComponentTokens) {
    const overrides = { ...system.components[component] };
    delete overrides[key];
    update({
      ...system,
      components: { ...system.components, [component]: overrides },
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(output);
      setCopyStatus("Copied to clipboard");
    } catch {
      setCopyStatus("Clipboard unavailable. Use Download instead.");
    }
  }

  function download() {
    const url = URL.createObjectURL(
      new Blob([output], {
        type: format === "css" ? "text/css" : "application/json",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `bambi-tokens.${format}`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="studio-shell">
      <a className="skip-link" href="#workspace">
        Skip to preview
      </a>
      <header className="studio-header">
        <Link href="/" className="brand" aria-label="Bambi UI home">
          <span className="brand-mark">
            <Icon name="spark" size={22} />
          </span>
          bambi<span className="brand-ui">ui</span>
          <span className="beta-tag">BETA</span>
        </Link>
        <div className="project-name">
          <span className="text-zinc-300">/</span>
          <input
            aria-label="Design system name"
            maxLength={80}
            disabled={!ready}
            value={system.name}
            onChange={(event) =>
              update({ ...system, name: event.target.value })
            }
          />
          <span className="draft-tag">Draft</span>
        </div>
        <div className="header-actions">
          <span className="save-status">
            <span
              className={`status-dot ${status === "Not saved" ? "warning" : ""}`}
            />
            {status}
          </span>
          <Button
            className="studio-button import-button"
            aria-label="Import design system"
            disabled={!ready}
            onClick={() => importRef.current?.click()}
          >
            <Icon name="upload" />
            <span>Import</span>
          </Button>
          <input
            ref={importRef}
            className="hidden"
            type="file"
            accept=".json,application/json"
            aria-label="Import design system JSON"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              try {
                if (file.size > 100_000)
                  throw new Error("The file must be smaller than 100 KB.");
                const imported = parseDesignSystem(await file.text());
                if (
                  !window.confirm(
                    "Replace the current design system with this file?",
                  )
                )
                  return;
                update(imported);
                setNotice("Design system imported successfully.");
              } catch (error) {
                setNotice(
                  `Import failed: ${error instanceof Error ? error.message : "Invalid JSON file."}`,
                );
              }
            }}
          />
          <Dialog.Root onOpenChange={() => setCopyStatus("")}>
            <Dialog.Trigger
              className="studio-button primary-button"
              aria-label="Export tokens"
              disabled={!ready}
            >
              <Icon name="download" />
              <span>Export tokens</span>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Backdrop className="studio-backdrop" />
              <Dialog.Popup className="export-dialog">
                <div className="flex items-center justify-between">
                  <Dialog.Title className="text-lg font-semibold">
                    Take your system with you.
                  </Dialog.Title>
                  <Dialog.Close
                    className="icon-button"
                    aria-label="Close export dialog"
                  >
                    <Icon name="close" />
                  </Dialog.Close>
                </div>
                <Dialog.Description className="mt-2 text-sm text-zinc-500">
                  Export CSS custom properties for your styles, or JSON to
                  restore your workspace. Component markup and styles are not
                  included.
                </Dialog.Description>
                <div className="segmented mt-5" aria-label="Export format">
                  {(["css", "json"] as const).map((item) => (
                    <Button
                      key={item}
                      aria-pressed={format === item}
                      onClick={() => {
                        setFormat(item);
                        setCopyStatus("");
                      }}
                      className={format === item ? "active" : ""}
                    >
                      {item.toUpperCase()}
                    </Button>
                  ))}
                </div>
                <pre
                  className="code-output"
                  tabIndex={0}
                  aria-label="Exported tokens"
                >
                  <code>{output}</code>
                </pre>
                <p role="status" className="min-h-5 text-xs text-zinc-500">
                  {copyStatus}
                </p>
                <div className="mt-3 flex justify-end gap-2">
                  <Button className="studio-button" onClick={copy}>
                    Copy {format.toUpperCase()}
                  </Button>
                  <Button
                    className="studio-button primary-button"
                    onClick={download}
                  >
                    <Icon name="download" />
                    Download
                  </Button>
                </div>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </header>

      <aside className="studio-sidebar" aria-label="Component library">
        <div className="sidebar-project">
          <span className="project-icon">
            <Icon name="box" size={20} />
          </span>
          <div>
            <strong>Your design system</strong>
            <span>Make it feel like you.</span>
          </div>
        </div>
        <div className="sidebar-section-label">WORKSPACE</div>
        <Button
          className={`nav-item ${selection === "overview" ? "active" : ""}`}
          aria-pressed={selection === "overview"}
          onClick={() => select("overview")}
        >
          <Icon name="grid" />
          Overview<span className="nav-end">6</span>
        </Button>
        <Button
          className="nav-item"
          onClick={() => {
            setScope("global");
            document
              .getElementById("token-editor")
              ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
          }}
        >
          <Icon name="sliders" />
          Global tokens
          <span className="nav-end">
            <Icon name="chevron" size={12} />
          </span>
        </Button>
        <div className="sidebar-divider" />
        <div className="sidebar-section-label flex justify-between">
          COMPONENTS<span>06</span>
        </div>
        <div className="search-field">
          <Icon name="search" size={14} />
          <input
            aria-label="Search components"
            placeholder="Find a component…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <nav aria-label="Components" className="component-nav">
          {componentIds
            .filter((id) => id.includes(query.toLowerCase().trim()))
            .map((id) => (
              <Button
                key={id}
                className={`nav-item ${selection === id ? "active" : ""}`}
                aria-pressed={selection === id}
                onClick={() => select(id)}
              >
                <Icon name={id} />
                {title(id)}
                {Object.keys(system.components[id]).length > 0 && (
                  <span className="override-dot" title="Has custom tokens" />
                )}
              </Button>
            ))}
          {!componentIds.some((id) =>
            id.includes(query.toLowerCase().trim()),
          ) && (
            <p className="p-3 text-xs text-zinc-500">No components found.</p>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="tip-card">
            <Icon name="spark" size={18} />
            <strong>Small tokens. Big possibilities.</strong>
            <p>
              Start with your foundations, then make every component your own.
            </p>
          </div>
          <a
            className="docs-link"
            href="https://base-ui.com/react/overview/quick-start"
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="box" size={14} />
            Built with Base UI
            <Icon name="arrow" size={14} />
          </a>
        </div>
      </aside>

      <main className="studio-main" id="workspace" tabIndex={-1}>
        <div className="workspace-heading">
          <div className="breadcrumbs">
            Workspace
            <Icon name="chevron" size={11} />
            <span>
              {selection === "overview" ? "Overview" : title(selection)}
            </span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1>
                {selection === "overview"
                  ? "Your system, coming together."
                  : `${title(selection)}, your way.`}
              </h1>
              <p>
                {selection === "overview"
                  ? "One place to shape your foundations and see them in action."
                  : "Fine-tune the details. Every change is reflected in real time."}
              </p>
            </div>
            <span className="live-badge">
              <span />
              Live preview
            </span>
          </div>
        </div>
        <div className="preview-toolbar">
          <div className="view-switch" aria-label="Workspace view">
            <Button
              aria-pressed={view === "preview"}
              onClick={() => setView("preview")}
              className={view === "preview" ? "active" : ""}
            >
              <Icon name="grid" size={14} />
              Preview
            </Button>
            <Button
              aria-pressed={view === "code"}
              onClick={() => setView("code")}
              className={view === "code" ? "active" : ""}
            >
              <Icon name="code" size={15} />
              Tokens
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <span className="viewport-label">
              {compact ? "375 px" : "Responsive"}
            </span>
            <div className="segmented" aria-label="Preview width">
              <Button
                aria-label="Desktop preview"
                aria-pressed={!compact}
                className={!compact ? "active" : ""}
                onClick={() => setCompact(false)}
              >
                <Icon name="desktop" size={15} />
              </Button>
              <Button
                aria-label="Mobile preview"
                aria-pressed={compact}
                className={compact ? "active" : ""}
                onClick={() => setCompact(true)}
              >
                <Icon name="mobile" size={15} />
              </Button>
            </div>
          </div>
        </div>
        <div className="preview-canvas">
          {notice && (
            <div role="status" className="notice">
              <span>{notice}</span>
              <Button
                className="icon-button"
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <Icon name="close" size={14} />
              </Button>
            </div>
          )}
          {view === "preview" ? (
            <div className={`preview-frame ${compact ? "compact" : ""}`}>
              <div className="canvas-label">
                <span>
                  {selection === "overview"
                    ? "COMPONENT COLLECTION"
                    : `${selection.toUpperCase()} EXPLORER`}
                </span>
                <span>
                  {selection === "overview" ? "01 — 06" : "INTERACTIVE"}
                </span>
              </div>
              <Preview selected={selection} system={system} compact={compact} />
            </div>
          ) : (
            <div className="tokens-code">
              <h2>One source of truth.</h2>
              <p>
                Global foundations and component aliases, as CSS custom
                properties.
              </p>
              <pre tabIndex={0} aria-label="Live CSS tokens">
                <code>{exportCSS(system)}</code>
              </pre>
            </div>
          )}
          <div className="canvas-footnote">
            <Icon name="link" size={13} />
            Connected to your tokens. Always in sync.
          </div>
        </div>
        <footer className="workspace-footer">
          <span>
            <span className="status-dot" />
            {componentIds.length} components
            <span className="footer-separator">/</span>
            {tokenFields.length} global tokens
            <span className="footer-separator">/</span>
            {overrideCount} overrides
          </span>
          <span>Made to be yours.</span>
        </footer>
      </main>

      <aside
        className="token-editor"
        id="token-editor"
        aria-label="Design token editor"
      >
        <div className="editor-title">
          <Icon name="sliders" />
          <h2>Token inspector</h2>
          <span className="editor-count">{fields.length}</span>
        </div>
        <div className="editor-scope segmented" aria-label="Token scope">
          <Button
            aria-pressed={isGlobal}
            className={isGlobal ? "active" : ""}
            onClick={() => setScope("global")}
          >
            Global tokens
          </Button>
          <Button
            disabled={selection === "overview"}
            aria-pressed={!isGlobal}
            className={!isGlobal ? "active" : ""}
            onClick={() => setScope("component")}
          >
            Component
          </Button>
        </div>
        <fieldset disabled={!ready} className="editor-fields">
          <div className="editor-intro">
            <span className="scope-icon">
              <Icon name={isGlobal ? "sliders" : component} size={18} />
            </span>
            <div>
              <h3>
                {isGlobal ? "The foundations" : `${title(component)} tokens`}
              </h3>
              <p>
                {isGlobal
                  ? "A little change goes a long way."
                  : "Your details. Just for this component."}
              </p>
            </div>
          </div>
          <div className="inherit-note">
            <Icon name="link" size={13} />
            <p>
              {isGlobal
                ? "Shared across every component. Overrides stay untouched."
                : "Values inherit from global tokens until you change them. Reset to reconnect."}
            </p>
          </div>
          {isGlobal && (
            <div className="palette-presets">
              <div className="section-heading">
                <h3>Start with a color</h3>
                <span>PRESETS</span>
              </div>
              <div className="flex gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    className="preset-swatch"
                    aria-label={`${preset.name} primary color`}
                    aria-pressed={system.global.primary === preset.color}
                    style={{ background: preset.color }}
                    onClick={() => setToken("primary", preset.color)}
                  >
                    {system.global.primary === preset.color && (
                      <Icon name="check" size={16} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          <section className="token-section">
            <div className="section-heading">
              <h3>Colors</h3>
              <span>
                {fields.filter((field) => field.type === "color").length}
              </span>
            </div>
            <div className="color-fields">
              {fields
                .filter((field) => field.type === "color")
                .map((field) => (
                  <TokenControl
                    key={`${scope}-${component}-${field.key}`}
                    field={field}
                    value={values[field.key as keyof typeof values]}
                    overridden={
                      isGlobal
                        ? undefined
                        : Object.hasOwn(system.components[component], field.key)
                    }
                    onChange={(value) => setToken(field.key, value)}
                    onReset={() =>
                      resetToken(field.key as keyof ComponentTokens)
                    }
                  />
                ))}
            </div>
          </section>
          <section className="token-section">
            <div className="section-heading">
              <h3>Shape & spacing</h3>
              <span>PX</span>
            </div>
            <div className="number-fields">
              {fields
                .filter((field) => field.type === "number")
                .map((field) => (
                  <TokenControl
                    key={`${scope}-${component}-${field.key}`}
                    field={field}
                    value={values[field.key as keyof typeof values]}
                    overridden={
                      isGlobal
                        ? undefined
                        : Object.hasOwn(system.components[component], field.key)
                    }
                    onChange={(value) => setToken(field.key, value)}
                    onReset={() =>
                      resetToken(field.key as keyof ComponentTokens)
                    }
                  />
                ))}
            </div>
          </section>
          <Button
            className="studio-button reset-button"
            onClick={() => {
              if (
                !window.confirm(
                  isGlobal
                    ? "Reset global tokens? Component overrides will be kept."
                    : `Reset all ${component} overrides to global tokens?`,
                )
              )
                return;
              update(
                isGlobal
                  ? { ...system, global: { ...defaultSystem.global } }
                  : {
                      ...system,
                      components: { ...system.components, [component]: {} },
                    },
              );
            }}
          >
            <Icon name="reset" size={14} />
            {isGlobal ? "Reset global tokens" : "Reset component overrides"}
          </Button>
        </fieldset>
        <div className="editor-footer">
          <span className="tiny-orbit" />
          Changes apply instantly
        </div>
      </aside>
    </div>
  );
}
