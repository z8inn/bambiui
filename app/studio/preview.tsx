"use client";

import {
  useId,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Input,
  Switch,
} from "./components";
import { Tabs } from "@base-ui/react/tabs";
import { highlight } from "sugar-high";
import { Icon } from "./icons";
import { snippets } from "./snippets";
import {
  componentIds,
  toCSSVariables,
  type ComponentId,
  type DesignSystem,
} from "./tokens";
import styles from "./preview.module.css";

const title = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const componentMeta: Record<
  ComponentId,
  { name: string; description: string }
> = {
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
        disabled={disabled}
        onClick={() => setClicks((count) => count + 1)}
        endIcon={<Icon name={clicks ? "check" : "arrow"} />}
      >
        {clicks ? "All set" : children}
      </Button>
      <span className={styles.srOnly} role="status">
        {clicks > 0 ? `Demo action completed successfully (${clicks}).` : ""}
      </span>
    </div>
  );
}

function Specimen({ id, expanded }: { id: ComponentId; expanded: boolean }) {
  switch (id) {
    case "button":
      if (!expanded)
        return (
          <div className={styles.states}>
            <DemoButton />
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
        );
      return (
        <div className={styles.rows}>
          <div className={styles.states}>
            <DemoButton />
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Delete</Button>
            <Button variant="link">Learn more</Button>
          </div>
          <div className={styles.states}>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button variant="outline" iconOnly aria-label="Add item">
              <Icon name="plus" />
            </Button>
          </div>
          <div className={styles.states}>
            <Button startIcon={<Icon name="download" />}>Download</Button>
            <Button loading>Saving</Button>
            <DemoButton disabled>Disabled</DemoButton>
          </div>
        </div>
      );
    case "input":
      return (
        <div className={styles.inputStates}>
          <Input
            label="Email address"
            type="email"
            placeholder="you@example.com"
            description={expanded ? "We only use it for receipts." : undefined}
          />
          {expanded && (
            <>
              <Input
                label="Search"
                hideLabel
                type="search"
                size="sm"
                placeholder="Search components…"
                startIcon={<Icon name="search" />}
              />
              <Input
                label="Workspace URL"
                type="url"
                defaultValue="studio"
                error="Enter a full URL, including https://"
              />
              <Input
                label="Read-only workspace email"
                defaultValue="hello@studio.design"
                readOnly
              />
              <Input label="Unavailable" size="lg" disabled defaultValue="—" />
              <div className={styles.sizeGroup}>
                <Input label="Small" size="sm" placeholder="size=&quot;sm&quot;" />
                <Input label="Medium" size="md" placeholder="size=&quot;md&quot;" />
                <Input label="Large" size="lg" placeholder="size=&quot;lg&quot;" />
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
              <Card.Title>Make something great</Card.Title>
              <Card.Description>
                Good design starts with a few thoughtful details.
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
                  <Card.Title>Space to explore</Card.Title>
                  <Card.Description>
                    Your next idea starts right here.
                  </Card.Description>
                </Card.Header>
                <Card.Footer>
                  <Button size="sm">Start</Button>
                  <Button size="sm" variant="ghost">
                    Later
                  </Button>
                </Card.Footer>
              </Card>
              <Card variant="filled" size="sm">
                <Card.Header>
                  <Card.Title>Filled, small</Card.Title>
                  <Card.Description>
                    A quieter surface for secondary content.
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
                  {title(tone)}
                </Badge>
              ))}
            </div>
          ))}
          <div className={styles.states}>
            <Badge size="sm" dot tone="success">
              Small
            </Badge>
            <Badge dot tone="success">
              Medium
            </Badge>
            <Badge size="lg" dot tone="success">
              Large
            </Badge>
          </div>
        </div>
      ) : (
        <div className={styles.states}>
          <Badge dot>Published</Badge>
          <Badge variant="subtle">Draft</Badge>
          <Badge variant="subtle" tone="success" dot>
            Live
          </Badge>
        </div>
      );
    case "switch":
      return (
        <div className={styles.toggleStates}>
          <Switch label="Notifications" defaultChecked />
          <Switch label="Focus mode" />
          {expanded && (
            <>
              <Switch
                label="Auto-save"
                description="Saves every change as you go."
                size="lg"
                defaultChecked
              />
              <Switch label="Compact rows" size="sm" labelPosition="start" />
              <Switch label="Unavailable" disabled />
            </>
          )}
        </div>
      );
    case "checkbox":
      return (
        <div className={styles.toggleStates}>
          <Checkbox label="Include the details" defaultChecked />
          <Checkbox label="Keep me in the loop" />
          {expanded && (
            <>
              <Checkbox label="Select all" indeterminate />
              <Checkbox
                label="I accept the terms"
                required
                error="Please accept the terms to continue."
              />
              <Checkbox label="Small print" size="sm" />
              <Checkbox label="Unavailable" disabled defaultChecked />
            </>
          )}
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
              <Icon name="spark" size="1.15em" />
            </span>
            <div>
              <h3 id={titleId}>Workspace settings</h3>
              <p className={styles.muted}>
                A small space for your next big thing.
              </p>
            </div>
          </div>
          <Badge variant="subtle" tone="primary">
            Pro plan
          </Badge>
        </div>
        <div className={styles.workspaceBody}>
          <div className={styles.workspaceFields}>
            <Input
              label="Workspace name"
              name="workspace"
              required
              value={workspace}
              onValueChange={(value) => {
                setWorkspace(value);
                markChanged();
              }}
            />
            <div className={styles.preferences}>
              <Switch
                label="Email notifications"
                defaultChecked
                onCheckedChange={markChanged}
              />
              <Checkbox
                label="Send me a weekly summary"
                defaultChecked
                onCheckedChange={markChanged}
              />
            </div>
          </div>
          <Card>
            <Card.Icon>
              <Icon name="spark" />
            </Card.Icon>
            <Card.Title>A little more you.</Card.Title>
            <Card.Description>
              Your colors, your rhythm. One system that makes every detail feel
              at home.
            </Card.Description>
            <Badge dot tone="success" variant="subtle">
              All connected
            </Badge>
          </Card>
        </div>
        <div className={styles.workspaceFooter}>
          <p className={styles.saveStatus} role="status">
            {saved ? (
              <>
                <Icon name="check" size="1.15em" /> Saved locally in this
                preview · {saves}
              </>
            ) : (
              "Make it yours. Try a few changes."
            )}
          </p>
          <Button
            type="submit"
            endIcon={<Icon name={saved ? "check" : "arrow"} />}
          >
            {saved ? "Changes saved" : "Save changes"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function CodeBlock({ name, code }: { name: string; code: string }) {
  const [copyStatus, setCopyStatus] = useState("");
  // sugar-high escapes the source and only emits token <span>s.
  const html = useMemo(() => highlight(code), [code]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Copy failed");
    }
  }

  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeActions}>
        {/* The button label shows the result; announce it for screen readers too. */}
        <span role="status" className={styles.srOnly}>
          {copyStatus}
        </span>
        <button
          type="button"
          className={styles.copyButton}
          aria-label={`Copy ${name} code`}
          onClick={copy}
          onBlur={() => setCopyStatus("")}
        >
          <Icon name={copyStatus === "Copied" ? "check" : "copy"} size={13} />
          {copyStatus === "Copied" ? "Copied" : "Copy"}
        </button>
      </div>
      {/* The scroll container is the tab stop so arrow keys scroll the code. */}
      <pre className={styles.code} tabIndex={0} aria-label={`${name} React code`}>
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
}

