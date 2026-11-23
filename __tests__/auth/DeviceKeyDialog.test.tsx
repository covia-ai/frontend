import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { DeviceKeyDialog } from "@/components/DeviceKeyDialog";
import type { DeviceKeySignIn } from "@/hooks/use-device-key-signin";

const DID = "did:key:z6MkjZ99jCFSWek3Y9vuktSiHcqbtrc3vaUFUTF0upyePk8q";

function signIn(overrides: Partial<DeviceKeySignIn> = {}): DeviceKeySignIn {
  return {
    dialogOpen: true,
    setDialogOpen: jest.fn(),
    step: "show",
    setStep: jest.fn(),
    deviceKey: "00".repeat(32),
    deviceKeyDid: DID,
    isExisting: true,
    pastedKey: "",
    handlePastedKeyChange: jest.fn(),
    keyError: null,
    copied: false,
    checking: false,
    authError: null,
    storedKeys: [],
    handleGenerate: jest.fn(),
    handleProvideKey: jest.fn(),
    handleSubmitProvidedKey: jest.fn(),
    handleCopy: jest.fn(),
    handleContinue: jest.fn(),
    handleUseStoredKey: jest.fn(),
    handleUseDifferentKey: jest.fn(),
    ...overrides,
  } as unknown as DeviceKeySignIn;
}

describe("DeviceKeyDialog", () => {
  it("focuses Continue on Welcome Back, so the DID tooltip does not cover the description", () => {
    render(<DeviceKeyDialog signIn={signIn()} />);

    expect(screen.getByText("Welcome Back")).toBeInTheDocument();
    expect(screen.getByTestId("devicekey-continue")).toHaveFocus();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
