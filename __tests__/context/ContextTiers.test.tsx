import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { ContextTiers } from "@/components/ContextTiers";
import { CONTEXT_TIERS, SCOPE_LABELS } from "@/lib/context-tiers";

describe("ContextTiers", () => {
  it("renders one card per tier with its scope badge and a working link", () => {
    render(<ContextTiers />);

    for (const tier of CONTEXT_TIERS) {
      const card = screen.getByTestId(`context-tier-${tier.key}`);
      expect(card).toHaveTextContent(tier.label);
      expect(card).toHaveTextContent(tier.prefix);
      expect(card).toHaveTextContent(SCOPE_LABELS[tier.scope]);

      const link = screen.getByRole("link", { name: tier.linkLabel });
      expect(link).toHaveAttribute("href", tier.href);
    }
  });

  it("labels the venue tier as shared and read-only", () => {
    render(<ContextTiers />);
    const venueCard = screen.getByTestId("context-tier-venue");
    expect(venueCard).toHaveTextContent("Shared");
    expect(venueCard).toHaveTextContent(/read-only/i);
  });
});
