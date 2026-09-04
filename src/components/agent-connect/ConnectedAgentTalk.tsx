"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Cable, Loader2, SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { jobFailure, notifyError, notifyWarning } from "@/lib/notify";
import { A2A_SEND_OP, A2ATask, isTaskComplete, taskReplyText } from "@/lib/a2a";

interface TalkMessage {
  role: "user" | "agent";
  text: string;
  incomplete?: boolean;
}

interface ConnectedAgentTalkProps {
  /** The local alias registered at `w/a2a/agents/<name>`. */
  agentName?: string;
}

/**
 * Task a connected (BYOA) A2A agent from the dashboard: each send invokes
 * `a2a:send` against `w/a2a/agents/<name>`, and the reply text is pulled from
 * the returned A2A Task. A returned `taskId` threads the next turn onto the same
 * remote conversation. This is the P1 request/response surface; live SSE
 * mirroring of the remote Task lifecycle comes next.
 */
export function ConnectedAgentTalk({ agentName }: ConnectedAgentTalkProps) {
  const router = useRouter();
  const venue = useAuthenticatedVenue();

  const [messages, setMessages] = useState<TalkMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const taskId = useRef<string | undefined>(undefined);

  const agentPath = agentName ? `w/a2a/agents/${agentName}` : "";

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

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setSending(true);
    try {
      const task = await venue.operations.run<A2ATask>(A2A_SEND_OP, {
        agent: agentPath,
        message: { role: "user", parts: [{ type: "text", text }] },
        ...(taskId.current && { taskId: taskId.current }),
      });
      if (typeof task?.id === "string") taskId.current = task.id;
      const reply = taskReplyText(task) || "(the agent returned no text)";
      const incomplete = !isTaskComplete(task?.status?.state);
      setMessages((prev) => [...prev, { role: "agent", text: reply, incomplete }]);
    } catch (err) {
      const { reason, jobHref } = jobFailure(err, venue.venueId);
      notifyError("Unable to reach agent", reason, venue.baseUrl, jobHref);
      setMessages((prev) => [
        ...prev,
        { role: "agent", text: `Could not reach the agent: ${reason}`, incomplete: true },
      ]);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] w-full max-w-3xl flex-col px-4 py-6">
      <div className="mb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/agents/create")} aria-label="Back">
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
            <Cable size={28} className="text-primary/60" />
            <p>Send a task to {agentName || "this agent"} over A2A.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-primary-foreground"
                  : "max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-bl-sm border bg-background px-4 py-2 text-sm"
              }
            >
              {m.text}
              {m.incomplete && (
                <span className="mt-1 block text-xs italic text-muted-foreground">
                  interrupted or not yet complete
                </span>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border bg-background px-4 py-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" /> Waiting for the agent…
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-end gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={agentName ? `Send a task to ${agentName}…` : "No connected agent selected"}
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
