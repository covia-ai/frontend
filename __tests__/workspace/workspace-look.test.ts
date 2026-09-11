import { keyLook, namespaceLook, valueTypeOf, isAssetRef } from "@/lib/workspace-look";
import { fieldLook } from "@/lib/concept-icons";
import {
  BookOpenCheck,
  Bot,
  Boxes,
  CalendarClock,
  CalendarPlus,
  KeyRound,
  MapPinned,
} from "lucide-react";

describe("namespaceLook", () => {
  it("maps each root namespace to its own icon", () => {
    expect(namespaceLook("g").Icon).toBe(Bot);
    expect(namespaceLook("s").Icon).toBe(KeyRound);
    expect(namespaceLook("v").Icon).toBe(MapPinned);
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

  it("gives sibling data-field keys their OWN icon (not the namespace's)", () => {
    // The bug we fixed: created and updated under meta both inheriting the
    // namespace glyph. They are distinct attributes → distinct icons.
    expect(keyLook("meta/created").Icon).toBe(CalendarPlus);
    expect(keyLook("meta/updated").Icon).toBe(CalendarClock);
    expect(keyLook("meta/created").Icon).not.toBe(keyLook("meta/updated").Icon);
  });

  it("falls back to a neutral key glyph for anything else", () => {
    expect(keyLook("zzz/thing").label).toBe("Key");
  });
});

describe("fieldLook", () => {
  it("maps well-known data-field keys to their own icon, case/separator-insensitive", () => {
    expect(fieldLook("created")?.Icon).toBe(CalendarPlus);
    expect(fieldLook("createdAt")?.Icon).toBe(CalendarPlus);
    expect(fieldLook("updated_at")?.Icon).toBe(CalendarClock);
    expect(fieldLook("lastModified")?.Icon).toBe(CalendarClock);
  });

  it("returns undefined for an unknown field key", () => {
    expect(fieldLook("some-random-id")).toBeUndefined();
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
