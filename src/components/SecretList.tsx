"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { revalidateVenueOnFailure, useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { jobFailure, notifyError, notifySuccess, notifyWarning } from "@/lib/notify";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { KeyRound, Loader2, Plus, Trash2, EyeOff, Lock, ChevronDown, Plug, Search, Code } from "lucide-react";
import Link from "next/link";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { TypeTile } from "./TypeTile";
import { conceptLook } from "@/lib/concept-icons";
import { CONNECTIONS } from "@/config/connections";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { KNOWN_LLM_KEYS } from "@/config/llm-providers";
import { keyNameSuggestions, recentKeyNames, rememberKeyName } from "@/lib/recent-keys";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
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

/** Secret name → the connection that stores it, so the Secrets page can show
 *  which secrets are a connection's credential rather than a bare LLM/API key. */
const CONNECTION_BY_SECRET = new Map(CONNECTIONS.map((s) => [s.secretName, s]));

// One-line descriptor for the general-purpose bucket, so bespoke secrets read
// as intentional (any name works and is referenced as s/<name>), not leftover.
const GROUP_NOTES: Record<string, string> = { Other: "your own named credentials" };

// The canonical secret glyph (KeyRound on the accent tile) — the app's secret
// iconography, shared with the rest of the type vocabulary.
const SECRET_LOOK = conceptLook("secret");

/** Buckets a flat secret-name list into provider groups for display — a
 *  connection's credential, a known LLM key, or unclassified (frontend#166). */
export function groupSecretsByProvider(secrets: string[]): { label: string; names: string[] }[] {
  const connections: string[] = [];
  const llmKeys: string[] = [];
  const other: string[] = [];
  for (const name of secrets) {
    if (CONNECTION_BY_SECRET.has(name)) connections.push(name);
    else if (KNOWN_LLM_KEYS[name]) llmKeys.push(name);
    else other.push(name);
  }
  return [
    { label: "Connections", names: connections },
    { label: "LLM providers", names: llmKeys },
    { label: "Other", names: other },
  ].filter((g) => g.names.length > 0);
}

