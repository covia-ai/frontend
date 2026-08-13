import {
  buildAssetMetadata,
  EMPTY_ASSET_METADATA_FIELDS,
  fieldsFromAssetMetadata,
} from "@/lib/asset-metadata-form";

describe("asset metadata form helpers", () => {
  it("normalizes shared create fields consistently", () => {
    const metadata = buildAssetMetadata(
      {
        ...EMPTY_ASSET_METADATA_FIELDS,
        name: "  Dataset  ",
        notes: "  reviewed  ",
        keywords: " iris,  dataset, , public ",
        contentType: " text/csv ",
      },
      { sha256: "abc", now: "2026-08-12T00:00:00.000Z" },
    );

    expect(metadata).toMatchObject({
      name: "Dataset",
      keywords: ["iris", "dataset", "public"],
      additionalInformation: { notes: ["reviewed"] },
      content: { contentType: "text/csv", sha256: "abc" },
      dateCreated: "2026-08-12T00:00:00.000Z",
    });
    expect(metadata).not.toHaveProperty("additionalInformationnotes");
  });

  it("preserves unexposed copy metadata while applying cleared form fields", () => {
    const source = {
      name: "Original",
      creator: "Ada",
      operation: { adapter: "demo" },
      content: { sha256: "abc", contentType: "text/plain", inline: "hello" },
      additionalInformation: { notes: ["old"], source: "catalog" },
      dateModified: "2025-01-01T00:00:00.000Z",
    } as any;
    const fields = fieldsFromAssetMetadata(source);
    const metadata = buildAssetMetadata(
      { ...fields, creator: "", notes: "", contentType: "" },
      { base: source, now: "2026-08-12T00:00:00.000Z" },
    );

    expect(metadata).toMatchObject({
      operation: { adapter: "demo" },
      content: { sha256: "abc", inline: "hello" },
      additionalInformation: { source: "catalog" },
    });
    expect(metadata).not.toHaveProperty("creator");
    expect(metadata.content).not.toHaveProperty("contentType");
    expect(metadata).not.toHaveProperty("dateModified");
  });
});
