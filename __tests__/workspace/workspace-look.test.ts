import { keyLook, skillLook, namespaceLook, valueTypeOf, isAssetRef } from "@/lib/workspace-look";
import { CONCEPT_ICONS, fieldLook } from "@/lib/concept-icons";
import { ADAPTER_LOOK } from "@/lib/adapter-icons";
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

  it("maps skill-library names to their concept (auth/admin/a2a/building)", () => {
    expect(keyLook("auth").label).toBe("Secret");
    expect(keyLook("admin").label).toBe("User");
    expect(keyLook("a2a").label).toBe("Connection");
    expect(keyLook("building").label).toBe("Create");
    // An unmapped single-segment key still gets the neutral fallback, never blank.
    expect(keyLook("zzz-unmapped").label).toBe("Key");
  });
});

describe("skillLook", () => {
  it("wears the brand adapter mark for adapter-named skills (matches Operations)", () => {
    // covia/convex/mcp carry real marks; skillLook uses that exact icon, not a
    // generic concept or folder.
    expect(skillLook("covia").Icon).toBe(ADAPTER_LOOK.covia.Icon);
    expect(skillLook("convex").Icon).toBe(ADAPTER_LOOK.convex.Icon);
    expect(skillLook("mcp").Icon).toBe(ADAPTER_LOOK.mcp.Icon);
    // a2a is a known adapter → its Operations mark (Radio), not the plain
    // connection concept keyLook would give.
    expect(skillLook("a2a").Icon).toBe(ADAPTER_LOOK.a2a.Icon);
  });

  it("wears the concept icon for concept-named skills", () => {
    expect(skillLook("auth").label).toBe("Secret");
    expect(skillLook("admin").label).toBe("User");
    expect(skillLook("building").label).toBe("Create");
  });

  it("matches word-form variants to the icon we already have", () => {
    // We have `orchestrator`/`scheduler` marks; the venue's skills are named
    // `orchestration`/`scheduling` — resolve them to the same icon, not the
    // generic skill glyph.
    expect(skillLook("orchestration").Icon).toBe(ADAPTER_LOOK.orchestrator.Icon);
    expect(skillLook("scheduling").Icon).toBe(ADAPTER_LOOK.scheduler.Icon);
    // Concept fits: ops tooling → operation, the audit/job-record skill → job.
    expect(skillLook("ops-tools").label).toBe(CONCEPT_ICONS.operation.label);
    expect(skillLook("provenance").label).toBe(CONCEPT_ICONS.job.label);
  });

  it("falls back to the skill glyph for unmapped names — never a folder", () => {
    expect(skillLook("caps-permissions").Icon).toBe(CONCEPT_ICONS.skill.Icon);
    expect(skillLook("zzz-whatever").Icon).toBe(CONCEPT_ICONS.skill.Icon);
    // Explicitly not the neutral key/folder fallback keyLook would return.
    expect(skillLook("caps-permissions").label).not.toBe("Key");
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
