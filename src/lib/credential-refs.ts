import { CONNECTIONS, connectionSecrets, type ConnectionService } from "@/config/connections";

// Which credentials an HTTP call used, read from its recorded input. Since
// covia-ai/covia#561 the venue keeps credential *references* in job inputs
// (`s/GITHUB_TOKEN`, `oauth/github`) and never the values, so the input alone
// says which connection a call went through (frontend#291). Venues before that
// recorded these fields as HIDDEN; anything that isn't a reference is ignored.
//
// The places a reference can sit mirror buildVerifyCall:
//  - `bearerSecret`        → "s/NAME" or "oauth/<provider>"
//  - `secretHeaders`       → header name → "s/NAME"
//  - `url`                 → "{s/NAME}" placeholders (Telegram, Zendesk site)

export type CredentialRef = {
  /** As recorded, e.g. "s/GITHUB_TOKEN" or "oauth/github". */
  ref: string;
  kind: "secret" | "oauth";
  /** The secret name or OAuth provider. */
  name: string;
};

export type CredentialUse = {
  /** The connection these references belong to, when one matches. */
  connection?: ConnectionService;
  /** Display label: the connection's name, else the bare reference. */
  label: string;
  refs: CredentialRef[];
};

const SECRET_REF = /^s\/([A-Za-z0-9_]+)$/;
const OAUTH_REF = /^oauth\/([A-Za-z0-9_.-]+)$/;
const URL_PLACEHOLDER = /\{(s\/[A-Za-z0-9_]+)\}/g;

function parseRef(value: unknown): CredentialRef | null {
  if (typeof value !== "string") return null;
  const secret = SECRET_REF.exec(value);
  if (secret) return { ref: value, kind: "secret", name: secret[1] };
  const oauth = OAUTH_REF.exec(value);
  if (oauth) return { ref: value, kind: "oauth", name: oauth[1] };
  return null;
}

/** Credential references in an HTTP call's input, in field order, deduplicated. */
export function credentialRefsOf(input: unknown): CredentialRef[] {
  if (input == null || typeof input !== "object" || Array.isArray(input)) return [];
  const fields = input as Record<string, unknown>;
  const found: CredentialRef[] = [];
  const add = (ref: CredentialRef | null) => {
    if (ref && !found.some((f) => f.ref === ref.ref)) found.push(ref);
  };

  add(parseRef(fields.bearerSecret));
  const headers = fields.secretHeaders;
  if (headers && typeof headers === "object" && !Array.isArray(headers)) {
    for (const value of Object.values(headers)) add(parseRef(value));
  }
  if (typeof fields.url === "string") {
    for (const match of fields.url.matchAll(URL_PLACEHOLDER)) add(parseRef(match[1]));
  }
  return found;
}

function connectionFor(ref: CredentialRef): ConnectionService | undefined {
  if (ref.kind === "oauth") return CONNECTIONS.find((c) => c.id === ref.name);
  return CONNECTIONS.find((c) => connectionSecrets(c).some((s) => s.name === ref.name));
}

/** Group a call's credential references by connection, e.g. Datadog's API and
 *  app keys become one use. References that match no connection stand alone. */
export function credentialUsesOf(input: unknown): CredentialUse[] {
  const uses: CredentialUse[] = [];
  for (const ref of credentialRefsOf(input)) {
    const connection = connectionFor(ref);
    const existing = connection && uses.find((u) => u.connection?.id === connection.id);
    if (existing) {
      existing.refs.push(ref);
      continue;
    }
    uses.push({ connection, label: connection?.name ?? ref.ref, refs: [ref] });
  }
  return uses;
}
