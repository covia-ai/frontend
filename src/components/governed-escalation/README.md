# Governed Escalation demo

A drift monitor watches a cohort metric. When it breaches its threshold the
monitor does not change policy and does not ask another agent — it escalates to
a person, and its work stops until that person decides. What they grant is a
capability with a real expiry, signed with their own key.

> **The cohort numbers are synthetic and the breach is scripted.** Covia has no
> drift metric; moving to week two is a fixture swap, and the page says so.
> Everything after the monitor reads those numbers is real.

## The two beats

| # | Beat | What is real |
|---|---|---|
| 1 | Drift becomes a governed event | `rk-monitor` reads both cohort windows under its own capped authority and reports the numbers. An ask is raised and its job **parks in `INPUT_REQUIRED`** — the wait is a recorded state. |
| 2 | A human decides | You answer in the **real Inbox** and sign the capability with your own device key. The parked job resumes, and the grant is verified here by the venue's own `ucan:verify`. |

## Two places the runtime differs from the obvious story

Both are stated on the page, not only here.

**The ask is raised by the page, not the agent.** Every agent tool call is
dispatched internally and the venue requires `hitl:request` to carry its own
job, so an agent cannot raise one at all on this build
([covia#316](https://github.com/covia-ai/covia/issues/316)). The monitor's
*analysis* is real and its finding is quoted into the ask verbatim.

**You sign the grant; the venue does not mint it.** A device-key sign-in is
self-sovereign, so the venue refuses to root-sign a grant over your own
namespace — verbatim: *"Self-sovereign DID owners must sign the UCAN with their
own key"*. The demo uses a COG-19 `token` ask: you sign, the venue transports
and verifies, and never holds the authority. The lifetime is capped at 7 days
by the venue ([covia#314](https://github.com/covia-ai/covia/issues/314)), and
the responder sets the real expiry — so what you sign may be shorter than what
was asked for. The panel reports the token's true expiry, not the request's.

## Run it

Same prerequisites as any demo here: a venue you can write to, a signed-in
identity, and that provider's API key in **Secrets**. See
`../adaptive-risk/README.md` for the local-venue walkthrough — it applies
unchanged.

Then **Run setup**, run beat 1, and answer the ask in your Inbox. Beat 1 stops
and waits for you: that pause is the point, not a hang.

## Tear down

Removes the demo's data subtree (`w/drift`) and the monitor agent.

Two things survive deliberately: job records, which are the audit trail; and
**Inbox records, which cannot be deleted at all** — `h/` is framework-managed
and not writable, by design. An unanswered ask can be withdrawn by cancelling
its parked job (from the Jobs page), which marks the record `cancelled` rather
than writing a decision that never happened.

## Related

[Adaptive Risk](../adaptive-risk/README.md) shows the other half of the same
picture: a policy gate that **refuses outright**, before execution, rather than
pausing for a human.
