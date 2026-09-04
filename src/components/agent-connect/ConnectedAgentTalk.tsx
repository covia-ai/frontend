"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Cable, KeyRound, Loader2, MessagesSquare, SendHorizontal } from "lucide-react";
import type { Job } from "@covia/covia-sdk";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { jobFailure, notifyError, notifyWarning } from "@/lib/notify";
import { A2A_SEND_OP, A2ATask, jobStatusLabel, taskReplyText } from "@/lib/a2a";

type MessageTone = "normal" | "input" | "auth" | "error";

interface TalkMessage {
  role: "user" | "agent";
  text: string;
  tone?: MessageTone;
}

interface ConnectedAgentTalkProps {
  /** The local alias registered at `w/a2a/agents/<name>`. */
  agentName?: string;
}

/**
 * Task a connected (BYOA) A2A agent. Each turn `invoke`s `a2a:send` and mirrors
 * the resulting Job's lifecycle live over SSE: a status pill tracks
 * PENDING→STARTED→terminal, and the local Job's paused states surface the
 * remote A2A Task's interrupts — INPUT_REQUIRED (your next message is delivered
 * to the same job to continue the remote Task) and AUTH_REQUIRED (reconnect the
 * agent with a stored secret). A returned `taskId` threads later turns onto the
 * same remote conversation.
 */
export function ConnectedAgentTalk({ agentName }: ConnectedAgentTalkProps) {
  const router = useRouter();
  const venue = useAuthenticatedVenue();

  const [messages, setMessages] = useState<TalkMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const taskId = useRef<string | undefined>(undefined);
  // A job left in INPUT_REQUIRED: the next user message is delivered to it.
  const pendingInputJob = useRef<Job | null>(null);

  const agentPath = agentName ? `w/a2a/agents/${agentName}` : "";
  const add = (m: TalkMessage) => setMessages((prev) => [...prev, m]);

  /**
   * Drive a Job to a settled state — terminal or a paused interrupt — mirroring
   * its status over SSE, with a polling fallback. Streaming closes only on a
   * terminal state, so we also break out when the job pauses (INPUT/AUTH).
   */
  const settleJob = async (job: Job) => {
    const settled = () => job.isFinished || job.isPaused;
    try {
      for await (const _ev of job.stream()) {
        void _ev;
        await job.refresh().catch(() => {});
        setLiveStatus(job.metadata.status ?? null);
        if (settled()) break;
      }
    } catch {
      // SSE unavailable — poll to a settled state.
      for (let i = 0; i < 120 && !settled(); i++) {
        await new Promise((r) => setTimeout(r, 1000));
        await job.refresh().catch(() => {});
        setLiveStatus(job.metadata.status ?? null);
      }
    }
    await job.refresh().catch(() => {});
    handleSettled(job);
  };

  const handleSettled = (job: Job) => {
    const status = (job.metadata.status ?? "").toUpperCase();
    const task = job.metadata.output as A2ATask | undefined;
    if (typeof task?.id === "string") taskId.current = task.id;

    if (job.needsInput) {
      pendingInputJob.current = job;
      add({
        role: "agent",
        tone: "input",
        text: taskReplyText(task) || "The agent needs more information to continue. Reply to continue.",
      });
      return;
    }
    if (job.needsAuth) {
      pendingInputJob.current = null;
      add({
        role: "agent",
        tone: "auth",
        text:
          "This agent requires authentication to continue. Reconnect it with a stored secret (Connected → Connect an agent → This agent needs authentication).",
      });
      return;
    }
    pendingInputJob.current = null;
    if (status === "COMPLETE") {
      add({ role: "agent", text: taskReplyText(task) || "(the agent returned no text)" });
    } else {
      const reason = job.metadata.error ? `: ${job.metadata.error}` : "";
      add({ role: "agent", tone: "error", text: `Task ${status || "did not complete"}${reason}` });
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    if (!venue) {
      notifyWarning("Please connect to a venue first");
      return;
    }
    if (!agentName) {
      notifyWarning("No connected agent selected");
      return;
    }

    add({ role: "user", text });
    setInput("");
    setSending(true);
    setLiveStatus("PENDING");
    const message = { role: "user", parts: [{ type: "text", text }] };
    try {
      let job: Job;
      if (pendingInputJob.current) {
        // Continue the interrupted remote Task by delivering to the same job.
        const paused = pendingInputJob.current;
        pendingInputJob.current = null;
        await paused.sendMessage(message);
        job = paused;
      } else {
        job = await venue.operations.invoke(A2A_SEND_OP, {
          agent: agentPath,
          message,
          ...(taskId.current && { taskId: taskId.current }),
        });
      }
      await settleJob(job);
    } catch (err) {
      const { reason, jobHref } = jobFailure(err, venue.venueId);
      notifyError("Unable to reach agent", reason, venue.baseUrl, jobHref);
      add({ role: "agent", tone: "error", text: `Could not reach the agent: ${reason}` });
    } finally {
      setSending(false);
      setLiveStatus(null);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const bubbleClass = (m: TalkMessage) => {
    if (m.role === "user") {
      return "max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-primary-foreground";
    }
    const base = "max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-bl-sm px-4 py-2 text-sm";
    if (m.tone === "input") return `${base} border border-amber-500/40 bg-amber-500/10`;
    if (m.tone === "auth") return `${base} border border-amber-500/40 bg-amber-500/10`;
    if (m.tone === "error") return `${base} border border-destructive/40 bg-destructive/10`;
    return `${base} border bg-background`;
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] w-full max-w-3xl flex-col px-4 py-6">
      <div className="mb-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/agents/connected")}
          aria-label="Back to connected agents"
        >
          <ArrowLeft size={18} />
        </Button>
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Cable size={18} />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">{agentName || "Connected agent"}</h1>
          {agentPath && <p className="truncate font-mono text-xs text-muted-foreground">{agentPath}</p>}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto rounded-lg border bg-card/40 p-4" data-testid="connect-talk-log">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <MessagesSquare size={28} className="text-primary/60" />
            <p>Send a task to {agentName || "this agent"} over A2A.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={bubbleClass(m)}>
              {m.tone === "input" && (
                <span className="mb-1 flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                  <MessagesSquare size={12} /> Needs your input
                </span>
              )}
              {m.tone === "auth" && (
                <span className="mb-1 flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                  <KeyRound size={12} /> Authentication required
                </span>
              )}
              {m.text}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border bg-background px-4 py-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" /> {jobStatusLabel(liveStatus ?? undefined)}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-end gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            pendingInputJob.current
              ? "The agent is waiting for your reply…"
              : agentName
                ? `Send a task to ${agentName}…`
                : "No connected agent selected"
          }
          className="h-20 resize-none"
          disabled={sending || !agentName}
          data-testid="connect-talk-input"
        />
        <Button
          onClick={send}
          disabled={sending || !input.trim() || !agentName}
          className="h-20 gap-2"
          data-testid="connect-talk-send"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <SendHorizontal size={16} />}
        </Button>
      </div>
    </div>
  );
}
