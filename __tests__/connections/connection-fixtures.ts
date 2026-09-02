/**
 * Per-connector verify fixtures, shared by the unit tests (connection-verify)
 * and the end-to-end component tests (ConnectionsList). Bodies are JSON
 * *strings*, exactly as `v/ops/http/*` returns them: `success` must make the
 * service's label return its connected message; `failure` must make it return
 * null. Jira has no generic verify and is excluded.
 */
export const VERIFY_FIXTURES: Record<
  string,
  { success: string; connected: string; failure: string }
> = {
  github: { success: '{"login":"octocat"}', connected: "Connected as @octocat", failure: '{"message":"Bad credentials"}' },
  notion: { success: '{"name":"Ada Lovelace","id":"u1"}', connected: "Connected as Ada Lovelace", failure: '{"message":"API token is invalid."}' },
  slack: { success: '{"ok":true,"team":"Acme"}', connected: "Connected to Acme", failure: '{"ok":false,"error":"invalid_auth"}' },
  hubspot: { success: '{"portalId":12345}', connected: "Connected (portal 12345)", failure: '{"message":"Authentication credentials not found"}' },
  linear: { success: '{"data":{"viewer":{"name":"Ada"}}}', connected: "Connected as Ada", failure: '{"errors":[{"message":"Authentication required"}]}' },
  stripe: { success: '{"object":"balance","available":[]}', connected: "Connected", failure: '{"error":{"message":"Invalid API Key provided"}}' },
  airtable: { success: '{"id":"usr123"}', connected: "Connected", failure: '{"error":"AUTHENTICATION_REQUIRED"}' },
  discord: { success: '{"username":"mybot"}', connected: "Connected as mybot", failure: '{"message":"401: Unauthorized"}' },
  telegram: { success: '{"ok":true,"result":{"username":"mybot"}}', connected: "Connected as @mybot", failure: '{"ok":false,"description":"Unauthorized"}' },
  asana: { success: '{"data":{"name":"Ada"}}', connected: "Connected as Ada", failure: '{"errors":[{"message":"Not Authorized"}]}' },
  intercom: { success: '{"email":"ada@acme.com"}', connected: "Connected as ada@acme.com", failure: '{"errors":[{"message":"Access Token Invalid"}]}' },
  sentry: { success: '[{"slug":"org1"}]', connected: "Connected (1 org)", failure: '{"detail":"Invalid token"}' },
  sendgrid: { success: '{"scopes":["mail.send"]}', connected: "Connected", failure: '{"errors":[{"message":"authorization required"}]}' },
  twilio: { success: '{"accounts":[{"sid":"AC1"}]}', connected: "Connected", failure: '{"message":"Authenticate"}' },
  gitlab: { success: '{"username":"ada"}', connected: "Connected as @ada", failure: '{"message":"401 Unauthorized"}' },
  clickup: { success: '{"user":{"username":"Ada"}}', connected: "Connected as Ada", failure: '{"err":"Token invalid","ECODE":"OAUTH_025"}' },
  calendly: { success: '{"resource":{"name":"Ada Lovelace"}}', connected: "Connected as Ada Lovelace", failure: '{"title":"Unauthorized","message":"The access token is invalid"}' },
  monday: { success: '{"data":{"me":{"name":"Ada"}}}', connected: "Connected as Ada", failure: '{"errors":[{"message":"Not Authenticated"}]}' },
  pagerduty: { success: '{"abilities":["sso"]}', connected: "Connected", failure: '{"error":{"code":2001,"message":"Invalid API key"}}' },
};
