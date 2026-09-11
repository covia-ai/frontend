import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { JumpBackIn } from "@/components/home/JumpBackIn";
import { VenuePulse } from "@/components/home/VenuePulse";
import { QuickActions } from "@/components/home/QuickActions";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("JumpBackIn", () => {
  it("renders a card per agent, humanised, linking to the agent's page", () => {
    render(
      <JumpBackIn
        agents={[
          { agentId: "release-manager", status: "RUNNING", lastActive: Date.now() - 60000, config: {} },
          { agentId: "support-triage", status: "SLEEPING", lastActive: Date.now() - 7200000, config: {} },
        ]}
      />,
    );
    const items = screen.getAllByTestId("home-jump-back-in-item");
    expect(items).toHaveLength(2);
    expect(screen.getByText("Release Manager")).toBeInTheDocument();
    expect(items[0]).toHaveAttribute("href", "/agents/agent/release-manager");
  });

  it("renders nothing when there are no recent agents", () => {
    const { container } = render(<JumpBackIn agents={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("VenuePulse", () => {
  it("shows agent figures always and the optional figures only when provided", () => {
    render(<VenuePulse running={2} total={5} jobs={48} connections={4} />);
    expect(screen.getByText("Agents running")).toBeInTheDocument();
    expect(screen.getByText("Jobs run")).toBeInTheDocument();
    expect(screen.getByText("Connections")).toBeInTheDocument();
  });

  it("omits optional tiles that weren't read", () => {
    render(<VenuePulse running={1} total={3} />);
    expect(screen.queryByText("Jobs run")).not.toBeInTheDocument();
    expect(screen.queryByText("Connections")).not.toBeInTheDocument();
  });

  it("folds away entirely on a fresh venue with nothing to show", () => {
    const { container } = render(<VenuePulse running={0} total={0} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("QuickActions", () => {
  it("links to the agent-create, operations, connections and jobs surfaces", () => {
    render(<QuickActions />);
    const links = screen.getAllByTestId("home-quick-action").map((a) => a.getAttribute("href"));
    expect(links).toEqual(
      expect.arrayContaining(["/agents/create", "/operations", "/connections", "/jobs"]),
    );
  });
});
