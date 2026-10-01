import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/hooks/use-authenticated-venue", () =>
  require("@test/use-authenticated-venue").venueMock);
jest.mock("@/hooks/use-auth", () => require("@test/use-auth").authMock);
jest.mock("@/lib/notify", () => require("@test/notify").notifyMock);

import { notifyMock } from "@test/notify";
import { sampleKeypairAuth, setCurrentAuth } from "@test/use-auth";
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

beforeEach(() => {
  resetSupportMocks();
  setCurrentAuth(sampleKeypairAuth);
});

describe("UcanVerifyPanel", () => {
  it("gates verify on sign-in instead of letting the venue refuse it (#418)", async () => {
    // Venues refuse anonymous invokes (covia-ai/covia#528), so a signed-out
    // click would only ever surface the venue's raw denial.
    setCurrentAuth(null);
    const verify = withVerify(jest.fn());
    render(<UcanVerifyPanel />);

    await userEvent.type(screen.getByTestId("ucan-verify-token"), "header.payload.sig");
    const submit = screen.getByTestId("ucan-verify-submit");
    expect(submit).toBeDisabled();
    expect(submit).toHaveTextContent("Sign in to verify on this venue");
    expect(screen.getByTestId("ucan-verify-signin-note"))
      .toHaveTextContent("does not permit anonymous verification");
    expect(verify).not.toHaveBeenCalled();
  });

  it("verifies a pasted token when signed in", async () => {
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

  it("replaces the venue's operator-facing capability denial with plain wording", async () => {
    withVerify(jest.fn().mockRejectedValue(new Error(
      "Job 0x01 FAILED: Capability denied: requires invoke on did:key:z6Mkq/v/ops/ucan/verify. "
      + "Your capabilities are: crud/read on did:key:z6Mkq:public … see UCAN.md §4.7",
    )));
    render(<UcanVerifyPanel />);

    await userEvent.type(screen.getByTestId("ucan-verify-token"), "t");
    await userEvent.click(screen.getByTestId("ucan-verify-submit"));

    await waitFor(() => expect(notifyMock.notifyError).toHaveBeenCalled());
    const [title, err] = notifyMock.notifyError.mock.calls[0];
    expect(title).toBe("Unable to verify capability");
    expect((err as Error).message).toMatch(/does not let your account run verification/);
    expect((err as Error).message).not.toMatch(/auth\.public\.caps|UCAN\.md/);
  });

  it("cannot verify an empty paste", () => {
    withVerify(jest.fn());
    render(<UcanVerifyPanel />);
    expect(screen.getByTestId("ucan-verify-submit")).toBeDisabled();
  });
});
