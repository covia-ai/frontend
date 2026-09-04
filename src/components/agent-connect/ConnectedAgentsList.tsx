"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Cable, Loader2, Lock, MessageSquareText, Plug, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConnectAgentDialog } from "@/components/ConnectAgentDialog";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { notifyError, notifySuccess } from "@/lib/notify";
import {
  A2A_AGENTS_DIR,
  ConnectedAgent,
  connectedAgentFromBinding,
} from "@/lib/a2a";

/**
 * The connected (BYOA) agents on this venue: every `w/a2a/agents/<name>`
 * binding, read job-free, with a link to task each one and a disconnect that
 * removes its binding (the immutable agent asset is left intact). The hub for
 * the Connect flow — its "Connect an agent" button opens the same dialog.
 */
export function ConnectedAgentsList() {
  const venue = useAuthenticatedVenue();
  const isAuthenticated = useIsAuthenticated();

  const [agents, setAgents] = useState<ConnectedAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!venue) return;
    setLoading(true);
    try {
      const listing = await venue.workspace.list(A2A_AGENTS_DIR);
      const names = listing.exists ? listing.keys ?? [] : [];
      const entries = await Promise.all(
        names.map(async (name) => {
          try {
            const rec = await venue.workspace.read(`${A2A_AGENTS_DIR}/${name}`);
            return connectedAgentFromBinding(name, rec.value);
          } catch {
            return connectedAgentFromBinding(name, undefined);
          }
        }),
      );
      setAgents(entries.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      setAgents([]);
      notifyError("Unable to load connected agents", error, venue.baseUrl);
    } finally {
      setLoading(false);
    }
  }, [venue]);

  useEffect(() => {
    if (!venue || !isAuthenticated) {
      setAgents([]);
      setLoading(false);
      return;
    }
    void load();
  }, [venue, isAuthenticated, load]);

  const disconnect = async (name: string) => {
    if (!venue) return;
    setRemoving(name);
    try {
      await venue.workspace.delete(`${A2A_AGENTS_DIR}/${name}`);
      notifySuccess(`Disconnected ${name}`);
      setAgents((prev) => prev.filter((a) => a.name !== name));
    } catch (error) {
      notifyError("Unable to disconnect agent", error, venue.baseUrl);
    } finally {
      setRemoving(null);
    }
  };

  const heading = (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Cable size={22} className="text-primary" /> Connected agents
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Remote A2A agents registered on this venue. They run where they live; task them from here.
        </p>
      </div>
      {isAuthenticated && (
        <ConnectAgentDialog
          trigger={
            <Button className="gap-2" data-testid="connected-list-connect">
              <Plug size={15} /> Connect an agent
            </Button>
          }
        />
      )}
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-6">
        {heading}
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <Lock className="text-muted-foreground" size={28} />
          <p className="text-sm text-muted-foreground">Sign in to connect and task remote agents.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      {heading}

      {loading ? (
        <div className="flex min-h-40 items-center justify-center gap-2 text-muted-foreground" role="status">
          <Loader2 className="animate-spin text-primary" size={22} /> Loading connected agents…
        </div>
      ) : agents.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center" data-testid="connected-list-empty">
          <Cable className="text-primary/60" size={30} />
          <div>
            <p className="font-medium">No connected agents yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Connect a remote A2A agent to task it from this venue.
            </p>
          </div>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2" data-testid="connected-list">
          {agents.map((agent) => (
            <li key={agent.name}>
              <Card className="flex h-full flex-col gap-3 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Cable size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{agent.cardName || agent.name}</div>
                    <div className="truncate font-mono text-xs text-muted-foreground">
                      w/a2a/agents/{agent.name}
                    </div>
                  </div>
                </div>
                {agent.description && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">{agent.description}</p>
                )}
                {(agent.url || agent.coviaAgent) && (
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {agent.url || agent.coviaAgent}
                  </p>
                )}
                <div className="mt-auto flex gap-2 pt-1">
                  <Button asChild variant="outline" size="sm" className="gap-2">
                    <Link href={`/agents/connected?agent=${encodeURIComponent(agent.name)}`}>
                      <MessageSquareText size={14} /> Talk
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-muted-foreground hover:text-destructive"
                    disabled={removing === agent.name}
                    onClick={() => disconnect(agent.name)}
                    data-testid={`connected-disconnect-${agent.name}`}
                  >
                    {removing === agent.name ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Unplug size={14} />
                    )}
                    Disconnect
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
