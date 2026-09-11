import { fileTypeLook, FOLDER_LOOK, DRIVE_LOOK } from "@/lib/file-type-look";
import {
  File,
  FileArchive,
  FileCode,
  FileImage,
  FileJson,
  FileSpreadsheet,
  FileText,
  KeyRound,
} from "lucide-react";

describe("fileTypeLook", () => {
  it.each([
    ["photo.png", FileImage, "bg-secondary/15 text-secondary"],
    ["a.jpeg", FileImage, "bg-secondary/15 text-secondary"],
    ["config.json", FileJson, "bg-chart-2/20 text-chart-2"],
    ["c.yaml", FileJson, "bg-chart-2/20 text-chart-2"],
    ["data.csv", FileSpreadsheet, "bg-chart-3/20 text-chart-3"],
    ["sheet.xlsx", FileSpreadsheet, "bg-chart-3/20 text-chart-3"],
    ["main.py", FileCode, "bg-chart-2/20 text-chart-2"],
    ["index.html", FileCode, "bg-chart-2/20 text-chart-2"],
    ["readme.md", FileText, "bg-chart-1/20 text-chart-1"],
    ["report.pdf", FileText, "bg-chart-1/20 text-chart-1"],
    ["backup.zip", FileArchive, "bg-chart-5/20 text-chart-5"],
    ["id.pem", KeyRound, "bg-accent/25 text-accent-foreground"],
  ])("maps %s to the right icon + tile", (name, Icon, tile) => {
    const look = fileTypeLook(name);
    expect(look.Icon).toBe(Icon);
    expect(look.tile).toBe(tile);
  });

  it("falls back to a neutral File tile for unknown or extensionless names", () => {
    expect(fileTypeLook("mystery.xyz").Icon).toBe(File);
    expect(fileTypeLook("LICENSE").tile).toBe("bg-muted text-muted-foreground");
    expect(fileTypeLook(".hidden").Icon).toBe(File); // dotfile → treated as no extension
  });

  it("is case-insensitive", () => {
    expect(fileTypeLook("PHOTO.PNG").Icon).toBe(FileImage);
  });

  it("exposes folder and drive looks", () => {
    expect(FOLDER_LOOK.label).toBe("Folder");
    expect(DRIVE_LOOK.tile).toContain("primary");
  });
});
