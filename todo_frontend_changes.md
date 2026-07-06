# Frontend TODO — Showcase Covia Capabilities

Analysis date: 2026-06-23  
Source: Venue server capabilities survey + frontend gap analysis  
Last updated: reanalysed after covia `develop` pull (87d1b66..0e12b28)

The venue exposes 80+ operations across 15 adapter categories and 4 protocols (REST, SSE,
MCP, A2A). The frontend currently covers roughly 30% of that surface. Items below are
ordered by developer-impact-to-effort ratio.

---

## P1 — SSE Streaming in ExecutionViewer ✅ DONE

**Status:** Fixed — commit `1af7b26`, issue [#134](https://github.com/covia-ai/frontend/issues/134), pushed to `develop` 2026-06-23.  
**File:** `src/components/ExecutionViewer.tsx`  
**Gap:** Job status is polled every 1 second via `setInterval`. The venue has a live SSE
endpoint at `/api/v1/jobs/{id}/sse`.

**Changes:**
- Replace the `setInterval` polling block with an `EventSource` connection.
- Close the source when `isJobFinished(status)` returns true.
- Show a small "Live" badge (e.g. green dot + "Streaming") in the job header while SSE is
  active; swap to "Completed" when the source closes.
- Fall back to polling if `EventSource` construction fails (e.g. auth headers cannot be
  set on EventSource — may need a token query-param or cookie approach).

```typescript
// Rough shape — replace the polling useEffect
useEffect(() => {
  if (!venue || !props.jobId) return;
  const url = `${venue.baseUrl}/api/v1/jobs/${props.jobId}/sse`;
  const source = new EventSource(url);
  source.onmessage = (e) => {
    const data = JSON.parse(e.data);
    setJobMetadata(data.metadata ?? data);
    setPollStatus(data.metadata?.status ?? data.status ?? "");
    if (isJobFinished(data.metadata?.status ?? data.status)) source.close();
  };
  source.onerror = () => source.close(); // fallback: leave last known state
  return () => source.close();
}, [venue, props.jobId]);
```

---

## P2 — Operations Catalog Page ✅ DONE

**Status:** Fixed — commit `4c8b37f`, issue [#137](https://github.com/covia-ai/frontend/issues/137), pushed to `develop` 2026-06-23.  
**New route:** `/operations/catalog`  
**Gap:** No page shows the full `v/ops/*` catalog. Developers cannot discover what the
venue can do without reading docs.

**REST endpoint (now live):** `GET /api/v1/operations` — returns all named operations with
`name`, `asset`, `description`, `input`, `output`. `GET /api/v1/operations/{name}` returns
a single operation. These are confirmed implemented on the server.

**Changes:**
- Call `GET /api/v1/operations` (returns all named operations with input/output schemas).
- Group results by adapter prefix: `langchain`, `agent`, `llmagent`, `goaltree`, `covia`,
  `file`, `dlfs`, `scheduler`, `schema`, `json`, `http`, `mcp`, `a2a`, `ucan`, `grid`,
  `convex`, `auth`, `secret`, `asset`, `memory`.
- Each row: operation path, description, expandable input/output schema accordion.
- "Run" button on each row opens the existing `OperationViewer` in a side-sheet/drawer
  (pass `operationId` as a prop; avoid full navigation so the catalog stays open).
- Add a search/filter bar (by adapter group or by keyword in name/description).
- Link this page from the existing Operations menu item as "Catalog" sub-item.

**SDK:** direct `fetch(`${venue.baseUrl}/api/v1/operations`)`.

---

## P3 — MCP Tools Page & "Connect to Claude" snippet ✅ DONE

**Status:** Fixed — commit `60f6264`, issue [#135](https://github.com/covia-ai/frontend/issues/135), pushed to `develop` 2026-06-23.  
**New route:** `/venues/[slug]/mcp`  
**Gap:** The MCP URL is displayed as plain text on the venue page. The venue is a full
MCP JSON-RPC 2.0 server — every operation is an MCP tool.

**Changes:**

### 3a — MCP section on Venue page (`/venues/[slug]/page.tsx`)
- Below the stats grid, add a "MCP Integration" card.
- Call `v/ops/mcp/toolList` and show tool count + top 5 tool names as a preview list.
- Large "Copy MCP URL" button (styled prominently, not just a copy icon).
- Expandable "Connect to Claude Desktop" block showing the exact JSON snippet:
  ```json
  {
    "mcpServers": {
      "covia": {
        "command": "npx",
        "args": ["-y", "mcp-remote", "<MCP_URL>"]
      }
    }
  }
  ```

### 3b — Full MCP tools page (`/venues/[slug]/mcp`)
- Full table of all MCP tools (from `v/ops/mcp/toolList`): name, description,
  input schema.
- "Test Tool" panel: select a tool, fill its input form (reuse the OperationViewer form
  builder), fire `v/ops/mcp/toolCall`, show result.
- JSON-RPC snippet for each tool (copy button).
- Add "MCP Tools" nav link inside venue sub-navigation.

---

## P4 — Implement ForkAgent and CloneToVenue

**Files:** `src/components/ForkAgent.tsx`, `src/components/CloneToVenue.tsx`  
**Gap:** Both dialogs show a success toast but perform no actual operation.

### ForkAgent
- Call `venue.agents.fork({ sourceId: props.agentId, agentId: forkName })`.
- Show a text input for the new agent ID (pre-filled with `${agentId}-fork`).
- Add a **"Include Timeline" checkbox** (`includeTimeline: true`) — the server now copies
  the source agent's conversation history into the fork when this is set.
- Add an optional **Config Override** textarea — a JSON snippet merged on top of the
  source config (e.g. to change the system prompt for the fork).
- On success: toast with "Forked as <newAgentId>" and navigate to
  `/agents/explorer?agentId=<newAgentId>`.
- On failure: show inline error.

### CloneToVenue
- Add a venue selector (dropdown from `useVenues()` store, excluding current venue).
- On confirm:
  1. Call `venue.agents.info(agentId)` to get config + state.
  2. Call `v/ops/grid/invoke` on the destination venue with operation
     `v/ops/agent/create` and the agent's config payload.
  3. Show a progress indicator (this is async — poll the remote job).
  4. On completion: show success with destination venue name.

---

## P5 — Identity & Auth Page

**New route:** `/identity`  
**Gap:** Developers cannot see their DID, auth mode, or generate UCAN tokens anywhere.

**Changes:**
- Add "Identity" to the dev menu (alongside Secrets).
- Page sections:

### Your Identity
- Call `v/ops/auth/whoami` → display caller DID prominently.
- Show auth mode: "Device Key (Ed25519)" or "Bearer Token (OAuth)".
- For device key: show DID, truncated public key with copy button.
- "Regenerate Key" button (with confirm dialog — destructive action).

### Venue Identity
- Show venue DID (from `venue.venueId`), link to `/.well-known/did.json` document.
- Render DID document JSON in a collapsible block.

### UCAN Capability Tokens
- "Issue Token" form: resource DID, ability string (e.g. `covia/invoke`), expiry.
- Call `v/ops/ucan/issue` with the form values.
- Show the resulting JWT with copy button and decoded payload view.
- **Self-attenuation note:** tokens issued with `iss == aud == callerDID` are now
  enforced as a capability ceiling when presented as a bearer. Show a callout:
  "Issue a self-attenuated token to restrict what this session can do."
- **Audience field:** tokens must now include the venue's DID as audience (`aud`) to
  be accepted; the venue enforces this per RFC 7519 §4.1.3. Pre-fill `aud` with the
  venue DID in the issue form.
- Brief explanation of what UCAN tokens are for (tooltip or callout).

---

## P6 — Scheduler UI

**Gap:** `v/ops/scheduler/schedule`, `cancel`, `list`, `trigger` are fully server-side but
have zero UI.

**Changes:**

### Scheduled Jobs tab in `/jobs`
- Add a "Scheduled" tab alongside the existing job list.
- Call `v/ops/scheduler/list` to populate the tab.
- Columns: operation, scheduled time / cron expression, status, actions (Cancel, Trigger
  Now).
- "Schedule Operation" button:
  - Pick operation (from the catalog or a free-text path).
  - Provide input JSON.
  - Set trigger: "Once at..." datetime picker or "Repeat every..." cron input.
  - Call `v/ops/scheduler/schedule` with `{ operation, input, trigger }`.
  - Show created schedule in the table.

---

## P7 — GoalTree Agent + Agent Context View

**Files:** `src/components/AgentTemplates.tsx`, `src/components/AgentExplorer.tsx`

### 7a — GoalTree agent template
- Add a 5th template to `AgentTemplates.tsx`. Use the official `goaltree` agent template
  (now registered as `v/agents/templates/goaltree` on the server):
  ```typescript
  {
    name: "Goal Planner",
    agentId: "goal-planner",
    description: "Decomposes complex goals into structured subtask trees.",
    icon: <GitFork size={32} />,
    // Use the server's goaltree template:
    config: "v/agents/templates/goaltree",
    // or inline:
    operation: "v/ops/goaltree/chat",
  }
  ```
- When the goaltree agent responds, its output is structured JSON — detect this in
  `AgentExplorer` and render it as a collapsible tree diagram (a diagram component
  already exists in the codebase).

### 7b — "View Context" panel in AgentExplorer
- Add a "Context" tab to the agent detail view.
- Call `v/ops/agent/context` (pass `{ agentId }`) — the server now dispatches this to
  the adapter's `ContextInspectable` implementation, so it returns the actual rendered
  LLM context string as the job output.
- Render the returned string in a read-only code block.
- Shows developers what context the agent "sees" — very useful for debugging prompt issues.

---

## P8 — A2A Protocol Section on Venue Page ✅ DONE

**Status:** Fixed — commit `a9a1ff2`, issue [#153](https://github.com/covia-ai/frontend/issues/153), pushed to `develop` 2026-07-06.  
**File:** `src/app/(demo)/venues/[slug]/page.tsx`  
**Gap:** The A2A endpoint is live and `/.well-known/agent-card.json` is served, but
nothing in the UI surfaces this.

**Changes:**
- Add an "A2A Protocol" card on the venue detail page.
- Fetch `/.well-known/agent-card.json` and display: agent name, description, provider URL,
  supported capabilities.
- "Send A2A Message" panel:
  - Text input → calls `v/ops/a2a/send` → gets task ID.
  - Auto-polls `v/ops/a2a/getTask` for result (same SSE approach as jobs if supported).
  - Shows raw A2A task response JSON — developers see the protocol in action.
- "Copy Agent Card URL" button (the `/.well-known/agent-card.json` URL).
- Integration callout: "This venue accepts A2A messages from any compatible AI agent."

---

## P9 — DLFS File Browser

**New route:** `/workspace/files` (or tab within WorkspaceExplorer)  
**Gap:** The decentralized filesystem (`v/ops/dlfs/*`) has a full POSIX-like API — list,
read, write, mkdir, delete, tree, stat — with no UI.

**Changes:**
- Left panel: drive list from `v/ops/dlfs/listDrives`. Select drive → show directory tree
  via `v/ops/dlfs/list` (lazy-load sub-directories on expand).
- Right panel: file viewer/editor.
  - Text files: textarea or Monaco editor.
  - Binary files: hex view + download button.
  - JSON files: JSONViewer (already exists in the codebase).
- Toolbar: "New File", "New Folder", "Upload", "Delete", "Download".
- "Create Drive" button: calls `v/ops/dlfs/createDrive`.
- Show WebDAV URL for each drive (venue serves WebDAV at `/dlfs/`).
- Add "Files" to the Data section of the navigation menu.

---

## P10 — Schema & JSON Tools Playground

**New route:** `/tools` (dev environment only)  
**Gap:** `v/ops/schema/*` and `v/ops/json/*` and the test operations are developer
utilities with no UI. Also `v/test/ops/*` are useful for SDK integration testing.

**Changes — three-tab page:**

### Schema Tools tab
- Input: JSON textarea.
- "Infer Schema" button → calls `v/ops/schema/infer` → shows resulting JSON Schema.
- "Validate" button → paste schema + value → calls `v/ops/schema/validate` → pass/fail
  with error details from `v/ops/schema/validateAll`.
- "Coerce" button → calls `v/ops/schema/coerce` → shows coerced output.

### JSON Tools tab
- "Merge" panel: two JSON inputs → `v/ops/json/merge` → merged output.
- "Select" panel: JSON input + field paths → `v/ops/json/select` → extracted fields.
- "Assoc" panel: JSON + path + value → `v/ops/json/assoc` → updated JSON.

### Test Operations tab
- Buttons for each test operation:
  - **Echo**: paste input JSON → `v/test/ops/echo` → see it reflected back.
  - **Delay**: number input → `v/test/ops/delay` → shows how long the job took.
  - **Fail**: trigger a deliberate failure → see `FAILED` status + error structure.
  - **Pause**: trigger a paused job → shows `INPUT_REQUIRED` → use the existing
    job message form to resume it.
- Each result opens in an inline `ExecutionViewer` (as a drawer/sheet).

Add "Developer Tools" section to the dev menu with this page and the Identity page.

---

## P11 — Fix Broken / Incomplete Pages (partial)

### `SecretList` — stale public-write notice ✅ DONE
- Fixed in commit `d47a6fa`, issue [#136](https://github.com/covia-ai/frontend/issues/136), pushed to `develop` 2026-06-23.
- `loadSecrets()` now early-returns when `!isAuthenticated` (no wasted fetch).
- `useEffect` dep array includes `isAuthenticated` so fetch re-fires on sign-in.
- Secrets table and Add form are gated behind `isAuthenticated`.
- Notice copy updated: "Authentication required — sign in to store and manage secrets."

### `/myvenues`
- `addVenueToList()` is undefined — wire it to `AddNewVenueModal` or duplicate the
  `Venue.connect()` logic from `AddNewVenueModal`.
- Either remove this route or make it an alias for the venues page.

### `/publicartifacts`
- The grid div has no `.map()` rendering — assets are fetched but never displayed.
- Fix: render `AssetCard` for each asset in the fetched list (same pattern as
  `OperationsList`).

### `/privateartifacts`
- `fetchAssets()` is defined but no `useEffect` triggers it.
- Fix: add `useEffect(() => { fetchAssets(); }, [venueObj, authMap])`.
- Consolidate with `/myassets` or clearly differentiate their purpose.

### CoviaAdapter CRUD response shape changed ✅ RESOLVED

**Status:** Audited 2026-07-06 — no stale consumers remain. WorkspaceExplorer was
fixed in `85beb38` (#147); a full sweep of `src/` found zero remaining reads of the
removed `written`/`deleted`/`appended` fields or the renamed `size` field. The only
other covia-CRUD consumers (`operations-catalog.ts` read ×2, `AgentExplorer`
sessions slice) read the unchanged `value`/`values` payloads; the slice shape was
verified against a live venue.

- `covia:write` / `covia:copy` now return `{pathCreated: true}` **only** when an
  intermediate path was built; omitted otherwise (was `{written: true}` always).
- `covia:delete` now returns `{}` (was `{deleted: true}`).
- `covia:append` now returns `{newSize: N}` (was `{appended: true}`).
- `covia:read` now reports `valueBytes` (always present; was `size`, only on truncation).

---

## P12 — Navigation Restructure

**File:** `src/config/menu-list.ts`

Restructure the dev menu to guide developers progressively through Covia's capabilities:

```
[Current venue selector]
────────────────────────
Dashboard
Operations
  └── Browse (existing)
  └── Catalog           ← new: full v/ops/* browser (P2)
Agents
  └── My Agents
  └── Templates
Jobs
  └── All Jobs
  └── Scheduled         ← new (P6)
Data
  └── Workspace         ← existing WorkspaceExplorer
  └── Files             ← new: DLFS browser (P9)
  └── Secrets
  └── Memory            ← new: user memory list (P14)
Venues
  └── My Venues
  └── MCP Tools         ← new (P3)
Developer Tools         ← new section, dev only
  └── Playground        ← new: schema/json/test ops (P10)
  └── Identity          ← new: whoami/DID/UCAN (P5)
  └── Scheduler         ← new (P6)
```

---

## P13 — Minor Improvements (low effort, good polish)

### AgentExplorer — show agent status badge
- `v/ops/agent/info` returns `status`. Show it as a colored badge in the header
  (SLEEPING = grey, RUNNING = blue/pulse, SUSPENDED = amber, TERMINATED = red).

### OperationViewer — show raw schema toggle
- Add a "View Schema" toggle that shows the raw JSON Schema for input and output.
  Useful for developers building SDK integrations.

### VenuePage — fix `useEffect` missing dep warning
- `fetchStats` and `fetchMCP` in the second `useEffect` use `venue` but `venue` is not
  in the dep array. Add it: `[venue]` is already there — verify linting is clean.

### JobList — N+1 fetch performance + filter empty state ✅ DONE
**Status:** Fixed — commit `c9d1205`, issue [#138](https://github.com/covia-ai/frontend/issues/138), pushed to `develop` 2026-06-23.
- Was making 1 + N HTTP requests (one `jobs.get()` per job ID) before rendering anything; page appeared frozen with 200+ jobs.
- Now: `jobs.list()` fetches all IDs (1 request), then only the current page's 10 IDs have their metadata fetched.
- Loading spinner added; `Promise.allSettled` prevents one bad ID breaking the page.
- "No jobs match this filter" empty state added (no "Clear filter" button yet).

### OperationsList — show operation count in the page header
- After loading: "Showing N operations". Helps developers gauge venue size quickly.

### AddNewAgent — show agentId suggestion
- Auto-derive a slugified agent ID from the agent name as the user types, shown as
  placeholder text below the name field. The agentId is what the SDK uses — developers
  need to know it.

### Secrets page — use REST API + group by provider
- The venue now exposes `GET /api/v1/secrets`, `PUT /api/v1/secrets/{name}`,
  `DELETE /api/v1/secrets/{name}` directly. Use these REST endpoints instead of going
  through `v/ops/secret/set` — faster, no job overhead.
- Use `KNOWN_LLM_KEYS` to label recognized secrets (ANTHROPIC_API_KEY → "Anthropic
  Claude"), and show an "Unknown" group for other keys.

### Venue connection modal — Private Network Access hint
- When the user connects to a `localhost` venue from a non-localhost frontend origin,
  show a tip: "If you get CORS errors, add `allowPrivateNetwork: true` to your venue
  config." The venue now disables this header by default (`allowPrivateNetwork: false`).

---

## P14 — User Memory UI (NEW — added in [0.2.0])

**New route/panel:** Memory panel in `/identity` or `/workspace/memory`  
**Gap:** The venue now has `v/ops/memory` — a per-user persistent numbered list of facts.
It is designed to be injected into an agent's context automatically. No UI surfaces it.

**Operation:** `v/ops/memory` with `command` field: `recall | remember | update | forget`

**Changes:**

### Memory panel (add to Identity page or Data section)
- Call `v/ops/memory` with `{ command: "recall" }` → renders the numbered list as a
  text block (or null when empty).
- Display the list as numbered rows, each editable inline.
- **"Remember"** button: text input → `{ command: "remember", text: "..." }` → appends.
- **"Update" (pencil icon)** per row: `{ command: "update", n: N, text: "..." }`.
- **"Forget" (trash icon)** per row: `{ command: "forget", n: N }`.
- Show empty state: "No memories yet. Add facts the agent should always know about you."
- Storage path: `w/memory` (default) — show a small path badge for advanced users.

### Agent config context entry
- In `AddNewAgent` / agent update config: show a checkbox
  "Inject user memory into context" that adds
  `{ "op": "v/ops/memory", "label": "User Memory" }` to `config.context`.
- This makes the memory list a system context entry every turn.

---

## P15 — Agent Chat UI (Session-Based Conversation) (NEW)

**File:** `src/components/AgentExplorer.tsx`  
**Gap:** `agent:chat` is a new synchronous request-response operation (added alongside
`agent:message` and `agent:request`). It reserves a per-session slot, delivers the
message, and the Job completes when the agent responds — making it ideal for a chat UI.

Unlike `agent:request` (async task) or `agent:message` (fire-and-forget), `agent:chat`
is synchronous chat: one message in, one response out per session turn.

**Changes:**

### Chat tab in AgentExplorer
- Add a "Chat" tab alongside "Info" and "Context".
- Text input + Send button; pressing Send calls:
  ```
  v/ops/agent/chat  { agentId, message: "...", sessionId? }
  ```
  On first message, omit `sessionId` — the server mints one and returns it.
  On subsequent messages, pass the returned `sessionId` to continue the session.
- Show conversation turns (user message → agent response) in a scrollable chat pane.
- The Job stays in `STARTED` until the agent responds; use SSE (`/api/v1/jobs/{id}/sse`)
  to get the completion in real time (ties into P1).
- Show a typing indicator while the job is in `STARTED`/`RUNNING`.
- Handle "Session already has an in-flight chat" error gracefully (disable Send while
  waiting for the previous response).
- "New Session" button to mint a fresh session (clear chat history in the UI).

### Session ID display
- Show the current `sessionId` as a small badge (truncated hex). Developers can copy it
  to reuse sessions across page loads.

---

## P16 — Agent Capability Config Editor (NEW)

**Files:** `src/components/AddNewAgent.tsx`, agent update/edit flow  
**Gap:** The `caps` array in agent config restricts what operations the agent can call.
The system prompt now renders a `## Your capabilities (caps)` section from this array.
There is no UI to configure it.

**Background:** Each cap is `{ with: "<resource>", can: "<ability>" }`. Example:
```json
[
  { "with": "w/mydata", "can": "covia/read" },
  { "with": "w/outputs", "can": "covia/write" }
]
```
An empty array `[]` means deny-all tools. Absent means unrestricted.

**Changes:**

### Capabilities section in AddNewAgent
- Below the system prompt field, add a collapsible "Capabilities (optional)" section.
- Default: unchecked / absent (unrestricted).
- When enabled: show a table of `(resource, ability)` rows.
  - "Add capability" button adds a new row.
  - Resource: free-text path or DID URL (e.g. `w/notes`, `g/my-agent`).
  - Ability: dropdown of common abilities (`covia/read`, `covia/write`, `agent/message`,
    `agent/request`, `http/get`, `secret/extract`, …) plus free-text.
- Serialize to `config.caps: [...]` on save.
- Show a warning when caps is `[]`: "Deny-all: agent cannot use any tools."

---

## P17 — Agent Update In-Place (NEW)

**File:** `src/components/AgentExplorer.tsx` (agent detail / config view)  
**Gap:** `agent:update` is a new operation that patches an agent's config or state without
the `overwrite` state-machine semantics of `agent:create`. Also, `agent:create` now
accepts an `overwrite: true` flag that updates a SLEEPING or SUSPENDED agent in place
(preserving timeline, inbox, tasks) — different from the previous behaviour where
`create` only worked on empty slots.

**Changes:**

### "Edit Config" button in AgentExplorer
- Show agent's current `config` JSON in an editable code block.
- "Save" button calls `v/ops/agent/update` with `{ agentId, config: <new config> }`.
- Optionally also allow editing `state` (with a warning: "Editing state directly is for
  advanced use").
- Disabled when agent is `RUNNING` (server would reject it).
- Show a warning if agent is `SUSPENDED`: "Changes will apply after resume."

### AddNewAgent — overwrite mode
- When the user tries to create an agent whose ID already exists:
  - Currently: server silently no-ops (idempotent).
  - Better: detect from the `agent:create` result `{ created: false, updated: false }`
    and show a prompt: "Agent already exists. Overwrite config?"
  - "Yes, Update" calls `agent:create` with `overwrite: true`.
  - Blocked if agent is `RUNNING`: show "Agent is currently running. Wait or cancel the
    active task first."

---

## SDK Coverage After These Changes

| Manager / Feature      | Current | After |
|------------------------|---------|-------|
| agents                 | 50%     | 85%   |
| assets                 | 60%     | 70%   |
| jobs                   | 95%     | 100%  |
| secrets                | 100%    | 100%  |
| workspace              | 100%    | 100%  |
| operations catalog     | 20%     | 80%   |
| scheduler              | 0%      | 80%   |
| mcp                    | 10%     | 80%   |
| a2a                    | 0%      | 60%   |
| ucan                   | 0%      | 60%   |
| dlfs / file            | 0%      | 70%   |
| schema / json tools    | 0%      | 70%   |
| federation (grid)      | 0%      | 50%   |
| memory                 | 0%      | 80%   |
| convex                 | 0%      | 10%   |

---

## P16 — SDK next-release migration & job-free reads (NEW — added 2026-07-06)

**Goal:** move to the next covia-sdk release (currently pinned `1.6.0-next.0`; npm
`latest` is still 1.5.0) as soon as it's tagged, and eliminate invoke-based reads —
every operation invoke persists a job (etch bloat, covia#177).

### What the venue already ships (covia develop, #177 closed 2026-07-03)
Job-free read routes `GET /api/v1/values/{read,list,slice,inspect,aggregate,count}` —
same `covia:*` read semantics, capability-checked, no job created. Full surface in
covia `venue/docs/READ_API.md`.

### What covia-sdk develop (unreleased) already has
- `WorkspaceManager.read/list/slice/inspect` repointed at `GET /api/v1/values/*`
  (invoke fallback only when UCAN proofs are passed).
- `AgentManager.query` **removed** (was 1 info + 3 covia/read = 4 jobs per call);
  agent info via `info()`, timeline/state/inbox via workspace reads.
- `KeyPairAuth` → `Ed25519Auth` rename (deprecated alias kept — non-breaking).

### HARD RULE (2026-07-06)
**The UI must never create jobs for reads.** The only permitted invokes are user
interactions that explicitly drive an execution (run an operation, call a tool,
message an agent, write/delete). Page loads, polls, navigation, and dialogs must
use job-free surfaces: REST GETs, `GET /api/v1/values/*` (with invoke fallback
until the stable fleet runs ≥0.3), the native `/mcp` JSON-RPC endpoint (verified
job-free), and `/.well-known/*`.

### Frontend migration checklist
- [x] Catalog reads job-free — `readValue()` in `src/lib/operations-catalog.ts`
      GETs `/api/v1/values/read` with invoke fallback for pre-0.3 venues
      (done 2026-07-06). **Delete `readValue()` at the SDK bump** and call
      `venue.workspace.read()` — the SDK now owns the pre-0.3 fallback
      (covia-sdk `0cc4d3e`); venue-version accommodation belongs in the SDK,
      not the frontend.
- [x] MCP tool lists job-free — `listMcpTools()` in `src/lib/utils.ts` speaks
      JSON-RPC `tools/list` to the native `/mcp` endpoint; used by the venue page
      and `/venues/[slug]/mcp` (done 2026-07-06). `tools-call` stays an invoke —
      user-driven execution.
- [ ] Bump `@covia/covia-sdk` pin when the next release is tagged; run
      `pnpm build` + jest.
- [ ] **AgentExplorer** (`src/components/AgentExplorer.tsx:68,130`): replace
      `agentHandle.query()` (API removed in SDK develop) with `agents.info()` +
      targeted `workspace.read` calls — the 3 s poll currently mints ~6 jobs per
      tick, the single worst offender; after migration only `agents.list`/`info`
      still create jobs (blocked on covia#180 for full elimination).
- [ ] `WorkspaceExplorer` + `AgentExplorer` sessions slice become job-free
      automatically via the SDK repoint — no code change, but verify.
- [ ] Optionally migrate `KeyPairAuth` → `Ed25519Auth` in `src/lib/auth-provider.ts` /
      `src/hooks/use-auth.ts` (alias works; rename at leisure).

### Remaining venue-side gap → filed as covia#180
`v/ops/agent/list` and `v/ops/agent/info` have no job-free route: no
`GET /api/v1/agents`, and the registry is not reachable via the values API
(`values/list?path=g` → Nil, rootless). Proposal in the issue mirrors the assets
GET pattern.
