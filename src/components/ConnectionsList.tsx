"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  revalidateVenueOnFailure,
  useAuthenticatedVenue,
} from "@/hooks/use-authenticated-venue";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { cn, formatRelativeTime } from "@/lib/utils";
import { notifyError, notifySuccess } from "@/lib/notify";
import {
  CONNECTIONS,
  CONNECTION_CATEGORIES,
  CONNECTION_CAPABILITIES,
  connectionSecrets,
  detectService,
  type ConnectionService,
} from "@/config/connections";
import { ConnectionLogo as Logo } from "@/components/ConnectionLogo";
import { buildVerifyCall, interpretVerify } from "@/lib/connection-verify";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
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
import { memo } from "react";

type TestState =
  | { phase: "idle" }
  | { phase: "testing" }
  | { phase: "ok"; message: string }
  | { phase: "error"; message: string };

// Per-connected-service health, keyed by secretName. On-demand only (the Test
// button) — a check on page load would persist a job per service per visit,
// which the reads-must-not-create-jobs rule forbids until the venue exposes a
// job-free verify (covia#489). Not persisted: a fresh page load starts idle.
type HealthState =
  | { phase: "checking" }
  | { phase: "ok"; message: string; checkedAt: string }
  | { phase: "attention"; message: string; checkedAt: string };

type ConnectionCardProps = {
  service: ConnectionService;
  connected: boolean;
  health: HealthState | undefined;
  loading: boolean;
  onTest: (service: ConnectionService) => void;
  onOpenAdd: (service: ConnectionService) => void;
  onDisconnect: (service: ConnectionService) => void;
};

