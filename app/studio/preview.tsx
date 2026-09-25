"use client";

import {
  useId,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Tabs } from "@base-ui/react/tabs";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Input,
  Switch,
} from "./components";

import { Icon } from "./icons";
import { Button as StudioButton } from "./controls";
import type { PaletteMode } from "./color-engine";
import type { Locale } from "./locale";
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

function WorkspaceSettings({ copy }: { copy: PreviewCopy }) {
  const titleId = useId();
  const [workspace, setWorkspace] = useState("Acme Studio");
  const [saves, setSaves] = useState(0);
  const [saved, setSaved] = useState(false);
  const markChanged = () => setSaved(false);

  return (
    <section className={styles.context} aria-labelledby={titleId}>
      <div className={styles.sectionHeading}>
        <span>{copy.workspace.inContext}</span>
        <span className={styles.sectionHint}>{copy.workspace.hint}</span>
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
              <h3 id={titleId}>{copy.workspace.settings}</h3>
              <p className={styles.muted}>
                {copy.workspace.subtitle}
              </p>
            </div>
          </div>
          <Badge variant="subtle" tone="primary">
            {copy.workspace.plan}
          </Badge>
        </div>
        <div className={styles.workspaceBody}>
          <div className={styles.workspaceFields}>
            <Input
              label={copy.workspace.name}
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
                label={copy.workspace.emailNotifications}
                defaultChecked
                onCheckedChange={markChanged}
              />
              <Checkbox
                label={copy.workspace.weeklySummary}
                defaultChecked
                onCheckedChange={markChanged}
              />
            </div>
          </div>
          <Card>
            <Card.Icon>
              <Icon name="spark" />
            </Card.Icon>
            <Card.Title>{copy.workspace.cardTitle}</Card.Title>
            <Card.Description>
              {copy.workspace.cardDescription}
            </Card.Description>
            <Badge dot tone="success" variant="subtle">
              {copy.workspace.connected}
            </Badge>
          </Card>
        </div>
        <div className={styles.workspaceFooter}>
          <p className={styles.saveStatus} role="status">
            {saved ? (
              <>
                <Icon name="check" size="1.15em" /> {copy.workspace.saved(saves)}
              </>
            ) : (
              copy.workspace.prompt
            )}
          </p>
          <Button
            type="submit"
            endIcon={<Icon name={saved ? "check" : "arrow"} />}
          >
            {saved ? copy.workspace.changesSaved : copy.workspace.saveChanges}
          </Button>
        </div>
      </form>
    </section>
  );
}


function Showcase({
  id,
  expanded,
  badge,
  copy,
}: {
  id: ComponentId;
  expanded: boolean;
  badge: string;
  copy: PreviewCopy;
}) {
  const { name, description } = copy.components[id];

  return (
    <section className={styles.showcase} aria-label={copy.showcase.preview(name)}>
      <header className={styles.showcaseHeader}>
        <h3>{name}</h3>
        <span className={styles.showcaseBadge}>{badge}</span>
      </header>
      <div className={`${styles.specimen} ${expanded ? styles.expanded : ""}`}>
        <Specimen id={id} expanded={expanded} copy={copy} />
      </div>
      <p className={styles.showcaseCaption}>
        {expanded
          ? copy.showcase.liveStates
          : description}
      </p>
    </section>
  );
}

function ThemePane({ theme, mode, activeMode, compare, compact, onModeChange, children, copy }: {
  theme: ThemeTokens;
  mode: PaletteMode;
  activeMode: PaletteMode;
  compare: boolean;
  compact: boolean;
  onModeChange: (mode: PaletteMode) => void;
  children: ReactNode;
  copy: PreviewCopy;
}) {
  const variables = useMemo(() => toCSSVariables(theme, mode), [theme, mode]);
  return (
    <section
      className="theme-pane"
      data-active={mode === activeMode || undefined}
      hidden={!compare && mode !== activeMode}
      aria-label={copy.theme.preview(copy.modes[mode])}
    >
      <header className="theme-pane-header" hidden={!compare}>
        <strong>{copy.theme.theme(copy.modes[mode], mode === activeMode)}</strong>
        <StudioButton onClick={() => onModeChange(mode)}>
          {copy.theme.edit(copy.modes[mode].toLocaleLowerCase("tr"))}
        </StudioButton>
      </header>
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

export function Preview({ selected, system, compact, mode, compare, onModeChange, locale }: {
  selected: "overview" | ComponentId;
  system: DesignSystem;
  compact: boolean;
  mode: PaletteMode;
  compare: boolean;
  onModeChange: (mode: PaletteMode) => void;
  locale: Locale;
}) {
  const copy = previewCopy[locale];
  const overview = selected === "overview";
  return (
    <>
      {/* Each context has one tab panel; both theme instances stay mounted. */}
      <Tabs.Panel value="components" keepMounted className={styles.contextPanel}>
        <div className={compare ? "theme-comparison" : undefined}>
          {(["light", "dark"] as const).map((item) => (
            <ThemePane key={item} theme={system.themes[item]} mode={item} activeMode={mode}
              compare={compare} compact={compact} onModeChange={onModeChange} copy={copy}>
              <div className={styles.previewHeading}>
                <div>
                  <p className={styles.eyebrow}>{copy.heading.systemEyebrow(copy.modes[item])}</p>
                  <h2>{overview ? copy.heading.overview : copy.components[selected].name}</h2>
                  <p className={styles.intro}>
                    {overview ? copy.heading.overviewIntro : copy.components[selected].description}
                  </p>
                </div>
                <span className={styles.liveIndicator}><span /> {copy.heading.livePreview}</span>
              </div>
              <div className={overview ? styles.grid : undefined}>
                {(overview ? componentIds : [selected as ComponentId]).map((id, index) => (
                  <Showcase key={id} id={id} expanded={!overview}
                    badge={overview ? String(index + 1).padStart(2, "0") : copy.heading.spotlight} copy={copy} />
                ))}
              </div>
            </ThemePane>
          ))}
        </div>
      </Tabs.Panel>
      <Tabs.Panel value="scenario" keepMounted className={styles.contextPanel}>
        <div className={compare ? "theme-comparison" : undefined}>
          {(["light", "dark"] as const).map((item) => (
            <ThemePane key={item} theme={system.themes[item]} mode={item} activeMode={mode}
              compare={compare} compact={compact} onModeChange={onModeChange} copy={copy}>
              <div className={styles.previewHeading}>
                <div>
                  <p className={styles.eyebrow}>{copy.heading.contextEyebrow(copy.modes[item])}</p>
                  <h2>{copy.heading.scenario}</h2>
                  <p className={styles.intro}>
                    {copy.heading.scenarioIntro(copy.modes[mode].toLocaleLowerCase("tr"))}
                  </p>
                </div>
                <span className={styles.liveIndicator}><span /> {copy.heading.livePreview}</span>
              </div>
              <WorkspaceSettings copy={copy} />
            </ThemePane>
          ))}
        </div>
      </Tabs.Panel>
    </>
  );
}