export function SecretList() {
  const [secrets, setSecrets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  // Per-row in-flight guard: the name currently being deleted disables its own
  // Delete control and blocks starting a second concurrent delete.
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => setRecent(recentKeyNames()), []);

  // Grouped name suggestions: recent → your existing keys → common LLM keys.
  const nameGroups = keyNameSuggestions({
    recent,
    existing: secrets,
    common: Object.keys(KNOWN_LLM_KEYS),
  });

  const venue = useAuthenticatedVenue();
  const isAuthenticated = useIsAuthenticated();

  const loadSecrets = useCallback(() => {
    if (!venue || !isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    venue.secrets
      .list()
      .then((result) => {
        setSecrets(Array.isArray(result) ? result : []);
      })
      .catch((err: any) => {
        notifyError("Unable to load secrets", err, venue.baseUrl);
        // A connectivity or auth failure here is a venue problem, not a
        // secrets problem — force a status recheck so health indicators and
        // resolution-gated pages converge on the real state (unreachable,
        // auth-required, or a restarted venue identity).
        revalidateVenueOnFailure(venue, null, err);
        setSecrets([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [venue, isAuthenticated]);

  useEffect(() => {
    loadSecrets();
  }, [loadSecrets]);

  // Filter the already-loaded names client-side, then group — no new fetch.
  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = needle ? secrets.filter((s) => s.toLowerCase().includes(needle)) : secrets;
    return groupSecretsByProvider(matched);
  }, [secrets, query]);

  const handleAdd = () => {
    if (!venue || !newName.trim() || !newValue.trim()) {
      notifyWarning("Name and value are required");
      return;
    }
    setAdding(true);
    venue.secrets
      .set(newName.trim(), newValue)
      .then(() => {
        notifySuccess(`Secret "${newName}" stored`);
        rememberKeyName(newName.trim());
        setRecent(recentKeyNames());
        setNewName("");
        setNewValue("");
        loadSecrets();
      })
      .catch((err: any) => {
        // Surface the cause — a blind toast hid a JWT-audience 401 for days.
        const { reason, jobHref } = jobFailure(err, venue.venueId);
        notifyError("Unable to store secret", reason, venue.baseUrl, jobHref);
      })
      .finally(() => {
        setAdding(false);
      });
  };

  const handleDelete = (name: string) => {
    if (!venue || deletingName) return;
    setDeletingName(name);
    venue.secrets
      .delete(name)
      .then(() => {
        notifySuccess(`Secret "${name}" deleted`);
        loadSecrets();
      })
      .catch((err: any) => {
        notifyError("Unable to delete secret", err, venue.baseUrl);
      })
      .finally(() => {
        setDeletingName(null);
      });
  };

  if (!venue) {
    return (
      <Card className="flex h-[200px] w-full items-center justify-center text-muted-foreground">
        <KeyRound size={32} className="mr-2" />
        <p className="text-sm">Select a venue to manage secrets</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Add Secret Form */}
      {isAuthenticated ? (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Plus size={16} /> Add secret
          </h3>
          <div className="flex flex-col sm:flex-row gap-2">
            {/* This is not a login form. Without these opt-outs the browser
                treats name+password as credentials and autofills a saved
                password into the value field. autoComplete="new-password" is the
                reliable signal to suppress filling an existing password; the
                data-* attrs cover 1Password / LastPass. */}
            <div className="flex-1 flex gap-1">
              <Input
                placeholder="Secret name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 font-mono"
                autoComplete="off"
              />
              {nameGroups.length > 0 && (
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="outline" size="icon" aria-label="Suggested key names" data-testid="key-name-suggestions">
                          <ChevronDown size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Suggested key names</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end" className="max-h-72 overflow-auto">
                    {nameGroups.map((group, i) => (
                      <div key={group.label}>
                        {i > 0 && <DropdownMenuSeparator />}
                        <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {group.label}
                        </DropdownMenuLabel>
                        {group.names.map((name) => (
                          <DropdownMenuItem key={name} className="font-mono text-xs" onSelect={() => setNewName(name)}>
                            {name}
                          </DropdownMenuItem>
                        ))}
                      </div>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <Input
              type="password"
              placeholder="Secret value"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="flex-1"
              autoComplete="new-password"
              data-1p-ignore
              data-lpignore="true"
              spellCheck={false}
            />
            <Button onClick={handleAdd} disabled={adding || !newName.trim() || !newValue.trim()}>
              {adding ? "Storing..." : "Add"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
            <Lock size={13} className="shrink-0" /> Values are write-only and can&apos;t be revealed after storage.
          </p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
            <Code size={13} className="shrink-0" /> Any name works — operations reference it as{" "}
            <code className="font-mono text-muted-foreground">s/&lt;name&gt;</code>.
          </p>
        </Card>
      ) : (
        <Card className="p-4 flex flex-row items-start gap-3">
          <Lock size={16} className="text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Authentication required</p>
            <p className="text-xs text-muted-foreground mt-1">
              Sign in to store and manage secrets. Secret operations require a verified identity.
            </p>
          </div>
        </Card>
      )}

      {/* Secrets List — only shown to authenticated users */}
      {isAuthenticated && (
        <>
          {!loading && secrets.length > 0 && (
            <div className="flex justify-end">
              <div className="relative w-full sm:w-64">
                <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Search secrets"
                  placeholder="Search secrets"
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

            {!loading && secrets.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <KeyRound size={32} />
                <p className="text-sm mt-2">No secrets stored</p>
              </div>
            )}

            {!loading && secrets.length > 0 && groups.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Search size={28} />
                <p className="text-sm mt-2">No secrets match &quot;{query}&quot;</p>
              </div>
            )}

            {!loading && groups.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-sm">Name</TableHead>
                      <TableHead className="text-sm">Value</TableHead>
                      <TableHead className="text-sm w-20 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.map((group) => (
                      <Fragment key={group.label}>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableHead
                            scope="colgroup"
                            colSpan={3}
                            className="h-auto py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground"
                          >
                            {group.label}
                            {GROUP_NOTES[group.label] && (
                              <span className="ml-2 normal-case tracking-normal text-muted-foreground/70">
                                · {GROUP_NOTES[group.label]}
                              </span>
                            )}
                          </TableHead>
                        </TableRow>
                        {group.names.map((name) => {
                          const connection = CONNECTION_BY_SECRET.get(name);
                          const deleting = deletingName === name;
                          return (
                            <TableRow key={name} data-testid="secret-row" className={deleting ? "opacity-60" : undefined}>
                              <TableCell>
                                <div className="flex min-w-0 items-start gap-3">
                                  <TypeTile Icon={SECRET_LOOK.Icon} tile={SECRET_LOOK.tile} className="size-7" iconSize={15} title={SECRET_LOOK.label} />
                                  <div className="min-w-0">
                                    <div className="truncate font-mono text-sm">{name}</div>
                                    {connection && (
                                      <Link href="/connections">
                                        <Badge
                                          variant="outline"
                                          className="mt-1 gap-1 font-sans text-[10px] font-normal text-muted-foreground hover:bg-muted"
                                        >
                                          <Plug size={10} /> {connection.name} connection
                                        </Badge>
                                      </Link>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                <span className="flex items-center gap-1 font-mono">
                                  <EyeOff size={14} /> ••••••••
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <AlertDialog>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          disabled={deleting}
                                          aria-label={deleting ? `Deleting ${name}` : `Delete ${name}`}
                                          className="text-destructive hover:text-destructive/80"
                                        >
                                          {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                        </Button>
                                      </AlertDialogTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>Delete secret</TooltipContent>
                                  </Tooltip>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete secret &quot;{name}&quot;?</AlertDialogTitle>
                                      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDelete(name)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
