"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowDownToLine,
  Bot,
  Cable,
  CopyPlus,
  Loader2,
  Lock,
  LogOut,
  Plus,
  Users,
} from "lucide-react";

import { AddNewAgent } from "@/components/AddNewAgent";
import { PortAgentDialog } from "@/components/PortAgentDialog";
import { ConnectAgentDialog } from "@/components/ConnectAgentDialog";
import { AgentTemplates } from "@/components/AgentTemplates";
import { PageHeading } from "@/components/PageHeading";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AgentListItem } from "@/config/types";
import { useAuthStore, useCurrentAuth, useIsAuthenticated } from "@/hooks/use-auth";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import {
  reportVenueAuthHealth,
  useVenueAccessState,
} from "@/hooks/use-venue-auth-health";
import {
  cloneSeedFromAgent,
  type AgentCreationSeed,
} from "@/lib/agent-config";
import { normalizeAgentEntries } from "@/lib/agent-list";
import {
  errorMessage,
  errorStatus,
  isAuthenticationRejectedError,
} from "@/lib/errors";
import { notifyError } from "@/lib/notify";

export function AgentCreate() {
  const router = useRouter();
  const venue = useAuthenticatedVenue();
  const auth = useCurrentAuth();
  const isAuthenticated = useIsAuthenticated();
  const logout = useAuthStore((state) => state.logout);
  const access = useVenueAccessState(venue?.venueId);
  const canUseAgents = access.state === "accepted" || access.state === "unverified";
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [sourceAgentId, setSourceAgentId] = useState("");
  const [cloneLoading, setCloneLoading] = useState(false);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [cloneSeed, setCloneSeed] = useState<AgentCreationSeed | null>(null);

  const handleAgentError = useCallback((title: string, error: unknown) => {
    if (!venue) return;
    if (auth && isAuthenticationRejectedError(error)) {
      reportVenueAuthHealth(venue.venueId, auth, {
        state: "rejected",
        detail: errorMessage(error, "This venue rejected the stored account"),
        status: errorStatus(error),
      });
      return;
    }
    notifyError(title, error, venue.baseUrl);
  }, [auth, venue]);

  useEffect(() => {
    let active = true;
    if (!venue || !canUseAgents) {
      setAgents([]);
      setAgentsLoading(false);
      return () => {
        active = false;
      };
    }

    setAgentsLoading(true);
    void venue.agents
      .list()
      .then(({ agents: entries }) => {
        if (!active) return;
        if (auth) reportVenueAuthHealth(venue.venueId, auth, { state: "accepted" });
        setAgents(normalizeAgentEntries(entries));
      })
      .catch((error: unknown) => {
        if (active) {
          setAgents([]);
          handleAgentError("Unable to load agents", error);
        }
      })
      .finally(() => {
        if (active) setAgentsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [auth, canUseAgents, handleAgentError, venue]);

  const prepareClone = async () => {
    if (!venue || !sourceAgentId) return;
    setCloneLoading(true);
    try {
      const source = await venue.agents.info(sourceAgentId);
      setCloneSeed(cloneSeedFromAgent(source));
      setCloneDialogOpen(true);
    } catch (error) {
      handleAgentError("Unable to load agent configuration", error);
    } finally {
      setCloneLoading(false);
    }
  };

  if (access.state === "checking") {
    return (
      <ContentLayout>
        <TopBar />
        <div className="flex min-h-80 items-center justify-center gap-2 text-muted-foreground" role="status">
          <Loader2 className="animate-spin text-primary" size={24} />
          Checking venue account…
        </div>
      </ContentLayout>
    );
  }

  if (access.state === "rejected") {
    return (
      <ContentLayout>
        <TopBar />
        <div
          className="mx-auto mt-16 flex max-w-2xl flex-col items-center gap-4 rounded-lg border border-destructive/40 bg-destructive/5 p-8 text-center"
          data-testid="agent-auth-rejected"
        >
          <AlertTriangle className="text-destructive" size={40} />
          <div>
            <h2 className="text-lg font-semibold">This venue rejected the stored account</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign out and choose an admitted account, or ask the venue administrator to provision this identity.
            </p>
            <p className="mt-2 break-words font-mono text-xs text-muted-foreground">
              {access.detail}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" onClick={() => venue && logout(venue.venueId)}>
              <LogOut size={14} /> Sign out
            </Button>
            <Button onClick={() => router.push("/profile")}>
              <Users size={14} /> Manage accounts
            </Button>
          </div>
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout>
      <TopBar />
      <div className="mx-auto w-full max-w-6xl pb-14">
        <div className="px-4 pt-6 text-center sm:px-10">
          <PageHeading text="Create an" highlight="agent" />
        </div>

        <AgentTemplates />

        <section className="px-4 pb-8 pt-2 sm:px-10">
          <h2 className="mb-4 text-lg font-semibold">Other options</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="flex flex-col gap-4 p-6">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ArrowDownToLine size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Port an agent</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Bring an existing agent&apos;s prompt and SKILL.md skills in as a native agent.
                </p>
              </div>
              <div className="mt-auto pt-2">
                {isAuthenticated ? (
                  <PortAgentDialog
                    trigger={
                      <Button variant="outline" data-testid="port-agent-trigger">
                        Port an agent
                      </Button>
                    }
                  />
                ) : (
                  <Button disabled className="gap-2">
                    <Lock size={14} /> Sign in to port
                  </Button>
                )}
              </div>
            </Card>

            <Card className="flex flex-col gap-4 p-6">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Cable size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Connect an agent</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Register a remote A2A agent and task it from here. It keeps running where it lives.
                </p>
              </div>
              <div className="mt-auto pt-2">
                {isAuthenticated ? (
                  <ConnectAgentDialog
                    trigger={
                      <Button variant="outline" data-testid="connect-agent-trigger">
                        Connect an agent
                      </Button>
                    }
                  />
                ) : (
                  <Button disabled className="gap-2">
                    <Lock size={14} /> Sign in to connect
                  </Button>
                )}
              </div>
            </Card>

            <Card className="flex flex-col gap-4 p-6">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Plus size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Create a custom agent</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Set the model, instructions, and first task.
                </p>
              </div>
              <div className="mt-auto pt-2">
                {isAuthenticated ? (
                  <AddNewAgent
                    trigger={<Button data-testid="custom-agent-trigger">Create custom agent</Button>}
                  />
                ) : (
                  <Button disabled className="gap-2">
                    <Lock size={14} /> Sign in to create
                  </Button>
                )}
              </div>
            </Card>

            <Card className="flex flex-col gap-4 p-6">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CopyPlus size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Clone an existing agent</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Copy an agent&apos;s configuration. History and runtime state are not copied.
                </p>
              </div>

              {isAuthenticated ? (
                <div className="mt-auto flex flex-col gap-3 pt-2 sm:flex-row">
                  <Select value={sourceAgentId} onValueChange={setSourceAgentId}>
                    <SelectTrigger data-testid="clone-agent-select" className="min-w-0 flex-1">
                      <SelectValue placeholder={agentsLoading ? "Loading agents…" : "Choose an agent"} />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.agentId} value={agent.agentId}>
                          {agent.agentId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    data-testid="clone-agent-trigger"
                    variant="outline"
                    className="gap-2"
                    disabled={!sourceAgentId || cloneLoading || agentsLoading}
                    onClick={prepareClone}
                  >
                    {cloneLoading ? <Loader2 size={14} className="animate-spin" /> : <CopyPlus size={14} />}
                    Clone
                  </Button>
                </div>
              ) : (
                <Button disabled className="mt-auto w-fit gap-2">
                  <Lock size={14} /> Sign in to clone
                </Button>
              )}

              {!agentsLoading && isAuthenticated && agents.length === 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Bot size={15} /> No existing agents to clone.
                </div>
              )}
            </Card>
          </div>
        </section>
      </div>

      {cloneSeed && (
        <AddNewAgent
          trigger={null}
          open={cloneDialogOpen}
          onOpenChange={setCloneDialogOpen}
          dialogTitle={`Clone ${sourceAgentId}`}
          submitLabel="Create clone"
          preferAvailableProvider={false}
          {...cloneSeed}
        />
      )}
    </ContentLayout>
  );
}
