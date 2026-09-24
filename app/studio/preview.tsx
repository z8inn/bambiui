"use client";

import { useId, useState, type CSSProperties, type ReactNode } from "react";
import { Button } from "@base-ui/react/button";
import { Input } from "@base-ui/react/input";
import { Switch } from "@base-ui/react/switch";
import { Checkbox } from "@base-ui/react/checkbox";
import {
  componentIds,
  toCSSVariables,
  type ComponentId,
  type DesignSystem,
} from "./tokens";
import styles from "./preview.module.css";

const components: Record<ComponentId, { name: string; description: string }> = {
  button: {
    name: "Button",
    description: "A little nudge to take the next step.",
  },
  input: { name: "Input", description: "Make room for a good idea." },
  card: {
    name: "Card",
    description: "A home for things that belong together.",
  },
  badge: { name: "Badge", description: "Small details. Just enough context." },
  switch: { name: "Switch", description: "A simple choice, on or off." },
  checkbox: {
    name: "Checkbox",
    description: "Keep the important things in check.",
  },
};

function Icon({
  kind = "check",
}: {
  kind?: "check" | "arrow" | "plus" | "spark";
}) {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === "check" && <path d="m4 10 4 4 8-8" />}
      {kind === "arrow" && <path d="M4 10h12m-5-5 5 5-5 5" />}
      {kind === "plus" && <path d="M10 4v12M4 10h12" />}
      {kind === "spark" && (
        <path d="m10 2 2.2 5.8L18 10l-5.8 2.2L10 18l-2.2-5.8L2 10l5.8-2.2L10 2Z" />
      )}
    </svg>
  );
}

function DemoButton({
  children = "Get started",
  disabled = false,
}: {
  children?: ReactNode;
  disabled?: boolean;
}) {
  const [clicks, setClicks] = useState(0);
  return (
    <div className={styles.actionDemo}>
      <Button
        className={styles.button}
        disabled={disabled}
        onClick={() => setClicks((count) => count + 1)}
      >
        <span>{clicks ? "All set" : children}</span>
        <Icon kind={clicks ? "check" : "arrow"} />
      </Button>
      <span className={styles.srOnly} role="status">
        {clicks > 0 ? `Demo action completed successfully (${clicks}).` : ""}
      </span>
    </div>
  );
}

function TextInput({
  label,
  disabled = false,
  defaultValue,
  placeholder,
}: {
  label: string;
  disabled?: boolean;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className={styles.inputGroup}>
      <span className={styles.fieldLabel}>{label}</span>
      <Input
        className={styles.input}
        disabled={disabled}
        defaultValue={defaultValue}
        placeholder={placeholder}
      />
    </label>
  );
}

function Toggle({
  label,
  defaultChecked = false,
  disabled = false,
  onCheckedChange,
}: {
  label: string;
  defaultChecked?: boolean;
  disabled?: boolean;
  onCheckedChange?: () => void;
}) {
  return (
    <label className={styles.switchGroup} data-disabled={disabled || undefined}>
      <Switch.Root
        className={styles.switch}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      >
        <Switch.Thumb className={styles.thumb} />
      </Switch.Root>
      <span>{label}</span>
    </label>
  );
}

function Check({
  label,
  defaultChecked = false,
  disabled = false,
  onCheckedChange,
}: {
  label: string;
  defaultChecked?: boolean;
  disabled?: boolean;
  onCheckedChange?: () => void;
}) {
  return (
    <label
      className={styles.checkboxGroup}
      data-disabled={disabled || undefined}
    >
      <Checkbox.Root
        className={styles.checkbox}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      >
        <Checkbox.Indicator className={styles.indicator}>
          <Icon />
        </Checkbox.Indicator>
      </Checkbox.Root>
      <span>{label}</span>
    </label>
  );
}

function Badge({
  children,
  subtle = false,
}: {
  children: ReactNode;
  subtle?: boolean;
}) {
  return (
    <span className={`${styles.badge} ${subtle ? styles.subtle : ""}`}>
      <span className={styles.badgeDot} aria-hidden="true" />
      {children}
    </span>
  );
}

function SampleCard({ alternate = false }: { alternate?: boolean }) {
  return (
    <article className={`${styles.card} ${alternate ? styles.elevated : ""}`}>
      <span className={styles.cardSymbol}>
        <Icon kind={alternate ? "plus" : "spark"} />
      </span>
      <strong>{alternate ? "Space to explore" : "Make something great"}</strong>
      <p className={styles.muted}>
        {alternate
          ? "Your next idea starts right here."
          : "Good design starts with a few thoughtful details."}
      </p>
    </article>
  );
}

