import { CONCEPT_ICONS, conceptLook, fieldLook } from "@/lib/concept-icons";
import { Bot, CalendarClock, CalendarPlus, MapPinned } from "lucide-react";

describe("CONCEPT_ICONS", () => {
  it("gives every concept an icon, a tile, and a label", () => {
    for (const [concept, look] of Object.entries(CONCEPT_ICONS)) {
      expect(look.Icon).toBeTruthy();
      expect(typeof look.tile).toBe("string");
      expect(look.tile.length).toBeGreaterThan(0);
      expect(look.label).toBeTruthy();
      expect(conceptLook(concept as keyof typeof CONCEPT_ICONS)).toBe(look);
    }
  });

  it("uses a pinned map for a venue (a located node, not the whole globe)", () => {
    expect(CONCEPT_ICONS.venue.Icon).toBe(MapPinned);
    expect(CONCEPT_ICONS.venue.tile).toContain("secondary");
  });

  it("uses the agent glyph for the agent concept", () => {
    expect(CONCEPT_ICONS.agent.Icon).toBe(Bot);
  });

  it("keeps amber (accent) sparing — only keys/secrets", () => {
    const amber = Object.entries(CONCEPT_ICONS).filter(([, l]) => l.tile.includes("accent"));
    expect(amber.map(([c]) => c)).toEqual(["secret"]);
  });
});

describe("fieldLook", () => {
  it("maps well-known data-field keys, case- and separator-insensitive", () => {
    expect(fieldLook("created")?.Icon).toBe(CalendarPlus);
    expect(fieldLook("createdAt")?.Icon).toBe(CalendarPlus);
    expect(fieldLook("updated")?.Icon).toBe(CalendarClock);
    expect(fieldLook("updated_at")?.Icon).toBe(CalendarClock);
    expect(fieldLook("lastModified")?.Icon).toBe(CalendarClock);
  });

  it("gives sibling fields distinct icons", () => {
    expect(fieldLook("created")?.Icon).not.toBe(fieldLook("updated")?.Icon);
  });

  it("returns undefined for an unknown key", () => {
    expect(fieldLook("some-instance-id")).toBeUndefined();
  });
});
