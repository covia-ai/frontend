import {
  File,
  FileArchive,
  FileCode,
  FileImage,
  FileJson,
  FileSpreadsheet,
  FileText,
  Folder,
  HardDrive,
  KeyRound,
} from "lucide-react";
import type { ComponentType } from "react";

// The house "type → icon + tinted tile" pattern (the same one the Operations
// catalogue uses for adapters): a lucide icon in a `size-9 rounded-lg ${tile}`
// tile, tinted by TYPE FAMILY from the brand/chart tokens. Opacity rule:
// primary/secondary → /15, chart-* → /20 (chart-4 → /25), accent → /25, and an
// unknown type falls back to a flat neutral tile so nothing ever renders blank.
// Consolidates the extension knowledge that already lived in filePreviewKind /
// DocumentViewer so every Files/Workspace row can show what a thing IS.

/** Any icon component that takes the props a lucide icon does — a lucide icon,
 *  a react-icons brand logo, or one of our custom SVG glyphs. */
export type IconCmp = ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;

export interface TypeLook {
  Icon: IconCmp;
  /** Tailwind bg + text classes for the tile. */
  tile: string;
  label: string;
}

const IMAGE = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico", "avif", "tiff", "heic"]);
const CONFIG = new Set(["json", "yaml", "yml", "toml", "ini", "env", "conf", "config"]);
const SHEET = new Set(["csv", "tsv", "xlsx", "xls", "ods"]);
const CODE = new Set([
  "js", "ts", "tsx", "jsx", "mjs", "cjs", "py", "java", "sh", "bash", "zsh", "rb", "go",
  "rs", "c", "cc", "cpp", "h", "hpp", "php", "html", "htm", "css", "scss", "less", "xml", "sql", "swift", "kt",
]);
const DOC = new Set(["txt", "md", "markdown", "mdx", "pdf", "doc", "docx", "rtf", "odt", "log"]);
const ARCHIVE = new Set(["zip", "tar", "gz", "tgz", "rar", "7z", "bz2", "xz", "zst"]);
const KEY = new Set(["pem", "key", "crt", "cert", "cer", "pub", "p12", "pfx", "asc", "gpg"]);

const LOOKS = {
  image: { Icon: FileImage, tile: "bg-secondary/15 text-secondary", label: "Image" },
  code: { Icon: FileCode, tile: "bg-icon-violet/15 text-icon-violet", label: "Code" },
  config: { Icon: FileJson, tile: "bg-icon-violet/15 text-icon-violet", label: "Data" },
  sheet: { Icon: FileSpreadsheet, tile: "bg-icon-indigo/15 text-icon-indigo", label: "Spreadsheet" },
  doc: { Icon: FileText, tile: "bg-icon-indigo/15 text-icon-indigo", label: "Document" },
  archive: { Icon: FileArchive, tile: "bg-icon-indigo/15 text-icon-indigo", label: "Archive" },
  key: { Icon: KeyRound, tile: "bg-accent/25 text-accent-foreground", label: "Key" },
  unknown: { Icon: File, tile: "bg-muted text-muted-foreground", label: "File" },
} satisfies Record<string, TypeLook>;

/** A directory / folder. */
export const FOLDER_LOOK: TypeLook = { Icon: Folder, tile: "bg-primary/15 text-primary", label: "Folder" };
/** A DLFS drive. */
export const DRIVE_LOOK: TypeLook = { Icon: HardDrive, tile: "bg-primary/15 text-primary", label: "Drive" };

function extensionOf(name: string): string {
  const clean = name.split(/[?#]/)[0];
  const i = clean.lastIndexOf(".");
  return i <= 0 ? "" : clean.slice(i + 1).toLowerCase();
}

/** Icon + tile for a file, by its name's extension. Case-insensitive; unknown
 *  extensions get the neutral fallback (never blank). */
export function fileTypeLook(name: string): TypeLook {
  const ext = extensionOf(name);
  if (IMAGE.has(ext)) return LOOKS.image;
  if (CONFIG.has(ext)) return LOOKS.config;
  if (SHEET.has(ext)) return LOOKS.sheet;
  if (CODE.has(ext)) return LOOKS.code;
  if (ARCHIVE.has(ext)) return LOOKS.archive;
  if (KEY.has(ext)) return LOOKS.key;
  if (DOC.has(ext)) return LOOKS.doc;
  return LOOKS.unknown;
}
