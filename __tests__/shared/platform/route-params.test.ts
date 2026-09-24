import { routeParam } from "@/lib/route-params";

describe("routeParam", () => {
  it("decodes a param exactly once, as link builders encode exactly once", () => {
    const id = "did:web:localhost%3A8080";
    expect(routeParam(encodeURIComponent(id))).toBe(id);
  });

  it.each(["my agent", "team:helper", "100%", "a/b"])("round-trips the id %p", (id) => {
    expect(routeParam(encodeURIComponent(id))).toBe(id);
  });

  it("returns a malformed param as-is instead of throwing", () => {
    expect(routeParam("100%")).toBe("100%");
  });
});
