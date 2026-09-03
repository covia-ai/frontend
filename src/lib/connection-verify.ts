import type { ConnectionService } from "@/config/connections";

/** The http op call that validates a service's token. */
export type VerifyCall = { op: string; input: Record<string, unknown> };

/**
 * Builds the `v/ops/http/*` call for a service's verify, or null if the service
 * has no generic verify (e.g. Jira, whose host is per-user). Every credential is
 * referenced by name, never inlined:
 *  - `bearer`  → `bearerSecret: s/<secretName>`
 *  - `header`  → `secretHeaders`: the service's `secretHeaders` map when set
 *                (multi-header, e.g. Datadog), else the single
 *                `{ [headerName ?? Authorization]: s/<secretName> }`
 *  - `url`     → the value(s) ride the URL as `{s/NAME}` placeholders the venue
 *                resolves; a site subdomain in `baseUrl` works the same way
 *                alongside a bearer/header token.
 */
export function buildVerifyCall(service: ConnectionService): VerifyCall | null {
  const v = service.verify;
  if (!v) return null;
  const url = v.url ?? service.baseUrl + (v.path ?? "");
  const secretRef = `s/${service.secretName}`;
  const input: Record<string, unknown> = { url, headers: { ...(v.headers ?? {}) } };
  if (service.auth === "bearer") input.bearerSecret = secretRef;
  else if (service.auth === "header")
    input.secretHeaders = service.secretHeaders ?? { [service.headerName ?? "Authorization"]: secretRef };
  // auth === "url": the value(s) ride the URL via {s/NAME}; no header to add.
  if (v.method === "post") input.body = v.body;
  return { op: v.method === "post" ? "v/ops/http/post" : "v/ops/http/get", input };
}

/**
 * Interprets an http op result against a service's verify label. Returns the
 * success message, or throws a "<Service> rejected the token" error.
 *
 * The op returns `body` as a JSON string, so it is parsed before the label
 * reads fields off it — otherwise a valid 200 with a real body still fails
 * every `b?.field` check and reads as a rejection. A non-JSON body is left as
 * the raw string for the label to handle.
 */
export function interpretVerify(service: ConnectionService, out: any): string {
  const v = service.verify;
  if (!v) throw new Error(`${service.name} has no verification.`);
  let body: any = out?.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      /* non-JSON: keep the string */
    }
  }
  // Some APIs (e.g. Slack) 200 with an error body, so the per-service label is
  // the source of truth: a non-null label is success, null is a rejection.
  const label = v.label(body);
  if (label) return label;
  const status = out?.status;
  const detail =
    body?.message ??
    body?.error ??
    body?.errors?.[0]?.message ??
    body?.description ??
    body?.detail ?? // Sentry, and other DRF-based APIs, put the reason here
    "";
  throw new Error(
    `${service.name} rejected the token${status ? ` (${status})` : ""}${detail ? `: ${detail}` : ""}`,
  );
}
