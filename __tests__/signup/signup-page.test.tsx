import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// DidDisplay maps a raw key to its did:key for the identicon; the page passes a
// did:key straight through, but stub the SDK call so nothing heavy loads.
jest.mock("@covia/covia-sdk", () => ({
  didFromPublicKey: jest.fn(() => "did:key:z6MockUser"),
}));

let mockAuth: { type: "keypair" | "bearer"; did: string } | null = null;
jest.mock("@/hooks/use-auth", () => ({
  useCurrentAuth: () => mockAuth,
}));

const mockVenueState = {
  selectedVenueId: "did:web:venue.example",
  venues: [
    {
      venueId: "did:web:venue.example",
      baseUrl: "https://venue.example",
      metadata: { name: "Test Venue" },
    },
  ],
};
jest.mock("@/hooks/use-venues", () => ({
  useVenues: (selector: (s: unknown) => unknown) => selector(mockVenueState),
}));

// No venue advertises OAuth (the #394 reality) → device key is the sole/primary path.
jest.mock("@/hooks/use-oauth-sign-in", () => ({
  useOAuthSignInOptions: () => [],
}));

// Keep the real SignupSignInButton mounted, but stub the sign-in hook it drives.
jest.mock("@/hooks/use-device-key-signin", () => ({
  useDeviceKeySignIn: () => ({
    dialogOpen: false,
    setDialogOpen: jest.fn(),
    openDialog: jest.fn(),
    step: "choose",
    setStep: jest.fn(),
    deviceKey: "",
    deviceKeyDid: "",
    isExisting: false,
    pastedKey: "",
    keyError: "",
    copied: false,
    checking: false,
    authError: "",
    storedKeys: [],
    handleGenerate: jest.fn(),
    handleProvideKey: jest.fn(),
    handlePastedKeyChange: jest.fn(),
    handleSubmitProvidedKey: jest.fn(),
    handleCopy: jest.fn(),
    handleContinue: jest.fn(),
    handleUseStoredKey: jest.fn(),
    handleUseDifferentKey: jest.fn(),
  }),
}));

import SignUp from "@/app/(signup)/signUp/page";

describe("SignUp page (2C)", () => {
  it("signed out: names the venue, shows the device-key path, and links the terms", () => {
    mockAuth = null;
    render(<SignUp />);

    // Venue context chip (the copy promised "the selected venue" but never showed it).
    expect(screen.getByText("Signing in to")).toBeInTheDocument();
    expect(screen.getByText("Test Venue")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Change" })).toHaveAttribute("href", "/venues");

    // The device-key path is present (the only path when no venue advertises OAuth).
    expect(screen.getByRole("button", { name: /continue with a device key/i })).toBeInTheDocument();

    // Terms + Privacy are now real links (was plain text).
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacypolicy");
  });

  it("signed in: shows the identity + type badge and real onward CTAs", () => {
    mockAuth = { type: "keypair", did: "did:key:z6MockUser" };
    render(<SignUp />);

    expect(screen.getByText(/you're signed in/i)).toBeInTheDocument();
    expect(screen.getByText("Device Key")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /continue to dashboard/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /manage identities/i })).toHaveAttribute("href", "/profile");
  });
});
