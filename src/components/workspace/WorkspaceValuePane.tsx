"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useTheme } from "next-themes";
import {
  Database,
  Eye,
  FileText,
  ListPlus,
  Loader2,
  Lock,
  PenLine,
  Save,
  Trash2,
} from "lucide-react";
import type {
  WorkspaceMutation,
  WorkspaceValue,
} from "@/hooks/use-workspace-explorer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  onCancelEdit: () => void;
  onSave: () => Promise<boolean>;
  onAppend: (value: string) => Promise<boolean>;
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
  onCancelEdit,
  onSave,
  onAppend,
  onDelete,
}: WorkspaceValuePaneProps) {
  const { theme } = useTheme();
  const [showAppend, setShowAppend] = useState(false);
  const [appendValue, setAppendValue] = useState("");

  const append = async () => {
    if (await onAppend(appendValue)) {
      setAppendValue("");
      setShowAppend(false);
    }
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
          {isAuthenticated ? (
            <>
              {!editMode ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditModeChange(true)}
                >
                  <PenLine size={14} className="mr-1" /> Edit
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={onCancelEdit}>
                    <Eye size={14} className="mr-1" /> View
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void onSave()}
                    disabled={pendingMutation === "save"}
                  >
                    <Save size={14} className="mr-1" />
                    {pendingMutation === "save" ? "Saving..." : "Save"}
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAppend((visible) => !visible)}
              >
                <ListPlus size={14} className="mr-1" /> Append
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={14} className="mr-1" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Delete &quot;{selectedPath}&quot;?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone.
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
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Lock size={12} /> Read-only
            </span>
          )}
        </div>
      </div>

      {isAuthenticated && showAppend && (
        <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-3 py-2">
          <Input
            placeholder="Value to append (text or JSON)"
            value={appendValue}
            onChange={(event) => setAppendValue(event.target.value)}
            className="flex-1 text-sm"
          />
          <Button
            size="sm"
            onClick={() => void append()}
            disabled={
              !appendValue.trim() || pendingMutation === "append"
            }
          >
            {pendingMutation === "append" ? "Appending..." : "Append"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowAppend(false);
              setAppendValue("");
            }}
          >
            Cancel
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4">
        {isObject ? (
          <WorkspaceJsonEditor
            data={editedData as object}
            editable={editMode}
            rootName={selectedPath.split("/").pop() || "data"}
            dark={theme === "dark"}
            onChange={onEditedDataChange}
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
