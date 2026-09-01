// Connection catalogue. Each entry is a third-party service a user can connect
// with their own token, mirroring the venue's `connections/*` skills. Adding a
// service here is data, not code: it drives the card, the guided add-flow, the
// live "test connection" check, token auto-detect, and the connected state.
//
// Keep `skillId` and `secretName` in lockstep with the matching skill in
// covia-ai/covia (venue/src/main/resources/skills/<id>.json).

export type ConnectionMethod = "token" | "key" | "basic" | "bot" | "app";

/** A cheap authenticated call used to validate a token and show what it sees. */
export type ConnectionVerify = {
  /** Run through v/ops/http/{get,post}. Default get. */
  method?: "get" | "post";
  /** Full URL (falls back to baseUrl + path if `path` given instead). */
  url?: string;
  path?: string;
  /** Body for POST/GraphQL verifies. */
  body?: unknown;
  /** Non-secret headers to add (e.g. Notion-Version). */
  headers?: Record<string, string>;
  /** Success message from the response body; return null to treat as failure. */
  label: (body: any) => string | null;
};

export type ConnectionService = {
  /** Stable id, matches the skill name: v/skills/connections/<id>. */
  id: string;
  name: string;
  method: ConnectionMethod;
  /** Secret name the token is stored under (e.g. GITHUB_TOKEN). */
  secretName: string;
  skillId: string;
  blurb: string;
  category: "Dev" | "Docs & PM" | "CRM & Support" | "Payments" | "Comms" | "Data";
  initials: string;
  color: string;
  /** Where the user creates the token. */
  tokenUrl: string;
  createSteps: string[];
  placeholder: string;
  /** API base + how the secret is presented. */
  baseUrl: string;
  /** "bearer" → bearerSecret (Authorization: Bearer …); "header" → secretHeaders (the stored value is the full header). */
  auth: "bearer" | "header";
  /** Header name for `auth: "header"` (default Authorization). */
  headerName?: string;
  /** Optional live validation call. */
  verify?: ConnectionVerify;
  /** Token prefixes for paste-to-detect (distinctive ones only). */
  detect?: string[];
};

