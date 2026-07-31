"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { type Job } from "@covia/covia-sdk";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { resolveOperationByAddress } from "@/lib/operations-catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import { ArrowRight, Check, CircleAlert, ExternalLink, PlayCircle } from "lucide-react";

// The demo invokes the venue's bootstrap test operation v/test/ops/delay,
// which waits `delay` ms and then runs another operation — here
// v/test/ops/echo, which returns its input unchanged. The indirection is the
// point: echo alone completes faster than a single poll, while the delay
// keeps the job observably RUNNING so the lifecycle can be watched happening.
const DELAY_OP = "v/test/ops/delay";
const ECHO_OP = "v/test/ops/echo";
const POLL_MS = 400;

const STAGES = ["resolve", "invoke", "watch", "result"] as const;
type Stage = (typeof STAGES)[number];
type StepState = "idle" | "active" | "done" | "error";

type TimelineEntry = { status: string; atMs: number };

export function JobLifecycleDemo() {
  const venue = useAuthenticatedVenue();
  const isAuthenticated = useIsAuthenticated();

  const [message, setMessage] = useState("Hello, Covia!");
  const [delayMs, setDelayMs] = useState(2000);

  const [stage, setStage] = useState<Stage | "idle" | "done" | "failed">("idle");
  const [failedStage, setFailedStage] = useState<Stage | null>(null);
  const [error, setError] = useState("");
  const [opName, setOpName] = useState("");
  const [jobId, setJobId] = useState("");
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [output, setOutput] = useState<unknown>(undefined);

  // Bumped on every run and on unmount so a stale async loop can tell it no
  // longer owns the component state — same idiom as use-execution-lifecycle.
  const runGeneration = useRef(0);
  useEffect(() => () => void ++runGeneration.current, []);

  const running = STAGES.includes(stage as Stage);

  async function run() {
    if (!venue || running) return;
    const generation = ++runGeneration.current;
    const owns = () => runGeneration.current === generation;

    setFailedStage(null);
    setError("");
    setOpName("");
    setJobId("");
    setTimeline([]);
    setOutput(undefined);

    const startedAt = Date.now();
    const markStatus = (status: unknown) => {
      if (status === undefined || status === null) return;
      const s = String(status);
      const atMs = Date.now() - startedAt;
      setTimeline((prev) =>
        prev[prev.length - 1]?.status === s ? prev : [...prev, { status: s, atMs }],
      );
    };

    let stageNow: Stage = "resolve";
    try {
      // 1. Resolve — a job-free catalogue read via the values API.
      setStage("resolve");
      const op = await resolveOperationByAddress(venue, DELAY_OP);
      if (!owns()) return;
      setOpName(op.metadata?.name ?? DELAY_OP);

      // 2. Invoke — the venue persists a Job and returns a handle for it.
      stageNow = "invoke";
      setStage("invoke");
      const job: Job = await op.invoke({
        operation: ECHO_OP,
        delay: delayMs,
        input: { message },
      });
      if (!owns()) return;
      setJobId(job.id);
      markStatus(job.metadata?.status);

      // 3. Watch — poll until the job reaches a terminal state, recording
      // each status change so the transition is visible.
      stageNow = "watch";
      setStage("watch");
      while (!job.isFinished) {
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
        if (!owns()) return;
        await job.refresh();
        if (!owns()) return;
        markStatus(job.metadata?.status);
      }

      // 4. Result — job.output throws unless status is COMPLETE, so check
      // first and surface the venue's error for any other terminal state.
      // Venue-side failures store the message at metadata.error; some
      // adapters report through output.error instead (the SDK's
      // JobFailedError checks the same place).
      stageNow = "result";
      setStage("result");
      if (!job.isComplete) {
        const out = job.metadata?.output;
        const outError =
          out && typeof out === "object" && "error" in out ? (out as { error?: unknown }).error : undefined;
        throw new Error(
          String(
            job.metadata?.error ??
              outError ??
              `Job finished with status ${job.metadata?.status}`,
          ),
        );
      }
      setOutput(job.output);
      setStage("done");
    } catch (runError) {
      if (!owns()) return;
      setFailedStage(stageNow);
      setStage("failed");
      // Some fetch-layer errors carry an empty message — fall back to the
      // error's name so the failed step is never silent about its cause.
      setError(
        runError instanceof Error
          ? runError.message || runError.name
          : String(runError),
      );
    }
  }

  function stepState(step: Stage): StepState {
    if (stage === "idle") return "idle";
    if (stage === "done") return "done";
    const stepIdx = STAGES.indexOf(step);
    if (stage === "failed") {
      const failedIdx = failedStage ? STAGES.indexOf(failedStage) : 0;
      return stepIdx < failedIdx ? "done" : stepIdx === failedIdx ? "error" : "idle";
    }
    const currentIdx = STAGES.indexOf(stage as Stage);
    return stepIdx < currentIdx ? "done" : stepIdx === currentIdx ? "active" : "idle";
  }

  const jobUrl =
    venue && jobId
      ? `/venues/${encodeURIComponent(venue.venueId)}/jobs/${jobId}`
      : null;

  const invokeSnippet = `const job = await op.invoke({
  operation: "${ECHO_OP}",  // what to run…
  delay: ${delayMs},                    // …after this many ms
  input: { message: ${JSON.stringify(message)} },
});`;

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* What this demo is */}
      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-foreground flex flex-col gap-2">
        <p>
          This demo runs a real operation on the connected venue using the{" "}
          <span className="font-mono text-xs">@covia/covia-sdk</span> TypeScript SDK,
          directly from your browser — the same calls a script or backend service would
          make. Every execution on a venue is recorded as a <strong>job</strong>, so the
          demo walks the full lifecycle: resolve an operation, invoke it, watch the job
          run, and read its result.
        </p>
        <p className="text-muted-foreground">
          The operation is the venue&apos;s built-in{" "}
          <span className="font-mono text-xs">{DELAY_OP}</span>, told to wait and then run{" "}
          <span className="font-mono text-xs">{ECHO_OP}</span> with your message. Echo
          returns its input unchanged — when your message comes back, it has made the
          round trip browser → venue → adapter → job record → browser.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-48">
          <p className="text-xs font-semibold text-muted-foreground mb-1">Message to echo</p>
          <Input
            data-testid="demo-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Hello, Covia!"
            disabled={running}
          />
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1">Delay</p>
          <Select
            value={String(delayMs)}
            onValueChange={(value) => setDelayMs(Number(value))}
            disabled={running}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="500">0.5 s</SelectItem>
              <SelectItem value="2000">2 s</SelectItem>
              <SelectItem value="5000">5 s</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button data-testid="demo-run" onClick={() => void run()} disabled={!venue || running}>
          {running ? (
            <Spinner variant="ellipsis" size={16} />
          ) : (
            <PlayCircle size={16} className="mr-1" />
          )}
          {stage === "done" || stage === "failed" ? "Run again" : "Run the demo"}
        </Button>
      </div>

      {!venue && (
        <p className="text-sm text-muted-foreground">
          Connect to a venue to run the demo.
        </p>
      )}
      {venue && !isAuthenticated && (
        <p className="text-xs text-muted-foreground">
          You are not signed in — some venues reject anonymous invocations. If the invoke
          step fails, sign in and run it again.
        </p>
      )}

      {/* Lifecycle steps */}
      <ol className="flex flex-col gap-3">
        <DemoStep
          step="resolve"
          state={stepState("resolve")}
          title="Resolve the operation"
          code={`const op = await resolveOperationByAddress(venue, "${DELAY_OP}");`}
          error={error}
        >
          <p>
            The SDK looks the operation up in the venue&apos;s public catalogue with a
            job-free read (<span className="font-mono text-xs">venue.workspace.read</span>{" "}
            → <span className="font-mono text-xs">GET /api/v1/values/read</span>).
            Browsing and reading never create jobs — only running things does.
          </p>
          {opName && stepState("resolve") !== "idle" && (
            <p className="text-foreground">
              Resolved: <span className="font-medium">{opName}</span>
            </p>
          )}
        </DemoStep>

        <DemoStep
          step="invoke"
          state={stepState("invoke")}
          title="Invoke it — a job is created"
          code={invokeSnippet}
          error={error}
        >
          <p>
            <span className="font-mono text-xs">op.invoke(input)</span> posts the
            invocation to the venue. The venue persists a job record in its lattice — a
            durable, auditable account of who ran what, with which input — and returns a{" "}
            <span className="font-mono text-xs">Job</span> handle straight away while the
            work continues on the venue.
          </p>
          {jobId && (
            <p className="flex items-center gap-2 flex-wrap">
              <span>Job created:</span>
              <Badge variant="outline" className="font-mono" data-testid="demo-job-id">
                {jobId}
              </Badge>
              {jobUrl && (
                <Link
                  href={jobUrl}
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                  data-testid="demo-job-link"
                >
                  open in Jobs <ExternalLink size={12} />
                </Link>
              )}
            </p>
          )}
        </DemoStep>

        <DemoStep
          step="watch"
          state={stepState("watch")}
          title="Watch the job run"
          code={`while (!job.isFinished) {\n  await job.refresh();  // GET /api/v1/jobs/{id}\n}`}
          error={error}
        >
          <p>
            The handle polls the venue until the job reaches a terminal state. The demo
            polls in a loop so you can watch each status transition arrive; if you
            don&apos;t need live updates,{" "}
            <span className="font-mono text-xs">await job.wait()</span> or{" "}
            <span className="font-mono text-xs">await job.result()</span> does the same
            with exponential backoff.
          </p>
          {timeline.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap" data-testid="demo-timeline">
              {timeline.map((entry, index) => (
                <span key={`${entry.status}-${index}`} className="flex items-center gap-1.5">
                  {index > 0 && <ArrowRight size={12} className="text-muted-foreground" />}
                  <Badge
                    variant={entry.status === "COMPLETE" ? "default" : "outline"}
                    className="font-mono text-xs"
                  >
                    {entry.status}
                    <span className="ml-1 opacity-60">{(entry.atMs / 1000).toFixed(1)}s</span>
                  </Badge>
                </span>
              ))}
              {stepState("watch") === "active" && (
                <Spinner variant="ellipsis" size={16} className="text-primary" />
              )}
            </div>
          )}
        </DemoStep>

        <DemoStep
          step="result"
          state={stepState("result")}
          title="Read the result"
          code={`const result = job.output;`}
          error={error}
        >
          <p>
            Once the status is <span className="font-mono text-xs">COMPLETE</span>, the
            output is available on the job — and stays available: the job record persists
            on the venue, so the run can be revisited on the Jobs page later.
          </p>
          {output !== undefined && (
            <pre
              data-testid="demo-output"
              className="text-xs bg-muted rounded p-3 overflow-x-auto whitespace-pre-wrap break-all"
            >
              {JSON.stringify(output, null, 2)}
            </pre>
          )}
        </DemoStep>
      </ol>
    </div>
  );
}

