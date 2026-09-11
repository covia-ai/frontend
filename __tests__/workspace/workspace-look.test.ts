import { keyLook, namespaceLook, valueTypeOf, isAssetRef } from "@/lib/workspace-look";
import { BookOpenCheck, Bot, Boxes, Globe, KeyRound } from "lucide-react";

describe("namespaceLook", () => {
  it("maps each root namespace to its own icon", () => {
    expect(namespaceLook("g").Icon).toBe(Bot);
    expect(namespaceLook("s").Icon).toBe(KeyRound);
    expect(namespaceLook("v").Icon).toBe(Globe);
  });

  it("resolves nested paths by their root segment", () => {
    expect(namespaceLook("v/skills/x").label).toBe("Venue");
    expect(namespaceLook("s/OPENAI_KEY").Icon).toBe(KeyRound);
  });

  it("falls back for an unknown namespace", () => {
    expect(namespaceLook("zzz").label).toBe("Namespace");
  });
});

describe("keyLook", () => {
  it("gives well-known sub-keys their OWN concept icon (not the namespace's)", () => {
    expect(keyLook("v/ops").Icon).toBe(Boxes); // operation
    expect(keyLook("v/adapters").label).toBe("Adapter");
    expect(keyLook("v/skills").Icon).toBe(BookOpenCheck);
    expect(keyLook("v/agents").Icon).toBe(Bot);
    // Distinct concepts under one namespace → distinct icons.
    expect(keyLook("v/ops").Icon).not.toBe(keyLook("v/skills").Icon);
  });

  it("gives an instance key its namespace's concept", () => {
    expect(keyLook("s/OPENAI_KEY").Icon).toBe(KeyRound); // a secret name is a secret
    expect(keyLook("g/some-agent-id").Icon).toBe(Bot); // an agent id is an agent
  });

  it("falls back to a neutral key glyph for anything else", () => {
    expect(keyLook("zzz/thing").label).toBe("Key");
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
