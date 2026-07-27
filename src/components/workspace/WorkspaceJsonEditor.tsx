"use client";

import { JsonEditor, githubDarkTheme, githubLightTheme } from "json-edit-react";

type WorkspaceJsonEditorProps = {
  data: object;
  editable: boolean;
  rootName: string;
  dark: boolean;
  onChange: (data: unknown) => void;
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
      theme={dark ? githubDarkTheme : githubLightTheme}
    />
  );
}