export const CONNECTIONS: ConnectionService[] = [
  {
    id: "github", name: "GitHub", method: "token", secretName: "GITHUB_TOKEN", skillId: "connections/github",
    blurb: "Repos, issues, and pull requests.", category: "Dev", initials: "GH", color: "#1B1F23",
    tokenUrl: "https://github.com/settings/tokens?type=beta",
    createSteps: ["GitHub → Settings → Developer settings → Fine-grained tokens.", "Grant only the repositories your agents should see.", "Paste the token (starts with github_pat_)."],
    placeholder: "github_pat_…", baseUrl: "https://api.github.com", auth: "bearer",
    verify: { path: "/user", headers: { Accept: "application/vnd.github+json" }, label: (b) => (b?.login ? `Connected as @${b.login}` : null) },
    detect: ["github_pat_", "ghp_", "gho_"],
  },
  {
    id: "notion", name: "Notion", method: "token", secretName: "NOTION_TOKEN", skillId: "connections/notion",
    blurb: "Read and write pages and databases.", category: "Docs & PM", initials: "N", color: "#000000",
    tokenUrl: "https://www.notion.so/my-integrations",
    createSteps: ["Notion → Settings → Connections → Develop or manage integrations → New integration.", "Share the pages/databases you want with the integration.", "Paste the internal integration secret (ntn_ or secret_)."],
    placeholder: "ntn_… / secret_…", baseUrl: "https://api.notion.com/v1", auth: "bearer",
    verify: { path: "/users/me", headers: { "Notion-Version": "2022-06-28" }, label: (b) => (b?.name ? `Connected as ${b.name}` : b?.id ? "Connected" : null) },
    detect: ["ntn_", "secret_"],
  },
  {
    id: "slack", name: "Slack", method: "app", secretName: "SLACK_TOKEN", skillId: "connections/slack",
    blurb: "Post to channels and read messages.", category: "Comms", initials: "SL", color: "#611F69",
    tokenUrl: "https://api.slack.com/apps",
    createSteps: ["api.slack.com/apps → Create New App → From scratch, in your workspace.", "Add the OAuth scopes you need, then Install to Workspace.", "Paste the Bot User OAuth Token (starts with xoxb-)."],
    placeholder: "xoxb-…", baseUrl: "https://slack.com/api", auth: "bearer",
    verify: { path: "/auth.test", label: (b) => (b?.ok ? `Connected to ${b.team}` : b?.error ? `Slack: ${b.error}` : null) },
    detect: ["xoxb-", "xoxp-"],
  },
  {
    id: "hubspot", name: "HubSpot", method: "token", secretName: "HUBSPOT_TOKEN", skillId: "connections/hubspot",
    blurb: "CRM contacts, companies, and deals.", category: "CRM & Support", initials: "HS", color: "#FF7A59",
    tokenUrl: "https://app.hubspot.com/",
    createSteps: ["HubSpot → Settings → Integrations → Private Apps → Create.", "Grant the CRM scopes you need.", "Paste the private-app access token (starts with pat-)."],
    placeholder: "pat-…", baseUrl: "https://api.hubapi.com", auth: "bearer",
    verify: { path: "/account-info/v3/details", label: (b) => (b?.portalId ? `Connected (portal ${b.portalId})` : null) },
    detect: ["pat-na", "pat-eu"],
  },
  {
    id: "jira", name: "Jira", method: "basic", secretName: "ATLASSIAN_AUTH", skillId: "connections/jira",
    blurb: "Issues, JQL search, transitions.", category: "Docs & PM", initials: "J", color: "#0B5CFF",
    tokenUrl: "https://id.atlassian.com/manage-profile/security/api-tokens",
    createSteps: ["id.atlassian.com → Security → Create API token.", "Base64-encode your-email:the-token.", "Paste the complete header value: Basic <that base64>."],
    placeholder: "Basic …", baseUrl: "", auth: "header",
    // Jira's host is per-user, so a generic verify isn't possible without the site URL.
    detect: ["Basic "],
  },
  {
    id: "linear", name: "Linear", method: "key", secretName: "LINEAR_API_KEY", skillId: "connections/linear",
    blurb: "Issues, teams, projects (GraphQL).", category: "Docs & PM", initials: "L", color: "#5E6AD2",
    tokenUrl: "https://linear.app/settings/api",
    createSteps: ["Linear → Settings → Security & access → API → Personal keys.", "Create a key with the access you need.", "Paste the key as-is (starts with lin_api_)."],
    placeholder: "lin_api_…", baseUrl: "https://api.linear.app", auth: "header",
    verify: { method: "post", path: "/graphql", body: { query: "{ viewer { name } }" }, label: (b) => (b?.data?.viewer?.name ? `Connected as ${b.data.viewer.name}` : null) },
    detect: ["lin_api_"],
  },
  {
    id: "stripe", name: "Stripe", method: "key", secretName: "STRIPE_KEY", skillId: "connections/stripe",
    blurb: "Customers, charges, invoices.", category: "Payments", initials: "S", color: "#635BFF",
    tokenUrl: "https://dashboard.stripe.com/apikeys",
    createSteps: ["Stripe → Developers → API keys → Create restricted key.", "Grant read-only unless writes are needed.", "Paste the restricted key (starts with rk_)."],
    placeholder: "rk_live_… / rk_test_…", baseUrl: "https://api.stripe.com/v1", auth: "bearer",
    verify: { path: "/balance", label: (b) => (b?.object === "balance" ? "Connected" : b?.available ? "Connected" : null) },
    detect: ["rk_live_", "rk_test_", "sk_live_", "sk_test_"],
  },
  {
    id: "airtable", name: "Airtable", method: "token", secretName: "AIRTABLE_TOKEN", skillId: "connections/airtable",
    blurb: "Bases and records.", category: "Data", initials: "AT", color: "#FCB400",
    tokenUrl: "https://airtable.com/create/tokens",
    createSteps: ["airtable.com/create/tokens → Create token.", "Grant the bases and data.records scopes you need.", "Paste the personal access token (starts with pat)."],
    placeholder: "pat…", baseUrl: "https://api.airtable.com/v0", auth: "bearer",
    verify: { url: "https://api.airtable.com/v0/meta/whoami", label: (b) => (b?.id ? "Connected" : null) },
    detect: ["patZ", "patX", "pat.", "pat_"],
  },
  {
    id: "discord", name: "Discord", method: "bot", secretName: "DISCORD_BOT_TOKEN", skillId: "connections/discord",
    blurb: "Post messages, read channels.", category: "Comms", initials: "DC", color: "#5865F2",
    tokenUrl: "https://discord.com/developers/applications",
    createSteps: ["discord.com/developers → your app → Bot → Reset Token.", "Invite the bot to your server with the scopes you need.", "Paste the complete header value: Bot <token>."],
    placeholder: "Bot …", baseUrl: "https://discord.com/api/v10", auth: "header",
    verify: { path: "/users/@me", label: (b) => (b?.username ? `Connected as ${b.username}` : null) },
    detect: ["Bot "],
  },
  {
    id: "asana", name: "Asana", method: "token", secretName: "ASANA_TOKEN", skillId: "connections/asana",
    blurb: "Tasks, projects, workspaces.", category: "Docs & PM", initials: "AS", color: "#F06A6A",
    tokenUrl: "https://app.asana.com/0/my-apps",
    createSteps: ["Asana → Settings → Apps → Developer apps → Personal access tokens.", "Create a token.", "Paste it (starts with 1/ or 2/)."],
    placeholder: "1/…", baseUrl: "https://app.asana.com/api/1.0", auth: "bearer",
    verify: { path: "/users/me", label: (b) => (b?.data?.name ? `Connected as ${b.data.name}` : null) },
    detect: ["1/", "2/"],
  },
  {
    id: "intercom", name: "Intercom", method: "token", secretName: "INTERCOM_TOKEN", skillId: "connections/intercom",
    blurb: "Contacts and conversations.", category: "CRM & Support", initials: "IC", color: "#1F8DED",
    tokenUrl: "https://app.intercom.com/a/developer-signup",
    createSteps: ["Intercom → Settings → Developers → Developer Hub → your app.", "Copy the workspace access token from Authentication.", "Paste the access token."],
    placeholder: "dG9r…", baseUrl: "https://api.intercom.io", auth: "bearer",
    verify: { path: "/me", headers: { "Intercom-Version": "2.11" }, label: (b) => (b?.email ? `Connected as ${b.email}` : b?.name ? `Connected as ${b.name}` : null) },
  },
  {
    id: "sentry", name: "Sentry", method: "token", secretName: "SENTRY_TOKEN", skillId: "connections/sentry",
    blurb: "Issues, events, projects.", category: "Dev", initials: "SN", color: "#362D59",
    tokenUrl: "https://sentry.io/settings/account/api/auth-tokens/",
    createSteps: ["Sentry → Settings → Auth Tokens → Create New Token.", "Scope it project:read, event:read, org:read.", "Paste the token (starts with sntryu_)."],
    placeholder: "sntryu_…", baseUrl: "https://sentry.io/api/0", auth: "bearer",
    verify: { url: "https://sentry.io/api/0/organizations/", label: (b) => (Array.isArray(b) ? `Connected (${b.length} org${b.length === 1 ? "" : "s"})` : null) },
    detect: ["sntryu_"],
  },
  {
    id: "sendgrid", name: "SendGrid", method: "key", secretName: "SENDGRID_KEY", skillId: "connections/sendgrid",
    blurb: "Send transactional email, read stats.", category: "Comms", initials: "SG", color: "#1A82E2",
    tokenUrl: "https://app.sendgrid.com/settings/api_keys",
    createSteps: ["SendGrid → Settings → API Keys → Create API Key.", "Scope to Mail Send (or read-only).", "Paste the key (starts with SG.)."],
    placeholder: "SG.…", baseUrl: "https://api.sendgrid.com/v3", auth: "bearer",
    verify: { path: "/scopes", label: (b) => (Array.isArray(b?.scopes) ? "Connected" : null) },
    detect: ["SG."],
  },
  {
    id: "twilio", name: "Twilio", method: "basic", secretName: "TWILIO_AUTH", skillId: "connections/twilio",
    blurb: "Send SMS, read message logs.", category: "Comms", initials: "TW", color: "#F22F46",
    tokenUrl: "https://console.twilio.com/",
    createSteps: ["Twilio Console → Account Info (Account SID + Auth Token).", "Base64-encode AccountSID:AuthToken.", "Paste the complete header value: Basic <that base64>."],
    placeholder: "Basic …", baseUrl: "https://api.twilio.com/2010-04-01", auth: "header",
    verify: { url: "https://api.twilio.com/2010-04-01/Accounts.json", label: (b) => (Array.isArray(b?.accounts) ? "Connected" : null) },
    detect: ["Basic "],
  },
];

export const CONNECTION_CATEGORIES = [
  "Dev", "Docs & PM", "CRM & Support", "Payments", "Comms", "Data",
] as const;

/** Match a pasted token to a service by its distinctive prefix. Ambiguous → null. */
export function detectService(token: string): ConnectionService | null {
  const t = token.trim();
  if (!t) return null;
  const hits = CONNECTIONS.filter((s) => s.detect?.some((p) => t.startsWith(p)));
  return hits.length === 1 ? hits[0] : null;
}
