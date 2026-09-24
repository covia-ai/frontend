import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/hooks/use-authenticated-venue", () =>
  require("@test/use-authenticated-venue").venueMock);
jest.mock("@/hooks/use-auth", () => require("@test/use-auth").authMock);
jest.mock("@/lib/notify", () => require("@test/notify").notifyMock);

import { notifyMock } from "@test/notify";
import { sampleKeypairAuth, setCurrentAuth } from "@test/use-auth";
import { setVenue, VENUE_ID } from "@test/use-authenticated-venue";
import { resetSupportMocks } from "@test/reset";
import { UcanIssuePanel } from "@/components/ucan/UcanIssuePanel";

function withIssue(impl: jest.Mock) {
  setVenue({ ucan: { issue: impl } });
  return impl;
}

/** Signed in, past the advanced gate, with the issuance form on screen. */
async function openForm(issue = jest.fn().mockResolvedValue({ token: "minted.jwt" })) {
  setCurrentAuth(sampleKeypairAuth);
  withIssue(issue);
  render(<UcanIssuePanel />);
  await userEvent.click(screen.getByTestId("ucan-issue-reveal"));
  return issue;
}

beforeEach(resetSupportMocks);

describe("UcanIssuePanel", () => {
  it("requires an account, unlike verification", () => {
    setCurrentAuth(null);
    render(<UcanIssuePanel />);

    expect(screen.getByText("Sign in to issue capabilities")).toBeInTheDocument();
    expect(screen.queryByTestId("ucan-issue-reveal")).not.toBeInTheDocument();
  });

  it("keeps the form behind an advanced gate", async () => {
    setCurrentAuth(sampleKeypairAuth);
    render(<UcanIssuePanel />);

    expect(screen.getByTestId("ucan-issue-gate")).toBeInTheDocument();
    expect(screen.queryByTestId("ucan-issue-form")).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId("ucan-issue-reveal"));
    expect(screen.getByTestId("ucan-issue-form")).toBeInTheDocument();
  });

  it("defaults the audience to the venue and pre-fills a narrow self-attenuation", async () => {
    await openForm();

    expect(screen.getByTestId("ucan-issue-aud")).toHaveValue(VENUE_ID);
    expect(screen.getByTestId("ucan-issue-with-0")).toHaveValue("/w/");
    expect(screen.getByTestId("ucan-issue-can-0")).toHaveValue("crud/read");
    expect(screen.queryByTestId("ucan-issue-broad-warning")).not.toBeInTheDocument();
  });

  it("mints with an absolute expiry and shows the token once, with when it expires", async () => {
    const issue = await openForm();

    await userEvent.click(screen.getByTestId("ucan-issue-mint"));

    await waitFor(() => expect(issue).toHaveBeenCalledWith(
      VENUE_ID,
      [{ with: "/w/", can: "crud/read" }],
      expect.any(Number),
    ));
    // exp is a future Unix timestamp in seconds, not a lifetime.
    const exp = issue.mock.calls[0][2] as number;
    expect(exp).toBeGreaterThan(Date.now() / 1000);
    expect(exp).toBeLessThan(Date.now() / 1000 + 3_700);

    expect(screen.getByTestId("ucan-issue-token")).toHaveTextContent("minted.jwt");
    expect(screen.getByTestId("ucan-issue-result")).toHaveTextContent(/Expires/);
  });

  it("will not mint a broad grant until it is explicitly confirmed", async () => {
    const issue = await openForm();

    await userEvent.clear(screen.getByTestId("ucan-issue-can-0"));
    await userEvent.type(screen.getByTestId("ucan-issue-can-0"), "*");

    expect(screen.getByTestId("ucan-issue-broad-warning")).toBeInTheDocument();
    expect(screen.getByTestId("ucan-issue-mint")).toBeDisabled();

    await userEvent.click(screen.getByTestId("ucan-issue-confirm-broad"));
    expect(screen.getByTestId("ucan-issue-mint")).toBeEnabled();

    await userEvent.click(screen.getByTestId("ucan-issue-mint"));
    await waitFor(() => expect(issue).toHaveBeenCalledWith(
      VENUE_ID,
      [{ with: "/w/", can: "*" }],
      expect.any(Number),
    ));
  });

  it("re-arms the broad-grant confirmation when the scope changes again", async () => {
    await openForm();

    await userEvent.clear(screen.getByTestId("ucan-issue-can-0"));
    await userEvent.type(screen.getByTestId("ucan-issue-can-0"), "*");
    await userEvent.click(screen.getByTestId("ucan-issue-confirm-broad"));
    expect(screen.getByTestId("ucan-issue-mint")).toBeEnabled();

    // Widening the resource as well must not inherit the earlier consent.
    await userEvent.clear(screen.getByTestId("ucan-issue-with-0"));
    await userEvent.type(screen.getByTestId("ucan-issue-with-0"), "/");
    expect(screen.getByTestId("ucan-issue-mint")).toBeDisabled();
  });

  it("blocks a half-filled capability row", async () => {
    await openForm();

    await userEvent.click(screen.getByTestId("ucan-issue-add-row"));
    await userEvent.type(screen.getByTestId("ucan-issue-with-1"), "/w/notes/");

    expect(screen.getByTestId("ucan-issue-mint")).toBeDisabled();
  });

  it("blocks an audience that is not a DID", async () => {
    await openForm();

    await userEvent.clear(screen.getByTestId("ucan-issue-aud"));
    await userEvent.type(screen.getByTestId("ucan-issue-aud"), "not-a-did");

    expect(screen.getByTestId("ucan-issue-mint")).toBeDisabled();
  });

  it("drops a minted token the moment the inputs change", async () => {
    await openForm();

    await userEvent.click(screen.getByTestId("ucan-issue-mint"));
    await screen.findByTestId("ucan-issue-result");

    await userEvent.type(screen.getByTestId("ucan-issue-with-0"), "reports/");
    expect(screen.queryByTestId("ucan-issue-result")).not.toBeInTheDocument();
  });

  it("surfaces a venue refusal rather than a blank result", async () => {
    await openForm(jest.fn().mockRejectedValue(new Error("not a custodial resource")));

    await userEvent.click(screen.getByTestId("ucan-issue-mint"));

    await waitFor(() => expect(notifyMock.notifyError).toHaveBeenCalledWith(
      "Unable to issue capability",
      expect.any(Error),
      expect.any(String),
    ));
    expect(screen.queryByTestId("ucan-issue-result")).not.toBeInTheDocument();
  });
});
