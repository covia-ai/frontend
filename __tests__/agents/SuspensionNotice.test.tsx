import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";

import { SuspensionNotice } from "@/components/agent-explorer/SuspensionNotice";

const SELF = "did:key:z6MkSelfAccountKey";
const OPERATOR = "did:key:z6MkVenueOperatorKey";

describe("SuspensionNotice (covia#590)", () => {
  it("names another stopper by DID, with the time and the reason", () => {
    render(
      <SuspensionNotice
        suspension={{ by: OPERATOR, ts: Date.now() - 3 * 60_000, reason: "Rotating its key" }}
        self={SELF}
      />,
    );

    const notice = screen.getByTestId("agent-suspension");
    expect(within(notice).getByTestId("did-display")).toHaveAttribute("data-value", OPERATOR);
    expect(within(notice).getByTestId("agent-suspension-time")).toBeInTheDocument();
    expect(within(notice).getByTestId("agent-suspension-reason")).toHaveTextContent("Rotating its key");
  });

  it("shows no DID for a stop of the signed-in account's own", () => {
    render(<SuspensionNotice suspension={{ by: SELF, ts: Date.now() }} self={SELF} />);
    expect(within(screen.getByTestId("agent-suspension")).queryByTestId("did-display")).not.toBeInTheDocument();
  });

  it("leaves out a time and reason the venue didn't record", () => {
    render(<SuspensionNotice suspension={{ by: OPERATOR }} self={null} />);
    expect(screen.queryByTestId("agent-suspension-time")).not.toBeInTheDocument();
    expect(screen.queryByTestId("agent-suspension-reason")).not.toBeInTheDocument();
  });
});
