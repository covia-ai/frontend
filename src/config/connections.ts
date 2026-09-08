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

/**
 * One stored value a connection collects during setup. Single-value connections
 * omit {@link ConnectionService.secrets} and are described by `secretName` /
 * `placeholder`; multi-value ones (a key + a token, or a site subdomain + a
 * token) list each value here, collected in setup order.
 */
export type SecretField = {
  /** Stored under `s/<name>`; must match /^[A-Z0-9_]+$/. */
  name: string;
  /** UI label for the field, e.g. "API key", "App key", "Site". */
  label: string;
  placeholder?: string;
};

export type ConnectionService = {
  /** Stable id, matches the skill name: v/skills/connections/<id>. */
  id: string;
  name: string;
  method: ConnectionMethod;
  /** Secret name the token is stored under (e.g. GITHUB_TOKEN). For a
   *  multi-value connection this is the primary auth credential (the one used by
   *  `bearer` / single-`header` verify) and must be one of `secrets`. */
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
  /** "bearer" → bearerSecret (Authorization: Bearer …); "header" → secretHeaders
   *  (the stored value is the full header); "url" → the token rides in the URL
   *  itself via an {s/NAME} placeholder (e.g. Telegram's /bot<token>/), so no
   *  auth header is added. */
  auth: "bearer" | "header" | "url";
  /** Header name for `auth: "header"` (default Authorization). */
  headerName?: string;
  /** Optional live validation call. */
  verify?: ConnectionVerify;
  /** Token prefixes for paste-to-detect (distinctive ones only). */
  detect?: string[];
  /** Multi-value connections (Phase 3): each value the setup flow collects and
   *  stores as `s/<name>`, in setup order (a site subdomain typically precedes
   *  its token). `secretName` names the primary auth credential and is one of
   *  these — not necessarily the first. Unset ⇒ a single secret via `secretName`.
   *  A value used in the URL (a site subdomain, a key in the query string) is
   *  referenced as `{s/<name>}` in `baseUrl` / `verify.url` and resolved by the
   *  venue; a value sent as a header goes in `secretHeaders`. */
  secrets?: SecretField[];
  /** For `auth: "header"` connections that send more than one secret header
   *  (e.g. Datadog's `DD-API-KEY` + `DD-APPLICATION-KEY`): header name →
   *  `s/<name>`. When set it supersedes the single `headerName` / `secretName`
   *  header in the verify call. */
  secretHeaders?: Record<string, string>;
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
    verify: { path: "/auth.test", label: (b) => (b?.ok ? `Connected to ${b.team}` : null) },
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
    id: "telegram", name: "Telegram", method: "bot", secretName: "TELEGRAM_BOT_TOKEN", skillId: "connections/telegram",
    blurb: "Send messages, read updates via a bot.", category: "Comms", initials: "TG", color: "#26A5E4",
    tokenUrl: "https://t.me/BotFather",
    createSteps: ["Open @BotFather in Telegram and send /newbot.", "Choose a name and username for your bot.", "Paste the token BotFather gives you (looks like 123456789:AA…)."],
    placeholder: "123456789:AA…", baseUrl: "https://api.telegram.org", auth: "url",
    verify: { url: "https://api.telegram.org/bot{s/TELEGRAM_BOT_TOKEN}/getMe", label: (b) => (b?.ok ? `Connected as @${b.result?.username ?? "bot"}` : null) },
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
  {
    id: "gitlab", name: "GitLab", method: "token", secretName: "GITLAB_TOKEN", skillId: "connections/gitlab",
    blurb: "Projects, issues, and merge requests.", category: "Dev", initials: "GL", color: "#FC6D26",
    tokenUrl: "https://gitlab.com/-/user_settings/personal_access_tokens",
    createSteps: ["GitLab → Preferences → Access Tokens → Add new token.", "Grant the api (or read_api) scope.", "Paste the token (starts with glpat-)."],
    placeholder: "glpat-…", baseUrl: "https://gitlab.com/api/v4", auth: "bearer",
    verify: { path: "/user", label: (b) => (b?.username ? `Connected as @${b.username}` : null) },
    detect: ["glpat-"],
  },
  {
    id: "clickup", name: "ClickUp", method: "key", secretName: "CLICKUP_TOKEN", skillId: "connections/clickup",
    blurb: "Tasks, lists, and spaces.", category: "Docs & PM", initials: "CU", color: "#7B68EE",
    tokenUrl: "https://app.clickup.com/settings/apps",
    createSteps: ["ClickUp → Settings → Apps → API Token → Generate.", "Copy your personal token.", "Paste it (starts with pk_)."],
    placeholder: "pk_…", baseUrl: "https://api.clickup.com/api/v2", auth: "header",
    // ClickUp sends the raw token as the Authorization value (no "Bearer").
    // No `detect`: the pk_ prefix collides with Stripe publishable keys.
    verify: { path: "/user", label: (b) => (b?.user?.username ? `Connected as ${b.user.username}` : null) },
  },
  {
    id: "calendly", name: "Calendly", method: "token", secretName: "CALENDLY_TOKEN", skillId: "connections/calendly",
    blurb: "Scheduled events and invitees.", category: "Docs & PM", initials: "CL", color: "#006BFF",
    tokenUrl: "https://calendly.com/integrations/api_webhooks",
    createSteps: ["Calendly → Integrations → API & Webhooks → Personal Access Tokens.", "Generate a token.", "Paste it here."],
    placeholder: "personal access token", baseUrl: "https://api.calendly.com", auth: "bearer",
    verify: { path: "/users/me", label: (b) => (b?.resource?.name ? `Connected as ${b.resource.name}` : null) },
  },
  {
    id: "monday", name: "monday.com", method: "key", secretName: "MONDAY_TOKEN", skillId: "connections/monday",
    blurb: "Boards, items, and updates (GraphQL).", category: "Docs & PM", initials: "M", color: "#FF3D57",
    tokenUrl: "https://monday.com/developers/v2",
    createSteps: ["monday.com → your avatar → Developers → My access tokens.", "Copy your personal API token.", "Paste it as-is."],
    placeholder: "API token", baseUrl: "https://api.monday.com/v2", auth: "header",
    // monday sends the raw token as the Authorization value; the API is a single GraphQL endpoint.
    verify: { method: "post", body: { query: "{ me { name } }" }, label: (b) => (b?.data?.me?.name ? `Connected as ${b.data.me.name}` : null) },
  },
  {
    id: "pagerduty", name: "PagerDuty", method: "token", secretName: "PAGERDUTY_TOKEN", skillId: "connections/pagerduty",
    blurb: "Incidents, services, and on-call.", category: "Dev", initials: "PD", color: "#06AC38",
    tokenUrl: "https://support.pagerduty.com/docs/api-access-keys",
    createSteps: ["PagerDuty → Integrations → API Access Keys → Create New API Key.", "Copy the key.", "Paste the complete header value: Token token=<key>."],
    placeholder: "Token token=…", baseUrl: "https://api.pagerduty.com", auth: "header",
    verify: { path: "/abilities", headers: { Accept: "application/vnd.pagerduty+json;version=2" }, label: (b) => (Array.isArray(b?.abilities) ? "Connected" : null) },
    detect: ["Token token="],
  },
  // ---- Wave B: multi-value connections (a site subdomain + a token, or two
  //      secrets). Staged ahead of their venue skills (covia#480). ----
  {
    id: "zendesk", name: "Zendesk", method: "basic", secretName: "ZENDESK_AUTH", skillId: "connections/zendesk",
    blurb: "Tickets, users, and organisations.", category: "CRM & Support", initials: "ZD", color: "#03363D",
    tokenUrl: "https://support.zendesk.com/hc/en-us/articles/4408889192858",
    createSteps: [
      "Zendesk Admin Center → Apps and integrations → APIs → Zendesk API → enable token access and add a token.",
      "Base64-encode {your-email}/token:{the-api-token}.",
      "Enter your subdomain, then paste the header value: Basic <that base64>.",
    ],
    placeholder: "Basic …", baseUrl: "https://{s/ZENDESK_SITE}.zendesk.com/api/v2", auth: "header",
    secrets: [
      { name: "ZENDESK_SITE", label: "Subdomain", placeholder: "acme" },
      { name: "ZENDESK_AUTH", label: "Basic auth header", placeholder: "Basic …" },
    ],
    verify: { path: "/users/me.json", label: (b) => (b?.user?.name ? `Connected as ${b.user.name}` : null) },
  },
  {
    id: "confluence", name: "Confluence", method: "basic", secretName: "CONFLUENCE_AUTH", skillId: "connections/confluence",
    blurb: "Pages, spaces, and search.", category: "Docs & PM", initials: "CF", color: "#172B4D",
    tokenUrl: "https://id.atlassian.com/manage-profile/security/api-tokens",
    createSteps: [
      "id.atlassian.com → Security → Create API token.",
      "Base64-encode {your-email}:{the-token}.",
      "Enter your site, then paste the header value: Basic <that base64>.",
    ],
    placeholder: "Basic …", baseUrl: "https://{s/CONFLUENCE_SITE}.atlassian.net/wiki", auth: "header",
    secrets: [
      { name: "CONFLUENCE_SITE", label: "Site", placeholder: "your-team" },
      { name: "CONFLUENCE_AUTH", label: "Basic auth header", placeholder: "Basic …" },
    ],
    verify: { path: "/rest/api/user/current", label: (b) => (b?.accountId ? `Connected as ${b.displayName ?? b.accountId}` : null) },
  },
  {
    id: "shopify", name: "Shopify", method: "token", secretName: "SHOPIFY_TOKEN", skillId: "connections/shopify",
    blurb: "Products, orders, and customers.", category: "Data", initials: "SH", color: "#95BF47",
    tokenUrl: "https://help.shopify.com/en/manual/apps/app-types/custom-apps",
    createSteps: [
      "Shopify admin → Settings → Apps and sales channels → Develop apps → create an app.",
      "Set Admin API scopes, install the app, and reveal the Admin API access token (starts with shpat_).",
      "Enter your store (the myshopify.com subdomain), then paste the token.",
    ],
    placeholder: "shpat_…", baseUrl: "https://{s/SHOPIFY_STORE}.myshopify.com/admin/api/2024-10", auth: "header", headerName: "X-Shopify-Access-Token",
    secrets: [
      { name: "SHOPIFY_STORE", label: "Store", placeholder: "acme" },
      { name: "SHOPIFY_TOKEN", label: "Admin API token", placeholder: "shpat_…" },
    ],
    verify: { path: "/shop.json", label: (b) => (b?.shop?.name ? `Connected to ${b.shop.name}` : null) },
    detect: ["shpat_"],
  },
  {
    id: "trello", name: "Trello", method: "key", secretName: "TRELLO_KEY", skillId: "connections/trello",
    blurb: "Boards, lists, and cards.", category: "Docs & PM", initials: "TR", color: "#0079BF",
    tokenUrl: "https://trello.com/power-ups/admin",
    createSteps: [
      "trello.com/power-ups/admin → create a Power-Up, then generate an API key.",
      "Click the Token link by the key to authorise and get a token.",
      "Paste the API key and the token.",
    ],
    placeholder: "", baseUrl: "https://api.trello.com/1", auth: "url",
    secrets: [
      { name: "TRELLO_KEY", label: "API key", placeholder: "key" },
      { name: "TRELLO_TOKEN", label: "Token", placeholder: "token" },
    ],
    verify: {
      url: "https://api.trello.com/1/members/me?key={s/TRELLO_KEY}&token={s/TRELLO_TOKEN}",
      label: (b) => (b?.id ? `Connected as ${b.fullName ?? b.username ?? "you"}` : null),
    },
  },
  {
    id: "datadog", name: "Datadog", method: "key", secretName: "DATADOG_API_KEY", skillId: "connections/datadog",
    blurb: "Metrics, monitors, and events.", category: "Dev", initials: "DD", color: "#632CA6",
    tokenUrl: "https://app.datadoghq.com/organization-settings/api-keys",
    createSteps: [
      "Datadog → Organization Settings → API Keys → New Key (the API key).",
      "Organization Settings → Application Keys → New Key (the application key).",
      "Paste both. (US1 region; other regions need a different base URL for now.)",
    ],
    placeholder: "", baseUrl: "https://api.datadoghq.com/api/v1", auth: "header",
    secrets: [
      { name: "DATADOG_API_KEY", label: "API key", placeholder: "api key" },
      { name: "DATADOG_APP_KEY", label: "Application key", placeholder: "app key" },
    ],
    secretHeaders: { "DD-API-KEY": "s/DATADOG_API_KEY", "DD-APPLICATION-KEY": "s/DATADOG_APP_KEY" },
    verify: { path: "/validate", label: (b) => (b?.valid ? "Connected" : null) },
  },
];

