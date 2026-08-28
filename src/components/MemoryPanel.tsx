"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { notifyError, notifySuccess } from "@/lib/notify";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "./ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
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
} from "./ui/alert-dialog";
import { BrainCircuit, Check, Loader2, Lock, Pencil, Plus, Trash2, X } from "lucide-react";

const MEMORY_PATH = "w/memory";
const MEMORY_OP = "v/ops/memory";

type MemoryEntry = {
  text: string;
  ts?: number;
  updated?: number;
};

function isMemoryEntry(value: unknown): value is MemoryEntry {
  return !!value && typeof value === "object" && typeof (value as { text?: unknown }).text === "string";
}

export function MemoryPanel() {
  const venue = useAuthenticatedVenue();
  const isAuthenticated = useIsAuthenticated();

  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  const loadMemory = useCallback(() => {
    if (!venue || !isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    venue.workspace
      .read(MEMORY_PATH)
      .then((result) => {
        const value = result.value;
        setEntries(Array.isArray(value) ? value.filter(isMemoryEntry) : []);
      })
      .catch((err) => {
        notifyError("Unable to load memory", err, venue.baseUrl);
        setEntries([]);
      })
      .finally(() => setLoading(false));
  }, [venue, isAuthenticated]);

  useEffect(() => {
    loadMemory();
  }, [loadMemory]);

  const handleRemember = () => {
    if (!venue || !newText.trim()) return;
    setAdding(true);
    venue.operations
      .run(MEMORY_OP, { command: "remember", text: newText.trim() })
      .then(() => {
        notifySuccess("Remembered");
        setNewText("");
        loadMemory();
      })
      .catch((err) => notifyError("Unable to remember item", err, venue.baseUrl))
      .finally(() => setAdding(false));
  };

  const startEdit = (index: number, text: string) => {
    setEditingIndex(index);
    setEditText(text);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditText("");
  };

  const handleSaveEdit = (index: number) => {
    if (!venue || !editText.trim()) return;
    setSavingIndex(index);
    venue.operations
      .run(MEMORY_OP, { command: "update", n: index + 1, text: editText.trim() })
      .then(() => {
        notifySuccess("Updated");
        cancelEdit();
        loadMemory();
      })
      .catch((err) => notifyError("Unable to update item", err, venue.baseUrl))
      .finally(() => setSavingIndex(null));
  };

  const handleForget = (index: number) => {
    if (!venue) return;
    setDeletingIndex(index);
    venue.operations
      .run(MEMORY_OP, { command: "forget", n: index + 1 })
      .then(() => {
        notifySuccess("Forgotten");
        loadMemory();
      })
      .catch((err) => notifyError("Unable to forget item", err, venue.baseUrl))
      .finally(() => setDeletingIndex(null));
  };

  if (!venue) {
    return (
      <div className="flex h-[200px] w-full border border-border rounded-lg items-center justify-center text-muted-foreground">
        <BrainCircuit size={32} className="mr-2" />
        <p className="text-sm">Select a venue to view memory</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="border border-border rounded-lg p-4 bg-muted/30 flex items-start gap-3">
        <Lock size={16} className="text-muted-foreground mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">Authentication required</p>
          <p className="text-xs text-muted-foreground mt-1">
            Sign in to view and manage your memory. Memory is scoped to your identity.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="border border-border rounded-lg p-4 bg-card">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Plus size={16} /> Remember
        </h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="A fact to always keep in view…"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !adding) handleRemember();
            }}
            className="flex-1"
          />
          <Button onClick={handleRemember} disabled={adding || !newText.trim()}>
            {adding ? "Remembering..." : "Remember"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Durable facts your agents can carry into every conversation — enable
          &quot;Inject user memory into context&quot; in an agent&apos;s config to use it.
        </p>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="animate-spin text-primary" size={24} />
          </div>
        )}

        {!loading && entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <BrainCircuit size={32} />
            <p className="text-sm mt-2">No memory yet</p>
            <p className="text-xs mt-1 max-w-sm text-center">
              Add a fact above, or let an agent write one via the memory tool
              (recall / remember / update / forget) at {MEMORY_OP}.
            </p>
          </div>
        )}

        {!loading && entries.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableCell className="font-semibold text-sm w-10">#</TableCell>
                <TableCell className="font-semibold text-sm">Text</TableCell>
                <TableCell className="font-semibold text-sm w-24">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry, index) => {
                const isEditing = editingIndex === index;
                const isSaving = savingIndex === index;
                const isDeleting = deletingIndex === index;
                return (
                  <TableRow key={index}>
                    <TableCell className="text-muted-foreground text-sm align-top">{index + 1}</TableCell>
                    <TableCell className="text-sm">
                      {isEditing ? (
                        <Input
                          autoFocus
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !isSaving) handleSaveEdit(index);
                            if (e.key === "Escape") cancelEdit();
                          }}
                        />
                      ) : (
                        entry.text
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={`Save item ${index + 1}`}
                                onClick={() => handleSaveEdit(index)}
                                disabled={isSaving || !editText.trim()}
                              >
                                <Check size={14} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Save</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={`Cancel editing item ${index + 1}`}
                                onClick={cancelEdit}
                                disabled={isSaving}
                              >
                                <X size={14} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Cancel</TooltipContent>
                          </Tooltip>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={`Update item ${index + 1}`}
                                onClick={() => startEdit(index, entry.text)}
                                disabled={isDeleting}
                              >
                                <Pencil size={14} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Update</TooltipContent>
                          </Tooltip>
                          <AlertDialog>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    aria-label={`Forget item ${index + 1}`}
                                    className="text-red-600 hover:text-red-700"
                                    disabled={isDeleting}
                                  >
                                    <Trash2 size={14} />
                                  </Button>
                                </AlertDialogTrigger>
                              </TooltipTrigger>
                              <TooltipContent>Forget</TooltipContent>
                            </Tooltip>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Forget item {index + 1}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  &quot;{entry.text}&quot; — this action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleForget(index)}>Forget</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
