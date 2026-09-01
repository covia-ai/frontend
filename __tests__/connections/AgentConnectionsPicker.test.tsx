import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { AgentConnectionsPicker } from "@/components/agent-config/AgentConnectionsPicker";
import { useToolSkillPickerData } from "@/hooks/use-tool-skill-picker-data";

jest.mock("@/hooks/use-tool-skill-picker-data", () => ({
  useToolSkillPickerData: jest.fn(),
}));

const mockUseToolSkillPickerData = useToolSkillPickerData as jest.MockedFunction<
  typeof useToolSkillPickerData
>;

function makeVenue(secretNames: string[]) {
  return {
    baseUrl: "https://venue.example",
    secrets: { list: jest.fn().mockResolvedValue(secretNames) },
  } as any;
}

describe("AgentConnectionsPicker", () => {
  const onToggleSkill = jest.fn();

  beforeEach(() => {
    onToggleSkill.mockClear();
    mockUseToolSkillPickerData.mockReturnValue({ ops: [], skills: [], loading: false });
  });

  it("shows a loading state before the connected-secrets read resolves", () => {
    const venue = makeVenue(["GITHUB_TOKEN"]);
    // Never resolves within this test — asserts the pre-load render only.
    venue.secrets.list.mockReturnValue(new Promise(() => {}));

    render(
      <AgentConnectionsPicker venue={venue} attachedSkills={[]} onToggleSkill={onToggleSkill} />,
    );

    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows the empty state when nothing is connected", async () => {
    const venue = makeVenue([]);

    render(
      <AgentConnectionsPicker venue={venue} attachedSkills={[]} onToggleSkill={onToggleSkill} />,
    );

    expect(await screen.findByText("Connect one")).toBeInTheDocument();
    expect(screen.queryByText("GitHub")).not.toBeInTheDocument();
  });

  it("lists only connected services, ignoring secrets that don't match a known connection", async () => {
    const venue = makeVenue(["GITHUB_TOKEN", "NOTION_TOKEN", "SOME_UNRELATED_SECRET"]);

    render(
      <AgentConnectionsPicker venue={venue} attachedSkills={[]} onToggleSkill={onToggleSkill} />,
    );

    expect(await screen.findByText("GitHub")).toBeInTheDocument();
    expect(screen.getByText("Notion")).toBeInTheDocument();
    expect(screen.queryByText("Slack")).not.toBeInTheDocument();
  });

  it("checks the box for a connection already attached via its synthetic skill path", async () => {
    const venue = makeVenue(["GITHUB_TOKEN"]);

    render(
      <AgentConnectionsPicker
        venue={venue}
        attachedSkills={["v/skills/connections/github"]}
        onToggleSkill={onToggleSkill}
      />,
    );

    await screen.findByText("GitHub");
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("leaves the box unchecked when the connection isn't attached", async () => {
    const venue = makeVenue(["GITHUB_TOKEN"]);

    render(
      <AgentConnectionsPicker venue={venue} attachedSkills={[]} onToggleSkill={onToggleSkill} />,
    );

    await screen.findByText("GitHub");
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("grants a connection by toggling the checkbox on", async () => {
    const user = userEvent.setup();
    const venue = makeVenue(["GITHUB_TOKEN"]);

    render(
      <AgentConnectionsPicker venue={venue} attachedSkills={[]} onToggleSkill={onToggleSkill} />,
    );

    await screen.findByText("GitHub");
    await user.click(screen.getByRole("checkbox"));

    expect(onToggleSkill).toHaveBeenCalledTimes(1);
    const [summary, attached] = onToggleSkill.mock.calls[0];
    expect(attached).toBe(true);
    expect(summary.path).toBe("v/skills/connections/github");
  });

  it("ungrants an already-attached connection by toggling the checkbox off", async () => {
    const user = userEvent.setup();
    const venue = makeVenue(["GITHUB_TOKEN"]);

    render(
      <AgentConnectionsPicker
        venue={venue}
        attachedSkills={["v/skills/connections/github"]}
        onToggleSkill={onToggleSkill}
      />,
    );

    await screen.findByText("GitHub");
    await user.click(screen.getByRole("checkbox"));

    expect(onToggleSkill).toHaveBeenCalledWith(expect.anything(), false);
  });

  it("prefers the venue's real installed skill over the synthetic fallback", async () => {
    const venue = makeVenue(["GITHUB_TOKEN"]);
    mockUseToolSkillPickerData.mockReturnValue({
      ops: [],
      loading: false,
      skills: [
        {
          key: "real-github",
          name: "GitHub (installed)",
          description: "real",
          path: "v/skills/connections/github",
          source: "venue",
          body: null,
          tools: ["v/ops/http/get"],
          reference: null,
          hasContent: true,
        },
      ],
    });

    render(
      <AgentConnectionsPicker
        venue={venue}
        attachedSkills={["GitHub (installed)"]}
        onToggleSkill={onToggleSkill}
      />,
    );

    await screen.findByText("GitHub");
    // Attached via the real skill's `name` alias, not the synthetic one.
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("does not fetch when there is no venue", () => {
    render(<AgentConnectionsPicker venue={null} attachedSkills={[]} onToggleSkill={onToggleSkill} />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });
});
