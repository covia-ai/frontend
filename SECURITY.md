# Security Policy

This repository is the Covia web app, served at [app.covia.ai](https://app.covia.ai). It holds users' device keys and venue tokens in the browser and talks to Covia venues on their behalf, so we take security reports seriously and appreciate the time researchers spend to make it safer.

## Reporting a vulnerability

**Please do not open a public issue, discussion, or pull request for a security vulnerability.**

Report privately through one of:

- **GitHub Private Vulnerability Reporting** (preferred) — on this repository, go to the **Security** tab → **Report a vulnerability**. This keeps the report and our coordination private until a fix is ready.
- **Email** — [security@covia.ai](mailto:security@covia.ai). Encrypt with our PGP key if you can; if you need the key, ask in the first (unencrypted) message and we'll respond.

Please include, as far as you can:

- a description of the issue and its impact;
- the affected page or component, and the commit (`git rev-parse HEAD`) if you tested a local build;
- steps to reproduce, a proof of concept, or a failing request;
- any suggested remediation.

## What to expect

- **Acknowledgement** within **3 business days**.
- An initial **assessment and severity** within **10 business days**.
- Regular updates as we work on a fix, and credit once it ships (unless you prefer to remain anonymous).
- **Coordinated disclosure:** we'll agree a disclosure timeline with you and publish an advisory when a fix is available. Please give us reasonable time to remediate before going public.

We will not pursue legal action against researchers who act in good faith, avoid privacy violations and service disruption, and follow this policy.

## Supported versions

Only the current deployment is supported. Fixes land on `develop` and reach app.covia.ai through `main`; there are no older releases to backport to.

## Scope

**In scope** — vulnerabilities in this repository and in app.covia.ai, including:

- cross-site scripting, HTML/Markdown injection, and other script execution in the app's origin;
- handling and storage of device keys, bearer tokens, and identity tokens in the browser;
- the OAuth sign-in callback and device-key sign-in flows;
- browser security headers and Content-Security-Policy;
- leaks of credentials or user data to third parties (including analytics).

**Out of scope** — typically not something we can fix here:

- vulnerabilities in a Covia venue server — report those to [covia-ai/covia](https://github.com/covia-ai/covia/security) (if you're unsure where a problem lives, report it here and we'll route it);
- venues you choose to connect to that are not operated by Covia;
- attacks that need a compromised device, browser, or malicious browser extension with full page access;
- vulnerabilities in dependencies that already have a public advisory and a fix available (open a normal issue or PR to bump them);
- missing best-practice headers or cookie flags with no demonstrated impact.
