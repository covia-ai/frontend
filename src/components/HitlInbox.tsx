"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { useHitlRequests } from "@/hooks/use-hitl";
import {
  missingRequiredAnswers,
  respondToHitl,
  type HitlAnswer,
  type HitlAsk,
  type HitlRequest,
} from "@/lib/hitl";
import { Inbox, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const ALL = "_all_";

const STATUS_FILTERS = [
  { value: "open", label: "Open" },
  { value: ALL, label: "All" },
  { value: "answered", label: "Answered" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

function formatWhen(ms?: number): string {
  return ms ? new Date(ms).toLocaleString() : "";
}

// True if the request offers capability grants anywhere. Grants are shown but
// never echoed back (see respondToHitl), so the UI says so rather than letting
// a responder assume ticking a box confers them.
function offersGrants(request: HitlRequest): boolean {
  return (request.asks ?? []).some(
    (ask) => (ask.grants?.length ?? 0) > 0 || (ask.options ?? []).some((o) => (o.grants?.length ?? 0) > 0),
  );
}

function AskField({
  ask,
  value,
  onChange,
}: {
  ask: HitlAsk;
  value: HitlAnswer | undefined;
  onChange: (value: HitlAnswer) => void;
}) {
  if (ask.type === "text") {
    return (
      <Textarea
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Your answer…"
      />
    );
  }

  if (ask.type === "approval") {
    return (
      <RadioGroup
        value={value === true ? "yes" : value === false ? "no" : ""}
        onValueChange={(v) => onChange(v === "yes")}
        className="flex gap-6"
      >
        {[
          { id: "yes", label: "Yes" },
          { id: "no", label: "No" },
        ].map((opt) => (
          <div key={opt.id} className="flex items-center gap-2">
            <RadioGroupItem value={opt.id} id={`${ask.id}-${opt.id}`} />
            <Label htmlFor={`${ask.id}-${opt.id}`} className="font-normal">{opt.label}</Label>
          </div>
        ))}
      </RadioGroup>
    );
  }

  if (ask.type === "choice") {
    return (
      <RadioGroup
        value={typeof value === "string" ? value : ""}
        onValueChange={onChange}
        className="flex flex-col gap-2"
      >
        {(ask.options ?? []).map((opt) => (
          <div key={opt.id} className="flex items-start gap-2">
            <RadioGroupItem value={opt.id} id={`${ask.id}-${opt.id}`} className="mt-1" />
            <Label htmlFor={`${ask.id}-${opt.id}`} className="font-normal">
              {opt.label}
              {opt.description && (
                <span className="block text-xs text-muted-foreground">{opt.description}</span>
              )}
            </Label>
          </div>
        ))}
      </RadioGroup>
    );
  }

  const selectedIds = Array.isArray(value) ? value : [];
  return (
    <div className="flex flex-col gap-2">
      {(ask.options ?? []).map((opt) => (
        <div key={opt.id} className="flex items-start gap-2">
          <Checkbox
            id={`${ask.id}-${opt.id}`}
            className="mt-1"
            checked={selectedIds.includes(opt.id)}
            onCheckedChange={(checked) =>
              onChange(checked ? [...selectedIds, opt.id] : selectedIds.filter((i) => i !== opt.id))
            }
          />
          <Label htmlFor={`${ask.id}-${opt.id}`} className="font-normal">
            {opt.label}
            {opt.description && (
              <span className="block text-xs text-muted-foreground">{opt.description}</span>
            )}
          </Label>
        </div>
      ))}
    </div>
  );
}

export function HitlInbox() {
  const venue = useAuthenticatedVenue();
  const { requests, loading, error, refresh } = useHitlRequests();

  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [selected, setSelected] = useState<HitlRequest | null>(null);
  const [answers, setAnswers] = useState<Record<string, HitlAnswer>>({});
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const visible = useMemo(
    () => (statusFilter === ALL ? requests : requests.filter((r) => r.status === statusFilter)),
    [requests, statusFilter],
  );

  function openRespond(request: HitlRequest) {
    setSelected(request);
    setAnswers({});
    setComment("");
  }

  async function submit(outcome: "answer" | "reject") {
    if (!venue || !selected) return;
    if (outcome === "answer") {
      const missing = missingRequiredAnswers(selected.asks ?? [], answers);
      if (missing.length > 0) {
        toast("Some required asks are unanswered", { description: missing.join(", ") });
        return;
      }
    }
    setSubmitting(true);
    try {
      await respondToHitl(venue, {
        id: selected.id,
        outcome,
        ...(outcome === "answer" ? { answers } : {}),
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      });
      toast(outcome === "answer" ? "Response sent" : "Request rejected");
      setSelected(null);
      refresh();
    } catch (err) {
      toast("Unable to send response", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 shrink-0" data-testid="hitl-status-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!loading && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {visible.length} of {requests.length}
          </span>
        )}
        <div className="flex-1" />
        <Button
          variant="outline"
          size="icon"
          data-testid="hitl-refresh"
          aria-label="Refresh HITL requests"
          title="Refresh HITL requests"
          disabled={loading}
          onClick={refresh}
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : undefined} />
        </Button>
      </div>

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
            <Card key={request.id} className="p-4 flex flex-col gap-2" data-testid="hitl-request">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium truncate">{request.title}</div>
                  {request.description && (
                    <div className="text-sm text-muted-foreground line-clamp-2">
                      {request.description}
                    </div>
                  )}
                </div>
                <StatusBadge status={request.status} kind="hitl" as="pill" className="shrink-0 text-xs" />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="text-xs text-muted-foreground font-mono truncate">
                  {request.from}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatWhen(request.created)}
                  </span>
                  {request.status === "open" && (
                    <Button size="sm" onClick={() => openRespond(request)}>Respond</Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selected?.title}</SheetTitle>
            {selected?.description && <SheetDescription>{selected.description}</SheetDescription>}
          </SheetHeader>

          <div className="flex flex-col gap-6 px-4">
            {selected && offersGrants(selected) && (
              <p className="text-xs text-muted-foreground border rounded-md p-2">
                This request offers capability grants. Responding here confers none of
                them — grant them deliberately via the API if that is your intent.
              </p>
            )}

            {(selected?.asks ?? []).map((ask) => (
              <div key={ask.id} className="flex flex-col gap-2">
                <Label className="text-sm">
                  {ask.prompt}
                  {ask.required && <span className="text-destructive"> *</span>}
                </Label>
                <AskField
                  ask={ask}
                  value={answers[ask.id]}
                  onChange={(value) => setAnswers((prev) => ({ ...prev, [ask.id]: value }))}
                />
              </div>
            ))}

            <div className="flex flex-col gap-2">
              <Label className="text-sm">Comment</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Optional — the reason the requester sees when rejecting."
              />
            </div>
          </div>

          <SheetFooter className="flex-row gap-2 justify-end">
            <Button
              variant="outline"
              disabled={submitting}
              onClick={() => submit("reject")}
              data-testid="hitl-reject"
            >
              Reject
            </Button>
            <Button disabled={submitting} onClick={() => submit("answer")} data-testid="hitl-answer">
              {submitting ? "Sending…" : "Answer"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
