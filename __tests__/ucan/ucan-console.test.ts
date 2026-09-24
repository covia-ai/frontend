import {
  broadScopes,
  chainDepthLabel,
  expiryDate,
  expiryFromNow,
  hasIncompleteRow,
  isBroadScope,
  lifetimeSeconds,
  rootAuthorityTone,
  selfAttenuation,
  usableRows,
  verifyCheck,
} from "@/lib/ucan-console";

describe("capability rows", () => {
  it("keeps only rows with both halves, trimmed", () => {
    expect(usableRows([
      { with: " /w/reports/ ", can: " crud/read " },
      { with: "", can: "" },
      { with: "/w/", can: "" },
    ])).toEqual([{ with: "/w/reports/", can: "crud/read" }]);
  });

  it("tells a half-filled row from a wholly empty one", () => {
    expect(hasIncompleteRow([{ with: "/w/", can: "" }])).toBe(true);
    expect(hasIncompleteRow([{ with: "", can: "crud/read" }])).toBe(true);
    expect(hasIncompleteRow([{ with: "", can: "" }])).toBe(false);
    expect(hasIncompleteRow([{ with: "/w/", can: "crud/read" }])).toBe(false);
  });

  it("pre-fills a narrow self-attenuation, not a wildcard", () => {
    const row = selfAttenuation();
    expect(isBroadScope(row)).toBe(false);
    expect(row.can).toBe("crud/read");
  });
});

describe("broad scopes", () => {
  it.each([
    [{ with: "/w/", can: "*" }, "wildcard ability"],
    [{ with: "*", can: "crud/read" }, "wildcard resource"],
    [{ with: "/", can: "crud/read" }, "whole namespace"],
  ])("flags %j as broad (%s)", (row) => {
    expect(isBroadScope(row)).toBe(true);
  });

  it("does not flag a scoped path", () => {
    expect(isBroadScope({ with: "/w/reports/", can: "crud/read" })).toBe(false);
  });

  it("reports only the filled-in broad rows", () => {
    expect(broadScopes([
      { with: "/w/reports/", can: "crud/read" },
      { with: "/w/", can: "*" },
      { with: "", can: "*" },
    ])).toEqual([{ with: "/w/", can: "*" }]);
  });
});

describe("verify check", () => {
  it("is sent only when both halves are given", () => {
    expect(verifyCheck({ with: "/w/", can: "crud/read" })).toEqual({ with: "/w/", can: "crud/read" });
    expect(verifyCheck({ with: "/w/", can: " " })).toBeUndefined();
    expect(verifyCheck({ with: "", can: "crud/read" })).toBeUndefined();
  });
});

describe("root authority", () => {
  it("maps each venue verdict to a distinct tone", () => {
    expect(rootAuthorityTone("owner")).toBe("success");
    expect(rootAuthorityTone("venue")).toBe("active");
    expect(rootAuthorityTone("refused")).toBe("failure");
    expect(rootAuthorityTone(undefined)).toBe("neutral");
    expect(rootAuthorityTone("something-new")).toBe("neutral");
  });
});

describe("expiry", () => {
  it("converts a lifetime to the absolute Unix seconds ucan:issue expects", () => {
    expect(expiryFromNow(3_600, 1_700_000_000_000)).toBe(1_700_000_000 + 3_600);
  });

  it("reads an exp claim as a date, and anything else as absent", () => {
    expect(expiryDate(1_700_000_000)?.getTime()).toBe(1_700_000_000_000);
    expect(expiryDate(null)).toBeNull();
    expect(expiryDate(undefined)).toBeNull();
    expect(expiryDate("soon")).toBeNull();
    expect(expiryDate(Number.NaN)).toBeNull();
  });

  it("converts each lifetime unit", () => {
    expect(lifetimeSeconds("2", "minutes")).toBe(120);
    expect(lifetimeSeconds("1.5", "hours")).toBe(5_400);
    expect(lifetimeSeconds("3", "days")).toBe(259_200);
    expect(lifetimeSeconds("", "hours")).toBe(0);
    expect(lifetimeSeconds("abc", "hours")).toBeNaN();
  });
});

describe("chain depth", () => {
  it("says what a depth means rather than printing a bare number", () => {
    expect(chainDepthLabel(0)).toBe("Root grant — no delegation above it");
    expect(chainDepthLabel(1)).toBe("1 delegation hop above the root");
    expect(chainDepthLabel(3)).toBe("3 delegation hops above the root");
    expect(chainDepthLabel(undefined)).toBeNull();
  });
});
