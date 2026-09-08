// Extensions accepted by the drop-to-asset fast path and the file picker in
// CreateAssetComponent. The native <input accept> attribute is advisory only
// (a user can still pick "All Files"), so this is enforced in JS as well.
export const ALLOWED_UPLOAD_EXTENSIONS = [
  ".csv", ".txt", ".json",
  ".md", ".pdf",
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg",
  ".zip",
];

export const ACCEPT_ATTRIBUTE = ALLOWED_UPLOAD_EXTENSIONS.join(",");

// No venue-side maxContentSize exists today (checked covia-sdk's types and
// every status/config response shape) — this is a client-side stopgap, not
// an enforced limit. Revisit once the venue exposes a real size guard.
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB

export function isAllowedUploadFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ALLOWED_UPLOAD_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function formatMaxUploadSize(): string {
  return `${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB`;
}
