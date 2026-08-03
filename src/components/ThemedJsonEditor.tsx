"use client";

import { useTheme } from "next-themes";
import { JsonEditor, githubDarkTheme, githubLightTheme } from "json-edit-react";

// Neither built-in theme styles the edit input, so it falls back to the
// library's default (near-black text, no explicit background) — on top of
// githubDarkTheme's near-black container that reads as black-on-black.
// Layered on unconditionally: it only ever shows once the edit UI renders,
// so it's inert wherever editing is restricted.
const inputThemeOverride = {
  dark: {
    input: { color: "#E6EDF3", backgroundColor: "#161b22", borderColor: "#30363d" },
    inputHighlight: "#264f78",
  },
  light: {
    input: { color: "#1F2328", backgroundColor: "#ffffff", borderColor: "#d0d7de" },
    inputHighlight: "#b3d8ff",
  },
};

interface ThemedJsonEditorProps {
  data: unknown;
  rootName?: string;
  collapse?: number | boolean;
  maxWidth?: string;
  editable?: boolean;
  onChange?: (data: unknown) => void;
}

// The one "show me this JSON" treatment this app uses — same font size and
// theme-aware coloring (dark/light via next-themes) everywhere it appears:
// MetadataViewer's "View metadata" dialog, OperationViewer's schema dialog,
// and the Workspace explorer's value pane. These had each drifted to a
// different font size, and two of the three ignored dark mode entirely
// (covia-ai/frontend#202 and its follow-up).
export function ThemedJsonEditor({
  data,
  rootName = "value",
  collapse = 3,
  maxWidth = "100%",
  editable = false,
  onChange,
}: ThemedJsonEditorProps) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  return (
    <JsonEditor
      data={data}
      setData={editable ? onChange : undefined}
      rootName={rootName}
      rootFontSize="0.875em"
      maxWidth={maxWidth}
      restrictEdit={!editable}
      restrictAdd={!editable}
      restrictDelete={!editable}
      collapse={collapse}
      theme={[
        dark ? githubDarkTheme : githubLightTheme,
        dark ? inputThemeOverride.dark : inputThemeOverride.light,
      ]}
    />
  );
}