export const CONNECTION_CATEGORIES = [
  "Dev", "Docs & PM", "CRM & Support", "Payments", "Comms", "Data",
] as const;

/** Every value a connection collects during setup, in order. A single-value
 *  connection derives one entry from `secretName` / `placeholder`; a multi-value
 *  one returns its declared `secrets`. One helper for the setup flow, the
 *  connected-state display, and the verify builder. */
export function connectionSecrets(s: ConnectionService): SecretField[] {
  return s.secrets ?? [{ name: s.secretName, label: "Token", placeholder: s.placeholder }];
}

/** Match a pasted token to a service by its distinctive prefix. Ambiguous → null. */
export function detectService(token: string): ConnectionService | null {
  const t = token.trim();
  if (!t) return null;
  const hits = CONNECTIONS.filter((s) => s.detect?.some((p) => t.startsWith(p)));
  return hits.length === 1 ? hits[0] : null;
}

/** What an agent can do with each connection, and a prompt or two to try —
 *  distilled from each connection skill's common calls. Shown in the add-flow
 *  and on connected cards so a freshly connected service is obviously useful. */
export type ConnectionCapabilities = { does: string[]; examples: string[] };

export const CONNECTION_CAPABILITIES: Record<string, ConnectionCapabilities> = {
  github: {
    does: ["Read repos, issues, and pull requests", "Open, comment on, and label issues", "Create and review pull requests"],
    examples: ["Summarise the open PRs on my repo", "Open an issue titled 'flaky test' with the details above"],
  },
  notion: {
    does: ["Search and read pages and databases", "Create and update pages", "Query database entries"],
    examples: ["Summarise the Q3 plan page", "Add a row to my Tasks database for this"],
  },
  slack: {
    does: ["Post messages to channels", "Read recent channel history", "List channels and users"],
    examples: ["Post the deploy summary to #releases", "What was discussed in #eng today?"],
  },
  hubspot: {
    does: ["Look up contacts, companies, and deals", "Create and update CRM records", "Add notes to a contact"],
    examples: ["Find the deal for Acme Corp", "Create a contact for jane@acme.com"],
  },
  jira: {
    does: ["Search issues with JQL", "Create and transition issues", "Comment on issues"],
    examples: ["List my open bugs in project ABC", "Create a task to update the docs"],
  },
  linear: {
    does: ["Search and read issues", "Create issues and comments", "Move issues across states"],
    examples: ["Open a Linear issue for this bug", "What's in my current cycle?"],
  },
  stripe: {
    does: ["Look up customers, charges, and invoices", "Read balance and payouts", "Search payments"],
    examples: ["Find recent failed charges", "What's my current balance?"],
  },
  airtable: {
    does: ["List and read records", "Create and update records", "Query a table with filters"],
    examples: ["Add a lead to my CRM base", "List records where Status is Open"],
  },
  discord: {
    does: ["Post messages to channels", "Read channel history", "List guild channels"],
    examples: ["Post the changelog to #announcements", "Summarise the last 50 messages in #support"],
  },
  telegram: {
    does: ["Send messages to chats", "Read incoming updates", "Look up chat info"],
    examples: ["Send me a summary on Telegram", "Reply to the latest message with an ack"],
  },
  asana: {
    does: ["List tasks and projects", "Create and update tasks", "Search across workspaces"],
    examples: ["Create a task to review the PR", "What's due this week in my project?"],
  },
  intercom: {
    does: ["Search contacts and conversations", "Read and reply to conversations", "Create notes"],
    examples: ["Find the conversation with jane@acme.com", "Summarise the open conversations"],
  },
  sentry: {
    does: ["List issues and events", "Read error details and stack traces", "Search by project"],
    examples: ["What are the top errors this week?", "Show details for the latest crash"],
  },
  sendgrid: {
    does: ["Send transactional email", "Read delivery and engagement stats", "Manage templates"],
    examples: ["Email this report to the team", "What's my open rate this week?"],
  },
  twilio: {
    does: ["Send SMS messages", "Look up message logs", "Read account usage"],
    examples: ["Text me when the build finishes", "List the last 10 SMS I sent"],
  },
  gitlab: {
    does: ["Read projects, issues, and merge requests", "Open and comment on issues", "Create and review merge requests"],
    examples: ["Summarise the open merge requests on my project", "Open an issue titled 'flaky pipeline' with the details above"],
  },
  clickup: {
    does: ["List tasks, lists, and spaces", "Create and update tasks", "Search tasks with filters"],
    examples: ["Create a task to review the PR", "What's due this week in my space?"],
  },
  calendly: {
    does: ["List scheduled events and invitees", "Read event types", "Look up who booked and when"],
    examples: ["What meetings do I have this week?", "Who booked the 30-minute intro calls?"],
  },
  monday: {
    does: ["Read boards and items", "Create and update items", "Post updates to an item"],
    examples: ["Add an item to my Leads board for Acme", "What's the status of items in the Sprint board?"],
  },
  pagerduty: {
    does: ["List incidents and their status", "Read services and on-call schedules", "Acknowledge or resolve incidents"],
    examples: ["What incidents are open right now?", "Who's on call for the payments service?"],
  },
  zendesk: {
    does: ["Search tickets and users", "Read and comment on tickets", "Look up organisations"],
    examples: ["Find open tickets from acme.com", "Summarise ticket 12345"],
  },
  confluence: {
    does: ["Search and read pages", "Read spaces", "Find content with CQL"],
    examples: ["Find the onboarding page", "Summarise the Q3 planning space"],
  },
  shopify: {
    does: ["Look up products, orders, and customers", "Read inventory and fulfilment", "Search orders"],
    examples: ["What were yesterday's orders?", "Find the product 'Blue Widget'"],
  },
  trello: {
    does: ["List boards, lists, and cards", "Create and move cards", "Comment on cards"],
    examples: ["Add a card to my To Do list", "What's on my Sprint board?"],
  },
  datadog: {
    does: ["Query metrics and monitors", "Read events and alerts", "Look up monitor status"],
    examples: ["Which monitors are alerting?", "Show CPU for the web service"],
  },
};
