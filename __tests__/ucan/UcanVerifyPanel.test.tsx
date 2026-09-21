import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/hooks/use-authenticated-venue", () =>
  require("@test/use-authenticated-venue").venueMock);
jest.mock("@/lib/notify", () => require("@test/notify").notifyMock);

import { notifyMock } from "@test/notify";
import { setVenue } from "@test/use-authenticated-venue";
import { resetSupportMocks } from "@test/reset";
import { UcanVerifyPanel } from "@/components/ucan/UcanVerifyPanel";

const verifyResult = (over: Record<string, unknown> = {}) => ({
  valid: true,
  iss: "did:key:z6MkIssuer",
  aud: "did:key:z6MkAudience",
  rootIssuer: "did:key:z6MkOwner",
  chainDepth: 1,
  exp: 1_700_000_000,
  att: [{ with: "/w/reports/", can: "crud/read", rootAuthority: "owner" }],
  ...over,
});

function withVerify(impl: jest.Mock) {
  setVenue({ ucan: { verify: impl } });
  return impl;
}

beforeEach(resetSupportMocks);

describe("UcanVerifyPanel", () => {
  it("verifies without an account — the signed-out case #254 requires", async () => {
    // The venue instance exists with no credentials; that is what the real
    // hook returns for a public venue when nobody is signed in.
    const verify = withVerify(jest.fn().mockResolvedValue(verifyResult()));
    render(<UcanVerifyPanel />);

    await userEvent.type(screen.getByTestId("ucan-verify-token"), "header.payload.sig");
    await userEvent.click(screen.getByTestId("ucan-verify-submit"));

    await waitFor(() => expect(screen.getByTestId("ucan-verify-result")).toBeInTheDocument());
    expect(verify).toHaveBeenCalledWith("header.payload.sig", undefined);
    expect(screen.getByTestId("ucan-verify-validity")).toHaveTextContent("Valid");
  });

  it("explains an invalid token with the venue's own reason", async () => {
    withVerify(jest.fn().mockResolvedValue(verifyResult({ valid: false, reason: "expired" })));
    render(<UcanVerifyPanel />);

    await userEvent.type(screen.getByTestId("ucan-verify-token"), "stale");
    await userEvent.click(screen.getByTestId("ucan-verify-submit"));

    await waitFor(() => expect(screen.getByTestId("ucan-verify-validity")).toHaveTextContent("Not valid"));
    expect(screen.getByTestId("ucan-verify-reason")).toHaveTextContent("expired");
  });

  it("shows each capability's root-authority verdict and what it means", async () => {
    withVerify(jest.fn().mockResolvedValue(verifyResult({
      att: [
        { with: "/w/a/", can: "crud/read", rootAuthority: "owner" },
        { with: "/w/b/", can: "crud/write", rootAuthority: "refused" },
      ],
    })));
    render(<UcanVerifyPanel />);

    await userEvent.type(screen.getByTestId("ucan-verify-token"), "t");
    await userEvent.click(screen.getByTestId("ucan-verify-submit"));

    const caps = await screen.findByTestId("ucan-verify-capabilities");
    expect(caps).toHaveTextContent("owner");
    expect(caps).toHaveTextContent("refused");
    expect(caps).toHaveTextContent(/will not honour the capability/);
  });

  it("passes a with/can check through and reports the verdict", async () => {
    const verify = withVerify(jest.fn().mockResolvedValue(verifyResult({ authorises: false })));
    render(<UcanVerifyPanel />);

    await userEvent.type(screen.getByTestId("ucan-verify-token"), "t");
    await userEvent.type(screen.getByTestId("ucan-verify-check-with"), "/w/other/");
    await userEvent.type(screen.getByTestId("ucan-verify-check-can"), "crud/write");
    await userEvent.click(screen.getByTestId("ucan-verify-submit"));

    await waitFor(() => expect(verify).toHaveBeenCalledWith("t", {
      with: "/w/other/",
      can: "crud/write",
    }));
    expect(screen.getByTestId("ucan-verify-authorises")).toHaveTextContent(/Does not authorise/);
  });

  it("drops a verdict as soon as the token is edited, so a stale one cannot be read", async () => {
    withVerify(jest.fn().mockResolvedValue(verifyResult()));
    render(<UcanVerifyPanel />);

    const input = screen.getByTestId("ucan-verify-token");
    await userEvent.type(input, "first");
    await userEvent.click(screen.getByTestId("ucan-verify-submit"));
    await screen.findByTestId("ucan-verify-result");

    await userEvent.type(input, "-changed");
    expect(screen.queryByTestId("ucan-verify-result")).not.toBeInTheDocument();
  });

  it("reports a failed verification through notify and shows no verdict", async () => {
    withVerify(jest.fn().mockRejectedValue(new Error("venue unreachable")));
    render(<UcanVerifyPanel />);

    await userEvent.type(screen.getByTestId("ucan-verify-token"), "t");
    await userEvent.click(screen.getByTestId("ucan-verify-submit"));

    await waitFor(() => expect(notifyMock.notifyError).toHaveBeenCalledWith(
      "Unable to verify capability",
      expect.any(Error),
      expect.any(String),
    ));
    expect(screen.queryByTestId("ucan-verify-result")).not.toBeInTheDocument();
  });

  it("cannot verify an empty paste", () => {
    withVerify(jest.fn());
    render(<UcanVerifyPanel />);
    expect(screen.getByTestId("ucan-verify-submit")).toBeDisabled();
  });
});