function DemoStep({
  step,
  state,
  title,
  code,
  error,
  children,
}: {
  step: Stage;
  state: StepState;
  title: string;
  code: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <li
      data-testid={`demo-step-${step}`}
      data-state={state}
      className={
        "rounded-lg border p-4 transition-colors " +
        (state === "active"
          ? "border-primary/60 bg-primary/5"
          : state === "error"
            ? "border-destructive/60"
            : "border-border")
      }
    >
      <div className="flex items-center gap-2 mb-2">
        <StepIcon state={state} index={STAGES.indexOf(step) + 1} />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="flex flex-col gap-2 text-sm text-muted-foreground pl-8">
        {children}
        <pre className="text-xs bg-muted rounded p-3 overflow-x-auto whitespace-pre-wrap break-all text-foreground/80">
          {code}
        </pre>
        {state === "error" && error && (
          <p
            data-testid="demo-error"
            className="text-sm text-destructive rounded border border-destructive/40 bg-destructive/5 p-3 break-words"
          >
            {error}
          </p>
        )}
      </div>
    </li>
  );
}

function StepIcon({ state, index }: { state: StepState; index: number }) {
  if (state === "done")
    return (
      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
        <Check size={14} />
      </span>
    );
  if (state === "error")
    return (
      <span className="w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center shrink-0">
        <CircleAlert size={14} />
      </span>
    );
  if (state === "active")
    return (
      <span className="w-6 h-6 rounded-full border-2 border-primary flex items-center justify-center shrink-0">
        <Spinner size={12} className="text-primary" />
      </span>
    );
  return (
    <span className="w-6 h-6 rounded-full border border-border text-muted-foreground text-xs flex items-center justify-center shrink-0">
      {index}
    </span>
  );
}
