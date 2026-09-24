"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Dialog } from "@base-ui/react/dialog";
import { Tabs } from "@base-ui/react/tabs";
import { Button, NavItem, SegmentedControl } from "./controls";
import { BrandMark, Icon } from "./icons";
import { Preview } from "./preview";
import { DeveloperView } from "./developer";
import { ColorBuilder, ContrastReport } from "./color-builder";
import {
  componentIds,
  defaultSystem,
  exportCSS,
  isComponentKey,
  parseDesignSystem,
  resolveComponent,
  STORAGE_KEY,
  tokenFields,
  type ComponentId,
  type ComponentTokens,
  type DesignSystem,
  type TokenField,
  type TokenValues,
} from "./tokens";

type Selection = "overview" | ComponentId;
type Scope = "global" | "component";
type View = "design" | "develop";
type PreviewContext = "components" | "scenario";
const title = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);


function isValidToken(field: TokenField, text: string) {
  if (field.type === "color") return /^#[\da-f]{6}$/i.test(text);
  const number = Number(text);
  return (
    text.trim() !== "" &&
    Number.isFinite(number) &&
    number >= field.min! &&
    number <= field.max!
  );
}

function TokenControl({
  field,
  value,
  overridden,
  onChange,
  onReset,
}: {
  field: TokenField;
  value: string | number;
  overridden?: boolean;
  onChange: (value: string | number) => void;
  onReset: () => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isColor = field.type === "color";
  const displayed = draft ?? String(value);
  const valid = isValidToken(field, displayed);
  return (
    <div className="token-control">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={`token-${field.key}`}
          className="text-[12px] text-zinc-600"
        >
          {field.label}
        </label>
        {overridden === true && (
          <button
            type="button"
            className="inherit-button"
            aria-label={`Reset ${field.label.toLowerCase()} override`}
            title="Reset to global token"
            onClick={() => {
              setDraft(null);
              onReset();
              // The reset control disappears; keep focus in the field it affected.
              inputRef.current?.focus();
            }}
          >
            <Icon name="reset" size={11} />
            Override
          </button>
        )}
        {overridden === false && (
          <span className="inherit-button" title="Inherited from global tokens">
            <Icon name="link" size={11} />
            Global
          </span>
        )}
      </div>
      <div className="token-input">
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
          ref={inputRef}
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
            if (isValidToken(field, next))
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
  const [view, setView] = useState<View>("design");
  const [previewContext, setPreviewContext] = useState<PreviewContext>("components");
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
    ({ key }) => isGlobal || isComponentKey(key),
  );
  const colorFields = fields.filter((field) => field.type === "color");
  const numberFields = fields.filter((field) => field.type === "number");
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
        Skip to workspace
      </a>
      <header className="studio-header">
        <Link href="/" className="brand" aria-label="bambiui home">
          <span className="brand-mark">
            <BrandMark size={24} />
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
            aria-label="Import design system"
            disabled={!ready}
            startIcon={<Icon name="upload" />}
            onClick={() => importRef.current?.click()}
          >
            Import
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
              render={
                <Button
                  variant="primary"
                  startIcon={<Icon name="download" />}
                />
              }
              aria-label="Export tokens"
              disabled={!ready}
            >
              Export tokens
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Backdrop className="studio-backdrop" />
              <Dialog.Popup className="export-dialog">
                <div className="flex items-center justify-between">
                  <Dialog.Title className="text-lg font-semibold">
                    Take your system with you.
                  </Dialog.Title>
                  <Dialog.Close
                    render={
                      <Button
                        variant="ghost"
                        iconOnly
                        aria-label="Close export dialog"
                      />
                    }
                  >
                    <Icon name="close" />
                  </Dialog.Close>
                </div>
                <Dialog.Description className="mt-2 text-sm text-zinc-500">
                  Export CSS custom properties for your styles, or JSON to
                  restore your workspace. Component markup and styles are not
                  included.
                </Dialog.Description>
                <SegmentedControl
                  className="mt-5"
                  aria-label="Export format"
                  value={format}
                  onValueChange={(next) => {
                    setFormat(next);
                    setCopyStatus("");
                  }}
                >
                  {(["css", "json"] as const).map((item) => (
                    <SegmentedControl.Item key={item} value={item}>
                      {item.toUpperCase()}
                    </SegmentedControl.Item>
                  ))}
                </SegmentedControl>
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
                  <Button onClick={copy}>Copy {format.toUpperCase()}</Button>
                  <Button
                    variant="primary"
                    startIcon={<Icon name="download" />}
                    onClick={download}
                  >
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
        <NavItem
          icon={<Icon name="grid" />}
          current={selection === "overview"}
          end={<span className="nav-end">6</span>}
          onClick={() => select("overview")}
        >
          Overview
        </NavItem>
        <NavItem
          icon={<Icon name="sliders" />}
          end={
            <span className="nav-end">
              <Icon name="chevron" size={12} />
            </span>
          }
          onClick={() => {
            setScope("global");
            document
              .getElementById("token-editor")
              ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
          }}
        >
          Global tokens
        </NavItem>
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
              <NavItem
                key={id}
                icon={<Icon name={id} />}
                current={selection === id}
                end={
                  Object.keys(system.components[id]).length > 0 && (
                    <>
                      <span
                        className="override-dot"
                        aria-hidden="true"
                        title="Has custom tokens"
                      />
                      <span className="sr-only">, has custom tokens</span>
                    </>
                  )
                }
                onClick={() => select(id)}
              >
                {title(id)}
              </NavItem>
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
        <Tabs.Root
          className="workspace-tabs"
          value={view}
          onValueChange={(next) => setView(next as View)}
        >
          <div className="preview-toolbar">
            <Tabs.List className="view-switch" aria-label="Workspace view">
              <Tabs.Tab value="design">
                <Icon name="grid" size={14} />
                Design
              </Tabs.Tab>
              <Tabs.Tab value="develop">
                <Icon name="code" size={15} />
                Develop
              </Tabs.Tab>
            </Tabs.List>
            <div className="preview-width-controls" hidden={view !== "design"}>
              <span className="viewport-label">
                {compact ? "375 px" : "Responsive"}
              </span>
              <SegmentedControl
                aria-label="Preview width"
                value={compact ? "mobile" : "desktop"}
                onValueChange={(next) => setCompact(next === "mobile")}
              >
                <SegmentedControl.Item value="desktop" aria-label="Desktop preview">
                  <Icon name="desktop" size={15} />
                </SegmentedControl.Item>
                <SegmentedControl.Item value="mobile" aria-label="Mobile preview">
                  <Icon name="mobile" size={15} />
                </SegmentedControl.Item>
              </SegmentedControl>
            </div>
          </div>
          <div className="preview-canvas">
            {notice && (
              <div role="status" className="notice">
                <span>{notice}</span>
                <Button
                  variant="ghost"
                  iconOnly
                  aria-label="Dismiss notification"
                  onClick={() => setNotice("")}
                >
                  <Icon name="close" size={14} />
                </Button>
              </div>
            )}
            <Tabs.Panel value="design" keepMounted className="workspace-panel">
              <Tabs.Root
                value={previewContext}
                onValueChange={(next) => setPreviewContext(next as PreviewContext)}
                className="preview-context"
              >
                <div className="context-toolbar">
                  <Tabs.List className="context-switch" aria-label="Design preview context">
                    <Tabs.Tab value="components">Components</Tabs.Tab>
                    <Tabs.Tab value="scenario">Scenario</Tabs.Tab>
                  </Tabs.List>
                  <p>Compare the details or try the whole system.</p>
                </div>
                <div className={`preview-frame ${compact ? "compact" : ""}`}>
                  <div className="canvas-label">
                    <span>
                      {previewContext === "scenario"
                        ? "WORKSPACE SCENARIO"
                        : selection === "overview"
                          ? "COMPONENT COLLECTION"
                          : `${selection.toUpperCase()} EXPLORER`}
                    </span>
                    <span>
                      {previewContext === "components" && selection === "overview"
                        ? "01 — 06"
                        : "INTERACTIVE"}
                    </span>
                  </div>
                  <Preview
                    selected={selection}
                    system={system}
                    compact={compact}
                  />
                </div>
              </Tabs.Root>
            </Tabs.Panel>
            <Tabs.Panel value="develop" keepMounted className="workspace-panel">
              <DeveloperView selected={selection} system={system} />
            </Tabs.Panel>
            <div className="canvas-footnote">
              <Icon name="link" size={13} />
              Connected to your tokens. Always in sync.
            </div>
          </div>
        </Tabs.Root>
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
        <SegmentedControl
          className="editor-scope"
          aria-label="Token scope"
          value={scope}
          onValueChange={setScope}
        >
          <SegmentedControl.Item value="global">Global tokens</SegmentedControl.Item>
          <SegmentedControl.Item
            value="component"
            disabled={selection === "overview"}
          >
            Component
          </SegmentedControl.Item>
        </SegmentedControl>
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
          {ready && (
            <div hidden={!isGlobal}>
              <ColorBuilder
                system={system}
                onApply={(colors) => update({
                  ...system,
                  global: { ...system.global, ...colors },
                })}
              />
            </div>
          )}
          <ContrastReport system={system} component={isGlobal ? undefined : component} />
          {(
            [
              {
                type: "color",
                heading: "Colors",
                hint: String(colorFields.length),
                className: "color-fields",
                items: colorFields,
              },
              {
                type: "number",
                heading: "Shape & spacing",
                hint: "PX",
                className: "number-fields",
                items: numberFields,
              },
            ] as const
          ).map((group) => (
            <section className="token-section" key={group.type}>
              <div className="section-heading">
                <h3>{group.heading}</h3>
                <span>{group.hint}</span>
              </div>
              <div className={group.className}>
                {group.items.map((field) => (
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
          ))}
          <Button
            className="reset-button"
            fullWidth
            startIcon={<Icon name="reset" size={14} />}
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
