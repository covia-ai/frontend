"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FiltersSheet } from "@/components/FiltersSheet";
import { ListToolbar } from "@/components/ListToolbar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import { HitlRequestCard } from "@/components/hitl/HitlRequestCard";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { useAuthStore } from "@/hooks/use-auth";
import { useHitlRequests } from "@/hooks/use-hitl";
import type { HitlRequest } from "@/lib/hitl";
import { Inbox, RefreshCw, Search } from "lucide-react";

// Empty selection means "no filter" (show every status) — same convention as
// the Status group on the Jobs filter sheet — so there's no separate "All"
// option here.
const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "answered", label: "Answered" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

function matchesQuery(request: HitlRequest, needle: string): boolean {
  if (!needle) return true;
  const hay = `${request.title ?? ""} ${request.description ?? ""} ${request.agent ?? ""} ${request.from ?? ""}`;
  return hay.toLowerCase().includes(needle);
}

/**
 * @param initialRequestId Opens this request expanded on mount, for deep links
 *   such as /inbox?requestId=… — the demo pages send a viewer to the ask they
 *   just raised rather than rebuilding an approval surface of their own.
 */
export function HitlInbox({ initialRequestId }: { initialRequestId?: string } = {}) {
  const venue = useAuthenticatedVenue();
  const { requests, loading, error, refresh } = useHitlRequests();
  // Whether stored credentials exist for *the venue actually being read*. The
  // signed-in gate keys off the selected venue while the Venue is built from the
  // current venue's id; when those drift the page renders as signed in but
  // reads anonymously, which the venue answers with a 401. Reporting both
  // makes that distinguishable from a genuine credential problem.
  const credsForVenue = useAuthStore((x) => (venue ? x.authMap[venue.venueId] ?? null : null));
  // Only a did:key holder can sign a self-sovereign token (COG-19); a bearer
  // login has no client key. null disables signing with an explanation.
  const signingKeyHex = credsForVenue?.type === "keypair" ? credsForVenue.privateKeyHex : null;

  // No filter pre-selected — the inbox shows everything until the user
  // narrows it down, rather than silently hiding non-open requests.
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  // The list only tracks which single card is open for editing; each card owns
  // its own draft, so a draft can never bleed across cards (frontend#196).
  const [expandedId, setExpandedId] = useState<string | null>(initialRequestId ?? null);
  // Answering moves a request out of the default Open filter, so without this
  // the card you just acted on vanishes and you never see what you decided.
  const [justAnsweredId, setJustAnsweredId] = useState<string | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const base = requests.filter(
      (r) => (statusFilter.length === 0 || statusFilter.includes(r.status)) && matchesQuery(r, needle),
    );
    if (!justAnsweredId || base.some((r) => r.id === justAnsweredId)) return base;
    const pinned = requests.find((r) => r.id === justAnsweredId);
    return pinned ? [pinned, ...base] : base;
  }, [requests, statusFilter, query, justAnsweredId]);

  function changeStatusFilter(next: string[]) {
    setStatusFilter(next);
    setJustAnsweredId(null);
  }

  // Stable callbacks so a memoised HitlRequestCard only re-renders when its own
  // props change — a keystroke in one card's draft (its local state) doesn't
  // touch the others, and expanding one card re-renders only it and the one it
  // replaced.
  const handleToggleExpanded = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);
  const handleAnswered = useCallback(
    (id: string) => {
      setExpandedId(null);
      setJustAnsweredId(id);
      refresh();
    },
    [refresh],
  );

  return (
    <div className="flex flex-col gap-4">
      <ListToolbar
        actions={
          <>
            <div className="relative w-44 sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
              <Input
                aria-label="Search Inbox requests"
                placeholder="Search requests"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <FiltersSheet
              title="Filter Requests"
              description="Narrow down Inbox requests by status."
              groups={[
                { label: "Status", options: STATUS_OPTIONS, selected: statusFilter, onChange: changeStatusFilter },
              ]}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  data-testid="hitl-refresh"
                  aria-label="Refresh Inbox requests"
                  disabled={loading}
                  onClick={refresh}
                >
                  <RefreshCw size={16} className={loading ? "animate-spin" : undefined} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh Inbox requests</TooltipContent>
            </Tooltip>
          </>
        }
        summary={!loading && requests.length > 0 && `Showing ${visible.length} of ${requests.length}`}
      />

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Spinner variant="ellipsis" className="text-primary" size={48} />
        </div>
      )}

      {!loading && error && (
        <div
          data-testid="hitl-error"
          className="border border-destructive/40 rounded-md p-4 flex flex-col gap-1"
        >
          <div className="text-sm font-medium text-destructive">Couldn&apos;t read your inbox</div>
          <div className="text-sm text-muted-foreground break-words">{error}</div>
          <div className="text-xs text-muted-foreground mt-1">
            The inbox lives in your own namespace on one venue — check that the selected
            venue is the one holding your requests, and that you are signed in with the
            same key.
          </div>
          <div
            data-testid="hitl-error-context"
            className="text-xs text-muted-foreground mt-2 font-mono break-all"
          >
            venue {venue?.baseUrl ?? "(none)"} · id {venue?.venueId ?? "(none)"} ·
            {" "}credentials stored for this venue: {credsForVenue ? `yes (${credsForVenue.did})` : "NONE"}
          </div>
        </div>
      )}

      {!loading && !error && visible.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <Inbox size={64} className="text-primary" />
          <div className="text-primary text-lg">Nothing waiting on you</div>
          <div className="text-card-foreground text-sm">
            Requests that need your decision will appear here.
          </div>
        </div>
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="flex flex-col gap-3">
          {visible.map((request) => (
            <HitlRequestCard
              key={request.id}
              request={request}
              selfDid={credsForVenue?.did}
              venue={venue}
              signingKeyHex={signingKeyHex}
              expanded={expandedId === request.id}
              onToggleExpanded={handleToggleExpanded}
              onAnswered={handleAnswered}
            />
          ))}
        </div>
      )}
    </div>
  );
}
