"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  revalidateVenueOnFailure,
  useAuthenticatedVenue,
} from "@/hooks/use-authenticated-venue";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { notifyError, notifySuccess } from "@/lib/notify";
import {
  CONNECTIONS,
  CONNECTION_CATEGORIES,
  detectService,
  type ConnectionService,
} from "@/config/connections";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Check,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Lock,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

function Logo({ service, size = 36 }: { service: ConnectionService; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-lg font-bold text-white"
      style={{ backgroundColor: service.color, width: size, height: size, fontSize: size * 0.32 }}
      aria-hidden
    >
      {service.initials}
    </span>
  );
}

type TestState =
  | { phase: "idle" }
  | { phase: "testing" }
  | { phase: "ok"; message: string }
  | { phase: "error"; message: string };

export function ConnectionsList() {
  const venue = useAuthenticatedVenue();
  const isAuthenticated = useIsAuthenticated();

  const [connected, setConnected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  // Quick-connect (paste any token → detect the service).
  const [quick, setQuick] = useState("");
  const detected = useMemo(() => detectService(quick), [quick]);

  // Add dialog.
  const [active, setActive] = useState<ConnectionService | null>(null);
  const [value, setValue] = useState("");
  const [test, setTest] = useState<TestState>({ phase: "idle" });

  const loadConnections = useCallback(() => {
    if (!venue || !isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    venue.secrets
      .list()
      .then((names) => setConnected(new Set(Array.isArray(names) ? names : [])))
      .catch((err: unknown) => {
        notifyError("Unable to load connections", err, venue.baseUrl);
        revalidateVenueOnFailure(venue, null, err);
        setConnected(new Set());
      })
      .finally(() => setLoading(false));
  }, [venue, isAuthenticated]);

  useEffect(() => loadConnections(), [loadConnections]);

  const openAdd = (service: ConnectionService, prefill = "") => {
    setActive(service);
    setValue(prefill);
    setTest({ phase: "idle" });
  };

  /** Run the service's verify call through the venue (secret already stored). */
  const runVerify = async (service: ConnectionService): Promise<string> => {
    if (!venue || !service.verify) throw new Error("No verification available.");
    const v = service.verify;
    const url = v.url ?? service.baseUrl + (v.path ?? "");
    const secretRef = `s/${service.secretName}`;
    const input: Record<string, unknown> = { url, headers: { ...(v.headers ?? {}) } };
    if (service.auth === "bearer") input.bearerSecret = secretRef;
    else if (service.auth === "header") input.secretHeaders = { [service.headerName ?? "Authorization"]: secretRef };
    // auth === "url": the token rides in the URL via {s/NAME}; no header to add.
    if (v.method === "post") input.body = v.body;
    const op = v.method === "post" ? "v/ops/http/post" : "v/ops/http/get";
    const out: any = await venue.operations.run(op, input);
    // out = { status, body }. Some APIs (Slack, Linear) 200 with an error body,
    // so the per-service label is the source of truth.
    const label = v.label(out?.body);
    if (label) return label;
    const status = out?.status;
    const detail =
      out?.body?.message ?? out?.body?.error ?? out?.body?.errors?.[0]?.message ?? out?.body?.description ?? "";
    throw new Error(`${service.name} rejected the token${status ? ` (${status})` : ""}${detail ? `: ${detail}` : ""}`);
  };

  const connect = async () => {
    if (!venue || !active) return;
    const token = value.trim();
    if (!token) return;
    setTest({ phase: "testing" });
    try {
      await venue.secrets.set(active.secretName, token);
      if (active.verify) {
        try {
          const message = await runVerify(active);
          setConnected((prev) => new Set(prev).add(active.secretName));
          setTest({ phase: "ok", message });
        } catch (verifyErr: any) {
          // Don't persist a token we couldn't validate.
          await venue.secrets.delete(active.secretName).catch(() => {});
          setTest({ phase: "error", message: verifyErr?.message ?? "Could not verify the token." });
        }
      } else {
        // No generic verify (e.g. Jira's per-user host) — store and confirm.
        setConnected((prev) => new Set(prev).add(active.secretName));
        setTest({ phase: "ok", message: "Saved. Validates on first use." });
      }
    } catch (err: unknown) {
      notifyError(`Unable to connect ${active.name}`, err, venue?.baseUrl);
      setTest({ phase: "idle" });
    }
  };

  const finishOk = () => {
    if (active && test.phase === "ok") {
      notifySuccess(`${active.name} connected`, {
        description: `Load the ${active.id} skill on an agent to use it.`,
      });
    }
    setActive(null);
    setValue("");
    setTest({ phase: "idle" });
  };

  const disconnect = (service: ConnectionService) => {
    if (!venue) return;
    venue.secrets
      .delete(service.secretName)
      .then(() => {
        setConnected((prev) => {
          const next = new Set(prev);
          next.delete(service.secretName);
          return next;
        });
        notifySuccess(`${service.name} disconnected`);
      })
      .catch((err: unknown) =>
        notifyError(`Unable to disconnect ${service.name}`, err, venue?.baseUrl),
      );
  };

  const isConnected = (s: ConnectionService) => connected.has(s.secretName);
  const connectedServices = CONNECTIONS.filter(isConnected);
  const searching = query.trim().length > 0;
  const filtered = CONNECTIONS.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.category.toLowerCase().includes(query.toLowerCase()),
  );
  const catalogueByCategory = CONNECTION_CATEGORIES.map((cat) => ({
    category: cat,
    services: CONNECTIONS.filter((s) => s.category === cat && !isConnected(s)),
  })).filter((g) => g.services.length > 0);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-10 text-center">
        <Lock className="text-muted-foreground" size={22} />
        <p className="text-sm text-muted-foreground">
          Sign in to connect services. Your token is stored encrypted on your venue and never leaves it.
        </p>
      </div>
    );
  }

  const Card = ({ service }: { service: ConnectionService }) => {
    const on = isConnected(service);
    return (
      <div className="flex flex-col rounded-xl border bg-card p-4">
        <div className="flex items-start gap-3">
          <Logo service={service} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-semibold">{service.name}</span>
              <span className="font-mono text-[10px] uppercase text-muted-foreground">{service.method}</span>
            </div>
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{service.blurb}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          {loading ? (
            <Loader2 className="animate-spin text-muted-foreground" size={16} />
          ) : on ? (
            <Badge variant="outline" className="gap-1 border-green-600/30 bg-green-600/10 text-green-700 dark:text-green-400">
              <Check size={12} /> Connected
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">Not connected</span>
          )}
          {on ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground">
                  <Trash2 size={14} />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disconnect {service.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Removes the stored secret <code className="rounded bg-muted px-1 font-mono text-xs">{service.secretName}</code>. Agents using the {service.id} skill lose access until you reconnect.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => disconnect(service)}>Disconnect</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button variant="outline" size="sm" className="h-7" onClick={() => openAdd(service)}>
              <Plus size={14} /> Connect
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Trust cue — Covia's differentiator, stated up front. */}
      <div className="flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
        <ShieldCheck className="mt-0.5 shrink-0 text-primary" size={17} />
        <p className="text-sm text-muted-foreground">
          Your token is stored <span className="font-medium text-foreground">encrypted on your venue</span> and referenced only by name. Covia runs no broker and never sees it — every call is a job on your venue.
        </p>
      </div>

      {/* Quick connect: paste any token, we detect the service. */}
      <div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
          <Input
            placeholder="Search services, or paste a token to auto-detect…"
            value={quick || query}
            onChange={(e) => {
              const val = e.target.value;
              // A pasted secret-looking value drives detection; plain text filters.
              if (detectService(val)) { setQuick(val); setQuery(""); }
              else { setQuery(val); setQuick(""); }
            }}
            onKeyDown={(e) => { if (e.key === "Enter" && detected) { openAdd(detected, quick); setQuick(""); } }}
            className="pl-9 font-normal"
          />
        </div>
        {detected && (
          <button
            onClick={() => { openAdd(detected, quick); setQuick(""); }}
            className="mt-2 flex w-full items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-left text-sm hover:bg-primary/10"
          >
            <Logo service={detected} size={22} />
            <span>Looks like <span className="font-semibold">{detected.name}</span> — press Enter to connect</span>
            <span className="ml-auto text-primary"><Plus size={16} /></span>
          </button>
        )}
      </div>

      {/* Search results (flat, with status) */}
      {searching ? (
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {filtered.length} result{filtered.length === 1 ? "" : "s"}
          </h3>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No service matches “{query}”. Try a token, or add a custom connection from Secrets.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((s) => <Card key={s.id} service={s} />)}
            </div>
          )}
        </section>
      ) : (
        <>
          {/* Connected first */}
          {connectedServices.length > 0 && (
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Connected · {connectedServices.length}
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {connectedServices.map((s) => <Card key={s.id} service={s} />)}
              </div>
            </section>
          )}
          {/* Browse the rest */}
          {catalogueByCategory.map(({ category, services }) => (
            <section key={category}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{category}</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((s) => <Card key={s.id} service={s} />)}
              </div>
            </section>
          ))}
        </>
      )}

      {/* Guided add-connection dialog with live test */}
      <Dialog open={!!active} onOpenChange={(o) => !o && finishOk()}>
        <DialogContent className="sm:max-w-md">
          {active && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <Logo service={active} />
                  <div>
                    <DialogTitle>Connect {active.name}</DialogTitle>
                    <DialogDescription>{active.blurb}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <ol className="space-y-3 py-1">
                {active.createSteps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">{i + 1}</span>
                    <span className="text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ol>

              <a href={active.tokenUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                Open {active.name} to create the token <ExternalLink size={13} />
              </a>

              <div className="mt-1">
                <Input
                  autoFocus
                  type="password"
                  placeholder={active.placeholder}
                  value={value}
                  onChange={(e) => { setValue(e.target.value); if (test.phase !== "idle") setTest({ phase: "idle" }); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && value.trim() && test.phase !== "testing") connect(); }}
                  className="font-mono"
                  disabled={test.phase === "testing" || test.phase === "ok"}
                />
                {test.phase === "ok" ? (
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400">
                    <CheckCircle2 size={14} /> {test.message}
                  </p>
                ) : test.phase === "error" ? (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
                    <XCircle size={14} className="mt-0.5 shrink-0" /> {test.message}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Stored encrypted as <code className="rounded bg-muted px-1 font-mono">{active.secretName}</code>.
                    {active.verify ? " We'll test it before saving." : " Stored on your venue only."}
                  </p>
                )}
              </div>

              <DialogFooter>
                {test.phase === "ok" ? (
                  <Button onClick={finishOk}>Done</Button>
                ) : (
                  <>
                    <Button variant="ghost" onClick={() => setActive(null)}>Cancel</Button>
                    <Button onClick={connect} disabled={!value.trim() || test.phase === "testing"}>
                      {test.phase === "testing" && <Loader2 className="animate-spin" size={14} />}
                      {active.verify ? "Test & connect" : "Connect"}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
