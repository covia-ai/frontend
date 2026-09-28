// Covia Privacy Policy v1.3 DRAFT (not yet approved; supersedes v1.2 once approved).
//
// Version history and approvals:
//   v1.0  2026-08-14  approved by Chirdeep Chhabra 2026-08-14
//   v1.1  2026-08-27  approved by Chirdeep Chhabra 2026-08-29
//   v1.2  2026-08-28  approved by Chirdeep Chhabra 2026-08-29
//   v1.3  DRAFT       prepared 2026-09-28, pending approval by Chirdeep Chhabra
//
// None of these has been reviewed by external counsel. That is a separate
// question from the approvals above and is still outstanding.
//
// v1.1 added the connector.covia.ai paragraph. v1.2 covers the Phase 3
// analytics work (D070) and says four things the earlier text did not:
//
//   1. PostHog is named as a processor. Adding it at all, events only and no
//      replay, makes it a sub-processor, so this disclosure is what gates
//      NEXT_PUBLIC_POSTHOG_KEY, not just session recording.
//   2. The pseudonymous analytics identifier is disclosed: a truncated
//      one-way hash of the email for OAuth accounts, of the DID for device
//      keys, computed in the browser with neither raw value sent.
//   3. Retention is stated per vendor because they differ. GA4 is configured
//      to delete granular data at 14 months; PostHog has no deletion schedule
//      at all, since its plans set a guaranteed *minimum* retention and a paid
//      plan would raise that to seven years. One figure for both would have
//      been inaccurate whichever number was chosen.
//   4. The IP-derived approximate location both services record is disclosed,
//      along with the fact that the raw IP is discarded and never stored.
//
// v1.3 corrects the policy against what is actually deployed (CAIQ review,
// 28 Sep 2026) and adds one new retention class:
//
//   1. Hosting locations: venue-4 runs in Azure Central India, so India is
//      listed. If venue-4 moves to Singapore (decision D1, security#5),
//      remove India again.
//   2. Sub-processors: adds Vercel, GitHub, Microsoft Clarity, Sentry,
//      Sanity and Resend, which were in use but not named.
//   3. Website: discloses the contact, early-access and newsletter forms,
//      and that covia.ai (not the app) uses Microsoft Clarity with consent,
//      which records sessions. The old sentence "we do not record your
//      screen or session" is now scoped to the app, where it is true.
//   4. Security audit logs kept 12 months (POL-06), separate from 90-day
//      server logs. Minimal content: DID, IP address, action.
//   5. Deletion wording matches the append-only store: removed from the
//      live venue at once, purged from storage at the next compaction,
//      then from backups within 35 days. Backups are now actually taken
//      (daily, kept 35 days) on the hosted venues.
//   6. New section on requests from authorities (law enforcement).
//   7. Account closure on Covia-operated venues goes through
//      privacy@covia.ai, since there is no self-service account delete yet
//      (covia#536).
//
// On approval: set the effective date below and move PRIVACY_POLICY_VERSION
// in src/lib/consent.ts to the same date (this re-prompts every user, which
// is intended for a change of this size).
//
// Keep in step with PRIVACY_POLICY_VERSION in src/lib/consent.ts, which
// invalidates stored consent and re-prompts every user when it moves.
// No em dashes in the copy below (house style). Edit the markdown to change
// the page.
export const PRIVACY_POLICY_MD = `
**Effective date: [set on approval]** · Version 1.3 (draft)

## Introduction

This policy explains how **COVIA LABS PTE. LTD.** (UEN 202534334M, registered at 1 Irving Place, #08-11 The Commerze@Irving, Singapore 369546) ("Covia", "we") handles personal data when you use the Covia App at app.covia.ai, our hosted venues (venue-1 through venue-4 and venue-test.covia.ai), our documentation at docs.covia.ai, and our websites. It is written to meet the Singapore Personal Data Protection Act 2012 (PDPA) and the EU/UK General Data Protection Regulation (GDPR), and to be accurate about an architecture in which most of your data never passes through us at all.

Three structural facts shape everything below:

1. **The Covia App is a pure client.** It holds no server-side state of its own. Your device keys are generated and stored in your browser; your assets, jobs, agents, and workspace live on the venues you connect to.
2. **Venues are operated independently.** When you connect the app to a venue operated by someone other than Covia (including one you self-host), that operator is the data controller for what you store there. This policy covers only venues Covia operates and the app itself.
3. **The software is open source.** The venue runtime is licensed under EPL-2.0 and the SDKs under Apache-2.0. If you run your own venue, the software sends us nothing: no telemetry, no phone-home, no account requirement.

## Who is the controller?

- **app.covia.ai, docs.covia.ai, covia.ai, and Covia-operated venues:** COVIA LABS PTE. LTD. is the controller. Contact: **privacy@covia.ai**. Our Data Protection Officer under the PDPA is **Chirdeep Chhabra, Co-founder and CEO**, reachable at the same address.
- **Third-party venues you connect to:** the venue operator is the controller. The app shows you each venue's identity (its DID and host) before you sign in; review that operator's policy.
- **Self-hosted venues:** you (or your organisation) are the controller. Covia has no access.

## Information we collect

**On Covia-operated venues, when you choose to use them:**

- **Identity data**: your decentralised identifier (DID). With device-key sign-in this is a \`did:key\` derived from a public key your browser generated; the private key never leaves your device and we never receive it. With OAuth sign-in (Google, GitHub, Microsoft) we receive your name, email address, and provider identifier to create a named venue account.
- **Content you store**: assets you upload, workspace values, agent configurations, memory entries, and files. You control what this contains.
- **Execution records**: jobs are the audit record of every operation you run: inputs, outputs, timing, status, and the DID that ran them. Fields an operation marks as secret are redacted from these records by design.
- **Secrets**: API keys you store are encrypted (AES-256-GCM) such that only the storing venue can decrypt them; they are injected into operations at runtime, never shown back to you, never placed in prompts, and redacted from job records.
- **Operational and security logs**: standard server logs (IP address, user agent, request paths) for reliability, and a security audit log of sign-ins, token issuance, administrative actions and key changes (your DID, IP address and the action taken, never the content you store).

**On the app and websites:**

- **Local browser storage**: your venue list, device keys, session tokens, and preferences. Stored on your device, not our servers.
- **Forms on covia.ai**: if you contact us, request early access, or subscribe to our newsletter, we receive the details you enter, such as your name, email address, organisation and message, and use them to reply to you or send what you asked for. Newsletter emails include an unsubscribe link.
- **Analytics**: with your consent, usage events on app.covia.ai and our websites, processed by Google Analytics and PostHog. These record which pages and features are used, not what you put into them: we do not send your job inputs or outputs, asset contents, agent conversations, workspace data, or secrets to either service, and on app.covia.ai we do not record your screen or session. Where you are signed in, events carry a truncated one-way hash as a pseudonymous identifier, so that repeat visits can be counted as one person: derived from your email address if you signed in with OAuth, or from your DID if you use a device key. The hash is computed in your browser, cannot be reversed, and neither your email address nor your DID is sent to either service. Using the same hash our website uses is also what lets us find and delete your analytics records when you ask us to.

  Analytics events also carry an approximate location worked out from your IP address: country and city in both services, and in PostHog also a postal area and coordinates accurate to within a few kilometres. These describe roughly where your network connects from, not where your device is; they are looked up from the address block, not from GPS or any device sensor. **Your IP address itself is discarded during processing and is never stored with the events.** Declining non-essential cookies means neither service is loaded at all.

  **On covia.ai only**, analytics with your consent also include **Microsoft Clarity**, which records how pages are used, including recordings of clicks, scrolling and navigation on the website, so we can see where the site is confusing. Clarity is not used on app.covia.ai, and like the other analytics tools it is not loaded unless you opt in.

**What we deliberately do not collect:** private keys; secret values in readable form; the content of prompts you send to LLM providers under your own API keys; anything at all from self-hosted venues.

**The Covia connector for AI assistants (connector.covia.ai).** When you connect Covia to an AI assistant such as Claude or ChatGPT through connector.covia.ai, the connector stores three things, associated with the assistant's session: the venue you chose, your DID, and the capability grant you signed, with the grant encrypted at rest using AES-256-GCM. It does not receive or store your private key (the grant is signed in your browser, and only the signed grant is sent), your venue secrets, or your conversation with the assistant; the arguments and results of the tools the assistant calls are not retained beyond ephemeral request logs. Actions the assistant takes are delegated: they run on your venue under the grant you signed, are checked by the venue on every call, and appear in your venue's job records. The connector runs on Cloudflare (see Third-party services); retention of the grant and its tokens is covered under Data retention. You can revoke at any time by disconnecting the connector in Claude, ChatGPT, or whichever assistant you connected, or by letting the grant expire; revocation takes effect immediately.

## How we use information

We use personal data to: operate and secure the services (legal bases: performance of contract, and legitimate interests in security); authenticate you and enforce capability-based access control; maintain the execution audit trail that is a core, advertised feature of the product; respond to support requests; meet legal obligations; and, with consent, measure aggregate product usage. We do not sell personal data, and we do not use your venue content to train models.

**A note on LLM operations:** when you run an operation that calls an LLM provider (OpenAI, Anthropic, Google, DeepSeek, xAI, or a local model), your input is sent to that provider under the API key you supplied. That processing happens on your instruction, under your provider account and the provider's terms. Choose providers accordingly; local models via Ollama keep inference entirely on infrastructure you control.

## Cookies & tracking

app.covia.ai uses a consent banner with three categories: essential, analytics, and marketing. Essential storage (your venue list, keys, session state) is local to your browser and functions without consent because the app cannot work without it; it is not tracking. Analytics is off unless you opt in, and the most privacy-preserving choice is preselected: until you accept, neither Google Analytics nor PostHog is loaded. If your browser sends a Do Not Track signal we do not load them at all, whatever the banner says. The marketing category is reserved and currently sets nothing. You can change or withdraw your choice at any time from the Privacy Policy page in the app. We use no advertising trackers.

## Third-party services

Service providers that may process personal data on our behalf: cloud hosting (Google Cloud, Amazon Web Services, Microsoft Azure), Vercel (hosting of app.covia.ai and covia.ai), GitHub (source code, container images, and hosting of docs.covia.ai), Cloudflare (hosting and edge delivery of the connector at connector.covia.ai, including its encrypted grant store), Google Workspace (email and internal collaboration), Google Analytics and PostHog (product analytics, both only with consent; PostHog processes in the European Union), Microsoft Clarity (website analytics on covia.ai, only with consent), Sentry (error monitoring for covia.ai), Sanity (content management for covia.ai), Brevo (email communications and newsletter), Resend (delivery of emails sent from website forms), Notion (internal documentation), and customer-relationship-management tooling for handling enquiries. OAuth sign-in involves your chosen identity provider. A current sub-processor list is available on request at privacy@covia.ai.

## International transfers

Covia-operated venues and services are hosted in Singapore, India, the United States, and the European Union. Where personal data of EU/UK residents is transferred outside the EEA/UK, we rely on adequacy decisions or Standard Contractual Clauses; under the PDPA's transfer limitation obligation we ensure a comparable standard of protection wherever data goes. The federated design also gives you a structural option most services cannot: keep your data on a venue in the jurisdiction of your choice (including your own), and let only results cross borders.

## Data retention

- **Venue content and workspace data**: retained until you delete it or close your account.
- **Job records**: retained as your audit trail while your account is active; you may delete your own job records at any time (each deletion is itself an auditable action).
- **venue-test**: a scratch venue; data may be cleared at any time without notice and should never contain personal data you care about.
- **Server logs**: 90 days.
- **Security audit logs** (sign-ins, token issuance, administrative actions, key changes): 12 months, so that we can investigate and evidence security incidents. They hold only the identifiers and actions described above.
- **Analytics events**: in Google Analytics, granular events tied to the pseudonymous identifier are deleted after 14 months. In PostHog they are kept while your account is active, and we delete them on request. The aggregate reports derived from both (visit counts, page and feature popularity, traffic sources) are kept indefinitely and identify no one.
- **Connector grants and tokens**: a capability grant you sign through connector.covia.ai is stored, encrypted, until it expires or you revoke it; issued access tokens expire within one hour and refresh tokens within 30 days, and never outlive the grant; short-lived authorisation requests and codes are held only for minutes. Connector request logs follow the server-log period above.
- **Backups**: we back up Covia-operated venues daily and keep each backup for 35 days, so data purged from a venue leaves our backups within 35 days.

One architectural note, stated plainly: assets are content-addressed and job records immutable *while they exist*; immutability means tamper-evident history, not undeletable data. Deletion removes the record from the venue at once: it no longer appears anywhere in the service. Because the venue's storage is append-only, the underlying bytes are purged when that storage is next compacted, which we are putting on a regular schedule for our hosted venues, and then leave backups within 35 days; what has already been shared to another venue or downloaded by an authorised party is under that party's control, as with any data you share.

## Your rights and choices

**Everyone:** access, correct, and delete your data directly in the app (workspace, assets, jobs, secrets, and agents are all self-service); sign out per venue; delete device keys; decline analytics. To close your account on a Covia-operated venue and have your account record deleted, email privacy@covia.ai.

**GDPR (EU/UK residents):** rights of access, rectification, erasure, restriction, portability, and objection, and the right not to be subject to solely automated decisions with legal effect (we make none about you). You may complain to your supervisory authority; we would appreciate the chance to resolve concerns first.

**PDPA (Singapore):** rights of access and correction, and withdrawal of consent (we will explain the consequences, such as the service ceasing to function). We maintain the accountability, protection, retention-limitation, transfer-limitation, and data-breach-notification obligations the Act requires. Complaints may be made to the Personal Data Protection Commission.

**Portability, for real:** your assets and identity are content-addressed and DID-based. You can pull your assets to any venue, including one you self-host, at any time; portability is a property of the architecture, not a request form. Requests we must handle manually receive a response within 30 days.

## Requests from authorities

We disclose personal data to law enforcement or other public authorities only where the law requires it and the request is valid. We check the legal basis of every request, disclose only what is required, and record it. Unless the law forbids it, we tell the affected customer or user before we disclose, so that they can object. We do not give any authority direct or bulk access to our systems. Data on venues you self-host or that third parties operate is outside our control, and requests for it should go to that operator.

## Open source and self-hosting

The venue runtime (EPL-2.0) and SDKs (Apache-2.0) are free software you can run yourself. A self-hosted venue makes no connection to Covia: no accounts, no telemetry, no usage statistics. If we ever propose anonymous usage metrics for the open-source runtime it will be opt-in and documented in the open. Contributions to our repositories are public by nature (GitHub usernames, commit metadata) and governed by GitHub's terms and our contribution guidelines.

## Security

Ed25519 signatures for identity; capability-based authorisation (UCAN) with least privilege by default; per-user encrypted secret storage; TLS for all data in transit; and secret redaction in audit records by design. Data at rest on our hosted venues is protected by the cloud providers' infrastructure-level encryption and access controls; the runtime additionally offers application-level store encryption, which operators of any venue (including ours) can enable, and which we are evaluating for our hosted venues. If a breach affects your personal data we will notify the PDPC and/or the relevant supervisory authority and affected users within the legally required windows (72 hours where GDPR applies; as required under the PDPA's data-breach-notification obligation).

## Children

Our services are not directed at children under 13 (or the higher age your jurisdiction sets for information-society services, 16 in parts of the EU) and we do not knowingly collect their data.

## Changes to this policy

We will post changes here with an updated effective date, and for material changes notify signed-in users in the app. Where consent is required for a new purpose, we will ask.

## Contact

COVIA LABS PTE. LTD. (UEN 202534334M)
1 Irving Place, #08-11 The Commerze@Irving, Singapore 369546
privacy@covia.ai · Data Protection Officer: Chirdeep Chhabra, Co-founder and CEO
`;
