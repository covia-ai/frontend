import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Venue } from "@covia/covia-sdk";
import {
  AgentRuntimeFields,
  DEFAULT_PROVIDER_OPTION,
} from "@/components/agent-config/AgentConfigEditor";
import { LLM_PROVIDERS } from "@/config/llm-providers";

const noop = () => {};

function venueWithCatalog(listFields: jest.Mock): Venue {
  return { venueId: "venue-1", workspace: { listFields } } as unknown as Venue;
}

function catalogOf(models: Record<string, string[]>) {
  return {
    exists: true,
    type: "Map",
    keys: Object.keys(models),
    values: Object.fromEntries(
      Object.entries(models).map(([id, tags]) => [id, { "model/tags": { exists: true, value: tags } }]),
    ),
  };
}

function renderFields(props: Partial<Parameters<typeof AgentRuntimeFields>[0]>) {
  return render(
    <AgentRuntimeFields
      providerId="anthropic"
      onProviderChange={noop}
      model=""
      onModelChange={noop}
      customModel=""
      onCustomModelChange={noop}
      availableKeys={["ANTHROPIC_API_KEY"]}
      {...props}
    />,
  );
}

// Opens the model picker and, once `awaited` is listed (the venue's answer has
// landed), returns every option it offers.
async function openModelOptions(awaited?: string) {
  const user = userEvent.setup({ delay: null });
  await user.click(screen.getByTestId("model-select"));
  if (awaited) await screen.findByRole("option", { name: awaited });
  return (await screen.findAllByRole("option")).map((option) => option.textContent);
}

describe("AgentRuntimeFields — model list", () => {
  it("lists the venue's catalogue for the provider, previous models grouped apart", async () => {
    const listFields = jest.fn().mockResolvedValue(catalogOf({
      "claude-sonnet-5-5": ["balanced"],
      "claude-sonnet-5": ["previous"],
    }));
    renderFields({ venue: venueWithCatalog(listFields) });

    await waitFor(() => expect(listFields).toHaveBeenCalledWith("v/models/anthropic", ["model/tags"]));
    const options = await openModelOptions("claude-sonnet-5");
    expect(options).toContain("claude-sonnet-5-5");
    // The venue's list replaces the curated one rather than adding to it.
    expect(options).not.toContain("claude-opus-5-5");
    expect(within(screen.getByTestId("previous-models")).getByRole("option", { name: "claude-sonnet-5" }))
      .toBeInTheDocument();
  });

  it("offers a provider's models when only the venue knows them", async () => {
    const listFields = jest.fn().mockResolvedValue(catalogOf({ "gpt-5.6-terra": ["balanced"] }));
    renderFields({ venue: venueWithCatalog(listFields), providerId: "openai" });

    await waitFor(() => expect(listFields).toHaveBeenCalledWith("v/models/openai", ["model/tags"]));
    expect(await openModelOptions("gpt-5.6-terra")).toContain("gpt-5.6-terra");
  });

  it("falls back to the curated list when the venue publishes no catalogue", async () => {
    const listFields = jest.fn().mockRejectedValue(new Error("Endpoint not found"));
    renderFields({ venue: venueWithCatalog(listFields) });

    await waitFor(() => expect(listFields).toHaveBeenCalled());
    expect(await openModelOptions()).toEqual(expect.arrayContaining(LLM_PROVIDERS.anthropic.models!));
    expect(screen.queryByTestId("previous-models")).not.toBeInTheDocument();
  });

  it("keeps a configured model the list doesn't carry selectable", async () => {
    renderFields({ model: "claude-opus-4-8" });

    expect(screen.getByTestId("model-select")).toHaveTextContent("claude-opus-4-8");
    expect(await openModelOptions()).toContain("claude-opus-4-8");
  });
});

describe("AgentRuntimeFields — venue-default provider key notice (#350)", () => {
  it("warns that the venue default's key can't be checked, when venue default is selected", () => {
    render(
      <AgentRuntimeFields
        providerId={DEFAULT_PROVIDER_OPTION}
        onProviderChange={noop}
        model=""
        onModelChange={noop}
        customModel=""
        onCustomModelChange={noop}
        availableKeys={[]}
        allowVenueDefaultProvider
      />,
    );
    expect(screen.getByTestId("venue-default-key-notice")).toBeInTheDocument();
  });

  it("shows the notice even when some other provider's key is already stored", () => {
    render(
      <AgentRuntimeFields
        providerId={DEFAULT_PROVIDER_OPTION}
        onProviderChange={noop}
        model=""
        onModelChange={noop}
        customModel=""
        onCustomModelChange={noop}
        availableKeys={["OPENAI_API_KEY"]}
        allowVenueDefaultProvider
      />,
    );
    // A stored OpenAI key says nothing about the venue's actual default model.
    expect(screen.getByTestId("venue-default-key-notice")).toBeInTheDocument();
  });

  it("does not show the venue-default notice for a specific provider missing its key (existing warning applies instead)", () => {
    render(
      <AgentRuntimeFields
        providerId="anthropic"
        onProviderChange={noop}
        model=""
        onModelChange={noop}
        customModel=""
        onCustomModelChange={noop}
        availableKeys={[]}
        allowVenueDefaultProvider
      />,
    );
    expect(screen.queryByTestId("venue-default-key-notice")).not.toBeInTheDocument();
    expect(screen.getByText(/No Anthropic \(Claude\) key\./)).toBeInTheDocument();
  });

  it("shows neither warning for a specific provider whose key is already stored", () => {
    render(
      <AgentRuntimeFields
        providerId="anthropic"
        onProviderChange={noop}
        model=""
        onModelChange={noop}
        customModel=""
        onCustomModelChange={noop}
        availableKeys={["ANTHROPIC_API_KEY"]}
        allowVenueDefaultProvider
      />,
    );
    expect(screen.queryByTestId("venue-default-key-notice")).not.toBeInTheDocument();
    expect(screen.queryByText(/No Anthropic \(Claude\) key\./)).not.toBeInTheDocument();
  });
});
