import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/lib/notify", () => ({
  notifySuccess: jest.fn(),
  notifyError: jest.fn(),
  notifyWarning: jest.fn(),
  notifyInfo: jest.fn(),
  jobFailure: (err: unknown) => ({ reason: String(err), jobHref: undefined }),
}));

const pushMock = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

// Stub the runtime (provider/model) fields — not under test here, and they
// otherwise pull the whole LLM-provider catalogue into the render.
jest.mock("@/components/agent-config/AgentConfigEditor", () => ({
  AgentRuntimeFields: () => <div data-testid="runtime-fields" />,
  DEFAULT_PROVIDER_OPTION: "venue-default",
  CUSTOM_PROVIDER_OPTION: "custom",
  isAgentProviderReady: () => true,
  resolvedModelId: () => "",
}));

const runMock = jest.fn().mockResolvedValue({
  agentId: "refund-bot",
  skillset: "w/skills",
  importedSkills: ["w/skills/refund-policy"],
});
const mockVenue = {
  venueId: "venue-1",
  baseUrl: "https://venue.example",
  operations: { run: runMock },
  agents: { request: jest.fn().mockResolvedValue({}) },
  secrets: { list: jest.fn().mockResolvedValue([]) },
};
jest.mock("@/hooks/use-authenticated-venue", () => ({
  useAuthenticatedVenue: () => mockVenue,
}));

import { PortAgentDialog } from "@/components/PortAgentDialog";
import { notifySuccess, notifyWarning } from "@/lib/notify";

const SKILL = `---
name: refund-policy
description: How to handle customer refund requests within the 30-day window.
---

# Refund policy

Refunds are allowed within 30 days of purchase.`;

const renderOpen = () => render(<PortAgentDialog open onOpenChange={() => {}} />);

describe("PortAgentDialog (Migrate → native)", () => {
  beforeEach(() => {
    runMock.mockClear();
    pushMock.mockClear();
    (notifySuccess as jest.Mock).mockClear();
    (notifyWarning as jest.Mock).mockClear();
  });

  it("migrates: stages a pasted SKILL.md and calls agent:from-skills, then routes to chat", async () => {
    const user = userEvent.setup({ delay: null });
    renderOpen();
    await user.type(screen.getByTestId("port-agent-name"), "Refund bot");
    await user.type(
      screen.getByTestId("port-agent-prompt"),
      "You are Acme support. Follow the refund-policy skill.",
    );
    // Paste the SKILL.md rather than typing it key-by-key — it matches the real
    // "paste a SKILL.md" flow and keeps the test fast enough not to blow the
    // per-test timeout when the CI machine is under heavy load.
    await user.click(screen.getByTestId("port-skill-draft"));
    await user.paste(SKILL);
    await user.click(screen.getByTestId("port-skill-add"));

    // The staged skill previews from its frontmatter.
    expect(screen.getByText("refund-policy")).toBeInTheDocument();

    await user.click(screen.getByTestId("port-agent-submit"));

    await waitFor(() => expect(runMock).toHaveBeenCalledTimes(1));
    const [op, input] = runMock.mock.calls[0];
    expect(op).toBe("v/ops/agent/from-skills");
    expect(input).toMatchObject({
      agentId: "refund-bot",
      systemPrompt: "You are Acme support. Follow the refund-policy skill.",
      skills: [{ text: expect.stringContaining("name: refund-policy") }],
    });

    // notifySuccess and router.push fire later in handlePort's async chain
    // (after run resolves), so wait for the final observable effect — the
    // route change — rather than asserting synchronously right after `run`.
    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/agents/chat?agentId=refund-bot"),
    );
    expect(notifySuccess).toHaveBeenCalled();
  });

  it("rejects a draft that is not a valid SKILL.md (no frontmatter)", async () => {
    const user = userEvent.setup({ delay: null });
    renderOpen();
    await user.type(screen.getByTestId("port-skill-draft"), "just some text, no frontmatter");
    await user.click(screen.getByTestId("port-skill-add"));
    expect(notifyWarning).toHaveBeenCalled();
    expect(screen.queryByTestId("port-skill-list")).not.toBeInTheDocument();
  });

  it("warns instead of porting when there's no name", async () => {
    const user = userEvent.setup({ delay: null });
    renderOpen();
    await user.type(
      screen.getByTestId("port-agent-prompt"),
      "You are a support agent.",
    );
    await user.click(screen.getByTestId("port-agent-submit"));
    expect(notifyWarning).toHaveBeenCalled();
    expect(runMock).not.toHaveBeenCalled();
  });

  it("warns when there's neither a system prompt nor any skill", async () => {
    const user = userEvent.setup({ delay: null });
    renderOpen();
    await user.type(screen.getByTestId("port-agent-name"), "Empty bot");
    await user.click(screen.getByTestId("port-agent-submit"));
    expect(notifyWarning).toHaveBeenCalled();
    expect(runMock).not.toHaveBeenCalled();
  });
});
