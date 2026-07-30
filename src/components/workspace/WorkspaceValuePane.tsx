"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import {
  Database,
  Eye,
  FileText,
  Loader2,
  Lock,
  PenLine,
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

const WorkspaceJsonEditor = dynamic(
  () =>
    import("./WorkspaceJsonEditor").then(
      (module) => module.WorkspaceJsonEditor,
    ),
  { ssr: false },
);

type WorkspaceValuePaneProps = {
  selectedPath: string | null;
  selectedValue: WorkspaceValue;
  loading: boolean;
  error: string | null;
  editedData: unknown;
  editMode: boolean;
  isAuthenticated: boolean;
  pendingMutation: WorkspaceMutation;
  onEditedDataChange: (value: unknown) => void;
  onEditModeChange: (editing: boolean) => void;
  onSave: (value?: unknown) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
};

export function WorkspaceValuePane({
  selectedPath,
  selectedValue,
  loading,
  error,
  editedData,
  editMode,
  isAuthenticated,
  pendingMutation,
  onEditedDataChange,
  onEditModeChange,
  onSave,
  onDelete,
}: WorkspaceValuePaneProps) {
  const { theme } = useTheme();

  // Edits autosave as they happen (see onChange/onBlur below), so leaving
  // edit mode just flushes whatever hasn't committed yet — there's nothing
  // to discard, unlike a traditional cancel.
  const exitEditMode = async () => {
    await onSave();
    onEditModeChange(false);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!selectedPath) {
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

  if (!selectedValue.exists) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
        <FileText size={32} />
        <p className="mt-2 text-sm">Path does not exist</p>
      </div>
    );
  }

  const readData = selectedValue.value;
  const isObject = typeof readData === "object" && readData !== null;
  const canMutate = isAuthenticated && isWritableWorkspaceEntry(selectedPath);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <Badge variant="outline" className="max-w-xs truncate font-mono text-xs">
          {selectedPath}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {selectedValue.type}
        </Badge>

        <div className="ml-auto flex items-center gap-1">
          {canMutate ? (
            <>
              {!editMode ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onEditModeChange(true)}
                      aria-label="Edit"
                    >
                      <PenLine size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit</TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => void exitEditMode()}
                      disabled={pendingMutation === "save"}
                      aria-label={pendingMutation === "save" ? "Saving" : "View"}
                    >
                      <Eye size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {pendingMutation === "save" ? "Saving..." : "View"}
                  </TooltipContent>
                </Tooltip>
              )}
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
                      Delete &quot;{selectedPath}&quot;?
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
          ) : (
            <span
              className="flex items-center gap-1 text-xs text-muted-foreground"
              title={
                !isAuthenticated
                  ? "Read-only — sign in to modify workspace data"
                  : selectedPath === "w"
                    ? "Read-only — select a key inside Workspace to edit it"
                    : "Read-only — only paths under \"w\" (Workspace) can be edited"
              }
            >
              <Lock size={14} aria-label="Read-only" />
              {selectedPath === "w" && "Choose a key to edit"}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {isObject ? (
          <WorkspaceJsonEditor
            data={editedData as object}
            editable={editMode}
            rootName={selectedPath.split("/").pop() || "data"}
            dark={theme === "dark"}
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
            {editMode ? (
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
