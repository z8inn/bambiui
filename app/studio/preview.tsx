"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Input,
  Switch,
} from "./components";

import { Icon } from "./icons";

import type { PaletteMode } from "./color-engine";

import { previewCopy, type PreviewCopy } from "./preview-copy";

import {
  componentIds,
  toCSSVariables,
  type ComponentId,
  type DesignSystem,
  type ThemeTokens,
} from "./tokens";
import styles from "./preview.module.css";


function DemoButton({
  children,
  disabled = false,
  copy,
}: {
  children?: ReactNode;
  disabled?: boolean;
  copy: PreviewCopy;
}) {
  const [clicks, setClicks] = useState(0);
  return (
    <div className={styles.actionDemo}>
      <Button
        disabled={disabled}
        onClick={() => setClicks((count) => count + 1)}
        endIcon={<Icon name={clicks ? "check" : "arrow"} />}
      >
        {clicks ? copy.demo.allSet : children ?? copy.demo.getStarted}
      </Button>
      <span className={styles.srOnly} role="status">
        {clicks > 0 ? copy.demo.completed(clicks) : ""}
      </span>
    </div>
  );
}

function Specimen({ id, expanded, copy }: { id: ComponentId; expanded: boolean; copy: PreviewCopy }) {
  switch (id) {
    case "button":
      if (!expanded)
        return (
          <div className={styles.states}>
            <DemoButton copy={copy} />
            <Button variant="secondary">{copy.button.secondary}</Button>
            <Button variant="ghost">{copy.button.ghost}</Button>
          </div>
        );
      return (
        <div className={styles.rows}>
          <div className={styles.states}>
            <DemoButton copy={copy} />
            <Button variant="secondary">{copy.button.secondary}</Button>
            <Button variant="outline">{copy.button.outline}</Button>
            <Button variant="ghost">{copy.button.ghost}</Button>
            <Button variant="destructive">{copy.button.delete}</Button>
            <Button variant="link">{copy.button.learnMore}</Button>
          </div>
          <div className={styles.states}>
            <Button size="sm">{copy.button.small}</Button>
            <Button size="md">{copy.button.medium}</Button>
            <Button size="lg">{copy.button.large}</Button>
            <Button variant="outline" iconOnly aria-label={copy.button.addItem}>
              <Icon name="plus" />
            </Button>
          </div>
          <div className={styles.states}>
            <Button startIcon={<Icon name="download" />}>{copy.button.download}</Button>
            <Button loading>{copy.button.saving}</Button>
            <DemoButton copy={copy} disabled>{copy.button.disabled}</DemoButton>
          </div>
        </div>
      );
    case "input":
      return (
        <div className={styles.inputStates}>
          <Input
            label={copy.input.email}
            type="email"
            placeholder="you@example.com"
            description={expanded ? copy.input.receipts : undefined}
          />
          {expanded && (
            <>
              <Input
                label={copy.input.search}
                hideLabel
                type="search"
                size="sm"
                placeholder={copy.input.searchPlaceholder}
                startIcon={<Icon name="search" />}
              />
              <Input
                label={copy.input.url}
                type="url"
                defaultValue="studio"
                error={copy.input.urlError}
              />
              <Input
                label={copy.input.readOnlyEmail}
                defaultValue="hello@studio.design"
                readOnly
              />
              <Input label={copy.input.unavailable} size="lg" disabled defaultValue="—" />
              <div className={styles.sizeGroup}>
                <Input label={copy.button.small} size="sm" placeholder="size=&quot;sm&quot;" />
                <Input label={copy.button.medium} size="md" placeholder="size=&quot;md&quot;" />
                <Input label={copy.button.large} size="lg" placeholder="size=&quot;lg&quot;" />
              </div>
            </>
          )}
        </div>
      );
    case "card":
      return (
        <div className={styles.cardStates}>
          <Card>
            <Card.Icon>
              <Icon name="spark" />
            </Card.Icon>
            <Card.Header>
              <Card.Title>{copy.card.make}</Card.Title>
              <Card.Description>
                {copy.card.makeDescription}
              </Card.Description>
            </Card.Header>
          </Card>
          {expanded && (
            <>
              <Card variant="elevated">
                <Card.Icon>
                  <Icon name="plus" />
                </Card.Icon>
                <Card.Header>
                  <Card.Title>{copy.card.explore}</Card.Title>
                  <Card.Description>
                    {copy.card.exploreDescription}
                  </Card.Description>
                </Card.Header>
                <Card.Footer>
                  <Button size="sm">{copy.card.start}</Button>
                  <Button size="sm" variant="ghost">
                    {copy.card.later}
                  </Button>
                </Card.Footer>
              </Card>
              <Card variant="filled" size="sm">
                <Card.Header>
                  <Card.Title>{copy.card.filled}</Card.Title>
                  <Card.Description>
                    {copy.card.filledDescription}
                  </Card.Description>
                </Card.Header>
              </Card>
            </>
          )}
        </div>
      );
    case "badge":
      return expanded ? (
        <div className={styles.rows}>
          {(["solid", "subtle", "outline"] as const).map((variant) => (
            <div className={styles.states} key={variant}>
              {(
                [
                  "neutral",
                  "primary",
                  "success",
                  "warning",
                  "danger",
                  "info",
                ] as const
              ).map((tone) => (
                <Badge key={tone} variant={variant} tone={tone}>
                  {copy.tones[tone]}
                </Badge>
              ))}
            </div>
          ))}
          <div className={styles.states}>
            <Badge size="sm" dot tone="success">
              {copy.button.small}
            </Badge>
            <Badge dot tone="success">
              {copy.button.medium}
            </Badge>
            <Badge size="lg" dot tone="success">
              {copy.button.large}
            </Badge>
          </div>
        </div>
      ) : (
        <div className={styles.states}>
          <Badge dot>{copy.badge.published}</Badge>
          <Badge variant="subtle">{copy.badge.draft}</Badge>
          <Badge variant="subtle" tone="success" dot>
            {copy.badge.live}
          </Badge>
        </div>
      );
    case "switch":
      return (
        <div className={styles.toggleStates}>
          <Switch label={copy.switch.notifications} defaultChecked />
          <Switch label={copy.switch.focus} />
          {expanded && (
            <>
              <Switch
                label={copy.switch.autoSave}
                description={copy.switch.autoSaveDescription}
                size="lg"
                defaultChecked
              />
              <Switch label={copy.switch.compact} size="sm" labelPosition="start" />
              <Switch label={copy.input.unavailable} disabled />
            </>
          )}
        </div>
      );
    case "checkbox":
      return (
        <div className={styles.toggleStates}>
          <Checkbox label={copy.checkbox.details} defaultChecked />
          <Checkbox label={copy.checkbox.loop} />
          {expanded && (
            <>
              <Checkbox label={copy.checkbox.selectAll} indeterminate />
              <Checkbox
                label={copy.checkbox.terms}
                required
                error={copy.checkbox.termsError}
              />
              <Checkbox label={copy.checkbox.smallPrint} size="sm" />
              <Checkbox label={copy.input.unavailable} disabled defaultChecked />
            </>
          )}
        </div>
      );
  }
}

