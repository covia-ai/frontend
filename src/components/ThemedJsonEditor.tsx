"use client";

import { useTheme } from "next-themes";
import { JsonEditor, githubDarkTheme, githubLightTheme } from "json-edit-react";

interface ThemedJsonEditorProps {
  data: unknown;
  rootName?: string;
  collapse?: number | boolean;
  maxWidth?: string;
}

// The one read-only "show me this JSON" treatment this app uses — theme-aware
// (dark/light), same as JSONViewer's content-preview dialog. Previously
// MetadataViewer's "View metadata" dialog used JsonEditor with no theme prop
// at all (hardcoded onto a bg-white wrapper instead), and OperationViewer's
// "View Schema" panel was a raw, unstyled <pre>{JSON.stringify(...)}</pre>
// dump — two more inconsistent presentations of the same underlying library
// (covia-ai/frontend#202). Both now render through this component.
export function ThemedJsonEditor({
  data,
  rootName = "value",
  collapse = 3,
  maxWidth = "100%",
}: ThemedJsonEditorProps) {
  const { theme } = useTheme();
  return (
    <JsonEditor
      data={data}
      rootName={rootName}
      rootFontSize="1em"
      maxWidth={maxWidth}
      restrictEdit
      restrictAdd
      restrictDelete
      collapse={collapse}
      theme={theme === "dark" ? githubDarkTheme : githubLightTheme}
    />
  );
}
