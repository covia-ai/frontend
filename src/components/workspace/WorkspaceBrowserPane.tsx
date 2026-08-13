"use client";

import { useState } from "react";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  Loader2,
  Plus,
} from "lucide-react";
import {
  isMutableWorkspacePath,
  type WorkspaceEntry,
  type WorkspaceMutation,
} from "@/hooks/use-workspace-explorer";
import { ROOT_NAMESPACE_LABELS } from "@/lib/workspace-namespaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Root-level lattice namespace keys (see covia/venue Namespace.java) have
// fixed meanings — only the top segment, nested keys under it (job ids,
// agent ids, secret names, ...) are real user data and stay as typed.
function labelForSegment(segment: string, index: number): string {
  return index === 0 ? ROOT_NAMESPACE_LABELS[segment] ?? segment : segment;
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
  onNavigate: (path: string) => void;
  onSelect: (path: string) => void;
  onCreate: (key: string, value: string) => Promise<boolean>;
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
  onNavigate,
  onSelect,
  onCreate,
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
        <span className="mr-1 font-semibold uppercase tracking-wider text-muted-foreground">
          Keys
        </span>
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
