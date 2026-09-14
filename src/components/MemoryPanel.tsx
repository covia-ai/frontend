"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { notifyError, notifySuccess } from "@/lib/notify";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
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
import { Brain, Check, Loader2, Lock, Pencil, Plus, Search, Trash2, X } from "lucide-react";

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

// A compact "edited 2h ago" for the timestamp the entry already carries but the
// old table dropped; the absolute time rides along as the title.
function editedWhen(entry: MemoryEntry): { rel: string; abs: string } | null {
  const ms = entry.updated ?? entry.ts;
  if (!ms) return null;
  const abs = new Date(ms).toLocaleString();
  const sec = Math.round((Date.now() - ms) / 1000);
  if (sec < 60) return { rel: "just now", abs };
  const min = Math.round(sec / 60);
  if (min < 60) return { rel: `${min}m ago`, abs };
  const hr = Math.round(min / 60);
  if (hr < 24) return { rel: `${hr}h ago`, abs };
  const day = Math.round(hr / 24);
  if (day < 7) return { rel: `${day}d ago`, abs };
  return { rel: new Date(ms).toLocaleDateString(), abs };
}

export function MemoryPanel() {
  const venue = useAuthenticatedVenue();
  const isAuthenticated = useIsAuthenticated();

  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
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

  // Filter the loaded entries client-side but keep each one's ORIGINAL index —
  // remember/update/forget key off the true 1-based position, so a filtered view
  // must still act on the right entry.
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => !needle || entry.text.toLowerCase().includes(needle));
  }, [entries, query]);

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
      <Card className="flex h-[200px] w-full items-center justify-center text-muted-foreground">
        <Brain size={32} className="mr-2" />
        <p className="text-sm">Select a venue to view memory</p>
      </Card>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card className="p-4 flex flex-row items-start gap-3">
        <Lock size={16} className="text-muted-foreground mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">Authentication required</p>
          <p className="text-xs text-muted-foreground mt-1">
            Sign in to view and manage your memory. Memory is scoped to your identity.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
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
      </Card>

      {!loading && entries.length > 0 && (
        <div className="flex justify-end">
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search memory"
              placeholder="Search memory"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      )}

      <Card className="overflow-hidden p-0">
        {loading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="animate-spin text-primary" size={24} />
          </div>
        )}

        {!loading && entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Brain size={32} />
            <p className="text-sm mt-2">No memory yet</p>
            <p className="text-xs mt-1 max-w-sm text-center">
              Add a fact above, or let an agent write one via the memory tool
              (recall / remember / update / forget) at {MEMORY_OP}.
            </p>
          </div>
        )}

        {!loading && entries.length > 0 && visible.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Search size={28} />
            <p className="text-sm mt-2">No memory matches &quot;{query}&quot;</p>
          </div>
        )}

        {!loading && visible.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-sm w-10">#</TableHead>
                  <TableHead className="text-sm">Text</TableHead>
                  <TableHead className="text-sm w-24">Edited</TableHead>
                  <TableHead className="text-sm w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map(({ entry, index }) => {
                  const isEditing = editingIndex === index;
                  const isSaving = savingIndex === index;
                  const isDeleting = deletingIndex === index;
                  const when = editedWhen(entry);
                  return (
                    <TableRow key={index}>
                      <TableCell className="text-muted-foreground text-sm align-top tabular-nums">{index + 1}</TableCell>
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
                      <TableCell className="align-top text-xs text-muted-foreground whitespace-nowrap">
                        {when ? <span title={when.abs}>{when.rel}</span> : <span className="text-muted-foreground/50">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
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
                          <div className="flex items-center justify-end gap-1">
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
                                      className="text-destructive hover:text-destructive/80"
                                      disabled={isDeleting}
                                    >
                                      {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
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
          </div>
        )}
      </Card>
    </div>
  );
}
