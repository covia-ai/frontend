import { buildBreadcrumbs, docsLinkFor } from "@/lib/breadcrumbs";

const VENUE = "did%3Aweb%3Atest";
const hrefs = (pathname: string, names = {}) => buildBreadcrumbs(pathname, names).map((c) => c.href);
const labels = (pathname: string, names = {}) => buildBreadcrumbs(pathname, names).map((c) => c.label);

describe("buildBreadcrumbs", () => {
  it("gives the home page no trail", () => {
    expect(buildBreadcrumbs("/")).toEqual([]);
  });

  it("links every crumb to the page it names", () => {
    expect(hrefs(`/venues/${VENUE}/jobs/abc123`)).toEqual([
      "/",
      "/venues",
      `/venues/${VENUE}`,
      `/venues/${VENUE}/jobs`,
      `/venues/${VENUE}/jobs/abc123`,
    ]);
  });

  // The singular detail routes have no page at the bare segment.
  it.each([
    ["/job/abc123", "/jobs"],
    ["/publicartifact/ffee", "/publicartifacts"],
    ["/operation/v/ops/covia/read", "/operations"],
  ])("points the %s parent crumb at its list route", (pathname, listHref) => {
    expect(hrefs(pathname)[1]).toBe(listHref);
  });

  it("names an id crumb once the page supplies it, and shows the decoded id until then", () => {
    const pathname = `/venues/${VENUE}/assets/ffee`;
    const loading = buildBreadcrumbs(pathname);
    const loaded = buildBreadcrumbs(pathname, { venueName: "Test Venue", assetOrJobName: "Sales Data" });

    expect([loading[2].label, loading[4].label]).toEqual(["did:web:test", "ffee"]);
    expect([loaded[2].label, loaded[4].label]).toEqual(["Test Venue", "Sales Data"]);
  });

  // A page-supplied name belongs to an id, never to a route: /connect used to
  // be missing from a hand-kept "known routes" list, so its crumb was replaced.
  it("never renames a route segment, whatever name the page supplies", () => {
    const withName = buildBreadcrumbs(`/venues/${VENUE}/connect`, { assetOrJobName: "did:web:test" });
    const without = buildBreadcrumbs(`/venues/${VENUE}/connect`);

    expect(withName[3]).toEqual(without[3]);
  });

  it("needs no table entry for a new route", () => {
    expect(labels("/some-new-route")).toEqual(["Home", "Some New Route"]);
  });

  // The route keeps the protocol's name; the IA calls the concept
  // "Capabilities" everywhere the user can see it.
  it("labels the UCAN route as Capabilities", () => {
    expect(labels("/ucan")).toEqual(["Home", "Capabilities"]);
  });

  it("collapses the agent routing namespace", () => {
    expect(hrefs("/agents/agent/helper")).toEqual(["/", "/agents", "/agents/agent/helper"]);
  });

  it("survives an id containing a bare percent sign", () => {
    expect(() => buildBreadcrumbs("/job/100%")).not.toThrow();
  });
});

describe("docsLinkFor", () => {
  const venues = docsLinkFor("/venues");

  it("prefers a venue section's own docs over the venues page", () => {
    expect(docsLinkFor(`/venues/${VENUE}/jobs`)).toBe(docsLinkFor("/jobs"));
    expect(docsLinkFor(`/venues/${VENUE}/jobs`)).not.toBe(venues);
  });

  it("falls back to the venues docs for a venue section without its own", () => {
    expect(docsLinkFor(`/venues/${VENUE}/adapters`)).toBe(venues);
  });

  // A substring match treated this operation address as the Jobs page.
  it("matches on route segments, not on text inside an operation address", () => {
    expect(docsLinkFor(`/venues/${VENUE}/operations/v/ops/jobs/list`)).toBe(docsLinkFor("/operations"));
  });

  it("has nothing for a section with no docs", () => {
    expect(docsLinkFor("/profile")).toBeUndefined();
  });
});
