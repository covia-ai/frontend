import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

jest.mock("@/components/admin-panel/signin-button", () => ({
  ChromeSignInButton: () => <div data-testid="chrome-sign-in-button" />,
}));

const mockAccess: { state: string } = { state: "connected" };
jest.mock("@/hooks/use-venue-access", () => ({
  useVenueAccess: () => mockAccess,
}));

jest.mock("@/hooks/use-auth", () => ({
  useIsAuthenticated: () => true,
}));

const mockVenue: any = {
  venueId: "venue-1",
  baseUrl: "https://venue.example",
  workspace: {
    read: jest.fn((path: string) => {
      if (path === "v/ops") {
        return Promise.resolve({
          exists: true,
          value: {
            covia: {
              read: { name: "Read", description: "Read a value", operation: { input: {}, output: {} } },
              write: { name: "Write", description: "Write a value", operation: { input: {}, output: {} } },
            },
          },
        });
      }
      return Promise.resolve({ exists: false, value: null });
    }),
  },
  skills: {
    list: jest.fn((path: string) => Promise.resolve(path === "v/skills"
      ? [{
          id: "v/skills/summarizer",
          metadata: { name: "Summarizer", description: "Summarize text", content: { inline: "Do the thing" } },
        }]
      : [])),
  },
};

import { ToolSkillPicker } from "@/components/agent-config/ToolSkillPicker";

async function openSheet(props: Partial<React.ComponentProps<typeof ToolSkillPicker>> = {}) {
  const onToggleTool = jest.fn();
  const onToggleSkill = jest.fn();
  const user = userEvent.setup();
  render(
    <ToolSkillPicker
      venue={mockVenue}
      attachedTools={[]}
      attachedSkills={[]}
      onToggleTool={onToggleTool}
      onToggleSkill={onToggleSkill}
      trigger={<button type="button">Browse &amp; attach</button>}
      {...props}
    />,
  );
  await user.click(screen.getByRole("button", { name: /Browse & attach/i }));
  return { user, onToggleTool, onToggleSkill };
}

describe("ToolSkillPicker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccess.state = "connected";
  });

  it("loads and lists catalog tools, grouped by adapter", async () => {
    const { user } = await openSheet();

    await user.click(screen.getByRole("button", { name: /covia/i }));
    expect(await screen.findByText("Read")).toBeInTheDocument();
    expect(screen.getByText("Write")).toBeInTheDocument();
    expect(mockVenue.workspace.read).toHaveBeenCalledWith("v/ops");
  });

  it("filters tools by search", async () => {
    const { user } = await openSheet();
    await user.click(screen.getByRole("button", { name: /covia/i }));
    await screen.findByText("Read");

    await user.type(screen.getByPlaceholderText("Search tools…"), "write");
    expect(screen.queryByText("Read")).not.toBeInTheDocument();
    expect(screen.getByText("Write")).toBeInTheDocument();
  });

  it("reflects attached tools as checked and toggles call onToggleTool with the op", async () => {
    const { user, onToggleTool } = await openSheet({ attachedTools: ["v/ops/covia/read"] });
    await user.click(screen.getByRole("button", { name: /covia/i }));
    await screen.findByText("Read");

    expect(screen.getByRole("checkbox", { name: "Attach Read" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Attach Write" })).not.toBeChecked();

    await user.click(screen.getByRole("checkbox", { name: "Attach Write" }));
    expect(onToggleTool).toHaveBeenCalledWith(
      expect.objectContaining({ path: "v/ops/covia/write" }),
      true,
    );
  });

  it("lists skills with a source badge and reflects attached skills, toggling calls onToggleSkill", async () => {
    const { user, onToggleSkill } = await openSheet({ attachedSkills: ["v/skills/summarizer"] });
    await user.click(screen.getByRole("tab", { name: /^Skills/ }));

    expect(await screen.findByText("Summarizer")).toBeInTheDocument();
    expect(screen.getByText("venue")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Attach Summarizer" })).toBeChecked();

    await user.click(screen.getByRole("checkbox", { name: "Attach Summarizer" }));
    expect(onToggleSkill).toHaveBeenCalledWith(
      expect.objectContaining({ path: "v/skills/summarizer" }),
      false,
    );
  });

  it("deep-links a skill row to the skills library page", async () => {
    const { user } = await openSheet();
    await user.click(screen.getByRole("tab", { name: "Skills" }));
    await screen.findByText("Summarizer");

    expect(screen.getByRole("link", { name: /View Summarizer in the skills library/i })).toHaveAttribute(
      "href",
      "/agents/skills",
    );
  });

  it("shows a sign-in gate instead of the catalog when the venue requires an account", async () => {
    mockAccess.state = "signed-out";
    await openSheet();

    expect(screen.getByTestId("chrome-sign-in-button")).toBeInTheDocument();
    expect(screen.queryByTestId("tool-picker-row")).not.toBeInTheDocument();
    expect(mockVenue.workspace.read).not.toHaveBeenCalled();
    expect(mockVenue.skills.list).not.toHaveBeenCalled();
  });

  it("disables checkboxes while a caller-driven save is in flight", async () => {
    const { user } = await openSheet({ attachedTools: ["v/ops/covia/read"], disabled: true });
    await user.click(screen.getByRole("button", { name: /covia/i }));
    await screen.findByText("Read");

    expect(screen.getByRole("checkbox", { name: "Attach Read" })).toBeDisabled();
  });
});
