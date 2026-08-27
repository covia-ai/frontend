// Covia Terms of Service v1.0 (effective 2026-08-14), approved by Chirdeep
// Chhabra 2026-08-14. Edit the markdown below to change the published page.
export const TERMS_OF_SERVICE_MD = `
**Effective date: 14 August 2026** · Version 1.0

## 1. Who we are and what these terms cover

These terms are an agreement between you and **COVIA LABS PTE. LTD.** (UEN 202534334M, 1 Irving Place, #08-11 The Commerze@Irving, Singapore 369546) ("Covia", "we") governing your use of our **hosted services**: the Covia App at app.covia.ai, the venues we operate (venue-1 through venue-4 and venue-test.covia.ai), and our documentation and websites.

They do **not** govern the open-source software. The venue runtime is licensed under the Eclipse Public License 2.0 and the SDKs under the Apache License 2.0; those licences alone govern your use of the code, including self-hosting. A venue you or anyone else self-hosts is that operator's service, on that operator's terms.

By using the hosted services you accept these terms. If you use them on behalf of an organisation, you confirm you have authority to bind it.

## 2. The services, honestly described

Covia is pre-1.0 infrastructure under active development. The hosted services are provided as a public beta: interfaces and APIs may change, venues may be updated or restarted, and **venue-test is a scratch venue whose data may be cleared at any time without notice**. We currently offer no service-level agreement. We will communicate breaking changes through the app, the documentation, or our repositories.

## 3. Identity, accounts, and keys

You authenticate with a device key you generate (your private key stays with you) or through an OAuth provider. **You are responsible for the security of your keys and tokens.** Actions signed by your key or performed under your session are attributed to your DID; if a key is compromised, revoke or stop using it and contact us. We may set reasonable limits (rate limits, concurrent-job caps, storage quotas) to protect the service for everyone.

## 4. Your content

You retain all rights to the content you store on our venues (assets, workspace data, agent configurations, files). You grant us the licence needed to host, process, replicate, and transmit that content solely to provide the services, including federated delivery you initiate to other venues. You are responsible for what you store and share: you confirm you have the rights to it and that it does not violate law or these terms. Personal data is handled per our [Privacy Policy](/privacypolicy).

Content you explicitly publish (public assets, marketplace listings, A2A-public agents) is visible to others by your choice and may be copied by them under whatever terms you attach to it.

## 5. Agents act on your authority

This is the clause to read twice. Covia lets you create and run autonomous agents and grant capabilities to people, agents, and other venues.

- Operations run by your agents, under your keys, sessions, or capability grants, are **your actions**. You are responsible for them as if you performed them directly.
- A capability grant (UCAN) you sign or approve is your authorisation, to exactly the scope shown when you approved it. Review scopes before consenting; the app will always show you what is being requested.
- Human-in-the-loop approvals you give are your decisions, and are recorded in the relevant job.
- When your operations call third-party services (LLM providers under your API keys, external MCP servers, systems reached via HTTP operations), your use of those services is governed by their terms, and the costs they charge you are yours.
- The service records execution in job records and agent timelines by design. This audit trail is a feature of the product; do not use the services if you require execution without records.

## 6. Acceptable use

Do not use the hosted services to: break the law or infringe others' rights; store or distribute malware or unlawful content; send spam or conduct unauthorised outreach through connected integrations; attempt to bypass capability enforcement, access other users' data without authorisation, or probe or disrupt the infrastructure; misrepresent your identity or a venue's identity; resell the hosted services as your own without agreement; or place excessive load that degrades the service. Security research is welcome against your own self-hosted venues under the open-source licences; for our hosted venues, contact us for permission first.

We may suspend or restrict access that we reasonably believe violates this section, with notice where practicable.

## 7. Fees

The hosted services are currently free. If we introduce fees we will announce them in advance, and continued use after the effective date of a fee schedule constitutes acceptance. Charges from third parties you connect (LLM providers, external services) are always yours.

## 8. Intellectual property

The Covia name, logo, and branding are ours; these terms grant no rights to them. The open-source code remains under its licences (EPL-2.0 runtime, Apache-2.0 SDKs); nothing in these terms narrows the rights those licences grant you. If you send us feedback or suggestions, you grant us a perpetual, irrevocable, royalty-free licence to use them without restriction.

## 9. Third-party services

The services interoperate with third parties you choose: OAuth identity providers, LLM providers, MCP servers, A2A agents, and venues operated by others. We are not responsible for third-party services, their availability, or their handling of your data. A venue operated by a third party is entirely between you and that operator, even when you reach it through the Covia App.

## 10. Disclaimers

The hosted services are provided **"as is" and "as available"**, without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, and non-infringement, to the maximum extent permitted by law. AI-generated outputs can be wrong; you are responsible for reviewing agent outputs and for any action taken on them. We do not warrant that the services will be uninterrupted, error-free, or that data will never be lost; keep copies of anything you cannot afford to lose (the architecture makes this easy: pull your assets to a venue you control).

## 11. Liability

To the maximum extent permitted by law: we are not liable for indirect, incidental, special, consequential, or punitive damages, or for lost profits, revenue, data, or goodwill; and our total aggregate liability for all claims relating to the hosted services is limited to the greater of the fees you paid us in the twelve months before the claim and **SGD 100**. Nothing in these terms excludes liability that cannot be excluded under applicable law (including under Singapore's Unfair Contract Terms Act where it applies).

## 12. Indemnity

You will indemnify us against third-party claims arising from your content, your agents' actions under your authority, or your breach of these terms, except to the extent we caused the harm.

## 13. Termination

You may stop using the services and delete your data at any time; the app and API give you self-service deletion, and content addressing means you can take your assets with you. We may suspend or terminate access for breach of these terms or where the law requires, with notice where practicable. After account closure we will make your data available for export for **30 days**, then delete it in line with the Privacy Policy's retention rules.

## 14. Governing law and disputes

These terms are governed by the laws of **Singapore**. Disputes are subject to the exclusive jurisdiction of the courts of Singapore. Before filing anything, talk to us; most issues are resolvable at privacy@covia.ai.

## 15. Changes to these terms

We may update these terms as the services evolve. We will post the new version with its effective date and, for material changes, notify signed-in users in the app. Continued use after the effective date constitutes acceptance.

## 16. General

If a provision is unenforceable, the rest stands. Our failure to enforce a provision is not a waiver. You may not assign these terms without our consent; we may assign them in connection with a merger, acquisition, or asset sale. These terms plus the Privacy Policy are the entire agreement for the hosted services; the open-source licences stand on their own.

## Contact

COVIA LABS PTE. LTD. (UEN 202534334M)
1 Irving Place, #08-11 The Commerze@Irving, Singapore 369546 · privacy@covia.ai
`;
