// A small external A2A agent for exercising BYOA (Agents → Connect / Talk)
// against the paths a Covia venue's own A2A front door can't produce: auth
// interrupts, a task that takes a while and then finishes, file and data
// artifacts, a failure with a reason, and a card-declared auth scheme.
//
// It speaks A2A 1.0 JSON-RPC the way the venue's A2A client does (covia
// A2AAdapter): an agent card at /.well-known/agent-card.json, and
// SendMessage / GetTask / CancelTask at /a2a. It does not stream, so the
// venue polls GetTask for anything still running. No dependencies.
//
// The first word of each message picks what the agent does:
//   echo <text>   completes with "echo: <text>" (the default for any other text)
//   ask           pauses INPUT_REQUIRED; replies are echoed back until "done"
//   auth          pauses AUTH_REQUIRED with a reason
//   slow [secs]   works for <secs> (default 15), then completes
//   hang          works and never finishes (until cancelled)
//   fail          fails with a reason
//   files         completes with text, data and file parts
//
// Usage:
//   pnpm mock:a2a                                         # :8095, no auth
//   node scripts/mock-a2a-agent.mjs --port 8096           # same, another port
//   node scripts/mock-a2a-agent.mjs --auth bearer         # needs Authorization: Bearer <token>
//   node scripts/mock-a2a-agent.mjs --auth apikey         # needs X-API-Key: <token>
//   PORT=8096 MOCK_A2A_TOKEN=s3cret node scripts/mock-a2a-agent.mjs --auth bearer
//
// The token defaults to "mock-a2a-token"; store the same value as a Secret on
// the venue and bind it on Connect (blank Scheme for bearer, "apiKey" for the
// API-key scheme). The connecting venue must allow the host, e.g.
// "adapters": { "http": { "allowedHosts": ["localhost", "127.0.0.1"] } }.

import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const PORT = Number(flag("port") ?? process.env.PORT ?? 8095);
const AUTH = flag("auth") ?? process.env.MOCK_A2A_AUTH ?? "none";
const TOKEN = process.env.MOCK_A2A_TOKEN ?? "mock-a2a-token";
const NAME = flag("name") ?? "Mock A2A Agent";
const BASE = `http://localhost:${PORT}`;

if (!["none", "bearer", "apikey"].includes(AUTH)) {
  console.error(`--auth must be none, bearer or apikey (got "${AUTH}")`);
  process.exit(1);
}

const SECURITY_SCHEMES = {
  bearer: { bearer: { httpAuthSecurityScheme: { scheme: "bearer" } } },
  apikey: { apiKey: { apiKeySecurityScheme: { location: "header", name: "X-API-Key" } } },
};

const card = {
  name: NAME,
  description:
    "Mock external A2A agent. First word picks the behaviour: echo, ask, auth, slow [secs], hang, fail, files.",
  version: "1.0.0",
  capabilities: { streaming: false, pushNotifications: false },
  defaultInputModes: ["text/plain"],
  defaultOutputModes: ["text/plain", "application/json"],
  skills: [],
  supportedInterfaces: [{ protocolBinding: "JSONRPC", url: `${BASE}/a2a`, protocolVersion: "1.0" }],
  preferredTransport: "JSONRPC",
  ...(AUTH !== "none" && { securitySchemes: SECURITY_SCHEMES[AUTH] }),
};

/** @type {Map<string, any>} */
const tasks = new Map();
const now = () => new Date().toISOString();
const agentMessage = (text) => ({ role: "ROLE_AGENT", messageId: randomUUID(), parts: [{ text }] });
const textOf = (message) =>
  (message?.parts ?? []).map((p) => (typeof p.text === "string" ? p.text : "")).join(" ").trim();

function setState(task, state, text) {
  task.status = { state, timestamp: now(), ...(text && { message: agentMessage(text) }) };
}

function complete(task, parts) {
  task.artifacts = [{ artifactId: randomUUID(), parts }];
  setState(task, "TASK_STATE_COMPLETED");
}

const FINAL = new Set(["TASK_STATE_COMPLETED", "TASK_STATE_FAILED", "TASK_STATE_CANCELED", "TASK_STATE_REJECTED"]);

