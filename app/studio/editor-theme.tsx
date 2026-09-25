"use client";

import { useEffect, useState } from "react";
import { SegmentedControl } from "./controls";

type EditorTheme = "light" | "dark" | "system";

export function EditorThemeControl() {
  const [theme, setTheme] = useState<EditorTheme>("system");

  useEffect(() => {
    document.documentElement.dataset.editorTheme = theme;
  }, [theme]);

  return (
    <SegmentedControl
      aria-label="Editor appearance"
      className="editor-theme-control"
      value={theme}
      onValueChange={setTheme}
    >
      <SegmentedControl.Item value="light">Light</SegmentedControl.Item>
      <SegmentedControl.Item value="dark">Dark</SegmentedControl.Item>
      <SegmentedControl.Item value="system">System</SegmentedControl.Item>
    </SegmentedControl>
  );
}
