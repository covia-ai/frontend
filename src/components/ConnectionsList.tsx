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
  type ConnectionService,
} from "@/config/connections";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Check, ExternalLink, Loader2, Lock, Plus, Trash2 } from "lucide-react";
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

/** Brand tile with the service's initials. */
function Logo({ service }: { service: ConnectionService }) {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
      style={{ backgroundColor: service.color }}
      aria-hidden
    >
      {service.initials}
    </span>
  );
}

export function ConnectionsList() {
  const venue = useAuthenticatedVenue();
  const isAuthenticated = useIsAuthenticated();

  // A service is "connected" iff its secret name is present in the store.
  const [connected, setConnected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [active, setActive] = useState<ConnectionService | null>(null);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

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

  const openAdd = (service: ConnectionService) => {
    setActive(service);
    setValue("");
  };

  const saveConnection = () => {
    if (!venue || !active) return;
    const token = value.trim();
    if (!token) return;
    setSaving(true);
    venue.secrets
      .set(active.secretName, token)
      .then(() => {
        setConnected((prev) => new Set(prev).add(active.secretName));
        notifySuccess(`${active.name} connected`, {
          description: `Stored as ${active.secretName}. Load the ${active.id} skill on an agent to use it.`,
        });
        setActive(null);
        setValue("");
      })
      .catch((err: unknown) =>
        notifyError(`Unable to connect ${active.name}`, err, venue?.baseUrl),
      )
      .finally(() => setSaving(false));
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

  const byCategory = useMemo(() => {
    return CONNECTION_CATEGORIES.map((cat) => ({
      category: cat,
      services: CONNECTIONS.filter((s) => s.category === cat),
    })).filter((g) => g.services.length > 0);
  }, []);

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
    <div className="space-y-7">
      {byCategory.map(({ category, services }) => (
        <section key={category}>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {category}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => {
              const isConnected = connected.has(service.secretName);
              return (
                <div
                  key={service.id}
                  className="flex flex-col rounded-xl border bg-card p-4"
                >
                  <div className="flex items-start gap-3">
                    <Logo service={service} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold">{service.name}</span>
                        <span className="font-mono text-[10px] uppercase text-muted-foreground">
                          {service.method}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {service.blurb}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    {loading ? (
                      <Loader2 className="animate-spin text-muted-foreground" size={16} />
                    ) : isConnected ? (
                      <Badge
                        variant="outline"
                        className="gap-1 border-green-600/30 bg-green-600/10 text-green-700 dark:text-green-400"
                      >
                        <Check size={12} /> Connected
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not connected</span>
                    )}

                    {isConnected ? (
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
                              This removes the stored secret <code className="rounded bg-muted px-1 font-mono text-xs">{service.secretName}</code>. Agents using the {service.id} skill will lose access until you reconnect.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => disconnect(service)}>
                              Disconnect
                            </AlertDialogAction>
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
            })}
          </div>
        </section>
      ))}

      {/* Guided add-connection dialog */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
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
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ol>

              <a
                href={active.tokenUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                Open {active.name} to create the token <ExternalLink size={13} />
              </a>

              <div className="mt-1">
                <Input
                  autoFocus
                  type="password"
                  placeholder={active.placeholder}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveConnection()}
                  className="font-mono"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Stored encrypted as{" "}
                  <code className="rounded bg-muted px-1 font-mono">{active.secretName}</code>. Only the reference is ever used — the token itself never appears in a request or job record.
                </p>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setActive(null)}>
                  Cancel
                </Button>
                <Button onClick={saveConnection} disabled={!value.trim() || saving}>
                  {saving && <Loader2 className="animate-spin" size={14} />}
                  Connect {active.name}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
