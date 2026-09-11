import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { AIPrompt } from "@/components/AIPrompt";

jest.mock("@/lib/notify", () => ({
  notifySuccess: jest.fn(), notifyError: jest.fn(), notifyWarning: jest.fn(), notifyInfo: jest.fn(),
  jobFailure: (err: unknown) => ({ reason: err, jobHref: undefined }),
}));
jest.mock("@/hooks/use-authenticated-venue", () => ({ useAuthenticatedVenue: () => null }));
jest.mock("@/hooks/use-auth", () => ({ useIsAuthenticated: () => true }));
jest.mock("@/hooks/use-device-key-signin", () => ({
  useDeviceKeySignIn: () => ({
    dialogOpen: false, setDialogOpen: jest.fn(), openDialog: jest.fn(),
    step: "choose", setStep: jest.fn(),
    deviceKey: null, deviceKeyDid: null, isExisting: false, pastedKey: "", keyError: null, copied: false,
    checking: false, authError: null, storedKeys: [],
    handleGenerate: jest.fn(), handleProvideKey: jest.fn(), handlePastedKeyChange: jest.fn(),
    handleSubmitProvidedKey: jest.fn(), handleCopy: jest.fn(), handleContinue: jest.fn(),
    handleUseStoredKey: jest.fn(), handleUseDifferentKey: jest.fn(),
  }),
}));

describe("AIPrompt — starter prompts", () => {
  it("renders no starter chips when none are given (the default composer)", () => {
    render(<AIPrompt fixedAgentId="assistant" />);
    expect(screen.queryByTestId("home-starter")).not.toBeInTheDocument();
  });

  it("fills the composer from a starter chip without sending", async () => {
    const user = userEvent.setup();
    render(<AIPrompt fixedAgentId="assistant" starters={["Summarise my open work", "What can this venue do?"]} />);

    const chips = screen.getAllByTestId("home-starter");
    expect(chips).toHaveLength(2);

    await user.click(screen.getByText("What can this venue do?"));
    // The chip fills the textarea for the person to edit — it does not submit.
    expect(screen.getByLabelText("prompt")).toHaveValue("What can this venue do?");
  });
});
