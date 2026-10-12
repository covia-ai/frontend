import type { StatusData } from "@covia/covia-sdk";
import { publicCapsOf } from "@/lib/venue-public-caps";

function statusWith(access: unknown): StatusData {
  return { access } as StatusData;
}

describe("publicCapsOf", () => {
  it.each(["disabled", "read-only", "unrestricted", "custom"])("reads %s", (value) => {
    expect(publicCapsOf(statusWith({ public: true, userAutoCreate: false, publicCaps: value }))).toBe(value);
  });

  it("is unknown on venues that predate the field", () => {
    expect(publicCapsOf(statusWith({ public: true, userAutoCreate: false }))).toBeUndefined();
    expect(publicCapsOf({} as StatusData)).toBeUndefined();
    expect(publicCapsOf(undefined)).toBeUndefined();
  });

  it("treats an unrecognised class as unknown, not as permission", () => {
    expect(publicCapsOf(statusWith({ publicCaps: "everything" }))).toBeUndefined();
    expect(publicCapsOf(statusWith({ publicCaps: 1 }))).toBeUndefined();
  });
});
