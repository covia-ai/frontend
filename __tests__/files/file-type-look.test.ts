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
    ["config.json", FileJson, "bg-icon-violet/15 text-icon-violet"],
    ["c.yaml", FileJson, "bg-icon-violet/15 text-icon-violet"],
    ["data.csv", FileSpreadsheet, "bg-icon-indigo/15 text-icon-indigo"],
    ["sheet.xlsx", FileSpreadsheet, "bg-icon-indigo/15 text-icon-indigo"],
    ["main.py", FileCode, "bg-icon-violet/15 text-icon-violet"],
    ["index.html", FileCode, "bg-icon-violet/15 text-icon-violet"],
    ["readme.md", FileText, "bg-icon-indigo/15 text-icon-indigo"],
    ["report.pdf", FileText, "bg-icon-indigo/15 text-icon-indigo"],
    ["backup.zip", FileArchive, "bg-icon-indigo/15 text-icon-indigo"],
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
