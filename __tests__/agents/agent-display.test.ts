import { agentDisplay, humanizeAgentId, relTime, shortRefLabel } from "@/lib/agent-display";

describe("humanizeAgentId", () => {
  it("turns a slug into words", () => {
    expect(humanizeAgentId("refund-bot-7f3a")).toBe("Refund Bot 7f3a");
    expect(humanizeAgentId("refundBot")).toBe("Refund Bot");
  });
});

describe("agentDisplay provider label", () => {
  it("names the provider for a known LLM operation", () => {
    expect(agentDisplay({ llmOperation: "v/ops/langchain/anthropic" }).providerLabel).toBe(
      "Anthropic (Claude)",
    );
    expect(agentDisplay({ llmOperation: "v/ops/langchain/ollama" }).providerLabel).toBe(
      "Ollama (local)",
    );
  });

  it("says venue default when no operation is configured", () => {
    expect(agentDisplay({}).providerLabel).toBe("Venue default");
    expect(agentDisplay(undefined).providerLabel).toBe("Venue default");
  });

  // providerForOperation falls back to "anthropic" for anything it does not
  // recognise, which is right for seeding the create form but wrong as a
  // label: a venue-local operation was captioned "Anthropic (Claude)".
  it("says custom for an operation that is not a known provider", () => {
    expect(agentDisplay({ llmOperation: "v/ops/local/my-llm" }).providerLabel).toBe("Custom model");
  });

  it("reads model, brief, skills and the governed flag from config", () => {
    const display = agentDisplay({
      model: "claude-opus-5",
      systemPrompt: "Be brief.",
      skills: ["v/skills/agents"],
      tools: ["v/ops/agent/list"],
      caps: [{ op: "v/ops/agent/list" }],
    });

    expect(display.model).toBe("claude-opus-5");
    expect(display.brief).toBe("Be brief.");
    expect(display.skills).toEqual(["v/skills/agents"]);
    expect(display.hasCaps).toBe(true);
  });

  it("treats an empty capability grant as ungoverned", () => {
    expect(agentDisplay({ caps: [] }).hasCaps).toBe(false);
    expect(agentDisplay({ caps: {} }).hasCaps).toBe(false);
    expect(agentDisplay({}).hasCaps).toBe(false);
  });
});

describe("relTime", () => {
  it("labels past and future instants", () => {
    const now = Date.now();
    expect(relTime(now - 5_000)).toBe("just now");
    expect(relTime(now - 3 * 60_000)).toBe("3m ago");
    expect(relTime(now + 3 * 60_000)).toBe("in 3m");
  });
});

describe("shortRefLabel", () => {
  it("keeps the last path segment", () => {
    expect(shortRefLabel("v/skills/agents")).toBe("agents");
  });
});
