import type { AssetMetadata } from "@covia/covia-sdk";
import { getLicenseUrl } from "@/lib/utils";

export type AssetMetadataFields = {
  name: string;
  description: string;
  creator: string;
  notes: string;
  keywords: string;
  contentType: string;
  encoding: string;
  language: string;
  license: string;
};

export const EMPTY_ASSET_METADATA_FIELDS: AssetMetadataFields = {
  name: "",
  description: "",
  creator: "",
  notes: "",
  keywords: "",
  contentType: "",
  encoding: "",
  language: "",
  license: "",
};

export function fieldsFromAssetMetadata(metadata: AssetMetadata = {}): AssetMetadataFields {
  return {
    name: metadata.name ?? "",
    description: metadata.description ?? "",
    creator: metadata.creator ?? "",
    notes: Array.isArray(metadata.additionalInformation?.notes)
      ? metadata.additionalInformation.notes.join(", ")
      : "",
    keywords: Array.isArray(metadata.keywords) ? metadata.keywords.join(", ") : "",
    contentType: metadata.content?.contentType ?? "",
    encoding: metadata.content?.encoding ?? "",
    language: metadata.content?.inLanguage ?? "",
    license: metadata.license?.name ?? "",
  };
}

function setTextField<T extends object, K extends keyof T>(target: T, key: K, value: string) {
  const trimmed = value.trim();
  if (trimmed) target[key] = trimmed as T[K];
  else delete target[key];
}

export function buildAssetMetadata(
  fields: AssetMetadataFields,
  options: { base?: AssetMetadata; sha256?: string; now?: string } = {},
): AssetMetadata {
  const metadata: AssetMetadata = { ...options.base };

  setTextField(metadata, "name", fields.name);
  setTextField(metadata, "description", fields.description);
  setTextField(metadata, "creator", fields.creator);

  const keywords = fields.keywords.split(",").map((keyword) => keyword.trim()).filter(Boolean);
  if (keywords.length > 0) metadata.keywords = keywords;
  else delete metadata.keywords;

  const additionalInformation = { ...metadata.additionalInformation };
  if (fields.notes.trim()) additionalInformation.notes = [fields.notes.trim()];
  else delete additionalInformation.notes;
  if (Object.keys(additionalInformation).length > 0) metadata.additionalInformation = additionalInformation;
  else delete metadata.additionalInformation;

  if (fields.license.trim()) {
    const license = fields.license.trim();
    metadata.license = { name: license, url: getLicenseUrl(license) };
  } else {
    delete metadata.license;
  }

  const content = { ...metadata.content };
  setTextField(content, "contentType", fields.contentType);
  setTextField(content, "encoding", fields.encoding);
  setTextField(content, "inLanguage", fields.language);
  if (options.sha256 !== undefined) setTextField(content, "sha256", options.sha256);
  if (Object.keys(content).length > 0) metadata.content = content;
  else delete metadata.content;

  metadata.dateCreated = options.now ?? new Date().toISOString();
  delete metadata.dateModified;
  return metadata;
}
