"use client";

import { useCallback, useEffect, useState } from "react";
import { revalidateVenueOnFailure, useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { jobFailure, notifyError, notifySuccess, notifyWarning } from "@/lib/notify";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { KeyRound, Loader2, Plus, Trash2, EyeOff, Lock, ChevronDown, Plug } from "lucide-react";
import Link from "next/link";
import { Badge } from "./ui/badge";
import { CONNECTIONS } from "@/config/connections";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { KNOWN_LLM_KEYS } from "@/config/llm-providers";
import { keyNameSuggestions, recentKeyNames, rememberKeyName } from "@/lib/recent-keys";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "./ui/table";
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

export function SecretList() {
  const [secrets, setSecrets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");
  const [adding, setAdding] = useState(false);
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
    if (!venue) return;
    venue.secrets
      .delete(name)
      .then(() => {
        notifySuccess(`Secret "${name}" deleted`);
        loadSecrets();
      })
      .catch((err: any) => {
        notifyError("Unable to delete secret", err, venue.baseUrl);
      });
  };

  if (!venue) {
    return (
      <div className="flex h-[200px] w-full border border-border rounded-lg items-center justify-center text-muted-foreground">
        <KeyRound size={32} className="mr-2" />
        <p className="text-sm">Select a venue to manage secrets</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Add Secret Form */}
      {isAuthenticated ? (
        <div className="border border-border rounded-lg p-4 bg-card">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Plus size={16} /> Add Secret
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
                className="flex-1"
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
          <p className="text-xs text-muted-foreground mt-2">
            Secret values are write-only and cannot be revealed after storage.
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-lg p-4 bg-muted/30 flex items-start gap-3">
          <Lock size={16} className="text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Authentication required</p>
            <p className="text-xs text-muted-foreground mt-1">
              Sign in to store and manage secrets. Secret operations require a verified identity.
            </p>
          </div>
        </div>
      )}

      {/* Secrets List — only shown to authenticated users */}
      {!isAuthenticated ? null : <div className="border border-border rounded-lg overflow-hidden">
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

        {!loading && secrets.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableCell className="font-semibold text-sm">Name</TableCell>
                <TableCell className="font-semibold text-sm">Value</TableCell>
                <TableCell className="font-semibold text-sm w-20">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {secrets.map((name) => (
                <TableRow key={name}>
                  <TableCell className="font-mono text-sm">
                    <span className="flex flex-wrap items-center gap-2">
                      {name}
                      {CONNECTION_BY_SECRET.get(name) && (
                        <Link href="/connections">
                          <Badge
                            variant="outline"
                            className="gap-1 font-sans text-[10px] font-normal text-muted-foreground hover:bg-muted"
                          >
                            <Plug size={10} /> {CONNECTION_BY_SECRET.get(name)!.name} connection
                          </Badge>
                        </Link>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    <span className="flex items-center gap-1">
                      <EyeOff size={14} /> ••••••••
                    </span>
                  </TableCell>
                  <TableCell>
                    {isAuthenticated ? (
                      <AlertDialog>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                <Trash2 size={14} />
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
                    ) : (
                      <Tooltip>
                        <TooltipTrigger className="inline-flex h-8 items-center px-2">
                          <Lock size={14} className="text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>Sign in to delete secrets</TooltipContent>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>}
    </div>
  );
}
