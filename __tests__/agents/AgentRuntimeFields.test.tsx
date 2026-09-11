import { render, screen } from "@testing-library/react";
import {
  AgentRuntimeFields,
  DEFAULT_PROVIDER_OPTION,
} from "@/components/agent-config/AgentConfigEditor";

const noop = () => {};

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
