import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { SecretList } from "@/components/SecretList";

const mockToast = jest.fn();
jest.mock("@/lib/notify", () => ({
  notifySuccess: (...a: any[]) => mockToast("success", ...a),
  notifyError: (...a: any[]) => mockToast("error", ...a),
  notifyWarning: (...a: any[]) => mockToast("warning", ...a),
  jobFailure: (err: unknown) => ({ reason: err, jobHref: undefined }),
}));

const mockUseAuthenticatedVenue = jest.fn();
const mockRevalidate = jest.fn();
jest.mock("@/hooks/use-authenticated-venue", () => ({
  useAuthenticatedVenue: () => mockUseAuthenticatedVenue(),
  revalidateVenueOnFailure: (...a: any[]) => mockRevalidate(...a),
}));

const mockUseIsAuthenticated = jest.fn();
jest.mock("@/hooks/use-auth", () => ({
  useIsAuthenticated: () => mockUseIsAuthenticated(),
}));

function makeVenue(over: Partial<{ list: jest.Mock; set: jest.Mock; del: jest.Mock }> = {}) {
  const list = over.list ?? jest.fn().mockResolvedValue(["GITHUB_TOKEN", "OPENAI_API_KEY", "MY_CUSTOM_KEY"]);
  const set = over.set ?? jest.fn().mockResolvedValue(undefined);
  const del = over.del ?? jest.fn().mockResolvedValue(undefined);
  return { venue: { venueId: "v1", baseUrl: "https://v.example", secrets: { list, set, delete: del } }, list, set, del };
}

beforeEach(() => {
  mockToast.mockReset();
  mockUseIsAuthenticated.mockReset().mockReturnValue(true);
  mockUseAuthenticatedVenue.mockReset();
});

describe("SecretList (2A)", () => {
  it("groups secrets, shows the connection badge, and never reveals a value", async () => {
    const { venue } = makeVenue();
    mockUseAuthenticatedVenue.mockReturnValue(venue);
    render(<SecretList />);

    // grouped headers
    expect(await screen.findByText("Connections")).toBeInTheDocument();
    expect(screen.getByText("LLM providers")).toBeInTheDocument();
    expect(screen.getByText("Other")).toBeInTheDocument();
    // all names, mono
    expect(screen.getByText("GITHUB_TOKEN")).toBeInTheDocument();
    expect(screen.getByText("OPENAI_API_KEY")).toBeInTheDocument();
    expect(screen.getByText("MY_CUSTOM_KEY")).toBeInTheDocument();
    // connection badge links to /connections
    const badge = screen.getByText(/connection$/i).closest("a");
    expect(badge).toHaveAttribute("href", "/connections");
    // value is masked, never a real secret value (list returns names only)
    expect(screen.getAllByText("••••••••").length).toBe(3);
  });

  it("stores a secret via secrets.set, and guards the Add button when blank", async () => {
    const user = userEvent.setup();
    const { venue, set } = makeVenue();
    mockUseAuthenticatedVenue.mockReturnValue(venue);
    render(<SecretList />);
    await screen.findByText("GITHUB_TOKEN");

    const add = screen.getByRole("button", { name: "Add" });
    expect(add).toBeDisabled(); // blank name+value

    await user.type(screen.getByPlaceholderText("Secret name"), "STRIPE_KEY");
    await user.type(screen.getByPlaceholderText("Secret value"), "sk_live_123");
    expect(add).toBeEnabled();
    await user.click(add);

    expect(set).toHaveBeenCalledWith("STRIPE_KEY", "sk_live_123");
  });

  it("filters the list with the search box", async () => {
    const user = userEvent.setup();
    const { venue } = makeVenue();
    mockUseAuthenticatedVenue.mockReturnValue(venue);
    render(<SecretList />);
    await screen.findByText("GITHUB_TOKEN");

    await user.type(screen.getByLabelText("Search secrets"), "openai");
    expect(screen.getByText("OPENAI_API_KEY")).toBeInTheDocument();
    expect(screen.queryByText("GITHUB_TOKEN")).not.toBeInTheDocument();
    expect(screen.queryByText("MY_CUSTOM_KEY")).not.toBeInTheDocument();
  });

  it("confirms delete, calls secrets.delete, and guards the row while it is in flight", async () => {
    const user = userEvent.setup();
    // A delete promise we resolve manually, to observe the in-flight guard.
    let resolveDelete: () => void = () => {};
    const del = jest.fn().mockReturnValue(new Promise<void>((r) => { resolveDelete = r; }));
    const { venue } = makeVenue({ del });
    mockUseAuthenticatedVenue.mockReturnValue(venue);
    render(<SecretList />);
    await screen.findByText("MY_CUSTOM_KEY");

    // Open the confirm dialog for MY_CUSTOM_KEY and confirm.
    await user.click(screen.getByRole("button", { name: "Delete MY_CUSTOM_KEY" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(del).toHaveBeenCalledWith("MY_CUSTOM_KEY");
    // In flight: the row's control flips to a disabled "Deleting …" button.
    const busy = await screen.findByRole("button", { name: "Deleting MY_CUSTOM_KEY" });
    expect(busy).toBeDisabled();

    await act(async () => { resolveDelete(); });
  });

  it("shows the auth-required card and hides the list when not signed in", () => {
    const { venue } = makeVenue();
    mockUseIsAuthenticated.mockReturnValue(false);
    mockUseAuthenticatedVenue.mockReturnValue(venue);
    render(<SecretList />);

    expect(screen.getByText("Authentication required")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Secret name")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Search secrets")).not.toBeInTheDocument();
  });
});
