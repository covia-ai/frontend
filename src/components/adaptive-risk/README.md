# Adaptive Risk demo

A guided walkthrough, inside the Covia app, of three agents and one policy
gate. Fictional issuer **Meridian Bank Singapore**, thin-file starter card,
base limit **S$500**, twelve synthetic applicants.

It runs on whatever venue you have selected, using operations you register
yourself from the page. Every beat is a real job on that venue; a failure is
shown as a failure, with the venue's own error string.

> **All data here is synthetic.** Twelve applicants, one fictional bank.
> Nothing describes a real person, device or lender. The page carries a
> permanent panel stating exactly what is real and what is not — read it
> before showing this to anyone.

## The claim it makes

The credit agent cannot issue a limit unless the fraud agent's signals pass a
policy gate. Credit and fraud are not integrated by a model; they are joined
at the execution layer, and the join is enforced by the runtime.

| Entity | Role | Authority (`config.caps`) |
|---|---|---|
| `rk-sentinel` | fraud signals | read applications; write signals and flags |
| `rk-assessor` | credit decisions | read applications + signals; write decisions; **invoke `issue-limit` gated by the limit gate** |
| `rk-monitor` | drift watch | read signals and cohort windows; invoke `hitl:request` |
| limit gate | the policy itself, as an ordinary content-addressed operation | — |

Only the assessor holds any grant to `issue-limit`, and that grant is
conditional (`nb: { gate: … }`). The sentinel and the monitor hold none.

## Run it against a local venue

1. **Start a venue** (from `covia-repo`):

   ```bash
   java -jar venue/target/covia.jar dev/local.json
   ```

   For local development the config wants `users.autoCreate: true` so the app
   can admit a fresh browser device key, and `auth.public.caps: "unrestricted"`
   if you want anonymous seeding to work. Both are local-only settings — see
   `venue/docs/CONFIG.md`.

2. **Point the app at it.** `NEXT_PUBLIC_IS_ENV_PROD=false` in
   `frontend/.env.local` adds `http://127.0.0.1:8080` to the venue list, then
   pick it in the top-right venue selector.

3. **Sign in.** Seeding writes into *your* namespace and the Inbox beat needs
   you to answer as yourself, so the demo requires a signed-in identity — a
   generated device key is enough.

4. **Add an LLM key.** The agents call a provider through the venue. Add your
   key under **Secrets** with the name the provider expects (default:
   `OPENAI_API_KEY` for `v/ops/langchain/openai`). The key is stored in the
   venue's per-user encrypted secret store, under your DID.

5. **Run setup**, then the beats in order.

Any venue works, not just a local one — the only requirement is an identity
that venue admits. The public Covia venues do not auto-create users, so ask
an operator to admit your DID first.

## Swap in your own operations

Every address is editable in the setup panel **before** anything is
registered, and your edits are persisted per browser:

| Field | What it is |
|---|---|
| Data root | `w/risk` — applications, signals, flags, decisions, windows live under it |
| Limit gate operation | the gate the assessor's grant is conditional on |
| Issue-limit operation | the decision-writing operation |
| Policy operation | content-addressed; left empty, setup registers ours and fills in the hash |
| Agent ids | `rk-sentinel`, `rk-assessor`, `rk-monitor` |
| LLM provider operation / Model | e.g. `v/ops/langchain/openai`; empty model = provider default |

Point any of them at something you already run and setup will use yours
instead of registering its own. Setup checks each address before writing, so
re-running is a no-op rather than a duplicate.

### How the policy is expressed

The policy operation's **output schema is the policy**:

```jsonc
{ "amount": { "type": "number", "maximum": 500 },
  "deviceFlagged": { "const": false } }
```

The gate is a `strict` orchestrator operation that reads the device-flag
ledger, composes a verdict, and pipes it through that policy operation. A
verdict that violates the schema fails the step, which fails the gate, which
denies the invocation — all venue-side. To change the policy, register your
own operation with a different output schema and put its address in the
setup panel.

## Tear down

The **Tear down** button removes what setup created on this venue: the data
subtree (`w/risk`), the gate and issue-limit operation addresses, and the
three agents.

Two things deliberately survive:

- **Job records.** They are the audit trail — the point of the demo.
- **The content-addressed policy asset.** Assets are immutable and there is no
  asset-delete in the SDK. It remains on the venue, unreferenced and inert.

## Development notes

- Reads are job-free (`workspace.read` / `list`); only user-driven actions
  invoke. See `AGENTS.md` — a non-user-driven `invoke` is a defect.
- Beat failures render `jobData.error` verbatim, deliberately **not** through
  `friendlyError()`, which rewrites denials to "Access denied" and would
  destroy the point of beat 3.
- A failed transition suspends an agent by design; beats clear that on the
  Run click, which is the operator's decision to retry.
- Narration lives in `story.ts` as data. Per `JOBS.md`, recovery *stabilises
  and never re-executes* — this demo says **reconstruct**, and a test asserts
  the word "replay" appears nowhere.
