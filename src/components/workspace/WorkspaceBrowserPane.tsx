"use client";

import { useState } from "react";
import {
  ChevronRight,
  Database,
  Folder,
  FolderOpen,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
} from "lucide-react";
import type {
  WorkspaceEntry,
  WorkspaceMutation,
} from "@/hooks/use-workspace-explorer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  onRefresh: () => void;
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
  onRefresh,
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

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {!isAuthenticated && (
        <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <Lock size={11} className="shrink-0" />
          Read-only — sign in to modify workspace data
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1 border-b border-border p-2 text-xs">
        <button
          onClick={() => onNavigate("/")}
          className="font-medium text-primary hover:underline"
          aria-label="Workspace root"
        >
          <Database size={14} />
        </button>
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
                {segment}
              </button>
            </span>
          );
        })}
        <button
          onClick={onRefresh}
          className="ml-auto text-muted-foreground hover:text-foreground"
          aria-label="Refresh workspace"
        >
          <RefreshCw size={12} />
        </button>
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
              <span className="flex-1 truncate">{entry.key}</span>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onNavigate(fullPath);
                }}
                className="shrink-0 text-muted-foreground hover:text-foreground"
                title="Browse into"
                aria-label={`Browse into ${entry.key}`}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          );
        })}

      {isAuthenticated && (
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