function Showcase({
  id,
  expanded,
  copy,
}: {
  id: ComponentId;
  expanded: boolean;

  copy: PreviewCopy;
}) {
  const { name } = copy.components[id];

  return (
    <section className={styles.showcase} data-specimen={id} aria-label={copy.showcase.preview(name)}>
      <header className={styles.showcaseHeader}>
        <h2>{name}</h2>
      </header>
      <div className={`${styles.specimen} ${expanded ? styles.expanded : ""}`}>
        <Specimen id={id} expanded={expanded} copy={copy} />
      </div>

    </section>
  );
}

function ThemePane({ theme, mode, compact, children, copy }: {
  theme: ThemeTokens;
  mode: PaletteMode;

  compact: boolean;
  children: ReactNode;
  copy: PreviewCopy;
}) {
  const variables = useMemo(() => toCSSVariables(theme, mode), [theme, mode]);
  return (
    <section className="theme-pane" aria-label={copy.theme.preview(copy.modes[mode])}>
      <div
        className={`${styles.preview} ${compact ? styles.compact : ""}`}
        data-ds-theme={mode}
        style={{ ...variables, colorScheme: mode } as CSSProperties}
      >
        {children}
      </div>
    </section>
  );
}

export function Preview({ selected, system, compact, mode, active = true }: {
  selected: "overview" | ComponentId;
  system: DesignSystem;
  compact: boolean;
  mode: PaletteMode;
  active?: boolean;
}) {
  const copy = previewCopy;
  const helpId = useId();
  const viewport = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; left: number; top: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [size, setSize] = useState({ width: 960, height: 1600 });

  const naturalLayout = () => compact || window.matchMedia("(max-width: 760px)").matches;

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      setSize({ width: element.offsetWidth, height: element.offsetHeight });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!active) return;
    const frame = requestAnimationFrame(() => {
      const view = viewport.current;
      const target = selected === "overview"
        ? canvas.current
        : canvas.current?.querySelector<HTMLElement>(`[data-specimen="${selected}"]`);
      if (!view || !target || !view.clientWidth) return;
      if (compact || window.matchMedia("(max-width: 760px)").matches) {
        if (selected !== "overview") target.scrollIntoView({ block: "center", behavior: "instant" });
      } else if (selected === "overview") {
        setZoom(Math.min(1, Math.max(0.25, Math.min(
          (view.clientWidth - 32) / target.offsetWidth,
          (view.clientHeight - 32) / target.offsetHeight,
        ))));
        view.scrollTo({ left: 0, top: 0, behavior: "instant" });
      } else {
        const bounds = target.getBoundingClientRect();
        const box = view.getBoundingClientRect();
        view.scrollTo({
          left: view.scrollLeft + bounds.left - box.left + bounds.width / 2 - view.clientWidth / 2,
          top: view.scrollTop + bounds.top - box.top + bounds.height / 2 - view.clientHeight / 2,
          behavior: "instant",
        });
      }
      if (selected !== "overview") {
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const highlight = { outline: "2px solid var(--ds-foreground)", outlineOffset: "4px" };
        target.animate(reducedMotion ? [highlight, highlight] : [
          { outline: "2px solid transparent", outlineOffset: "4px" },
          { ...highlight, offset: 0.2 },
          { outline: "2px solid transparent", outlineOffset: "4px" },
        ], { duration: 1400 });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [selected, active, compact]);

  function changeZoom(next: number) {
    const view = viewport.current;
    if (!view || naturalLayout()) return;
    const value = Math.min(2, Math.max(0.25, next));
    const x = (view.scrollLeft + view.clientWidth / 2) / zoom;
    const y = (view.scrollTop + view.clientHeight / 2) / zoom;
    setZoom(value);
    requestAnimationFrame(() => view.scrollTo({
      left: x * value - view.clientWidth / 2,
      top: y * value - view.clientHeight / 2,
      behavior: "instant",
    }));
  }

  function fit() {
    const view = viewport.current;
    if (!view) return;
    changeZoom(Math.min((view.clientWidth - 32) / size.width, (view.clientHeight - 32) / size.height, 1));
  }

  return (
    <ThemePane theme={system.themes[mode]} mode={mode} compact={compact} copy={copy}>
      <div className={styles.canvasControls} role="group" aria-label="Canvas zoom">
        <button type="button" onClick={() => changeZoom(zoom - 0.1)} disabled={zoom <= 0.25} aria-label="Zoom out">−</button>
        <output aria-live="polite" aria-label="Zoom level">{Math.round(zoom * 100)}%</output>
        <button type="button" onClick={() => changeZoom(zoom + 0.1)} disabled={zoom >= 2} aria-label="Zoom in">+</button>
        <button type="button" onClick={fit}>Fit</button>
        <button type="button" onClick={() => changeZoom(1)}>Reset zoom</button>
      </div>
      <p id={helpId} className={styles.srOnly}>Scroll to explore all six components. On desktop, drag empty background to pan, or focus the canvas and use arrow keys. Use the zoom buttons to fit or resize the canvas.</p>
      <div
        ref={viewport}
        className={styles.viewport}
        tabIndex={0}
        role="region"
        aria-label="Component canvas"
        aria-describedby={helpId}
        onPointerDown={(event) => {
          if (naturalLayout() || event.button !== 0 || event.pointerType === "touch" || !(event.target instanceof Element)) return;
          // Specimen content is never a drag handle, including labels and selectable text.
          if (event.target.closest("[data-specimen]")) return;
          const view = event.currentTarget;
          drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, left: view.scrollLeft, top: view.scrollTop };
          view.setPointerCapture(event.pointerId);
          view.dataset.dragging = "true";
          view.focus({ preventScroll: true });
          event.preventDefault();
        }}
        onPointerMove={(event) => {
          const start = drag.current;
          if (!start || start.id !== event.pointerId) return;
          event.currentTarget.scrollLeft = start.left - (event.clientX - start.x);
          event.currentTarget.scrollTop = start.top - (event.clientY - start.y);
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          drag.current = null;
          delete event.currentTarget.dataset.dragging;
        }}
        onPointerCancel={(event) => {
          drag.current = null;
          delete event.currentTarget.dataset.dragging;
        }}
        onLostPointerCapture={(event) => {
          drag.current = null;
          delete event.currentTarget.dataset.dragging;
        }}
      >
        <div className={styles.canvasExtent} style={{ width: size.width * zoom, height: size.height * zoom }}>
          <div ref={canvas} className={styles.canvas} style={{ transform: `scale(${zoom})` }}>
            <div className={styles.grid}>
              {componentIds.map((id) => <Showcase key={id} id={id} expanded copy={copy} />)}
            </div>
          </div>
        </div>
      </div>
    </ThemePane>
  );
}
