import {
  formatSessionLabel,
  sessionEntriesToSessions,
} from "@/lib/agent-sessions";

describe("agent session normalization", () => {
  it("flattens frame conversations and sorts newest sessions first", () => {
    const sessions = sessionEntriesToSessions([
      {
        key: "older-session",
        value: {
          meta: { created: 100, turns: 1 },
          frames: [{ conversation: [{ role: "user", content: "old" }] }],
        },
      },
      {
        key: "newer-session",
        value: {
          meta: { created: 200, turns: 2, parties: ["user", "agent"] },
          pending: ["work"],
          frames: [
            { conversation: [{ role: "user", content: "hello" }] },
            { conversation: [{ role: "assistant", content: "hi" }] },
          ],
        },
      },
    ]);

    expect(sessions.map((session) => session.sessionId)).toEqual([
      "newer-session",
      "older-session",
    ]);
    expect(sessions[0]).toMatchObject({
      turns: 2,
      parties: ["user", "agent"],
      pending: ["work"],
      conversation: [
        { role: "user", content: "hello" },
        { role: "assistant", content: "hi" },
      ],
    });
  });

  it("returns an empty list for malformed workspace values", () => {
    expect(sessionEntriesToSessions(undefined)).toEqual([]);
    expect(sessionEntriesToSessions({ values: [] })).toEqual([]);
  });

  it("formats a stable fallback label when creation time is absent", () => {
    expect(
      formatSessionLabel({
        sessionId: "session-12345678",
        turns: 1,
        conversation: [],
      }),
    ).toBe("— · …12345678 · 1 turn");
  });
});