// Hoisted to module scope (frontend#344) — a component defined inside
// another component's render body is a new function, hence a new component
// *type*, on every render. React keys reconciliation on type identity, so
// that pattern remounts every card from scratch (losing DOM state, replaying
// mount animations, tearing down open tooltips) on any parent state change —
// including typing a single character into the search box. Passing explicit
// props instead of closing over ConnectionsList's state keeps this a stable
// type across renders, so React diffs and updates in place like normal.
//
// Wrapped in React.memo (perf): the catalogue filters search client-side, so a
// keystroke re-renders ConnectionsList and remaps every visible card. With the
// parent passing stable props (the three handlers are useCallback'd), a card
// re-renders only when its own service/connected/health/loading actually
// changes — so testing one service's health never re-renders the others.
// The card root stays `div.rounded-xl` (the tests locate a card via
// `.closest("div.rounded-xl")`); the banded header brings it into visual
// parity with the operation and agent cards.
const ConnectionCard = memo(function ConnectionCard({
  service,
  connected,
  health,
  loading,
  onTest,
  onOpenAdd,
  onDisconnect,
}: ConnectionCardProps) {
  const on = connected;
  const attention = on && health?.phase === "attention";
  const example = CONNECTION_CAPABILITIES[service.id]?.examples[0];
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:border-accent hover:shadow-md">
      {/* Header band: logo identity + name + auth method */}
      <div className="flex items-start gap-3 border-b bg-card-banner px-4 py-3">
        <Logo service={service} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-semibold">{service.name}</span>
            <span className="shrink-0 font-mono text-[10px] uppercase text-muted-foreground">
              {service.method}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{service.blurb}</p>
        </div>
      </div>

      {/* Body: capability hint (connected), status + actions */}
      <div className="flex flex-1 flex-col gap-3 px-4 py-3">
        {on && example && (
          <p className="line-clamp-1 text-xs italic text-muted-foreground/80">
            Try: &ldquo;{example}&rdquo;
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            {loading ? (
              <Loader2 className="animate-spin text-muted-foreground" size={16} />
            ) : attention ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="w-fit gap-1 border-amber-600/30 bg-amber-600/10 text-amber-700 dark:text-amber-400"
                  >
                    <AlertTriangle size={12} /> Needs attention
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-64">{health.message}</TooltipContent>
              </Tooltip>
            ) : on ? (
              <Badge variant="outline" className="w-fit gap-1 border-green-600/30 bg-green-600/10 text-green-700 dark:text-green-400">
                <Check size={12} /> Connected
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground">Not connected</span>
            )}
            {on && health && health.phase !== "checking" && (
              <span className="text-[10px] text-muted-foreground">
                Checked {formatRelativeTime(health.checkedAt)}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {on && service.verify && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-muted-foreground"
                    aria-label={`Test ${service.name} connection`}
                    disabled={health?.phase === "checking"}
                    onClick={() => onTest(service)}
                  >
                    {health?.phase === "checking" ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <RefreshCw size={14} />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Test connection</TooltipContent>
              </Tooltip>
            )}
            {attention && (
              <Button variant="outline" size="sm" className="h-7" onClick={() => onOpenAdd(service)}>
                Fix
              </Button>
            )}
            {on ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-muted-foreground"
                    aria-label={`Disconnect ${service.name}`}
                  >
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
                    <AlertDialogAction onClick={() => onDisconnect(service)}>Disconnect</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button variant="outline" size="sm" className="h-7" onClick={() => onOpenAdd(service)}>
                <Plus size={14} /> Connect
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export function ConnectionsList() {
  const venue = useAuthenticatedVenue();
  const isAuthenticated = useIsAuthenticated();

  const [connected, setConnected] = useState<Set<string>>(new Set());
  const [health, setHealth] = useState<Record<string, HealthState>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  // Category filter chip; null = All. Complements search (search wins).
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Quick-connect (paste any token → detect the service).
  const [quick, setQuick] = useState("");
  const detected = useMemo(() => detectService(quick), [quick]);

  // Add dialog. `values` holds one entry per collected secret (keyed by its
  // s/<name>); single-value connections have exactly one.
  const [active, setActive] = useState<ConnectionService | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [test, setTest] = useState<TestState>({ phase: "idle" });
  const fields = useMemo(() => (active ? connectionSecrets(active) : []), [active]);
  const allFilled = fields.length > 0 && fields.every((f) => (values[f.name] ?? "").trim());
  const setField = (name: string, v: string) => setValues((prev) => ({ ...prev, [name]: v }));

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

  // useCallback so the handlers passed to every ConnectionCard keep a stable
  // identity across ConnectionsList re-renders (search keystrokes, health
  // updates). Without this, React.memo on the card could never skip a render.
  const openAdd = useCallback((service: ConnectionService, prefill = "") => {
    setActive(service);
    // Empty per field; a quick-connect prefill seeds the primary secret.
    setValues(
      Object.fromEntries(
        connectionSecrets(service).map((f) => [f.name, f.name === service.secretName ? prefill : ""]),
      ),
    );
    setTest({ phase: "idle" });
  }, []);

  /** Run the service's verify call through the venue (secret already stored). */
  const runVerify = useCallback(
    async (service: ConnectionService): Promise<string> => {
      const call = venue && buildVerifyCall(service);
      if (!venue || !call) throw new Error("No verification available.");
      const out = await venue.operations.run(call.op, call.input);
      return interpretVerify(service, out);
    },
    [venue],
  );

  const connect = useCallback(async () => {
    if (!venue || !active || !allFilled) return;
    const svc = active;
    const svcFields = connectionSecrets(svc);
    setTest({ phase: "testing" });
    // A fresh save (including a Fix-triggered reconnect) supersedes whatever
    // an earlier health check said — clear it rather than show a stale
    // "Needs attention" next to a token that was just re-verified.
    setHealth((prev) => {
      const { [svc.secretName]: _drop, ...rest } = prev;
      return rest;
    });
    // Discard everything we stored if verification fails — never leave a
    // half-configured connection behind.
    const cleanup = () => Promise.all(svcFields.map((f) => venue.secrets.delete(f.name).catch(() => {})));
    try {
      await Promise.all(svcFields.map((f) => venue.secrets.set(f.name, values[f.name].trim())));
      if (svc.verify) {
        try {
          const message = await runVerify(svc);
          setConnected((prev) => new Set(prev).add(svc.secretName));
          setTest({ phase: "ok", message });
        } catch (verifyErr: any) {
          const msg = String(verifyErr?.message ?? "");
          // A url-mode connector on a venue that can't yet resolve an {s/NAME}
          // URL placeholder fails with "Bad URI syntax" carrying the literal
          // placeholder — a venue-capability gap, not a bad value. Keep it and
          // say so, rather than deleting and surfacing a raw 500.
          const placeholderGap =
            svc.auth === "url" &&
            (/bad uri/i.test(msg) || svcFields.some((f) => msg.includes(`{s/${f.name}}`)));
          if (placeholderGap) {
            setConnected((prev) => new Set(prev).add(svc.secretName));
            setTest({
              phase: "ok",
              message: `Saved. ${svc.name} verifies once your venue supports URL secrets (an upcoming release).`,
            });
          } else {
            await cleanup();
            setTest({ phase: "error", message: msg || "Could not verify the connection." });
          }
        }
      } else {
        // No generic verify (e.g. Jira's per-user host) — store and confirm.
        setConnected((prev) => new Set(prev).add(svc.secretName));
        setTest({ phase: "ok", message: "Saved. Validates on first use." });
      }
    } catch (err: unknown) {
      notifyError(`Unable to connect ${svc.name}`, err, venue?.baseUrl);
      setTest({ phase: "idle" });
    }
  }, [venue, active, allFilled, values, runVerify]);

  const finishOk = () => {
    if (active && test.phase === "ok") {
      notifySuccess(`${active.name} connected`, {
        description: `Load the ${active.id} skill on an agent to use it.`,
      });
    }
    setActive(null);
    setValues({});
    setTest({ phase: "idle" });
  };

  /** On-demand health check for an already-connected service (frontend#290). */
  const checkHealth = useCallback(
    async (service: ConnectionService) => {
      if (!venue) return;
      setHealth((prev) => ({ ...prev, [service.secretName]: { phase: "checking" } }));
      const checkedAt = new Date().toISOString();
      try {
        const message = await runVerify(service);
        setHealth((prev) => ({ ...prev, [service.secretName]: { phase: "ok", message, checkedAt } }));
      } catch (err: unknown) {
        setHealth((prev) => ({
          ...prev,
          [service.secretName]: {
            phase: "attention",
            message: err instanceof Error ? err.message : String(err),
            checkedAt,
          },
        }));
      }
    },
    [venue, runVerify],
  );

  const disconnect = useCallback(
    (service: ConnectionService) => {
      if (!venue) return;
      // Remove every value the connection stored, not just the primary.
      Promise.all(connectionSecrets(service).map((f) => venue.secrets.delete(f.name)))
        .then(() => {
          setConnected((prev) => {
            const next = new Set(prev);
            next.delete(service.secretName);
            return next;
          });
          setHealth((prev) => {
            const { [service.secretName]: _drop, ...rest } = prev;
            return rest;
          });
          notifySuccess(`${service.name} disconnected`);
        })
        .catch((err: unknown) =>
          notifyError(`Unable to disconnect ${service.name}`, err, venue?.baseUrl),
        );
    },
    [venue],
  );

  // Derivations memoised so a search keystroke or health update doesn't rescan
  // the catalogue on every render. All keyed on the state they actually read.
  const connectedServices = useMemo(
    () => CONNECTIONS.filter((s) => connected.has(s.secretName)),
    [connected],
  );
  const searching = query.trim().length > 0;
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return CONNECTIONS.filter(
      (s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q),
    );
  }, [query]);
  const catalogueByCategory = useMemo(
    () =>
      CONNECTION_CATEGORIES.map((cat) => ({
        category: cat,
        services: CONNECTIONS.filter((s) => s.category === cat && !connected.has(s.secretName)),
      })).filter((g) => g.services.length > 0),
    [connected],
  );
  // Category chip narrows both the connected-first row and the catalogue.
  const shownConnected = useMemo(
    () => (activeCategory ? connectedServices.filter((s) => s.category === activeCategory) : connectedServices),
    [connectedServices, activeCategory],
  );
  const shownCatalogue = useMemo(
    () => (activeCategory ? catalogueByCategory.filter((g) => g.category === activeCategory) : catalogueByCategory),
    [catalogueByCategory, activeCategory],
  );

  // Per-category available (not-yet-connected) counts for the filter chips, and
  // the KPI tiles that frame the whole set — consistent with the Operations and
  // Agents headers.
  const categoryCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of catalogueByCategory) m.set(g.category, g.services.length);
    return m;
  }, [catalogueByCategory]);
  const availableCount = useMemo(
    () => catalogueByCategory.reduce((n, g) => n + g.services.length, 0),
    [catalogueByCategory],
  );
  const needsAttention = useMemo(
    () => Object.values(health).filter((h) => h.phase === "attention").length,
    [health],
  );
  const statTiles = [
    { label: "Connected", value: connectedServices.length },
    { label: "Available", value: availableCount },
    { label: "Categories", value: CONNECTION_CATEGORIES.length },
    ...(needsAttention > 0 ? [{ label: "Needs attention", value: needsAttention }] : []),
  ];

  const chipCls = (on: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
      on
        ? "border-transparent bg-primary text-primary-foreground"
        : "bg-card text-muted-foreground hover:border-accent hover:text-foreground",
    );

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

  return (
    <div className="space-y-6">
      {/* KPI header — frames the whole set, consistent with Operations/Agents. */}
      <div
        data-testid="connections-stats"
        className={cn(
          "grid grid-cols-2 gap-3",
          statTiles.length === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3",
        )}
      >
        {statTiles.map((t) => (
          <div key={t.label} className="rounded-lg border bg-card px-4 py-3 shadow-sm">
            <div className="text-xs font-medium text-muted-foreground">{t.label}</div>
            <div className="mt-1 text-3xl font-semibold tabular-nums text-foreground">{t.value}</div>
          </div>
        ))}
      </div>

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

      {/* Category filter chips (hidden while searching — search is its own filter) */}
      {!searching && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setActiveCategory(null)} className={chipCls(activeCategory === null)}>
            All
            <span className={cn("font-mono text-[10px]", activeCategory === null ? "opacity-80" : "text-muted-foreground")}>
              {availableCount}
            </span>
          </button>
          {CONNECTION_CATEGORIES.map((cat) => {
            const on = activeCategory === cat;
            const count = categoryCounts.get(cat) ?? 0;
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={chipCls(on)}>
                {cat}
                <span className={cn("font-mono text-[10px]", on ? "opacity-80" : "text-muted-foreground")}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

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
              {filtered.map((s) => (
                <ConnectionCard
                  key={s.id}
                  service={s}
                  connected={connected.has(s.secretName)}
                  health={health[s.secretName]}
                  loading={loading}
                  onTest={checkHealth}
                  onOpenAdd={openAdd}
                  onDisconnect={disconnect}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          {/* Connected first */}
          {shownConnected.length > 0 && (
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Connected · {shownConnected.length}
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {shownConnected.map((s) => (
                  <ConnectionCard
                    key={s.id}
                    service={s}
                    connected={connected.has(s.secretName)}
                    health={health[s.secretName]}
                    loading={loading}
                    onTest={checkHealth}
                    onOpenAdd={openAdd}
                    onDisconnect={disconnect}
                  />
                ))}
              </div>
            </section>
          )}
          {/* Browse the rest */}
          {shownCatalogue.map(({ category, services }) => (
            <section key={category}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{category}</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((s) => (
                  <ConnectionCard
                    key={s.id}
                    service={s}
                    connected={connected.has(s.secretName)}
                    health={health[s.secretName]}
                    loading={loading}
                    onTest={checkHealth}
                    onOpenAdd={openAdd}
                    onDisconnect={disconnect}
                  />
                ))}
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

              {CONNECTION_CAPABILITIES[active.id] && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs font-semibold">Once connected, your agent can</p>
                  <ul className="mt-1.5 space-y-1">
                    {CONNECTION_CAPABILITIES[active.id].does.map((d, i) => (
                      <li key={i} className="flex gap-1.5 text-xs text-muted-foreground">
                        <Check size={13} className="mt-0.5 shrink-0 text-green-600 dark:text-green-400" />
                        {d}
                      </li>
                    ))}
                  </ul>
                  {CONNECTION_CAPABILITIES[active.id].examples[0] && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Try asking:{" "}
                      <span className="italic">
                        &ldquo;{CONNECTION_CAPABILITIES[active.id].examples[0]}&rdquo;
                      </span>
                    </p>
                  )}
                </div>
              )}

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
                <div className="space-y-3">
                  {fields.map((f, idx) => (
                    <div key={f.name}>
                      {fields.length > 1 && (
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">{f.label}</label>
                      )}
                      <Input
                        autoFocus={idx === 0}
                        type="password"
                        placeholder={f.placeholder ?? active.placeholder}
                        value={values[f.name] ?? ""}
                        onChange={(e) => { setField(f.name, e.target.value); if (test.phase !== "idle") setTest({ phase: "idle" }); }}
                        onKeyDown={(e) => { if (e.key === "Enter" && allFilled && test.phase !== "testing") connect(); }}
                        className="font-mono"
                        disabled={test.phase === "testing" || test.phase === "ok"}
                      />
                    </div>
                  ))}
                </div>
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
                    Stored encrypted as{" "}
                    {fields.map((f, i) => (
                      <span key={f.name}>
                        {i > 0 && ", "}
                        <code className="rounded bg-muted px-1 font-mono">{f.name}</code>
                      </span>
                    ))}
                    .{active.verify ? " We'll test it before saving." : " Stored on your venue only."}
                  </p>
                )}
              </div>

              <DialogFooter>
                {test.phase === "ok" ? (
                  <Button onClick={finishOk}>Done</Button>
                ) : (
                  <>
                    <Button variant="ghost" onClick={() => setActive(null)}>Cancel</Button>
                    <Button onClick={connect} disabled={!allFilled || test.phase === "testing"}>
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
