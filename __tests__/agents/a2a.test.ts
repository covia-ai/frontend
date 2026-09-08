import {
  A2A_NAME_PATTERN,
  isTaskComplete,
  slugifyAgentName,
  taskReplyText,
  type A2ATask,
} from "@/lib/a2a";

describe("slugifyAgentName", () => {
  it("lowercases, hyphenates, and strips invalid characters", () => {
    expect(slugifyAgentName("Support Bot")).toBe("support-bot");
    expect(slugifyAgentName("  Acme's  Agent!!  ")).toBe("acmes-agent");
    expect(slugifyAgentName("a__b--c")).toBe("ab-c");
  });

  it("caps length at 64 characters", () => {
    expect(slugifyAgentName("a".repeat(80)).length).toBe(64);
  });

  it("produces names that satisfy the A2A alias pattern", () => {
    expect(A2A_NAME_PATTERN.test(slugifyAgentName("Support Bot"))).toBe(true);
    expect(A2A_NAME_PATTERN.test("")).toBe(false);
    expect(A2A_NAME_PATTERN.test("Has Space")).toBe(false);
  });
});

describe("isTaskComplete", () => {
  it("is true only for a COMPLETED state", () => {
    expect(isTaskComplete("TASK_STATE_COMPLETED")).toBe(true);
    expect(isTaskComplete("completed")).toBe(true);
    expect(isTaskComplete("TASK_STATE_INPUT_REQUIRED")).toBe(false);
    expect(isTaskComplete(undefined)).toBe(false);
  });
});

describe("taskReplyText", () => {
  it("reads text parts from artifacts", () => {
    const task: A2ATask = {
      artifacts: [{ parts: [{ type: "text", text: "Hello back" }] }],
      status: { state: "TASK_STATE_COMPLETED" },
    };
    expect(taskReplyText(task)).toBe("Hello back");
  });

  it("follows an echoed data.message part (the venue echo shape)", () => {
    const task: A2ATask = {
      artifacts: [
        {
          parts: [
            {
              data: {
                message: { role: "user", parts: [{ type: "text", text: "ping" }] },
              },
            },
          ],
        },
      ],
    };
    expect(taskReplyText(task)).toBe("ping");
  });

  it("falls back to the last non-user history message", () => {
    const task: A2ATask = {
      history: [
        { role: "ROLE_USER", parts: [{ text: "question" }] },
        { role: "ROLE_AGENT", parts: [{ text: "answer" }] },
      ],
    };
    expect(taskReplyText(task)).toBe("answer");
  });

  it("returns empty string for an empty or missing task", () => {
    expect(taskReplyText(undefined)).toBe("");
    expect(taskReplyText({})).toBe("");
  });
});
