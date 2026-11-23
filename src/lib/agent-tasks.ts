import { JobFailedError, type Venue } from "@covia/covia-sdk";
import type { AgentConfigInput } from "@/lib/agent-templates";
import { inlineAgentConfigPreview } from "@/lib/agent-templates";

// From covia 0.12 an agent takes a task (agent:request) only when its config
// sets acceptTasks: true, and refuses every other ("does not take tasks").
// agent:create and agent:from-skills add nothing to a config they are given;
// every standard template but minimal sets it.
export const ACCEPT_TASKS = { acceptTasks: true } as const;

/**
 * The acceptTasks override for a config the frontend builds: true, unless one
 * of the config's own inline layers already decides it. An explicit false is
 * the author's choice and stays; a reference layer the preview cannot see is
 * overridden, which only matters if it said false.
 */
export function acceptTasksOverride(config: AgentConfigInput | undefined): { acceptTasks?: true } {
  const stated = config === undefined ? undefined : inlineAgentConfigPreview(config).acceptTasks;
  return typeof stated === "boolean" ? {} : ACCEPT_TASKS;
}

// The venue refuses a task (no acceptTasks, suspended agent, …) by failing its
// job straight after submission. Waiting this long catches that without
// waiting on the task itself, which runs for as long as the agent takes.
const EARLY_FAILURE_WINDOW_MS = 3000;

/**
 * Calls `onFailed` if a task submitted with wait=false fails straight away,
 * as a refused one does. agents.request(…, false) returns a PENDING snapshot
 * before the venue has decided, so its own promise never sees the refusal.
 * A task still running after the window is left to the chat to show.
 */
export async function watchSubmittedTask(
  venue: Venue,
  jobId: string,
  onFailed: (error: JobFailedError) => void,
): Promise<void> {
  try {
    const job = await venue.jobs.get(jobId);
    await job.wait({ timeout: EARLY_FAILURE_WINDOW_MS });
  } catch (err) {
    if (err instanceof JobFailedError) onFailed(err);
    // Timeouts (still running) and read errors say nothing about the task.
  }
}
