import {
  defaultSessionTitle,
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
          wakeTime: 1750000000000,
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
      wakeTime: 1750000000000,
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

  it("surfaces the venue-persisted meta.title", () => {
    const sessions = sessionEntriesToSessions([
      {
        key: "titled-session",
        value: {
          meta: { created: 100, turns: 1, title: "Planning the launch" },
          frames: [{ conversation: [{ role: "user", content: "hi" }] }],
        },
      },
    ]);
    expect(sessions[0].title).toBe("Planning the launch");
  });

  it("leaves title undefined when meta carries none", () => {
    const sessions = sessionEntriesToSessions([
      { key: "untitled-session", value: { meta: { created: 100, turns: 1 } } },
    ]);
    expect(sessions[0].title).toBeUndefined();
  });
});

describe("defaultSessionTitle", () => {
  it("uses the first user message as a title", () => {
    expect(
      defaultSessionTitle({
        sessionId: "s1",
        conversation: [
          { role: "assistant", content: "ignored — not a user turn" },
          { role: "user", content: "How does photosynthesis work?" },
          { role: "user", content: "a later message, not the first" },
        ],
      }),
    ).toBe("How does photosynthesis work?");
  });

  it("truncates a long first message", () => {
    const long = "x".repeat(80);
    const title = defaultSessionTitle({
      sessionId: "s1",
      conversation: [{ role: "user", content: long }],
    });
    expect(title).toBe(`${"x".repeat(48)}…`);
  });

  it("collapses internal whitespace/newlines", () => {
    expect(
      defaultSessionTitle({
        sessionId: "s1",
        conversation: [{ role: "user", content: "line one\n\n  line two" }],
      }),
    ).toBe("line one line two");
  });

  it("returns undefined when the session has no user turn yet", () => {
    expect(
      defaultSessionTitle({ sessionId: "s1", conversation: [] }),
    ).toBeUndefined();
    expect(
      defaultSessionTitle({
        sessionId: "s1",
        conversation: [{ role: "assistant", content: "only an assistant turn" }],
      }),
    ).toBeUndefined();
  });
});
