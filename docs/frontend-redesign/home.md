# Home, Reimagined — design & build spec

**Status:** built on `feat/home` (stacked on `feat/agents-roster` / #362). Direction **B — Launchpad**, approved.
**Concept artefact (reimagined view):** `claude.ai/code/artifact/3215c403-44ca-4016-a9e6-f5e8df69979e`
**Series:** Jobs ✓ · Agents ✓ · Operations ✓ · Connections ✓ · **Home** → Venues · Workspace/Files · Secrets/Context/Inbox

This is the 4th page in the frontend-reimagination series: one shared design system, on the app's own theme, every redesign a **strict superset** of what the page shows today (no detail lost).

## 1. What Home was

`app/(demo)/page.tsx → DefaultAssistantHome → AIPrompt` with `fixedAgentId="assistant"`. The visible surface:

- A centred **"How can I help?"** heading.
- One composer card — the `prompt` textarea + **Run** (`chat-button`), Enter to send.
- Three on-demand dialogs — LLM provider picker (`chat-picker-dialog`), add-key (`chat-dialog`), device-key sign-in.
- The agent picker is **hidden on Home** (`fixedAgentId` set).
- Submit routes to `/agents/chat` — Home hands off, never renders a transcript.

**Zero venue calls on load, no polling** — instant and fully job-safe. Calm and focused, but a dead-end: no way to resume, no venue awareness, no discovery of the redesigned pages, and a blank page for first-time users.

## 2. What Home becomes (Direction B — Launchpad)

The composer stays the hero and paints first. Around it, additive and hydrated from **job-free** reads after the composer is on screen:

- **Starter prompts** — chips under the composer that *fill* it (never auto-send), matching the Chat redesign's pattern. Removes the blank-page problem.
- **Jump back in** — the agents you most recently worked with (two-tone `AgentIdenticon` + humanised name + status pill), one click back to `/agents/agent/<id>`.
- **Go anywhere** — quick-action tiles into New agent · Operations · Connections · Jobs.
- **This venue, right now** — a KPI pulse (agents running/total, jobs run, connections), the figures only a live venue can show.

Signed out: composer + starters + sign-in only. Fresh venue: each section folds away rather than showing an empty frame.

## 3. Architecture (wrap, don't rewrite)

- **`AIPrompt`** gains two *additive* optional props — `starters?: string[]` (fills its own textarea) and `variant?: "page" | "launchpad"` (full-centre vs top layout). Absent = today's exact behaviour, so `AIPrompt.test` stays green untouched.
- **`HomeLauncher`** composes `<AIPrompt fixedAgentId="assistant" variant="launchpad" starters=… />` with the sections. The "sends to assistant, no `onChatStarted`" contract now lives here.
- **`JumpBackIn` / `QuickActions` / `VenuePulse`** — presentational (props only).
- **`useHomeExtras`** — job-free `jobs.list` (count) + `secrets.list` (connections ∩ known connectors); `useAgentRoster` (reused) supplies recent agents + agent counts.
- **`DefaultAssistantHome`** renders `<HomeLauncher />`.

## 4. Parity map (superset — nothing lost)

| Today | In the redesign |
|---|---|
| "How can I help?" heading | Hero heading, unchanged (adds a one-line subhead) |
| `prompt` textarea + placeholder | The hero composer, identical behaviour & testids |
| Run (`chat-button`) | Same button, same disabled/busy logic |
| Agent picker (hidden on Home) | Still hidden — `fixedAgentId` unchanged |
| "Creating agent…" caption + busy states | Unchanged, inside `AIPrompt` |
| LLM picker · add-key · sign-in dialogs | Unchanged, inside `AIPrompt` |
| Submit → `/agents/chat` hand-off | Unchanged route & pending-chat echo |
| *(nothing)* | **added:** Starters · Jump back in · Quick actions · Venue pulse |

## 5. Testing

**Kept green (contract):** `AIPrompt.test.tsx` (full composer/dialog/agent-create/sign-in contract). **Relocated:** `DefaultAssistantHome.test.tsx` now asserts it mounts the launchpad; the composer contract moved to `HomeLauncher.test.tsx`.

**Added:** `HomeLauncher.test` (composer props + section gating + recent-agent selection), `home-sections.test` (JumpBackIn cards/links/empty, VenuePulse optional-tiles/fold-away, QuickActions routes), `AIPrompt.starters.test` (chips fill the composer, none when absent).

Full `pnpm test` **157 suites / 1188 tests** green; `tsc` + `eslint` clean; live-verified signed-out and device-key signed-in on `:3020`.

## 6. Dependencies & blast radius

- **Modify (Home-only):** `AIPrompt.tsx` (additive props), `DefaultAssistantHome.tsx`.
- **New:** `home/{HomeLauncher,JumpBackIn,QuickActions,VenuePulse}.tsx`, `hooks/use-home-extras.ts`.
- **Reuse, unchanged:** `AgentIdenticon`, `agent-display`, `use-agent-roster`, `StatusBadge`, `PageHeading`, `ContentLayout`, `TopBar`, `ui/*`, `use-authenticated-venue`.
- **Stacking:** `AgentIdenticon` / `humanizeAgentId` / `relTime` / `use-agent-roster` live on #362 (not yet on develop), so `feat/home` is **stacked on `feat/agents-roster`** and its PR merges after #362.
- No new external libraries.

## 7. Impact & risk

- **On-load reads (the one real change).** Today Home reads nothing. Mitigation: every read is job-free (never `invoke`/`run`), fired *after* the composer paints, best-effort and non-blocking. `useAgentRoster` reads are id-set-keyed.
- **Composer stays instant & job-safe** — `AIPrompt`'s testids/behaviour untouched.
- **Auth/venue states** — signed-out: composer + starters + sign-in, no reads; no venue / fresh venue: sections fold; composer always works.
- **Rollback:** revert `DefaultAssistantHome` to a bare `<AIPrompt fixedAgentId />`; `HomeLauncher` is fully isolated.

## 8. Rollout

Worktree `home-redesign` · branch `feat/home` (stacked on `feat/agents-roster`) · dev server `:3020`. Build order: launcher + starters → Jump back in → Quick actions → Venue pulse. Verify live (signed-out + device-key signed-in), full suite + `tsc` + `eslint`, show before push, PR → develop with a commit-by-commit body (after #362 merges).
