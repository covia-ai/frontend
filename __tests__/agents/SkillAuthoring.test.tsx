import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("@/components/admin-panel/TopBar", () => ({
  TopBar: () => <div data-testid="top-bar" />,
}));
jest.mock("@/components/MarkdownMessage", () => ({
  MarkdownMessage: ({ children }: { children: string }) => (
    <div data-testid="safe-markdown">{children}</div>
  ),
}));
jest.mock("@/lib/notify", () => require("@test/notify").notifyMock);

// A venue skill (read-only) and one of the user's own, so the two action sets
// can be told apart.
const VENUE_TREE = {
  agents: {
    name: "Agent skills",
    description: "Manage agents safely.",
    content: { inline: "## Agent workflow" },
    skill: { tools: ["v/ops/agent/list"] },
  },
};
const USER_TREE = {
  research: {
    name: "research",
    description: "Find reliable sources.",
    content: { inline: "## Research\nStart with primary sources." },
    skill: {},
  },
};

const mockVenue: any = {
  venueId: "venue-1",
  baseUrl: "https://venue.example",
  workspace: {
    read: jest.fn((path: string) =>
      Promise.resolve(
        path === "v/skills"
          ? { exists: true, value: VENUE_TREE }
          : { exists: true, value: USER_TREE },
      ),
    ),
    delete: jest.fn().mockResolvedValue({}),
  },
  assets: { get: jest.fn(), getContent: jest.fn() },
  agents: { list: jest.fn().mockResolvedValue({ agents: [] }), info: jest.fn() },
  operations: { run: jest.fn(), invoke: jest.fn() },
};

jest.mock("@/hooks/use-authenticated-venue", () => ({
  ...require("@test/use-authenticated-venue").venueMock,
  useAuthenticatedVenue: () => mockVenue,
}));

import { notifyMock } from "@test/notify";
import { SkillsLibrary } from "@/components/SkillsLibrary";

// Picking a row reloads the detail pane asynchronously, so wait for its
// heading before asserting on the actions that live beside it.
const selectSkill = async (name: string) => {
  const row = await screen.findByText(name);
  fireEvent.click(row.closest("button")!);
  await screen.findByRole("heading", { name, level: 2 });
};

const editor = () => screen.getByLabelText("Skill markdown") as HTMLTextAreaElement;

describe("skill authoring — entry points", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVenue.workspace.read.mockImplementation((path: string) =>
      Promise.resolve(
        path === "v/skills"
          ? { exists: true, value: VENUE_TREE }
          : { exists: true, value: USER_TREE },
      ),
    );
    mockVenue.workspace.delete.mockResolvedValue({});
    notifyMock.jobFailure.mockImplementation((err: unknown) => ({ reason: err, jobHref: undefined }));
  });

  it("opens a new-skill editor seeded with a valid template", async () => {
    render(<SkillsLibrary />);
    fireEvent.click(await screen.findByRole("button", { name: /new skill/i }));

    expect(editor().value).toContain("name: my-skill");
    // The template must be savable as-is, not a draft the person must repair.
    expect(screen.getByText("Saves to w/skills/my-skill")).toBeInTheDocument();
  });

  it("offers edit and delete on a workspace skill, and neither on a venue one", async () => {
    render(<SkillsLibrary />);

    await selectSkill("research");
    expect(screen.getByRole("button", { name: /^edit$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^delete$/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /duplicate/i })).not.toBeInTheDocument();

    await selectSkill("Agent skills");
    expect(await screen.findByRole("button", { name: /duplicate to workspace/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^edit$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^delete$/i })).not.toBeInTheDocument();
  });

  it("seeds the edit dialog from the stored skill so an unchanged save round-trips", async () => {
    render(<SkillsLibrary />);
    await selectSkill("research");
    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));

    const text = editor().value;
    expect(text).toContain("name: research");
    expect(text).toContain("description: Find reliable sources.");
    expect(text).toContain("## Research");
  });

  it("names a venue skill by its key when duplicating, so the copy is writable", async () => {
    render(<SkillsLibrary />);
    await selectSkill("Agent skills");
    fireEvent.click(await screen.findByRole("button", { name: /duplicate to workspace/i }));

    // "Agent skills" has a space and cannot be a path segment; the key can.
    expect(editor().value).toContain("name: agents");
    expect(screen.getByText("Saves to w/skills/agents")).toBeInTheDocument();
  });

  it("does not invoke anything just to browse the library", async () => {
    render(<SkillsLibrary />);
    await screen.findByText("research");
    expect(mockVenue.operations.run).not.toHaveBeenCalled();
    expect(mockVenue.operations.invoke).not.toHaveBeenCalled();
  });
});

