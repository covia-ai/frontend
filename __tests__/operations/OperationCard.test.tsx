import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/hooks/use-authenticated-venue", () => ({
  ...require("@test/use-authenticated-venue").venueMock,
  useAuthenticatedVenue: () => null,
}));
jest.mock("@/components/AssetInfoSheet", () => ({ AssetInfoSheet: () => null }));

import { OperationCard } from "@/components/OperationCard";

const asset: any = {
  id: "v/ops/http/get",
  metadata: { name: "HTTP GET", operation: { adapter: "http:get" } },
};

describe("OperationCard MCP chip (#361)", () => {
  it("marks an operation the venue also serves as an MCP tool", () => {
    render(<OperationCard asset={asset} mcpTool="http_get" />);
    expect(screen.getByTestId("operation-mcp")).toHaveAttribute("data-tool", "http_get");
  });

  it("claims nothing when no tool is known to serve it", () => {
    render(<OperationCard asset={asset} />);
    expect(screen.queryByTestId("operation-mcp")).not.toBeInTheDocument();
  });
});
