"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Cable, KeyRound, Loader2, MessagesSquare, SendHorizontal } from "lucide-react";
import type { Job } from "@covia/covia-sdk";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { jobFailure, notifyError, notifyWarning } from "@/lib/notify";
import { TONE_STYLES } from "@/lib/status";
import {
  A2ATask,
  jobStatusLabel,
  POLL_INTERVAL_MS,
  RESUME_TIMEOUT_MS,
  SETTLE_TIMEOUT_MS,
  taskReplyText,
  taskStatusText,
} from "@/lib/a2a";

type MessageTone = "normal" | "input" | "auth" | "error";

interface TalkMessage {
  role: "user" | "agent";
  text: string;
  tone?: MessageTone;
}

/** What to do about an AUTH_REQUIRED interrupt, appended to the agent's own message. */
const AUTH_HINT =
  "This agent requires authentication to continue. Reconnect it with a stored secret (Connected → Connect an agent → This agent needs authentication).";

/** Identity of the remote Task snapshot a Job is currently sitting on. */
const taskFingerprint = (job: Job): string =>
  `${job.metadata.status ?? ""}|${JSON.stringify(job.metadata.output ?? null)}`;

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
   *
   * `resumedFrom` is the snapshot a continuation resumed from. A continued Job
   * is *already* paused when we get here, so settling on `isPaused` alone would
   * re-report the interrupt the user just answered: a pause only settles once
   * the snapshot has actually moved. The stream is re-subscribed rather than
   * read once, because the venue closes it as soon as the Job is settled on its
   * side — which, mid-continuation, it still is.
   */
  const settleJob = async (job: Job, resumedFrom?: string) => {
    const moved = () => resumedFrom === undefined || taskFingerprint(job) !== resumedFrom;
    const settled = () => (job.isFinished || job.isPaused) && moved();
    const deadline =
      Date.now() + (resumedFrom === undefined ? SETTLE_TIMEOUT_MS : RESUME_TIMEOUT_MS);

    const sync = async () => {
      await job.refresh().catch(() => {});
      // Until a continuation advances, the Job still reports the interrupt we
      // resumed from; echoing "waiting for your input" back at someone who has
      // just answered reads as a stall, so keep the pill on "Working…".
      setLiveStatus(moved() ? (job.metadata.status ?? null) : "STARTED");
    };

    while (!settled() && Date.now() < deadline) {
      try {
        for await (const _ev of job.stream()) {
          void _ev;
          await sync();
          if (settled()) break;
        }
      } catch {
        // SSE unavailable — the poll below carries the turn instead.
      }
      if (settled()) break;
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      await sync();
    }
    await job.refresh().catch(() => {});
    handleSettled(job, moved());
  };

  const handleSettled = (job: Job, advanced: boolean) => {
    const status = (job.metadata.status ?? "").toUpperCase();
    const task = job.metadata.output as A2ATask | undefined;
    if (typeof task?.id === "string") taskId.current = task.id;

    if (!advanced) {
      // The reply was accepted locally but the remote Task never moved. Say so,
      // rather than re-rendering the prompt the user has already answered.
      pendingInputJob.current = job;
      add({
        role: "agent",
        tone: "error",
        text: "Your reply was accepted, but the agent hasn't responded — the task is still waiting for input. Try sending it again.",
      });
      return;
    }

    if (job.needsInput) {
      pendingInputJob.current = job;
      add({
        role: "agent",
        tone: "input",
        // The question lives on the Task status; artifacts may only hold partial work.
        text:
          taskStatusText(task) ||
          taskReplyText(task) ||
          "The agent needs more information to continue. Reply to continue.",
      });
      return;
    }
    if (job.needsAuth) {
      pendingInputJob.current = null;
      const detail = taskStatusText(task);
      add({
        role: "agent",
        tone: "auth",
        text: detail ? `${detail}\n\n${AUTH_HINT}` : AUTH_HINT,
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
      let resumedFrom: string | undefined;
      if (pendingInputJob.current) {
        // Continue the interrupted remote Task by delivering to the same job.
        const paused = pendingInputJob.current;
        pendingInputJob.current = null;
        resumedFrom = taskFingerprint(paused);
        await paused.sendMessage(message);
        job = paused;
      } else {
        job = await venue.a2a.send(agentPath, message, {
          ...(taskId.current && { taskId: taskId.current }),
        });
      }
      await settleJob(job, resumedFrom);
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
    if (m.tone === "input") return `${base} border ${TONE_STYLES.attention.tint}`;
    if (m.tone === "auth") return `${base} border ${TONE_STYLES.attention.tint}`;
    if (m.tone === "error") return `${base} border ${TONE_STYLES.failure.tint}`;
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
                <span className={`mb-1 flex items-center gap-1 text-xs font-medium ${TONE_STYLES.attention.text}`}>
                  <MessagesSquare size={12} /> Needs your input
                </span>
              )}
              {m.tone === "auth" && (
                <span className={`mb-1 flex items-center gap-1 text-xs font-medium ${TONE_STYLES.attention.text}`}>
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
