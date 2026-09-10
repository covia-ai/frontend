import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { VenueMark } from "@/components/VenueMark";

const cols = (container: HTMLElement) =>
  [...container.querySelectorAll("rect")].map((r) => Math.round(parseFloat(r.getAttribute("x") ?? "0") - 0.08));

describe("VenueMark", () => {
  it("is deterministic — the same venueId always renders the same mark", () => {
    const a = render(<VenueMark venueId="did:web:venue-test.covia.ai" />);
    const b = render(<VenueMark venueId="did:web:venue-test.covia.ai" />);
    expect(a.container.innerHTML).toBe(b.container.innerHTML);
  });

  it("differs between venues and is never blank", () => {
    const a = render(<VenueMark venueId="did:web:alpha.example" />);
    const b = render(<VenueMark venueId="did:web:bravo.example" />);
    expect(a.container.querySelectorAll("rect").length).toBeGreaterThan(0);
    expect(a.container.innerHTML).not.toBe(b.container.innerHTML);
  });

  it("is horizontally symmetric — every column has its mirror", () => {
    const { container } = render(<VenueMark venueId="did:web:symmetry.example" />);
    const present = new Set(cols(container));
    for (const c of present) {
      expect(present.has(4 - c)).toBe(true);
    }
  });
});
