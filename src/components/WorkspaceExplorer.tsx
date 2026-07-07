"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChevronRight, FolderOpen, Folder, FileText, GripVertical, Loader2, RefreshCw, Save, Trash2, Plus, PenLine, Eye, ListPlus, Database, Lock }from "lucide-react";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { JsonEditor, githubDarkTheme, githubLightTheme } from "json-edit-react";
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

interface PathEntry {
  key: string;
  type?: string;
  expanded?: boolean;
  children?: PathEntry[];
  loading?: boolean;
}

export function WorkspaceExplorer() {
  const [entries, setEntries] = useState<PathEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [pathSegments, setPathSegments] = useState<string[]>([]);
  const [readData, setReadData] = useState<any>(null);
  const [editedData, setEditedData] = useState<any>(null);
  const [readLoading, setReadLoading] = useState(false);
  const [readExists, setReadExists] = useState(false);
  const [readType, setReadType] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showNewKey, setShowNewKey] = useState(false);
  const [newKeyPath, setNewKeyPath] = useState("");
  const [newKeyValue, setNewKeyValue] = useState("");
  const [showAppend, setShowAppend] = useState(false);
  const [appendValue, setAppendValue] = useState("");

  const { theme } = useTheme();

  const venue = useAuthenticatedVenue();
  const isAuthenticated = useIsAuthenticated();

  // Resize state
  const [leftWidth, setLeftWidth] = useState(300);
  const isResizing = useRef(false);

  const startResizing = () => {
    isResizing.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", stopResizing);
    document.body.style.cursor = "col-resize";
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = Math.min(Math.max(200, e.clientX - 20), 500);
    setLeftWidth(newWidth);
  };

  const stopResizing = () => {
    isResizing.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", stopResizing);
    document.body.style.cursor = "default";
  };

  // Load root listing
  const loadPath = useCallback(
    (path?: string) => {
      if (!venue) {
        setLoading(false);
        return;
      }
      setLoading(true);
      venue.workspace
        .list(path)
        .then((result) => {
          // The job-free `list` (GET /api/v1/values/list) returns only keys —
          // per-entry values/types would each need a read (a job), which the UI
          // must not mint. Entry type is derived lazily on expand if needed.
          const items: PathEntry[] = (result.keys || []).map(
            (key: string): PathEntry => ({ key })
          );
          setEntries(items);
          if (path) {
            setPathSegments(path.split("/").filter(Boolean));
          } else {
            setPathSegments([]);
          }
        })
        .catch(() => {
          toast("Unable to list workspace");
          setEntries([]);
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [venue]
  );

  useEffect(() => {
    loadPath();
  }, [loadPath]);

  // Read a path value
  const readPath = (path: string) => {
    if (!venue) return;
    setSelectedPath(path);
    setReadLoading(true);
    setEditMode(false);
    setEditedData(null);
    venue.workspace
      .read(path)
      .then((result) => {
        setReadExists(result.exists);
        setReadData(result.value);
        setEditedData(result.value);
        setReadType(typeof result.value);
      })
      .catch(() => {
        toast("Unable to read path");
        setReadData(null);
        setReadExists(false);
      })
      .finally(() => {
        setReadLoading(false);
      });
  };

  // Navigate into a key
  const navigateInto = (key: string) => {
    const newPath =
      pathSegments.length > 0 ? pathSegments.join("/") + "/" + key : key;
    loadPath(newPath);
    setSelectedPath(null);
    setReadData(null);
  };

  // Navigate to a breadcrumb segment
  const navigateToBreadcrumb = (index: number) => {
    if (index < 0) {
      loadPath();
      setSelectedPath(null);
      setReadData(null);
    } else {
      const newPath = pathSegments.slice(0, index + 1).join("/");
      loadPath(newPath);
      setSelectedPath(null);
      setReadData(null);
    }
  };

  // Handle click on a key — read the value and show it in the right pane.
  // Double-click navigates into it as a container.
  const handleKeyClick = (key: string) => {
    const fullPath =
      pathSegments.length > 0 ? pathSegments.join("/") + "/" + key : key;
    readPath(fullPath);
  };

  const handleKeyDoubleClick = (key: string) => {
    navigateInto(key);
  };

  // Save edited data
  const handleSave = () => {
    if (!venue || !selectedPath) return;
    setSaving(true);
    venue.workspace
      .write(selectedPath, editedData)
      .then(() => {
        toast("Saved successfully");
        setReadData(editedData);
        setEditMode(false);
      })
      .catch(() => {
        toast("Unable to save");
      })
      .finally(() => {
        setSaving(false);
      });
  };

  // Delete a path
  const handleDelete = () => {
    if (!venue || !selectedPath) return;
    venue.workspace
      .delete(selectedPath)
      .then(() => {
        toast("Deleted successfully");
        setSelectedPath(null);
        setReadData(null);
        // Refresh current listing
        const currentPath =
          pathSegments.length > 0 ? pathSegments.join("/") : undefined;
        loadPath(currentPath);
      })
      .catch(() => {
        toast("Unable to delete");
      });
  };

  // Write new key
  const handleNewKey = () => {
    if (!venue || !newKeyPath.trim()) return;
    let value: any;
    try {
      value = JSON.parse(newKeyValue);
    } catch {
      value = newKeyValue;
    }
    const fullPath =
      pathSegments.length > 0
        ? pathSegments.join("/") + "/" + newKeyPath
        : newKeyPath;
    venue.workspace
      .write(fullPath, value)
      .then(() => {
        toast("Created successfully");
        setNewKeyPath("");
        setNewKeyValue("");
        setShowNewKey(false);
        const currentPath =
          pathSegments.length > 0 ? pathSegments.join("/") : undefined;
        loadPath(currentPath);
      })
      .catch(() => {
        toast("Unable to create");
      });
  };

  // Append value
  const handleAppend = () => {
    if (!venue || !selectedPath || !appendValue.trim()) return;
    let value: any;
    try {
      value = JSON.parse(appendValue);
    } catch {
      value = appendValue;
    }
    venue.workspace
      .append(selectedPath, value)
      .then(() => {
        toast("Appended successfully");
        setAppendValue("");
        setShowAppend(false);
        readPath(selectedPath);
      })
      .catch(() => {
        toast("Unable to append");
      });
  };

  const currentPath =
    pathSegments.length > 0 ? pathSegments.join("/") : undefined;

  if (!venue) {
    return (
      <div className="flex h-[200px] w-full border border-border rounded-lg overflow-hidden shadow-sm items-center justify-center mt-4 text-muted-foreground">
        <Database size={32} className="mr-2" />
        <p className="text-sm">Select a venue to browse workspace data</p>
      </div>
    );
  }

  return (
    <div className="flex h-[500px] w-full border border-border rounded-lg overflow-hidden shadow-sm select-none mt-4">
      {/* Left Pane — Path Browser */}
      <div
        style={{ width: `${leftWidth}px` }}
        className="flex-shrink-0 border-r border-border overflow-y-auto flex flex-col"
      >
        {/* Read-only notice for public users */}
        {!isAuthenticated && (
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border text-xs text-muted-foreground">
            <Lock size={11} className="shrink-0" />
            Read-only — sign in to modify workspace data
          </div>
        )}

        {/* Breadcrumb */}
        <div className="p-2 border-b border-border flex items-center gap-1 flex-wrap text-xs">
          <button
            onClick={() => navigateToBreadcrumb(-1)}
            className="text-primary hover:underline font-medium"
          >
            <Database size={14} />
          </button>
          {pathSegments.map((seg, i) => (
            <React.Fragment key={i}>
              <ChevronRight size={12} className="text-muted-foreground" />
              <button
                onClick={() => navigateToBreadcrumb(i)}
                className={`hover:underline ${
                  i === pathSegments.length - 1
                    ? "text-foreground font-medium"
                    : "text-primary"
                }`}
              >
                {seg}
              </button>
            </React.Fragment>
          ))}
          <button
            onClick={() => loadPath(currentPath)}
            className="ml-auto text-muted-foreground hover:text-foreground"
          >
            <RefreshCw size={12} />
          </button>
        </div>

        {/* Entries */}
        {loading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="animate-spin text-primary" size={24} />
          </div>
        )}
        {!loading && entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <FolderOpen size={32} />
            <p className="text-sm mt-2">Empty</p>
          </div>
        )}
        {entries.map((entry) => {
          const fullPath = currentPath
            ? currentPath + "/" + entry.key
            : entry.key;
          const isSelected = selectedPath === fullPath;
          return (
            <div
              key={entry.key}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors border-b border-border last:border-0 cursor-pointer ${
                isSelected
                  ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                  : "hover:bg-accent text-foreground"
              }`}
              onClick={() => handleKeyClick(entry.key)}
            >
              <Folder size={14} className="text-muted-foreground flex-shrink-0" />
              <span className="truncate flex-1">{entry.key}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleKeyDoubleClick(entry.key);
                }}
                className="text-muted-foreground hover:text-foreground flex-shrink-0"
                title="Browse into"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          );
        })}

        {/* New Key Button */}
        {isAuthenticated && (
          <div className="mt-auto border-t border-border p-2">
            {!showNewKey ? (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => setShowNewKey(true)}
              >
                <Plus size={12} className="mr-1" /> New Key
              </Button>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="Key path"
                  value={newKeyPath}
                  onChange={(e) => setNewKeyPath(e.target.value)}
                  className="text-xs h-7"
                />
                <Input
                  placeholder="Value (text or JSON)"
                  value={newKeyValue}
                  onChange={(e) => setNewKeyValue(e.target.value)}
                  className="text-xs h-7"
                />
                <div className="flex gap-1">
                  <Button size="sm" className="text-xs h-6 flex-1" onClick={handleNewKey}>
                    Create
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-6"
                    onClick={() => {
                      setShowNewKey(false);
                      setNewKeyPath("");
                      setNewKeyValue("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={startResizing}
        className="w-1.5 hover:w-1.5 bg-transparent hover:bg-blue-400 cursor-col-resize transition-colors flex items-center justify-center group relative z-10"
      >
        <div className="hidden group-hover:block absolute bg-blue-500 rounded-full p-0.5">
          <GripVertical size={10} className="text-white" />
        </div>
      </div>

      {/* Right Pane — Data Viewer/Editor */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {readLoading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        )}

        {!readLoading && selectedPath && readExists && (
          <>
            {/* Toolbar */}
            <div className="flex items-center gap-2 p-3 border-b border-border flex-wrap">
              <Badge variant="outline" className="font-mono text-xs truncate max-w-xs">
                {selectedPath}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {readType}
              </Badge>

              <div className="ml-auto flex items-center gap-1">
                {isAuthenticated ? (
                  <>
                    {!editMode ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditMode(true)}
                      >
                        <PenLine size={14} className="mr-1" /> Edit
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditMode(false);
                            setEditedData(readData);
                          }}
                        >
                          <Eye size={14} className="mr-1" /> View
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSave}
                          disabled={saving}
                        >
                          <Save size={14} className="mr-1" />
                          {saving ? "Saving..." : "Save"}
                        </Button>
                      </>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAppend(!showAppend)}
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
                          <AlertDialogAction onClick={handleDelete}>
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

            {/* Append form */}
            {isAuthenticated && showAppend && (
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/50">
                <Input
                  placeholder="Value to append (text or JSON)"
                  value={appendValue}
                  onChange={(e) => setAppendValue(e.target.value)}
                  className="text-sm flex-1"
                />
                <Button size="sm" onClick={handleAppend} disabled={!appendValue.trim()}>
                  Append
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

            {/* Data display */}
            <div className="flex-1 p-4 overflow-auto">
              {typeof readData === "object" && readData !== null ? (
                <JsonEditor
                  data={editedData}
                  setData={editMode ? setEditedData : undefined}
                  rootName={selectedPath.split("/").pop() || "data"}
                  rootFontSize="0.875em"
                  maxWidth="100%"
                  restrictEdit={!editMode}
                  restrictAdd={!editMode}
                  restrictDelete={!editMode}
                  collapse={2}
                  theme={
                    theme === "dark" ? githubDarkTheme : githubLightTheme
                  }
                />
              ) : (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">
                    Value
                  </div>
                  {editMode ? (
                    <Textarea
                      value={
                        typeof editedData === "string"
                          ? editedData
                          : JSON.stringify(editedData)
                      }
                      onChange={(e) => {
                        try {
                          setEditedData(JSON.parse(e.target.value));
                        } catch {
                          setEditedData(e.target.value);
                        }
                      }}
                      className="font-mono text-sm min-h-[200px]"
                    />
                  ) : (
                    <pre className="font-mono text-sm bg-muted rounded-lg p-4 border border-border overflow-auto whitespace-pre-wrap">
                      {typeof readData === "string"
                        ? readData
                        : JSON.stringify(readData, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {!readLoading && selectedPath && !readExists && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <FileText size={32} />
            <p className="text-sm mt-2">Path does not exist</p>
          </div>
        )}

        {!readLoading && !selectedPath && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Database size={32} />
            <p className="text-sm mt-2">Select a path to view its data</p>
          </div>
        )}
      </div>
    </div>
  );
}
