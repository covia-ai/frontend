"use client";

import { HomeLauncher } from "@/components/home/HomeLauncher";

// Home is a launchpad: the composer stays the hero and still hands off to
// /agents/chat on submit (it never swaps itself for the chat view in place),
// with Jump-back-in / Quick actions / Venue pulse surfaced around it for signed-in
// people. All of that lives in HomeLauncher — see it for the composer contract
// and the job-free, non-blocking reads that feed the launchpad sections.
export function DefaultAssistantHome() {
  return <HomeLauncher />;
}
