// Connection catalogue. Each entry is a third-party service a user can connect
// with their own token, mirroring the venue's `connections/*` skills. Adding a
// service here is data, not code: it drives the card, the guided add-flow, and
// the connected state (which is simply "is `secretName` present in the store").
//
// Keep `skillId` and `secretName` in lockstep with the matching skill in
// covia-ai/covia (venue/src/main/resources/skills/<id>.json).

export type ConnectionMethod = "token" | "key" | "basic" | "bot" | "app";

export type ConnectionService = {
  /** Stable id, matches the skill name: v/skills/connections/<id>. */
  id: string;
  name: string;
  /** One-word auth shape shown on the card. */
  method: ConnectionMethod;
  /** Secret name the token is stored under (e.g. GITHUB_TOKEN). */
  secretName: string;
  /** Skill the connection makes usable. */
  skillId: string;
  /** Short capability blurb. */
  blurb: string;
  category: "Dev" | "Docs & PM" | "CRM & Support" | "Payments" | "Comms" | "Data";
  /** Two-letter mark and brand colour for the logo tile. */
  initials: string;
  color: string;
  /** Where the user creates the token. */
  tokenUrl: string;
  /** Guided steps. The last line explains exactly what to paste. */
  createSteps: string[];
  /** Placeholder shown in the paste field. */
  placeholder: string;
};

