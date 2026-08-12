"use client";

import { useEffect, useState } from "react";
import {
  ChevronRight,
  Database,
  Folder,
  FolderOpen,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react";
import {
  isContainerWorkspaceValue,
  isMutableWorkspacePath,
  parseWorkspaceInput,
  type WorkspaceEntry,
  type WorkspaceMutation,
} from "@/hooks/use-workspace-explorer";
import { ROOT_NAMESPACE_LABELS } from "@/lib/workspace-namespaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Raw display/edit text for a scalar value: strings edit as themselves (no
// surrounding quotes), everything else round-trips through JSON — same
// convention WorkspaceValuePane's textarea uses for non-object values.
function scalarText(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

// Inline editable field for one scalar entry in the browser list. Local text
// state so keystrokes don't round-trip through the parent on every change;
// commits (parses + calls onSave) on blur or Enter.
function InlineValueField({
  path,
  value,
  pending,
  onSave,
}: {
  path: string;
  value: unknown;
  pending: boolean;
  onSave: (path: string, value: unknown) => Promise<boolean>;
}) {
  const [text, setText] = useState(() => scalarText(value));

  // Resync with the server value once a save round-trip finishes — but
  // never while the field is mid-save (would clobber what's in flight).
  useEffect(() => {
    if (!pending) setText(scalarText(value));
  }, [value, pending]);

  const commit = () => {
    if (text === scalarText(value)) return;
    void onSave(path, parseWorkspaceInput(text));
  };

  return (
    <Input
      value={text}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          setText(scalarText(value));
          event.currentTarget.blur();
        }
      }}
      onClick={(event) => event.stopPropagation()}
      disabled={pending}
      className="h-7 flex-1 font-mono text-xs"
    />
  );
}

// Root-level lattice namespace keys (see covia/venue Namespace.java) have
// fixed meanings — only the top segment, nested keys under it (job ids,
// agent ids, secret names, ...) are real user data and stay as typed.
function labelForSegment(segment: string, index: number): string {
  return index === 0 ? ROOT_NAMESPACE_LABELS[segment] ?? segment : segment;
}

