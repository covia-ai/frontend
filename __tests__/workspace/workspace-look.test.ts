import { namespaceLook, valueTypeOf, isAssetRef } from "@/lib/workspace-look";
import { Bot, Globe, KeyRound } from "lucide-react";

describe("namespaceLook", () => {
  it("maps each root namespace to its own icon", () => {
    expect(namespaceLook("g").Icon).toBe(Bot);
    expect(namespaceLook("s").Icon).toBe(KeyRound);
    expect(namespaceLook("v").Icon).toBe(Globe);
  });

  it("resolves nested paths by their root segment", () => {
    expect(namespaceLook("v/skills/x").label).toBe("Venue");
    expect(namespaceLook("s/OPENAI_KEY").label).toBe("Secrets");
  });

  it("falls back for an unknown namespace", () => {
    expect(namespaceLook("zzz").label).toBe("Namespace");
  });
});

describe("valueTypeOf", () => {
  it.each([
    [{}, "object"],
    [[], "array"],
    ["hi", "string"],
    [3, "number"],
    [true, "boolean"],
    [null, "null"],
    [undefined, "null"],
  ])("classifies %p", (value, type) => {
    expect(valueTypeOf(value)).toBe(type);
  });
});

describe("isAssetRef", () => {
  it("detects content-addressed did:key references only", () => {
    expect(isAssetRef("did:key:z6Mkabc")).toBe(true);
    expect(isAssetRef("did:web:venue.example")).toBe(false);
    expect(isAssetRef("just a string")).toBe(false);
    expect(isAssetRef({})).toBe(false);
  });
});
