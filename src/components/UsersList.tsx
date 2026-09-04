"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import type { AuthenticationKeysMap, StatusData, UserSummary } from "@covia/covia-sdk";
import { useResolvedVenueContext } from "@/hooks/use-resolved-venue";
import { revalidateVenueOnFailure } from "@/hooks/use-authenticated-venue";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import { DidDisplay } from "@/components/DidDisplay";
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
import { ChevronRight, Loader2, Lock, ShieldAlert, Search, Users as UsersIcon } from "lucide-react";
import { getVenueStatus } from "@/lib/venue-registry";
import { errorStatus } from "@/lib/errors";
import { formatDateTime } from "@/lib/utils";
import { jobFailure, notifyError, notifySuccess } from "@/lib/notify";

interface UsersListProps {
  venueId: string;
}

// Whether the signed-in caller can see the full users list: "checking" while
// the first read is in flight, "forbidden" for a 403 (signed in, not an
// operator — an expected, common outcome, not a failure to toast), "error"
// for anything else (a real venue/auth problem).
type ListState = "checking" | "ready" | "forbidden" | "error";

export function UsersList({ venueId }: UsersListProps) {
  const { venue, isAuthenticated, auth, status: venueStatus } = useResolvedVenueContext(venueId);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [listState, setListState] = useState<ListState>("checking");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusData | undefined>(undefined);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [authenticators, setAuthenticators] = useState<Record<string, AuthenticationKeysMap>>({});
  const [authLoading, setAuthLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!venue) return;
    let ignore = false;
    getVenueStatus(venue).then((s) => { if (!ignore) setStatus(s); });
    return () => { ignore = true; };
  }, [venue]);

  useEffect(() => {
    if (!venue) return;
    if (!isAuthenticated) {
      setListState("forbidden");
      return;
    }
    let ignore = false;
    setListState("checking");
    venue.users
      .list()
      .then((result) => {
        if (ignore) return;
        setUsers(result.users ?? []);
        setListState("ready");
      })
      .catch((err) => {
        if (ignore) return;
        if (errorStatus(err) === 403) {
          // Signed in, just not an operator — a gated view, not a broken page.
          setListState("forbidden");
          return;
        }
        notifyError("Unable to load users", err, venue.baseUrl);
        revalidateVenueOnFailure(venue, auth, err);
        setListState("error");
      });
    return () => { ignore = true; };
  }, [venue, isAuthenticated, auth]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) => u.did.toLowerCase().includes(term));
  }, [users, search]);

  function loadAuthenticators(did: string) {
    if (!venue || authenticators[did]) return;
    setAuthLoading(did);
    venue.users
      .listAuthenticators(did)
      .then((result) => {
        setAuthenticators((prev) => ({ ...prev, [did]: result.authenticationKeys ?? {} }));
      })
      .catch((err) => {
        notifyError("Unable to load authenticators", err, venue.baseUrl);
      })
      .finally(() => setAuthLoading(null));
  }

  function toggleExpand(did: string) {
    const next = expanded === did ? null : did;
    setExpanded(next);
    if (next) loadAuthenticators(next);
  }

  function handleRevoke(did: string, key: string) {
    if (!venue) return;
    venue.users
      .revokeAuthenticator(key, did)
      .then(() => {
        notifySuccess("Authenticator revoked");
        setAuthenticators((prev) => {
          const rest = { ...prev };
          delete rest[did];
          return rest;
        });
        loadAuthenticators(did);
      })
      .catch((err) => {
        const { reason, jobHref } = jobFailure(err, venue.venueId);
        notifyError("Unable to revoke authenticator", reason, venue.baseUrl, jobHref);
      });
  }

  return (
    <ContentLayout>
      <TopBar venueId={venueId} venueName={venue?.metadata.name} />

      <div className="flex flex-col gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary-vlight p-3 rounded-lg">
                <UsersIcon size={28} className="text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-thin">Users</h1>
                <p className="text-sm text-muted-foreground">
                  {status?.access
                    ? status.access.userAutoCreate
                      ? "New users are admitted automatically on first sign-in."
                      : "New users must be provisioned by the venue operator."
                    : "Admission policy unavailable for this venue."}
                </p>
              </div>
            </div>
            {listState === "ready" && (
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filter users…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            )}
          </div>
        </Card>

        {venueStatus !== "ready" && (
          <div className="flex items-center justify-center py-16">
            <Spinner variant="ellipsis" className="text-primary" size={48} />
          </div>
        )}

        {venueStatus === "ready" && !isAuthenticated && (
          <div className="border border-border rounded-lg p-4 bg-muted/30 flex items-start gap-3">
            <Lock size={16} className="text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Authentication required</p>
              <p className="text-xs text-muted-foreground mt-1">
                Sign in to view registered users on this venue.
              </p>
            </div>
          </div>
        )}

        {venueStatus === "ready" && isAuthenticated && listState === "checking" && (
          <div className="flex items-center justify-center py-16">
            <Spinner variant="ellipsis" className="text-primary" size={48} />
          </div>
        )}

        {venueStatus === "ready" && isAuthenticated && listState === "forbidden" && (
          <div className="border border-border rounded-lg p-4 bg-muted/30 flex items-start gap-3">
            <ShieldAlert size={16} className="text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Operator access required</p>
              <p className="text-xs text-muted-foreground mt-1">
                Viewing the full users list requires signing in as this venue&apos;s operator,
                or holding a venue-issued delegation.
              </p>
            </div>
          </div>
        )}

        {venueStatus === "ready" && isAuthenticated && listState === "error" && (
          <div className="border border-border rounded-lg p-4 bg-muted/30 flex items-start gap-3">
            <ShieldAlert size={16} className="text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Unable to load users</p>
              <p className="text-xs text-muted-foreground mt-1">
                Something went wrong reading the users list from this venue.
              </p>
            </div>
          </div>
        )}

        {venueStatus === "ready" && isAuthenticated && listState === "ready" && (
          <Card>
            <CardHeader className="px-2">
              <CardTitle className="text-base font-medium">
                {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground px-6 py-10 text-center">
                  {users.length === 0 ? "No registered users on this venue." : "No users match your filter."}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary hover:bg-secondary text-secondary-foreground">
                      <TableCell className="text-left">DID</TableCell>
                      <TableCell className="text-left">Account type</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => {
                      const isExpanded = expanded === user.did;
                      const keys = authenticators[user.did];
                      return (
                        <Fragment key={user.did}>
                          <TableRow className="cursor-pointer" onClick={() => toggleExpand(user.did)}>
                            <TableCell className="font-mono">
                              <span className="inline-flex items-center gap-1.5">
                                <ChevronRight
                                  size={14}
                                  className={`shrink-0 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`}
                                />
                                {/* DidDisplay is itself a dropdown trigger (Copy menu) — stop the
                                    click from also toggling row expand, so the two interactions
                                    (copy vs. expand) never fire together from one click. */}
                                <span onClick={(e) => e.stopPropagation()}>
                                  <DidDisplay value={user.did} chars={20} />
                                </span>
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{user.managed ? "Managed" : "External"}</Badge>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow className="hover:bg-transparent bg-muted/30">
                              <TableCell colSpan={2} className="py-3">
                                {authLoading === user.did && (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Loader2 className="animate-spin" size={14} /> Loading authenticators…
                                  </div>
                                )}
                                {authLoading !== user.did && keys && Object.keys(keys).length === 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    {user.managed
                                      ? "No authenticators on record."
                                      : "This is a plain registered DID, not a venue-managed named account — authenticators only apply to managed accounts."}
                                  </p>
                                )}
                                {authLoading !== user.did && keys && Object.keys(keys).length > 0 && (
                                  <ul className="flex flex-col gap-2">
                                    {Object.entries(keys).map(([key, entry]) => (
                                      <li key={key} className="flex flex-wrap items-center gap-2 text-xs">
                                        <DidDisplay value={key} chars={20} />
                                        <Badge variant={entry.status === "active" ? "outline" : "secondary"}>
                                          {entry.status}
                                        </Badge>
                                        <span className="text-muted-foreground">
                                          added {formatDateTime(entry.addedAt)}
                                          {entry.status === "revoked" && entry.revokedAt
                                            ? ` · revoked ${formatDateTime(entry.revokedAt)}`
                                            : ""}
                                        </span>
                                        {entry.status === "active" && (
                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-2 text-red-600 hover:text-red-700"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                Revoke
                                              </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                              <AlertDialogHeader>
                                                <AlertDialogTitle>Revoke this authenticator?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                  This action cannot be undone. The key stays on record as
                                                  a revoked tombstone.
                                                </AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleRevoke(user.did, key)}>
                                                  Revoke
                                                </AlertDialogAction>
                                              </AlertDialogFooter>
                                            </AlertDialogContent>
                                          </AlertDialog>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </ContentLayout>
  );
}
