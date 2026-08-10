// Shared sizing tokens for the app's larger dialogs (covia-ai/frontend#213).
// Each of these grew independently per-component with no shared constant, so
// nominally-identical dialogs drifted apart — JSONViewer/XmlViewer/
// DocumentViewer's classes matched only by coincidence of copy-paste, and
// AssetCard/MetadataViewer/CreateAssetComponent's metadata editor likewise.
// Compose these with any component-specific extras via cn(), don't inline a
// new size value at a new call site.

// A tabbed content-preview dialog (Preview/Raw tabs over fetched content),
// used by JSONViewer, XmlViewer, and DocumentViewer.
export const CONTENT_PREVIEW_DIALOG_CLASS =
  "flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden border border-border bg-card p-4 text-card-foreground";

// A near-fullscreen dialog built around json-edit-react's JsonEditor, used by
// AssetCard's copy-asset flow, MetadataViewer's "View metadata", and
// CreateAssetComponent's metadata editor step.
export const JSON_EDITOR_DIALOG_CLASS = "h-11/12 min-w-10/12 bg-card text-card-foreground";

// The matching `maxWidth` for a JsonEditor that fills one of the dialogs
// above (which are viewport-relative themselves) — not for a JsonEditor
// inside a fixed-width container like CONTENT_PREVIEW_DIALOG_CLASS's
// max-w-4xl, which should size to "100%" of that container instead.
export const JSON_EDITOR_MAX_WIDTH = "90vw";

// A plain form dialog (a handful of Input/Select fields, no embedded
// preview) — the base Dialog's sm:max-w-lg default is cramped once a field
// row goes side-by-side.
export const FORM_DIALOG_CLASS = "sm:max-w-xl bg-card text-card-foreground";