describe("skill authoring — saving", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVenue.workspace.read.mockImplementation((path: string) =>
      Promise.resolve(
        path === "v/skills"
          ? { exists: true, value: VENUE_TREE }
          : { exists: true, value: USER_TREE },
      ),
    );
  });

  it("writes the edited SKILL.md through the venue's import operation", async () => {
    mockVenue.operations.run.mockResolvedValue({
      path: "w/skills/research",
      name: "research",
      existed: true,
    });
    render(<SkillsLibrary />);
    await selectSkill("research");
    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));

    fireEvent.change(editor(), {
      target: { value: "---\nname: research\ndescription: Updated.\n---\n\n## New body\n" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(mockVenue.operations.run).toHaveBeenCalledWith("v/ops/skills/import", {
        text: "---\nname: research\ndescription: Updated.\n---\n\n## New body\n",
        skillset: "w/skills",
      }),
    );
    // `existed` distinguishes an edit from a create in the confirmation.
    expect(notifyMock.notifySuccess).toHaveBeenCalledWith("Updated research");
  });

  it("reloads the library after a save so the new skill is listed", async () => {
    mockVenue.operations.run.mockResolvedValue({ path: "w/skills/fresh", name: "fresh", existed: false });
    render(<SkillsLibrary />);
    await screen.findByText("research");
    const readsBefore = mockVenue.workspace.read.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: /new skill/i }));
    fireEvent.click(screen.getByRole("button", { name: /create skill/i }));

    await waitFor(() =>
      expect(mockVenue.workspace.read.mock.calls.length).toBeGreaterThan(readsBefore),
    );
    expect(notifyMock.notifySuccess).toHaveBeenCalledWith("Created fresh");
  });

  it("surfaces frontmatter keys the venue dropped instead of reporting a clean save", async () => {
    mockVenue.operations.run.mockResolvedValue({
      path: "w/skills/research",
      name: "research",
      ignored: ["argument-hint"],
    });
    render(<SkillsLibrary />);
    fireEvent.click(await screen.findByRole("button", { name: /new skill/i }));
    fireEvent.click(screen.getByRole("button", { name: /create skill/i }));

    await waitFor(() =>
      expect(notifyMock.notifyWarning).toHaveBeenCalledWith(
        "Saved without argument-hint",
        expect.objectContaining({ description: expect.stringContaining("frontmatter key") }),
      ),
    );
    expect(notifyMock.notifySuccess).not.toHaveBeenCalled();
  });

  it("blocks saving an invalid draft and says why, without calling the venue", async () => {
    render(<SkillsLibrary />);
    fireEvent.click(await screen.findByRole("button", { name: /new skill/i }));

    fireEvent.change(editor(), { target: { value: "# just a heading" } });
    expect(screen.getByRole("alert")).toHaveTextContent("frontmatter block");
    expect(screen.getByRole("button", { name: /create skill/i })).toBeDisabled();
    expect(mockVenue.operations.run).not.toHaveBeenCalled();
  });

  it("rejects a name that is not one path segment, as the venue would", async () => {
    render(<SkillsLibrary />);
    fireEvent.click(await screen.findByRole("button", { name: /new skill/i }));

    fireEvent.change(editor(), {
      target: { value: "---\nname: two words\ndescription: d\n---\n" },
    });
    expect(screen.getByRole("alert")).toHaveTextContent("one path segment");
    expect(screen.getByRole("button", { name: /create skill/i })).toBeDisabled();
  });

  it("keeps the editor open and reports the failure when the venue refuses", async () => {
    const failure = new Error("venue said no");
    mockVenue.operations.run.mockRejectedValue(failure);
    render(<SkillsLibrary />);
    fireEvent.click(await screen.findByRole("button", { name: /new skill/i }));
    fireEvent.click(screen.getByRole("button", { name: /create skill/i }));

    await waitFor(() =>
      expect(notifyMock.notifyError).toHaveBeenCalledWith(
        "Unable to save skill",
        failure,
        "https://venue.example",
      ),
    );
    // The draft survives, so the work is not lost.
    expect(editor()).toBeInTheDocument();
  });
});

describe("skill authoring — deleting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVenue.workspace.read.mockImplementation((path: string) =>
      Promise.resolve(
        path === "v/skills"
          ? { exists: true, value: VENUE_TREE }
          : { exists: true, value: USER_TREE },
      ),
    );
    mockVenue.workspace.delete.mockResolvedValue({});
  });

  it("confirms before deleting, naming the path that will be removed", async () => {
    render(<SkillsLibrary />);
    await selectSkill("research");
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/w\/skills\/research/)).toBeInTheDocument();
    expect(mockVenue.workspace.delete).not.toHaveBeenCalled();
  });

  it("deletes job-free on confirm and reloads the library", async () => {
    render(<SkillsLibrary />);
    await selectSkill("research");
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    const readsBefore = mockVenue.workspace.read.mock.calls.length;

    fireEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: /delete skill/i }),
    );

    await waitFor(() => expect(mockVenue.workspace.delete).toHaveBeenCalledWith("w/skills/research"));
    // A lattice delete, not an operation — no job for removing a skill.
    expect(mockVenue.operations.run).not.toHaveBeenCalled();
    expect(notifyMock.notifySuccess).toHaveBeenCalledWith("Deleted research");
    await waitFor(() =>
      expect(mockVenue.workspace.read.mock.calls.length).toBeGreaterThan(readsBefore),
    );
  });

  it("cancelling deletes nothing", async () => {
    render(<SkillsLibrary />);
    await selectSkill("research");
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    fireEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: /cancel/i }),
    );

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(mockVenue.workspace.delete).not.toHaveBeenCalled();
  });

  it("reports a failed delete and leaves the skill listed", async () => {
    const failure = new Error("nope");
    mockVenue.workspace.delete.mockRejectedValue(failure);
    render(<SkillsLibrary />);
    await selectSkill("research");
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    const readsBefore = mockVenue.workspace.read.mock.calls.length;
    fireEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: /delete skill/i }),
    );

    await waitFor(() =>
      expect(notifyMock.notifyError).toHaveBeenCalledWith(
        "Unable to delete skill",
        failure,
        "https://venue.example",
      ),
    );
    // Nothing was removed, so the library is not re-read, and the confirm stays
    // up rather than dismissing as though the delete had worked.
    expect(mockVenue.workspace.read.mock.calls.length).toBe(readsBefore);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });
});
