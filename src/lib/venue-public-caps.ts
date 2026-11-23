import type { PublicCaps, StatusData } from "@covia/covia-sdk";

export type { PublicCaps };

// What a venue lets signed-out callers do (`auth.public.caps`), as reported in
// `/status` → `access.publicCaps` (covia-ai/covia#562). Only the class is
// public: "custom" names no particular write, so it promises none.
const PUBLIC_CAPS: readonly PublicCaps[] = ["disabled", "read-only", "unrestricted", "custom"];

// Absent on venues before covia#562. A class this build doesn't know (a future
// venue) is treated as unknown, not as permission.
export function publicCapsOf(status: StatusData | undefined): PublicCaps | undefined {
  const value: unknown = status?.access?.publicCaps;
  return PUBLIC_CAPS.find((caps) => caps === value);
}