function Showcase({
  id,
  expanded,
  badge,
}: {
  id: ComponentId;
  expanded: boolean;
  badge: string;
}) {
  const { name, description } = componentMeta[id];

  if (!expanded)
    return (
      <section className={styles.showcase} aria-label={`${name} preview`}>
        <header className={styles.showcaseHeader}>
          <h3>{name}</h3>
          <span className={styles.showcaseBadge}>{badge}</span>
        </header>
        <div className={styles.specimen}>
          <Specimen id={id} expanded={false} />
        </div>
        <p className={styles.showcaseCaption}>{description}</p>
      </section>
    );

  return (
    <section className={styles.showcase} aria-label={`${name} preview`}>
      <Tabs.Root defaultValue="preview">
        <header className={styles.showcaseHeader}>
          <h3>{name}</h3>
          <Tabs.List
            className={styles.showcaseTabs}
            aria-label={`${name} example view`}
          >
            <Tabs.Tab value="preview" className={styles.showcaseTab}>
              <Icon name="grid" size={13} />
              Preview
            </Tabs.Tab>
            <Tabs.Tab value="code" className={styles.showcaseTab}>
              <Icon name="code" size={13} />
              React
            </Tabs.Tab>
            <Tabs.Indicator className={styles.showcaseTabIndicator} />
          </Tabs.List>
        </header>
        {/* Keep the preview mounted so demo state survives a look at the code. */}
        <Tabs.Panel
          value="preview"
          keepMounted
          className={`${styles.specimen} ${styles.expanded}`}
        >
          <Specimen id={id} expanded />
        </Tabs.Panel>
        <Tabs.Panel value="code" className={styles.codePanel} tabIndex={-1}>
          <CodeBlock name={name} code={snippets[id]} />
        </Tabs.Panel>
      </Tabs.Root>
      <p className={styles.showcaseCaption}>
        Live states · Try the controls to see how they feel.
      </p>
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
                : componentMeta[selected].name}
            </h2>
            <p className={styles.intro}>
              {overview
                ? "A living collection, shaped by your design decisions."
                : componentMeta[selected].description}
            </p>
          </div>
          <span className={styles.liveIndicator}>
            <span /> Live preview
          </span>
        </div>
        <div className={overview ? styles.grid : styles.isolated}>
          {(overview ? componentIds : [selected as ComponentId]).map(
            (id, index) => (
              <Showcase
                key={id}
                id={id}
                expanded={!overview}
                badge={
                  overview
                    ? String(index + 1).padStart(2, "0")
                    : "COMPONENT SPOTLIGHT"
                }
              />
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
