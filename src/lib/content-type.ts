import * as mime from "mime-types";

// Kept out of lib/utils.ts: mime-types bundles the whole mime-db table
// (~23 KB gzip), and utils is imported by nearly every component (#471).
export function getContentTypeForFile(filename: string): [string, string] {
  const mimeType = mime.contentType(filename) || "";
  const contentType = mimeType.split(";")[0];
  // Binary types (pdf, images, zip, …) have no charset segment — fields
  // like AssetMetadataFields.encoding are always-string, so this must
  // never come back as undefined.
  const charset = mimeType.split(";")[1]?.split("=")[1] ?? "";
  return [contentType, charset];
}
