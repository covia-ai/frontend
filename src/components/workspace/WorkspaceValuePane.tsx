"use client";

import dynamic from "next/dynamic";
import {
  Database,
  FileText,
  Loader2,
  Lock,
  Trash2,
} from "lucide-react";
import {
  isWritableWorkspaceEntry,
  type WorkspaceMutation,
  type WorkspaceValue,
} from "@/hooks/use-workspace-explorer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  isWorkspaceNamespaceRoot,
  workspaceNamespaceForPath,
} from "@/lib/workspace-namespaces";

const ThemedJsonEditor = dynamic(
  () =>
    import("@/components/ThemedJsonEditor").then(
      (module) => module.ThemedJsonEditor,
    ),
  { ssr: false },
);

type WorkspaceValuePaneProps = {
  currentPath: string;
  selectedPath: string | null;
  namespaceEmpty: boolean;
  selectedValue: WorkspaceValue;
  loading: boolean;
  error: string | null;
  editedData: unknown;
  isAuthenticated: boolean;
  pendingMutation: WorkspaceMutation;
  onEditedDataChange: (value: unknown) => void;
  onSave: (value?: unknown) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
};

export function WorkspaceValuePane({
  currentPath,
  selectedPath,
  namespaceEmpty,
  selectedValue,
  loading,
  error,
  editedData,
  isAuthenticated,
  pendingMutation,
  onEditedDataChange,
  onSave,
  onDelete,
}: WorkspaceValuePaneProps) {
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const displayPath = selectedPath ?? (currentPath === "/" ? null : currentPath);

  if (!displayPath) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
        <Database size={32} />
        <p className="mt-2 text-sm">Select a path to view its data</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-destructive">
        <FileText size={32} />
        <p className="mt-2 text-sm">Unable to read path</p>
      </div>
    );
  }

  const namespace = workspaceNamespaceForPath(displayPath);
  const directoryLanding = !selectedPath;
  const namespaceLanding = directoryLanding && isWorkspaceNamespaceRoot(currentPath);
  const emptyNamespace =
    namespaceLanding
      ? namespaceEmpty
      : !selectedValue.exists && isWorkspaceNamespaceRoot(displayPath);

  if (selectedPath && !selectedValue.exists && !emptyNamespace) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
        <FileText size={32} />
        <p className="mt-2 text-sm">Path does not exist</p>
      </div>
    );
  }

  const readData = selectedValue.value;
  const isObject = typeof readData === "object" && readData !== null;
  const canMutate =
    !!selectedPath && isAuthenticated && isWritableWorkspaceEntry(selectedPath);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <Badge variant="outline" className="max-w-xs truncate font-mono text-xs">
          {displayPath}
        </Badge>

        <div className="ml-auto flex items-center gap-1">
          {selectedPath && canMutate ? (
            <>
              <AlertDialog>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-red-600 hover:text-red-700"
                        aria-label="Delete"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Delete</TooltipContent>
                </Tooltip>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Delete &quot;{displayPath}&quot;?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {isObject
                        ? "This deletes the entire key, including everything nested under it. This action cannot be undone."
                        : "This deletes the key. This action cannot be undone."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => void onDelete()}
                      disabled={pendingMutation === "delete"}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : selectedPath ? (
            <span
              className="flex items-center gap-1 text-xs text-muted-foreground"
              title={
                !isAuthenticated
                  ? "Read-only — sign in to modify workspace data"
                  : displayPath === "w"
                    ? "Read-only — select a key inside Workspace to edit it"
                    : "Read-only — only paths under \"w\" (Workspace) can be edited"
              }
            >
              <Lock size={14} aria-label="Read-only" />
              {displayPath === "w" && "Choose a key to edit"}
            </span>
          ) : null}
        </div>
        {namespace && (
          <p
            data-testid="workspace-namespace-description"
            className="basis-full text-sm text-muted-foreground"
          >
            <span className="font-medium text-foreground">{namespace.label}</span>
            {" — "}{namespace.description}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4">
        {directoryLanding && namespaceEmpty ? (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <Database size={32} />
            <p className="mt-2 text-sm">
              This {namespaceLanding ? "namespace" : "directory"} is empty
            </p>
          </div>
        ) : emptyNamespace ? (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <Database size={32} />
            <p className="mt-2 text-sm">This namespace is empty</p>
          </div>
        ) : directoryLanding ? (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <Database size={32} />
            <p className="mt-2 text-sm">Select a key to view its data</p>
          </div>
        ) : isObject ? (
          <ThemedJsonEditor
            data={editedData as object}
            editable={canMutate}
            rootName={displayPath.split("/").pop() || "data"}
            collapse={2}
            onChange={(value) => {
              onEditedDataChange(value);
              // The tree editor's onChange only fires once a field edit is
              // confirmed (not per keystroke), so it's safe to save right away.
              void onSave(value);
            }}
          />
        ) : (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Value
            </div>
            {canMutate ? (
              <Textarea
                value={
                  typeof editedData === "string"
                    ? editedData
                    : JSON.stringify(editedData)
                }
                onChange={(event) => {
                  try {
                    onEditedDataChange(JSON.parse(event.target.value));
                  } catch {
                    onEditedDataChange(event.target.value);
                  }
                }}
                onBlur={() => void onSave()}
                className="min-h-[200px] font-mono text-sm"
              />
            ) : (
              <pre className="overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-muted p-4 font-mono text-sm">
                {typeof readData === "string"
                  ? readData
                  : JSON.stringify(readData, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </>
  );
}
