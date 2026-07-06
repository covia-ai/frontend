"use client";

import { useEffect, useState } from "react";
import { Venue, Job, JobMetadata, isJobFinished, RunStatus } from "@covia/covia-sdk";
import { Network, Copy, Send, RotateCcw } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { ErrorDisplay } from "./ErrorDisplay";
import { copyDataToClipBoard } from "@/lib/utils";
import { useAuthStore } from "@/hooks/use-auth";
import { toast } from "sonner";
import Link from "next/link";

interface AgentCard {
  name?: string;
  description?: string;
  provider?: { organization?: string; url?: string };
  capabilities?: { streaming?: boolean; pushNotifications?: boolean; stateTransitionHistory?: boolean };
}

interface A2ACardProps {
  venue: Venue;
}

export default function A2ACard({ venue }: A2ACardProps) {
  const [agentCard, setAgentCard] = useState<AgentCard | null>(null);
  const [messageText, setMessageText] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState("");
  const [taskResult, setTaskResult] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const getAuthForVenue = useAuthStore((x) => x.getAuthForVenue);

  const agentCardUrl = `${venue.baseUrl}/.well-known/agent-card.json`;

  // Fetch the agent card discovery document
  useEffect(() => {
    if (!venue) return;
    fetch(agentCardUrl)
      .then((r) => r.json())
      .then((body) => setAgentCard(body?.error ? null : body))
      .catch(() => setAgentCard(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue]);

  // SSE (with polling fallback) for the mirrored Covia job behind an a2a/send call
  useEffect(() => {
    if (!venue || !jobId) return;

    const applyMetadata = (meta: JobMetadata) => {
      const status = meta.status ?? "";
      setTaskStatus(status);
      if (isJobFinished(status)) {
        setTaskResult(status === RunStatus.FAILED ? meta.error : meta.output);
        setSending(false);
        setStreaming(false);
      }
    };

    const authData = getAuthForVenue(venue.venueId);
    let sseUrl = `${venue.baseUrl}/api/v1/jobs/${jobId}/sse`;
    if (authData?.type === "bearer") {
      sseUrl += `?token=${encodeURIComponent(authData.token)}`;
    }

    let source: EventSource | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let sseOpened = false;

    const startPolling = () => {
      setStreaming(false);
      pollInterval = setInterval(() => {
        venue.jobs
          .get(jobId)
          .then((job: Job) => {
            applyMetadata(job.metadata);
            if (isJobFinished(job.metadata.status ?? "") && pollInterval) {
              clearInterval(pollInterval);
              pollInterval = null;
            }
          })
          .catch(() => setTaskStatus("ERROR"));
      }, 1000);
    };

    try {
      source = new EventSource(sseUrl);

      source.onopen = () => {
        sseOpened = true;
        setStreaming(true);
      };

      source.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          applyMetadata(data.metadata ?? data);
          if (isJobFinished((data.metadata ?? data).status ?? "")) {
            source?.close();
            source = null;
          }
        } catch {
          /* ignore malformed event */
        }
      };

      source.onerror = () => {
        source?.close();
        source = null;
        setStreaming(false);
        if (!sseOpened) startPolling();
      };
    } catch {
      startPolling();
    }

    return () => {
      source?.close();
      setStreaming(false);
      if (pollInterval) clearInterval(pollInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue, jobId]);

  const handleSend = async () => {
    if (!venue || !messageText.trim()) return;
    setSending(true);
    setJobId(null);
    setTaskResult(null);
    setTaskStatus("");
    try {
      const job = await venue.operations.invoke("v/ops/a2a/send", {
        url: venue.baseUrl,
        message: { role: "user", parts: [{ type: "text", text: messageText.trim() }] },
      });
      setTaskStatus(job.metadata.status ?? "");
      setJobId(job.id);
    } catch (e: any) {
      toast(`A2A send failed: ${e?.message ?? "see console"}`);
      setSending(false);
    }
  };

  const handleReset = () => {
    setJobId(null);
    setTaskResult(null);
    setTaskStatus("");
    setMessageText("");
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-primary-vlight p-2 rounded-lg">
          <Network size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-medium">A2A Protocol</h2>
          <p className="text-sm text-muted-foreground">
            {agentCard?.description || "Agent-to-Agent protocol endpoint"}
          </p>
        </div>
      </div>

      {agentCard && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {agentCard.name && <Badge variant="outline">{agentCard.name}</Badge>}
          {agentCard.provider?.organization && (
            <Badge variant="outline">
              {agentCard.provider.url ? (
                <Link href={agentCard.provider.url} target="_blank" className="hover:underline">
                  {agentCard.provider.organization}
                </Link>
              ) : (
                agentCard.provider.organization
              )}
            </Badge>
          )}
          {agentCard.capabilities?.streaming && <Badge variant="outline">Streaming</Badge>}
          {agentCard.capabilities?.pushNotifications && <Badge variant="outline">Push</Badge>}
          {agentCard.capabilities?.stateTransitionHistory && <Badge variant="outline">State History</Badge>}
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <Button
          className="flex items-center gap-2"
          onClick={() => copyDataToClipBoard(agentCardUrl, "Agent Card URL copied")}
          variant="default"
        >
          <Copy size={14} /> Copy Agent Card URL
        </Button>
      </div>

      <p className="text-xs text-muted-foreground italic mb-4">
        This venue accepts A2A messages from any compatible AI agent.
      </p>

      {/* Send A2A Message panel */}
      <div className="border-t border-border pt-4">
        <h3 className="text-sm font-medium mb-2">Send A2A Message</h3>
        <div className="flex gap-2">
          <Input
            placeholder="Type a message to send to this venue's A2A endpoint..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            disabled={sending}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !sending) handleSend();
            }}
          />
          <Button onClick={handleSend} disabled={sending || !messageText.trim()}>
            <Send size={14} className="mr-1" />
            {sending ? "Sending..." : "Send"}
          </Button>
        </div>

        {jobId && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-muted-foreground">Status:</span>
              <span className="text-sm font-medium">{taskStatus}</span>
              {streaming && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Streaming
                </span>
              )}
              {!streaming && isJobFinished(taskStatus) && (
                <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                  Completed
                </span>
              )}
              <button
                type="button"
                onClick={handleReset}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <RotateCcw size={12} /> Reset
              </button>
            </div>

            {isJobFinished(taskStatus) && (
              taskStatus === RunStatus.FAILED ? (
                <ErrorDisplay error={typeof taskResult === "string" ? taskResult : JSON.stringify(taskResult)} />
              ) : (
                <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">
                  {JSON.stringify(taskResult, null, 2)}
                </pre>
              )
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