function Specimen({ id, expanded }: { id: ComponentId; expanded: boolean }) {
  switch (id) {
    case "button":
      return (
        <div className={styles.states}>
          <DemoButton />
          <DemoButton disabled>Disabled</DemoButton>
        </div>
      );
    case "input":
      return (
        <div className={styles.inputStates}>
          <TextInput label="Email address" placeholder="you@example.com" />
          {expanded && (
            <TextInput
              label="Read-only workspace email"
              defaultValue="hello@studio.design"
              disabled
            />
          )}
        </div>
      );
    case "card":
      return (
        <div className={styles.cardStates}>
          <SampleCard />
          {expanded && <SampleCard alternate />}
        </div>
      );
    case "badge":
      return (
        <div className={styles.states}>
          <Badge>Published</Badge>
          <Badge subtle>Draft</Badge>
          {expanded && <Badge>In review</Badge>}
        </div>
      );
    case "switch":
      return (
        <div className={styles.toggleStates}>
          <Toggle label="Notifications" defaultChecked />
          <Toggle label="Focus mode" />
          {expanded && <Toggle label="Unavailable" disabled />}
        </div>
      );
    case "checkbox":
      return (
        <div className={styles.toggleStates}>
          <Check label="Include the details" defaultChecked />
          <Check label="Keep me in the loop" />
          {expanded && <Check label="Unavailable" disabled defaultChecked />}
        </div>
      );
  }
}

function WorkspaceSettings() {
  const titleId = useId();
  const [workspace, setWorkspace] = useState("Acme Studio");
  const [saves, setSaves] = useState(0);
  const [saved, setSaved] = useState(false);
  const markChanged = () => setSaved(false);

  return (
    <section className={styles.context} aria-labelledby={titleId}>
      <div className={styles.sectionHeading}>
        <span>IN CONTEXT</span>
        <span className={styles.sectionHint}>The little things, together</span>
      </div>
      <form
        className={styles.workspace}
        onSubmit={(event) => {
          event.preventDefault();
          setSaves((count) => count + 1);
          setSaved(true);
        }}
      >
        <div className={styles.workspaceHeader}>
          <div className={styles.workspaceIdentity}>
            <span className={styles.workspaceMark}>
              <Icon kind="spark" />
            </span>
            <div>
              <h3 id={titleId}>Workspace settings</h3>
              <p className={styles.muted}>
                A small space for your next big thing.
              </p>
            </div>
          </div>
          <Badge>Pro plan</Badge>
        </div>
        <div className={styles.workspaceBody}>
          <div className={styles.workspaceFields}>
            <label className={styles.inputGroup}>
              <span className={styles.fieldLabel}>Workspace name</span>
              <Input
                className={styles.input}
                name="workspace"
                required
                value={workspace}
                onValueChange={(value) => {
                  setWorkspace(value);
                  markChanged();
                }}
              />
            </label>
            <div className={styles.preferences}>
              <Toggle
                label="Email notifications"
                defaultChecked
                onCheckedChange={markChanged}
              />
              <Check
                label="Send me a weekly summary"
                defaultChecked
                onCheckedChange={markChanged}
              />
            </div>
          </div>
          <article className={styles.card}>
            <span className={styles.cardSymbol}>
              <Icon kind="spark" />
            </span>
            <strong>A little more you.</strong>
            <p className={styles.muted}>
              Your colors, your rhythm. One system that makes every detail feel
              at home.
            </p>
            <Badge>All connected</Badge>
          </article>
        </div>
        <div className={styles.workspaceFooter}>
          <p className={styles.saveStatus} role="status">
            {saved ? (
              <>
                <Icon /> Saved locally in this preview · {saves}
              </>
            ) : (
              "Make it yours. Try a few changes."
            )}
          </p>
          <Button type="submit" className={styles.button}>
            <span>{saved ? "Changes saved" : "Save changes"}</span>
            <Icon kind={saved ? "check" : "arrow"} />
          </Button>
        </div>
      </form>
    </section>
  );
}

export function Preview({
  selected,
  system,
  compact,
}: {
  selected: "overview" | ComponentId;
  system: DesignSystem;
  compact: boolean;
}) {
  const titleId = useId();
  const overview = selected === "overview";
  return (
    <div
      className={`${styles.preview} ${compact ? styles.compact : ""}`}
      style={toCSSVariables(system) as CSSProperties}
    >
      <section aria-labelledby={titleId}>
        <div className={styles.previewHeading}>
          <div>
            <p className={styles.eyebrow}>YOUR SYSTEM, IN ACTION</p>
            <h2 id={titleId}>
              {overview
                ? "Small pieces. Endless possibilities."
                : components[selected].name}
            </h2>
            <p className={styles.intro}>
              {overview
                ? "A living collection, shaped by your design decisions."
                : components[selected].description}
            </p>
          </div>
          <span className={styles.liveIndicator}>
            <span /> Live preview
          </span>
        </div>
        <div className={overview ? styles.grid : styles.isolated}>
          {(overview ? componentIds : [selected as ComponentId]).map(
            (id, index) => (
              <section
                className={styles.showcase}
                key={id}
                aria-label={`${components[id].name} preview`}
              >
                <header className={styles.showcaseHeader}>
                  <h3>{components[id].name}</h3>
                  <span>
                    {overview
                      ? String(index + 1).padStart(2, "0")
                      : "COMPONENT SPOTLIGHT"}
                  </span>
                </header>
                <div
                  className={`${styles.specimen} ${!overview ? styles.expanded : ""}`}
                >
                  <Specimen id={id} expanded={!overview} />
                </div>
                <p className={styles.showcaseCaption}>
                  {overview
                    ? components[id].description
                    : "Live states · Try the controls to see how they feel."}
                </p>
              </section>
            ),
          )}
        </div>
      </section>
      <WorkspaceSettings />
      <p className={styles.previewFootnote}>
        Built from the same tokens. Designed to belong together.
      </p>
    </div>
  );
}
