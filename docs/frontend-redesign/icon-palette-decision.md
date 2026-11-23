# Icon palette — the app-wide decision (Option A vs Option B)

Status: **REIMAGINE / DECISION DOC. Nothing implemented.** Compare the two
palettes side by side (artifact linked below), then choose; implementation is a
separate, gated change.

## The question

The icon directory has seven categories; three of them are **colour-tinted tiles**
— **concepts** (26: Home/Agents/Operations/Jobs/Venues/Workspace/Files/Asset/
Secret/Context…), **adapters** (~30: http/agent/langchain/mcp/convex/dlfs/hitl…),
and **file types** (10). (The other four — value types, status tones, field
keys, namespaces — are semantic or already brand-neutral and don't change.)

Today those tiles are tinted with **Option B**. The question is whether to move
the whole directory to **Option A**.

## The single-source rule (true either way)

Whichever palette wins, the fix for the inconsistency you spotted is the same:
**adapters derive from concepts** (one lookup). So `asset` is the *same* tile on
a Job, in Workspace, and on a card — a concept and its adapter can never drift.
This doc is only about *which palette* that single source uses.

## Option A — brand only

The five brand colours (`#6B46C1` purple, `#4A90E2` cerulean, `#1E2642` navy,
`#F2AE30` amber, `#E5E5E9` gray), using hues/shades/transparencies. Categories
ride the **purple↔cerulean analogous arc** (purple → violet → cerulean → indigo
→ navy) + amber (keys, reserved) + neutral.

- **Pros:** 100% on-brand, no third-party (shadcn) colours; brand hues **don't
  hue-shift between light and dark**, so a concept keeps its colour in both
  themes; feels unmistakably Covia.
- **Cons:** only ~5–6 usable tile hues (navy is weak as a dark-mode tile), so
  **many concepts collapse onto the same tint** — less at-a-glance separation by
  category (you lean more on the icon than the colour). It also **restyles every
  shipped page** (Home/Agents/Jobs/Operations/Workspace/Venues…), so it's a
  bigger, gated change.

## Option B — brand + chart tokens (what we shipped)

The brand core (`primary`/`secondary`/`accent`) **plus** the theme's
`chart-1..5` tokens — the same system the Agents and Venues icons you approved
yesterday/today already use.

- **Pros:** more distinct hues (chart-1..5 add orange/green/gold/red-ish), so
  categories separate better at a glance; **already shipped** — no restyle, no
  risk to live pages.
- **Cons:** `chart-1..5` are the **generic shadcn defaults, not Covia brand**
  colours; and they **hue-shift between themes** (chart-1 orange→indigo,
  chart-4 gold→purple), so a concept can change colour when you switch light/dark
  — the opposite of "one symbol, one look."

## What the comparison shows

The artifact renders **all three tinted categories, every item, in A next to B**,
in both themes, with the real logos (LangChain/MCP/Java) and custom marks
(convex hexagon, lattice, connector) — those glyphs are identical in both; only
the tint differs.

- In **A**, you'll see the brand cohesion but more items sharing a hue.
- In **B**, you'll see more colour variety but the non-brand chart hues, and (if
  you toggle theme) the hue-shift.

Artifact: **https://claude.ai/code/artifact/637c72af-41c8-49b5-abef-ba65b8779a6b**

## Option C — hybrid (now the third column)

Keep the brand arc, but add **two brand-*derived* tints** — a **teal**
(files/storage) and a **sky** (comms/human) — as real tokens, so the buckets
that collapse in A get their own on-brand hue. More separation than A, no
generic shadcn colours, and no theme hue-shift like B. This is rendered as the
third column in the comparison.

## Recommendation

Lead with **consistency + brand purity (Option A)** *if* you're willing to take
the whole-directory restyle as a proper gated change — it's the "uniform
throughout, no exceptions" end state. Stay on **B** if at-a-glance category
colour matters more than brand purity and you'd rather not restyle shipped pages
now. I don't think adapters-only (the divergence) is worth keeping either way.

## After you decide

- Chosen palette becomes the single source in `concept-icons.ts`; adapters
  derive from it (`adapter-icons.ts`), with the real logos + custom marks.
- Full impact gate (blast radius across every consumer + venue twins) and perf
  gate; full Jest; a real in-app render; then a PR — nothing to `main` without
  your word.
