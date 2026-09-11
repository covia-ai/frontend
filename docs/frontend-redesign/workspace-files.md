# Workspace & Files, Reimagined — design & build spec

**Status:** building on `feat/workspace-files`, **off develop** (independent of #362).
**Direction:** **B — legible explorers.** Consistency tidy-ups **deferred** to a separate backlog (chirdeep, 2026-09-11) — see the icon-system memory.
**Concept artefact:** `claude.ai/code/artifact/e5e3c261-9588-423a-96dc-d8770afec780`
**Series:** Jobs ✓ · Agents ✓ · Operations ✓ · Connections ✓ · Home ✓ · Venues ✓ · **Workspace & Files** → Secrets/Context/Inbox

Sixth page in the reimagination series. App theme, strict **superset**, job-free preserved.

## 1. What we have today

- **Workspace** (`/workspace` → `WorkspaceExplorer` + `workspace/{Namespace,Browser,Value}Pane`) browses the lattice/KV store via `venue.workspace.*` — 9 namespaces (`v w o a g j h s meta`), editable under `w`. Every namespace = `FolderRoot`, every key = `Folder`.
- **Files** (`/files` → `FilesExplorer`) browses DLFS drives via `venue.dlfs.*` — read-first MVP (no upload/mkdir/delete). Every file = `File`, drives = `HardDrive`. Preview: json/text/image/other. `modified` is fetched (`DLFSEntry.modified`) but never shown.
- Both job-free (no `run`/`invoke`; no eager value reads — tests enforce). Fixed 600px 3-pane grids. Content-addressing lives in the `a` (Assets) namespace, NOT DLFS (DLFS is path-addressed).

Diagnosis: **one icon for everything** is the biggest, cheapest win. Type signals already exist (`use-file-preview.ts` `filePreviewKind`, `DocumentViewer` `CONTENT_TYPE_TO_FILE_TYPE`, `DLFSEntry.type`, namespace keys) — just never reach the row.

## 2. What it becomes (B)

- **File-type icon system** — a new shared `lib/file-type-look.ts` (`fileTypeLook(name|mime) → {Icon, tile}`) following the Operations `adapterLook` house pattern: a lucide icon in a `size-9 rounded-lg` tinted tile, tinted **by type family** (folder, drive, doc, code, json, data/spreadsheet, image, archive, key, unknown-fallback) using the house opacity rule (`primary/secondary /15`, `chart-* /20`, `accent /25`, flat `bg-muted` fallback). A `TypeTile` render atom.
- **Workspace** — `lib/workspace-look.ts`: `namespaceLook(key)` (each of the 9 namespaces its own icon+tint, matching app concept icons — Bot/KeyRound/ScrollText/Inbox/Globe/Boxes/Package/Tags) + `valueTypeLook(value)` (object/array/scalar/asset badges). Content-addressed `a`ssets get the DID `Identicon`.
- **Files** — rows gain the per-type icon + the already-fetched **modified** (relative time); in-column **search**; CTA empty states; roomier **responsive** panes.
- One shared visual language across both (rows, breadcrumbs, type tiles).

## 3. Iconography (the centrepiece)

`fileTypeLook` families → lucide icon + tint token:
- Folder → `Folder` · chart-4 · Drive → `HardDrive` · primary
- Document (md/pdf/txt/doc) → `FileText` · chart-1 · Code (js/ts/py/sh/html/css) → `FileCode` · chart-2
- JSON/config (json/yaml/toml/ini) → `FileJson` · chart-2 · Spreadsheet (csv/xlsx/xls) → `FileSpreadsheet` · chart-3
- Image (png/jpg/gif/webp/svg/bmp) → `FileImage` · secondary · Archive (zip/tar/gz/rar/7z) → `FileArchive` · chart-5
- Key/secret (pem/key/env/crt) → `KeyRound` · accent · Unknown → `File` · `bg-muted text-muted-foreground` (never blank)

`namespaceLook`: v→Globe·secondary, w→FolderOpen·primary, o→Boxes·chart-5, a→Package·chart-3, g→Bot·primary, j→ScrollText·chart-1, h→Inbox·chart-4, s→KeyRound·accent, meta→Tags·muted.
`valueTypeLook`: object `{}`, array `[]`, string/number/boolean scalar, null, asset (did → identicon).

## 4. Parity map (superset — testids kept)

Files: Folder/File icon → per-type; name·size·Download·previews(json/text/image/other)·403 "Access denied"·WebDAV card (`copy webdav url`) all kept, + modified + search. Workspace: 3 panes (`workspace-namespace-pane`/`-content-pane`/`workspace-json-content`), namespaces, breadcrumb, Resync, create/save/delete guards, `ThemedJsonEditor`, `workspace-shared-venue-banner`, `workspace-namespace-description` — all kept + per-namespace icons + value badges. Both: "Select a venue" empty, job-free reads, no eager `read`/`operations.run` (tests enforce). Added: type/namespace/value icons · modified · search · responsive · CTA empties.

## 5. Testing

Keep green: `FilesExplorer.test` (8), `WorkspaceExplorer.test` (5), `use-workspace-explorer.test` (12), `workspace-namespaces.test` (3). Approach: add icons/meta to presentational rows only — never touch the data hooks, so job-safety + mutation-guard tests stay green. Add: `file-type-look.test` (ext/mime→icon+tile, unknown→fallback, case-insensitive), `workspace-look.test` (namespaceLook, valueTypeLook), row rendering (png→image tile, folder→folder tile, modified renders), search filters in-memory (no reads). Full suite + tsc + eslint green; live signed-out & signed-in across drives + namespaces.

## 6. Dependencies & blast radius

Modify (page-only): `FilesExplorer`, `workspace/*Pane`. New shared libs: `lib/file-type-look.ts`, `lib/workspace-look.ts`, a `TypeTile` atom. Reuse unchanged: `Identicon`/`DidDisplay` (assets), `StatusBadge`, `CopyField`, `RawTextPanel`, `ErrorDisplay`, the `use-files/workspace-explorer` hooks (untouched). No new external libs (icons = lucide, already a dep). No unmerged-branch dependency.

## 7. Impact & risk

Presentational + additive → low risk. Job-safety unchanged (no run/invoke; reads via dlfs/workspace; icons touch only rows). Mutation guards untouched. Auth states preserved. Rollback = revert page files. **Deferred tidy-ups** (agent identicon rounded-lg, shared hash lib, StatusBadge for status colors, dead agentMonogram) → separate PRs later, NOT here.

## 8. Rollout

Worktree `workspace-files-redesign` · branch `feat/workspace-files` off develop · dev `:3022`. Order: (1) fileTypeLook + TypeTile + tests; (2) Files rows (icons + modified + search) + empties; (3) Workspace namespaces + value badges + asset identicons; (4) responsive panes + preview header. Verify live; full suite + tsc + eslint; show before push; PR → develop, commit-by-commit body, assigned Anupama; independent of #362.