/** Start a new task from a first message. */
function start(message) {
  const text = textOf(message);
  const [word = "", ...rest] = text.split(/\s+/);
  const task = {
    id: randomUUID(),
    contextId: message.contextId ?? randomUUID(),
    status: { state: "TASK_STATE_SUBMITTED", timestamp: now() },
    artifacts: [],
    history: [message],
  };
  tasks.set(task.id, task);

  switch (word.toLowerCase()) {
    case "ask":
      setState(task, "TASK_STATE_INPUT_REQUIRED", "What is your order number? Reply \"done\" to finish.");
      break;
    case "auth":
      setState(task, "TASK_STATE_AUTH_REQUIRED", "Sign in to the billing API before I can continue.");
      break;
    case "slow": {
      const secs = Number(rest[0]) > 0 ? Number(rest[0]) : 15;
      setState(task, "TASK_STATE_WORKING");
      task.timer = setTimeout(() => {
        if (FINAL.has(task.status.state)) return;
        complete(task, [{ text: `Finished after ${secs} seconds.` }]);
      }, secs * 1000);
      break;
    }
    case "hang":
      setState(task, "TASK_STATE_WORKING");
      break;
    case "fail":
      setState(task, "TASK_STATE_FAILED", "The mock agent was asked to fail: upstream quota exceeded.");
      break;
    case "files":
      complete(task, [
        { text: "Here is your report, its data, and the file." },
        { data: { orders: 3, refunded: 1, total: 129.5 } },
        {
          url: `${BASE}/files/report.csv`,
          mediaType: "text/csv",
          filename: "report.csv",
        },
      ]);
      break;
    case "echo":
      complete(task, [{ text: `echo: ${rest.join(" ")}` }]);
      break;
    default:
      complete(task, [{ text: `echo: ${text}` }]);
  }
  return task;
}

/** Deliver a reply to an existing task. */
function resume(task, message) {
  if (FINAL.has(task.status.state)) {
    return { error: { code: -32004, message: `Task ${task.id} is in terminal state` } };
  }
  task.history.push(message);
  const text = textOf(message);
  if (task.status.state === "TASK_STATE_INPUT_REQUIRED") {
    if (text.toLowerCase() === "done") complete(task, [{ text: "All done, thanks." }]);
    else setState(task, "TASK_STATE_INPUT_REQUIRED", `Got "${text}". Anything else? Reply "done" to finish.`);
  } else if (task.status.state === "TASK_STATE_AUTH_REQUIRED") {
    complete(task, [{ text: "Thanks, you're signed in. Request completed." }]);
  }
  return { result: task };
}

function view(task) {
  const { timer, ...rest } = task;
  void timer;
  return rest;
}

function authorised(req) {
  if (AUTH === "bearer") return req.headers.authorization === `Bearer ${TOKEN}`;
  if (AUTH === "apikey") return req.headers["x-api-key"] === TOKEN;
  return true;
}

function send(res, status, body, type = "application/json") {
  res.writeHead(status, { "content-type": type });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

function rpc(body) {
  const { id = null, method, params = {} } = body ?? {};
  const reply = (r) => ({ jsonrpc: "2.0", id, ...r });
  switch (method) {
    case "SendMessage": {
      const message = params.message;
      if (!message?.parts?.length) return reply({ error: { code: -32602, message: "message.parts required" } });
      if (message.taskId) {
        const task = tasks.get(message.taskId);
        if (!task) return reply({ error: { code: -32001, message: `Task not found: ${message.taskId}` } });
        const out = resume(task, message);
        return reply(out.error ? out : { result: view(out.result) });
      }
      return reply({ result: view(start(message)) });
    }
    case "GetTask": {
      const task = tasks.get(params.id);
      return task
        ? reply({ result: view(task) })
        : reply({ error: { code: -32001, message: `Task not found: ${params.id}` } });
    }
    case "CancelTask": {
      const task = tasks.get(params.id);
      if (!task) return reply({ error: { code: -32001, message: `Task not found: ${params.id}` } });
      if (!FINAL.has(task.status.state)) {
        clearTimeout(task.timer);
        setState(task, "TASK_STATE_CANCELED");
      }
      return reply({ result: view(task) });
    }
    default:
      return reply({ error: { code: -32601, message: `Method not found: ${method}` } });
  }
}

const server = createServer((req, res) => {
  const path = new URL(req.url ?? "/", BASE).pathname;
  if (req.method === "GET" && path === "/.well-known/agent-card.json") return send(res, 200, card);
  if (req.method === "GET" && path === "/files/report.csv") {
    return send(res, 200, "order,amount\nA-1,49.50\nA-2,80.00\n", "text/csv");
  }
  if (req.method === "POST" && path === "/a2a") {
    if (!authorised(req)) return send(res, 401, { error: "Missing or invalid credentials" });
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        return send(res, 200, { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
      }
      const out = rpc(body);
      console.log(`${body.method} → ${out.error ? `error ${out.error.code}` : out.result?.status?.state}`);
      send(res, 200, out);
    });
    return;
  }
  send(res, 404, { error: "Not found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`${NAME} on ${BASE} (auth: ${AUTH})`);
  console.log(`  card: ${BASE}/.well-known/agent-card.json`);
});