export const CONNECTIONS: ConnectionService[] = [
  {
    id: "github", name: "GitHub", method: "token", secretName: "GITHUB_TOKEN", skillId: "connections/github",
    blurb: "Repos, issues, and pull requests.", category: "Dev", initials: "GH", color: "#1B1F23",
    tokenUrl: "https://github.com/settings/tokens?type=beta",
    createSteps: ["GitHub → Settings → Developer settings → Fine-grained tokens.", "Grant only the repositories your agents should see.", "Paste the token (starts with github_pat_)."],
    placeholder: "github_pat_…",
  },
  {
    id: "notion", name: "Notion", method: "token", secretName: "NOTION_TOKEN", skillId: "connections/notion",
    blurb: "Read and write pages and databases.", category: "Docs & PM", initials: "N", color: "#000000",
    tokenUrl: "https://www.notion.so/my-integrations",
    createSteps: ["Notion → Settings → Connections → Develop or manage integrations → New integration.", "Share the pages/databases you want with the integration.", "Paste the internal integration secret (starts with ntn_ or secret_)."],
    placeholder: "ntn_… / secret_…",
  },
  {
    id: "slack", name: "Slack", method: "app", secretName: "SLACK_TOKEN", skillId: "connections/slack",
    blurb: "Post to channels and read messages.", category: "Comms", initials: "SL", color: "#611F69",
    tokenUrl: "https://api.slack.com/apps",
    createSteps: ["api.slack.com/apps → Create New App → From scratch, in your workspace.", "Add the OAuth scopes you need, then Install to Workspace.", "Paste the Bot User OAuth Token (starts with xoxb-)."],
    placeholder: "xoxb-…",
  },
  {
    id: "hubspot", name: "HubSpot", method: "token", secretName: "HUBSPOT_TOKEN", skillId: "connections/hubspot",
    blurb: "CRM contacts, companies, and deals.", category: "CRM & Support", initials: "HS", color: "#FF7A59",
    tokenUrl: "https://app.hubspot.com/",
    createSteps: ["HubSpot → Settings → Integrations → Private Apps → Create.", "Grant the CRM scopes you need.", "Paste the private-app access token (starts with pat-)."],
    placeholder: "pat-…",
  },
  {
    id: "jira", name: "Jira", method: "basic", secretName: "ATLASSIAN_AUTH", skillId: "connections/jira",
    blurb: "Issues, JQL search, transitions.", category: "Docs & PM", initials: "J", color: "#0B5CFF",
    tokenUrl: "https://id.atlassian.com/manage-profile/security/api-tokens",
    createSteps: ["id.atlassian.com → Security → Create API token.", "Base64-encode your-email:the-token.", "Paste the complete header value: Basic <that base64>."],
    placeholder: "Basic …",
  },
  {
    id: "linear", name: "Linear", method: "key", secretName: "LINEAR_API_KEY", skillId: "connections/linear",
    blurb: "Issues, teams, projects (GraphQL).", category: "Docs & PM", initials: "L", color: "#5E6AD2",
    tokenUrl: "https://linear.app/settings/api",
    createSteps: ["Linear → Settings → Security & access → API → Personal keys.", "Create a key with the access you need.", "Paste the key as-is (starts with lin_api_)."],
    placeholder: "lin_api_…",
  },
  {
    id: "stripe", name: "Stripe", method: "key", secretName: "STRIPE_KEY", skillId: "connections/stripe",
    blurb: "Customers, charges, invoices.", category: "Payments", initials: "S", color: "#635BFF",
    tokenUrl: "https://dashboard.stripe.com/apikeys",
    createSteps: ["Stripe → Developers → API keys → Create restricted key.", "Grant read-only unless writes are needed.", "Paste the restricted key (starts with rk_)."],
    placeholder: "rk_live_… / rk_test_…",
  },
  {
    id: "airtable", name: "Airtable", method: "token", secretName: "AIRTABLE_TOKEN", skillId: "connections/airtable",
    blurb: "Bases and records.", category: "Data", initials: "AT", color: "#FCB400",
    tokenUrl: "https://airtable.com/create/tokens",
    createSteps: ["airtable.com/create/tokens → Create token.", "Grant the bases and data.records scopes you need.", "Paste the personal access token (starts with pat)."],
    placeholder: "pat…",
  },
  {
    id: "discord", name: "Discord", method: "bot", secretName: "DISCORD_BOT_TOKEN", skillId: "connections/discord",
    blurb: "Post messages, read channels.", category: "Comms", initials: "DC", color: "#5865F2",
    tokenUrl: "https://discord.com/developers/applications",
    createSteps: ["discord.com/developers → your app → Bot → Reset Token.", "Invite the bot to your server with the scopes you need.", "Paste the complete header value: Bot <token>."],
    placeholder: "Bot …",
  },
  {
    id: "asana", name: "Asana", method: "token", secretName: "ASANA_TOKEN", skillId: "connections/asana",
    blurb: "Tasks, projects, workspaces.", category: "Docs & PM", initials: "AS", color: "#F06A6A",
    tokenUrl: "https://app.asana.com/0/my-apps",
    createSteps: ["Asana → Settings → Apps → Developer apps → Personal access tokens.", "Create a token.", "Paste it (starts with 1/ or 2/)."],
    placeholder: "1/…",
  },
  {
    id: "intercom", name: "Intercom", method: "token", secretName: "INTERCOM_TOKEN", skillId: "connections/intercom",
    blurb: "Contacts and conversations.", category: "CRM & Support", initials: "IC", color: "#1F8DED",
    tokenUrl: "https://app.intercom.com/a/developer-signup",
    createSteps: ["Intercom → Settings → Developers → Developer Hub → your app.", "Copy the workspace access token from Authentication.", "Paste the access token."],
    placeholder: "dG9r…",
  },
  {
    id: "sentry", name: "Sentry", method: "token", secretName: "SENTRY_TOKEN", skillId: "connections/sentry",
    blurb: "Issues, events, projects.", category: "Dev", initials: "SN", color: "#362D59",
    tokenUrl: "https://sentry.io/settings/account/api/auth-tokens/",
    createSteps: ["Sentry → Settings → Auth Tokens → Create New Token.", "Scope it project:read, event:read, org:read.", "Paste the token (starts with sntryu_)."],
    placeholder: "sntryu_…",
  },
  {
    id: "sendgrid", name: "SendGrid", method: "key", secretName: "SENDGRID_KEY", skillId: "connections/sendgrid",
    blurb: "Send transactional email, read stats.", category: "Comms", initials: "SG", color: "#1A82E2",
    tokenUrl: "https://app.sendgrid.com/settings/api_keys",
    createSteps: ["SendGrid → Settings → API Keys → Create API Key.", "Scope to Mail Send (or read-only).", "Paste the key (starts with SG.)."],
    placeholder: "SG.…",
  },
  {
    id: "twilio", name: "Twilio", method: "basic", secretName: "TWILIO_AUTH", skillId: "connections/twilio",
    blurb: "Send SMS, read message logs.", category: "Comms", initials: "TW", color: "#F22F46",
    tokenUrl: "https://console.twilio.com/",
    createSteps: ["Twilio Console → Account Info (Account SID + Auth Token).", "Base64-encode AccountSID:AuthToken.", "Paste the complete header value: Basic <that base64>."],
    placeholder: "Basic …",
  },
];

export const CONNECTION_CATEGORIES = [
  "Dev", "Docs & PM", "CRM & Support", "Payments", "Comms", "Data",
] as const;
