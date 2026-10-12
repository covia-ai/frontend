import type { StatusData } from "@covia/covia-sdk";

// What a venue lets signed-out callers do (`auth.public.caps`), as reported in
// `/status` → `access.publicCaps` (covia-ai/covia#562). Only the class is
// public: "custom" names no particular write, so it promises none.
export type PublicCaps = "disabled" | "read-only" | "unrestricted" | "custom";

const PUBLIC_CAPS: readonly string[] = ["disabled", "read-only", "unrestricted", "custom"];

// Absent on venues before covia#562, and on SDK types that predate it.
// Unknown values (a future class) are treated as unknown, not as permission.
export function publicCapsOf(status: StatusData | undefined): PublicCaps | undefined {
  const value = (status?.access as { publicCaps?: unknown } | undefined)?.publicCaps;
  return typeof value === "string" && PUBLIC_CAPS.includes(value) ? (value as PublicCaps) : undefined;
}
