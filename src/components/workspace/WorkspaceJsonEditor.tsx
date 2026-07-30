"use client";

import { JsonEditor, githubDarkTheme, githubLightTheme } from "json-edit-react";

type WorkspaceJsonEditorProps = {
  data: object;
  editable: boolean;
  rootName: string;
  dark: boolean;
  onChange: (data: unknown) => void;
};

// Neither built-in theme styles the edit input, so it falls back to the
// library's default (near-black text, no explicit background) — on top of
// githubDarkTheme's near-black container that reads as black-on-black.
// Layer explicit input colors per theme so edited text stays legible.
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

export function WorkspaceJsonEditor({
  data,
  editable,
  rootName,
  dark,
  onChange,
}: WorkspaceJsonEditorProps) {
  return (
    <JsonEditor
      data={data}
      setData={editable ? onChange : undefined}
      rootName={rootName}
      rootFontSize="0.875em"
      maxWidth="100%"
      restrictEdit={!editable}
      restrictAdd={!editable}
      restrictDelete={!editable}
      collapse={2}
      theme={[
        dark ? githubDarkTheme : githubLightTheme,
        dark ? inputThemeOverride.dark : inputThemeOverride.light,
      ]}
    />
  );
}
