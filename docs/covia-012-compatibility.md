# Covia 0.12 compatibility

This pass prepares the existing frontend flows for the upcoming venue release.
It retains the upstream SDK 1.29.0 dependency and transitional support for older
response shapes. It is not release-candidate certification.

Reviewed against frontend upstream `042c62f`, SDK 1.29.0 and local Covia
develop through `ef91bf2c`. The latter includes the capability contract review
and token/callable issuance narrowing; frontend grant failures continue to be
reported rather than retried with broader authority.

## Implemented

- Covia session selection and chat results normalize hexadecimal IDs to bare,
  lowercase hex. Comparisons also accept `0x` and `0X` prefixes. Pending chat
  echoes, watched jobs and inbox deep links match either spelling. Opaque IDs
  retain their spelling; external A2A task/context IDs are passed through.
  Operation asset lookups and adapter icons also accept either prefix case,
  including hashes within `a/` references; abbreviated job labels show one
  prefix even when the server sends `0X`.
- Job controls accept both older metadata responses and 0.12 acknowledgements.
  Connected-agent cancellation uses `venue.jobs.cancel(id)`, avoiding SDK
  1.29's `Job.cancel()` metadata replacement. The UI reports acceptance rather
  than claiming that a remote task has stopped; failures remain visible.
  GET/SSE remain the source of job status and output.
- Inbox reads accept `caller`, the older `from`, or an omitted self caller.
  The implicit caller is the authenticated account holding the inbox, never
  the venue DID. Both full and paged reads apply the same interpretation, so
  token approvals retain their correct default audience.
- Agent profiles display the reported controller. Venues that omit it retain
  the previous owner fallback.
- Capability choices include the new job, schedule, token, callable and
  administration abilities. Older administration names remain explicitly
  labelled for pre-0.12 venues. Existing grants are never rewritten or
  automatically broadened.
- Schedule reads retain the new optional resource `id` and accept the older
  `by` attribution. Qualified agent references are not linked as local IDs.

## Validation and release follow-up

Regression fixtures cover both ID spellings, new-session follow-up, pending
message deduplication, cancellation acknowledgements/refusals, implicit and
legacy inbox callers, and controller attribution. Local validation passed:
`pnpm lint`, `pnpm typecheck`, `pnpm test --runInBand` (242 suites, 2,061 tests)
and `pnpm build`. No local venue was listening on port 8080, so live venue
checks remain outstanding.

Before finalizing against the released venue:

1. Exercise sign-in, create/chat/follow-up/reload, job polling/SSE and controls
   against the exact 0.12 release candidate and the older venue kept in service.
2. Verify restricted job/read, job/manage and job/message grants independently;
   test scheduling, disabled adapters and remote cancellation refusal.
3. Answer ordinary and grant-bearing HITL requests through direct device-key
   and OAuth sign-ins, including self requests and requests from agents.
4. Recheck the SDK release: its Job instance control methods should understand
   acknowledgements without overwriting metadata. Keep using manager controls
   until that contract is fixed upstream.

Dedicated access-token management, callable discovery/schema resolution and
operator adapter-health/restart screens remain separate feature work. These
are not provided by this compatibility pass.
