"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  revalidateVenueOnFailure,
  useAuthenticatedVenue,
} from "@/hooks/use-authenticated-venue";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
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

  const openAdd = (service: ConnectionService, prefill = "") => {
    setActive(service);
    // Empty per field; a quick-connect prefill seeds the primary secret.
    setValues(
      Object.fromEntries(
        connectionSecrets(service).map((f) => [f.name, f.name === service.secretName ? prefill : ""]),
      ),
    );
    setTest({ phase: "idle" });
  };

  /** Run the service's verify call through the venue (secret already stored). */
  const runVerify = async (service: ConnectionService): Promise<string> => {
    const call = venue && buildVerifyCall(service);
    if (!venue || !call) throw new Error("No verification available.");
    const out = await venue.operations.run(call.op, call.input);
    return interpretVerify(service, out);
  };

  const connect = async () => {
    if (!venue || !active || !allFilled) return;
    const svc = active;
    const svcFields = connectionSecrets(svc);
    setTest({ phase: "testing" });
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
  };

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

  const disconnect = (service: ConnectionService) => {
    if (!venue) return;
    // Remove every value the connection stored, not just the primary.
    Promise.all(connectionSecrets(service).map((f) => venue.secrets.delete(f.name)))
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
  // Category chip narrows both the connected-first row and the catalogue.
  const shownConnected = activeCategory
    ? connectedServices.filter((s) => s.category === activeCategory)
    : connectedServices;
  const shownCatalogue = activeCategory
    ? catalogueByCategory.filter((g) => g.category === activeCategory)
    : catalogueByCategory;

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
            {on && CONNECTION_CAPABILITIES[service.id]?.examples[0] && (
              <p className="mt-1 line-clamp-1 text-xs italic text-muted-foreground/80">
                Try: &ldquo;{CONNECTION_CAPABILITIES[service.id].examples[0]}&rdquo;
              </p>
            )}
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

      {/* Category filter chips (hidden while searching — search is its own filter) */}
      {!searching && (
        <div className="flex flex-wrap gap-2">
          {[null, ...CONNECTION_CATEGORIES].map((cat) => {
            const label = cat ?? "All";
            const on = activeCategory === cat;
            return (
              <button
                key={label}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  on
                    ? "border-primary bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {label}
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
              {filtered.map((s) => <Card key={s.id} service={s} />)}
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
                {shownConnected.map((s) => <Card key={s.id} service={s} />)}
              </div>
            </section>
          )}
          {/* Browse the rest */}
          {shownCatalogue.map(({ category, services }) => (
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
