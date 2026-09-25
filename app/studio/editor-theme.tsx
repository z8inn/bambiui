"use client";

import { useEffect, useState } from "react";
import { SegmentedControl } from "./controls";
import { copy, type Locale } from "./locale";

type EditorTheme = "light" | "dark" | "system";

export function EditorThemeControl({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const [theme, setTheme] = useState<EditorTheme>("system");

  useEffect(() => {
    document.documentElement.dataset.editorTheme = theme;
  }, [theme]);

  return (
    <SegmentedControl
      aria-label={t.editorAppearance}
      className="editor-theme-control"
      value={theme}
      onValueChange={setTheme}
    >
      <SegmentedControl.Item value="light">{t.light}</SegmentedControl.Item>
      <SegmentedControl.Item value="dark">{t.dark}</SegmentedControl.Item>
      <SegmentedControl.Item value="system">{t.system}</SegmentedControl.Item>
    </SegmentedControl>
  );
}
