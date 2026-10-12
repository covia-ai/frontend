import { getContentTypeForFile } from "@/lib/content-type";

describe("getContentTypeForFile", () => {
  it("splits a text type into content type and charset", () => {
    expect(getContentTypeForFile("notes.md")).toEqual(["text/markdown", "utf-8"]);
  });

  it("returns an empty charset for binary types", () => {
    expect(getContentTypeForFile("report.pdf")).toEqual(["application/pdf", ""]);
  });

  it("returns empty strings for an unknown extension", () => {
    expect(getContentTypeForFile("blob.unknownext")).toEqual(["", ""]);
  });
});
