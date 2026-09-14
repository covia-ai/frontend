import { useCallback, useState } from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HitlRequestCard } from "@/components/hitl/HitlRequestCard";
import type { HitlRequest } from "@/lib/hitl";

// Record which cards render, keyed by the requester DID we make unique per card.
// DidDisplay renders once per card body, so a card re-rendering pushes its DID
// again — that's the render counter.
const didRenders: string[] = [];
jest.mock("@/components/DidDisplay", () => ({
  DidDisplay: ({ value }: { value: string }) => {
    didRenders.push(value);
    return <span>{value}</span>;
  },
}));
// Stub the capability surface — never rendered for text asks, and it pulls heavy
// crypto/venue deps we don't want in this render-count test.
jest.mock("@/components/HitlGrantAsk", () => ({ HitlGrantAsk: () => null }));

function textRequest(id: string): HitlRequest {
  return {
    id,
    title: `Request ${id}`,
    status: "open",
    from: `did:key:z6Mk${id}`,
    created: 1_700_000_000_000,
    asks: [{ id: "note", type: "text", prompt: "Say something", required: false }],
  } as unknown as HitlRequest;
}

// Renders three cards, all expanded (each owns its own draft). Stable callbacks
// + stable request refs, so a memoised card re-renders only when its own props
// or its own local state change.
function Harness() {
  const [requests] = useState(() => [textRequest("a"), textRequest("b"), textRequest("c")]);
  const onToggleExpanded = useCallback(() => {}, []);
  const onAnswered = useCallback(() => {}, []);
  return (
    <>
      {requests.map((r) => (
        <HitlRequestCard
          key={r.id}
          request={r}
          selfDid={undefined}
          venue={null}
          signingKeyHex={null}
          expanded
          onToggleExpanded={onToggleExpanded}
          onAnswered={onAnswered}
        />
      ))}
    </>
  );
}

describe("HitlRequestCard render isolation (1C Gate B)", () => {
  beforeEach(() => {
    didRenders.length = 0;
  });

  it("re-renders only the typed-in card, not its siblings", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    // Initial mount: every card rendered once.
    expect(didRenders.sort()).toEqual(["did:key:z6Mka", "did:key:z6Mkb", "did:key:z6Mkc"]);
    didRenders.length = 0;

    // Type into the first card's draft textarea (its local state).
    const boxes = screen.getAllByPlaceholderText("Your answer…");
    await act(async () => {
      await user.type(boxes[0], "hello");
    });

    // Only card "a" re-rendered — its siblings' props never changed, so memo
    // skipped them. Draft state is local, so it can't touch b or c.
    expect(new Set(didRenders)).toEqual(new Set(["did:key:z6Mka"]));
    expect(didRenders).not.toContain("did:key:z6Mkb");
    expect(didRenders).not.toContain("did:key:z6Mkc");
  });
});