// Recursive row for one entry inside "w" — loadListing already fetched its
// full value, so nested structure (a poem's title/content, say) can render
// and edit in place, expanded by default, with no navigation or selection
// step. Only a container whose *own* read came back truncated falls back to
// the old server-paginated drill-in, since a partial local value can't be
// trusted to render (or edit) the complete structure.
function WorkspaceEntryTree({
  entryKey,
  path,
  value,
  truncated,
  depth,
  selectedPath,
  isAuthenticated,
  pendingEntryPath,
  onSelect,
  onNavigate,
  onSaveEntry,
}: {
  entryKey: string;
  path: string;
  value: unknown;
  truncated?: boolean;
  depth: number;
  selectedPath: string | null;
  isAuthenticated: boolean;
  pendingEntryPath: string | null;
  onSelect: (path: string) => void;
  onNavigate: (path: string) => void;
  onSaveEntry: (path: string, value: unknown) => Promise<boolean>;
}) {
  const isContainer = isContainerWorkspaceValue(value);
  const [expanded, setExpanded] = useState(true);
  const isSelected = selectedPath === path;
  const indent = 12 + depth * 16;

  if (isContainer && truncated) {
    return (
      <div
        className={`flex w-full cursor-pointer items-center gap-2 border-b border-border py-2 pr-3 text-left text-sm transition-colors last:border-0 ${
          isSelected
            ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
            : "text-foreground hover:bg-accent"
        }`}
        style={{ paddingLeft: indent }}
        onClick={() => onSelect(path)}
      >
        <Folder size={14} className="shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate">{entryKey}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(event) => {
                event.stopPropagation();
                onNavigate(path);
              }}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              aria-label={`Browse into ${entryKey}`}
            >
              <ChevronRight size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Too large to inline — browse into {entryKey}</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  if (isContainer) {
    const childEntries = Object.entries(value as Record<string, unknown>);
    return (
      <div className="border-b border-border last:border-0">
        <div
          className="flex w-full cursor-pointer items-center gap-2 py-1.5 pr-3 text-left text-sm transition-colors hover:bg-accent"
          style={{ paddingLeft: indent }}
          onClick={() => setExpanded((current) => !current)}
        >
          <ChevronRight
            size={14}
            className={`shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`}
          />
          <Folder size={14} className="shrink-0 text-muted-foreground" />
          <span
            className="flex-1 truncate text-foreground"
            onClick={(event) => {
              event.stopPropagation();
              onSelect(path);
            }}
          >
            {entryKey}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {childEntries.length}
          </span>
        </div>
        {expanded &&
          childEntries.map(([childKey, childValue]) => (
            <WorkspaceEntryTree
              key={childKey}
              entryKey={childKey}
              path={`${path}/${childKey}`}
              value={childValue}
              depth={depth + 1}
              selectedPath={selectedPath}
              isAuthenticated={isAuthenticated}
              pendingEntryPath={pendingEntryPath}
              onSelect={onSelect}
              onNavigate={onNavigate}
              onSaveEntry={onSaveEntry}
            />
          ))}
      </div>
    );
  }

  return (
    <div
      className={`flex w-full items-center gap-2 border-b border-border py-1.5 pr-3 text-left text-sm transition-colors last:border-0 ${
        isSelected ? "bg-blue-50 dark:bg-blue-950" : "hover:bg-accent"
      }`}
      style={{ paddingLeft: indent }}
    >
      <span
        className="w-24 shrink-0 cursor-pointer truncate text-foreground"
        onClick={() => onSelect(path)}
        title={entryKey}
      >
        {entryKey}
      </span>
      {isAuthenticated ? (
        <InlineValueField
          path={path}
          value={value}
          pending={pendingEntryPath === path}
          onSave={onSaveEntry}
        />
      ) : (
        <span
          className="flex-1 truncate font-mono text-xs text-muted-foreground"
          onClick={() => onSelect(path)}
        >
          {scalarText(value)}
        </span>
      )}
    </div>
  );
}

type WorkspaceBrowserPaneProps = {
  entries: WorkspaceEntry[];
  loading: boolean;
  error: string | null;
  currentPath: string;
  pathSegments: string[];
  selectedPath: string | null;
  isAuthenticated: boolean;
  pendingMutation: WorkspaceMutation;
  pendingEntryPath: string | null;
  onNavigate: (path: string) => void;
  onSelect: (path: string) => void;
  onRefresh: () => void;
  onCreate: (key: string, value: string) => Promise<boolean>;
  onSaveEntry: (path: string, value: unknown) => Promise<boolean>;
};

export function WorkspaceBrowserPane({
  entries,
  loading,
  error,
  currentPath,
  pathSegments,
  selectedPath,
  isAuthenticated,
  pendingMutation,
  pendingEntryPath,
  onNavigate,
  onSelect,
  onRefresh,
  onCreate,
  onSaveEntry,
}: WorkspaceBrowserPaneProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");

  const closeCreate = () => {
    setShowCreate(false);
    setKey("");
    setValue("");
  };

  const create = async () => {
    if (await onCreate(key, value)) closeCreate();
  };

  const canCreate = isAuthenticated && isMutableWorkspacePath(currentPath);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex flex-wrap items-center gap-1 border-b border-border p-2 text-xs">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onNavigate("/")}
              className="font-medium text-primary hover:underline"
              aria-label="Workspace root"
            >
              <Database size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Go to workspace root</TooltipContent>
        </Tooltip>
        {pathSegments.map((segment, index) => {
          const path = pathSegments.slice(0, index + 1).join("/");
          return (
            <span key={path} className="contents">
              <ChevronRight size={12} className="text-muted-foreground" />
              <button
                onClick={() => onNavigate(path)}
                className={
                  index === pathSegments.length - 1
                    ? "font-medium text-foreground hover:underline"
                    : "text-primary hover:underline"
                }
              >
                {labelForSegment(segment, index)}
              </button>
            </span>
          );
        })}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onRefresh}
              className="ml-auto text-muted-foreground hover:text-foreground"
              aria-label="Refresh workspace"
            >
              <RefreshCw size={12} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Refresh workspace</TooltipContent>
        </Tooltip>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="animate-spin text-primary" size={24} />
        </div>
      )}
      {!loading && error && (
        <div className="px-3 py-8 text-center text-sm text-destructive">
          Unable to list workspace
        </div>
      )}
      {!loading && !error && entries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <FolderOpen size={32} />
          <p className="mt-2 text-sm">Empty</p>
        </div>
      )}
      {!loading &&
        !error &&
        entries.map((entry) => {
          const fullPath =
            currentPath === "/"
              ? entry.key
              : `${currentPath}/${entry.key}`;
          const isSelected = selectedPath === fullPath;
          const label = currentPath === "/" ? labelForSegment(entry.key, 0) : entry.key;

          // Only entries listed inside "w" carry a fetched value (see
          // loadListing) — everywhere else this is undefined and the row
          // falls back to the original label + drill-in behavior below.
          if (entry.valueType !== undefined) {
            return (
              <WorkspaceEntryTree
                key={entry.key}
                entryKey={entry.key}
                path={fullPath}
                value={entry.value}
                truncated={entry.truncated}
                depth={0}
                selectedPath={selectedPath}
                isAuthenticated={isAuthenticated}
                pendingEntryPath={pendingEntryPath}
                onSelect={onSelect}
                onNavigate={onNavigate}
                onSaveEntry={onSaveEntry}
              />
            );
          }

          return (
            <div
              key={entry.key}
              className={`flex w-full cursor-pointer items-center gap-2 border-b border-border px-3 py-2 text-left text-sm transition-colors last:border-0 ${
                isSelected
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  : "text-foreground hover:bg-accent"
              }`}
              onClick={() => onSelect(fullPath)}
            >
              <Folder size={14} className="shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{label}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onNavigate(fullPath);
                    }}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label={`Browse into ${entry.key}`}
                  >
                    <ChevronRight size={14} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Browse into {entry.key}</TooltipContent>
              </Tooltip>
            </div>
          );
        })}

      {canCreate && (
        <div className="mt-auto border-t border-border p-2">
          {!showCreate ? (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => setShowCreate(true)}
            >
              <Plus size={12} className="mr-1" /> New Key
            </Button>
          ) : (
            <div className="space-y-2">
              <Input
                placeholder="Key path"
                value={key}
                onChange={(event) => setKey(event.target.value)}
                className="h-7 text-xs"
              />
              <Input
                placeholder="Value (text or JSON)"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                className="h-7 text-xs"
              />
              <div className="flex gap-1">
                <Button
                  size="sm"
                  className="h-6 flex-1 text-xs"
                  onClick={() => void create()}
                  disabled={!key.trim() || pendingMutation === "create"}
                >
                  {pendingMutation === "create" ? "Creating..." : "Create"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={closeCreate}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
