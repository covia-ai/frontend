// GENERATED FILE — do not edit by hand.
//
// Written by `pnpm reel:manifest` in the demo-reels working tree, which reads
// each clip's script.ts and its rendered master. Titles, claims, audiences and
// runtimes therefore cannot drift from the clip that actually ships: when a
// clip is re-rendered, regenerate this file rather than editing it.
//
// Media paths are relative. The frontend resolves them against the reel media
// base (see lib/reel-media.ts), so where the files are hosted is a frontend
// configuration question and is deliberately absent here.

/** The two voices a clip can be watched in. Not every clip has both. */
export type ReelCutId = "narrated" | "ciso";

export type ReelCut = {
  /** Path to the master, relative to the reel media base. */
  media: string;
  /** Path to the WebVTT sidecar, relative to the same base. */
  captions: string;
};

export type ReelClip = {
  slug: string;
  id: string;
  title: string;
  /** What the clip proves, in the suite's own words. */
  claim: string;
  /** What the clip shows, for someone landing cold. */
  synopsis?: string;
  audiences: string[];
  runtimeSec: number;
  /** Poster filename, served from /reel/. */
  poster: string;
  /**
   * `narrated` is always present. `ciso` exists only on the clips that carry
   * a governance register, and both cuts are the same picture at the same
   * length, which is what lets the player switch between them in place.
   */
  cuts: { narrated: ReelCut; ciso?: ReelCut };
};

export const DEMO_REEL: ReelClip[] = [
  {
    slug: "n6-day-on-the-grid",
    id: "n6",
    title: "A Day on the Grid",
    claim: "One run, end to end: capability is discovered, agents act under scoped authority, a policy refuses, a human grants a bounded capability, and every step is on the record.",
    synopsis: "Everything in one run: agents find work and do it, a rule stops one of them, a person approves an exception, and all of it is written down.",
    audiences: ["Investor", "CTO", "CISO", "Partners"],
    runtimeSec: 169,
    poster: "n6-day-on-the-grid.webp",
    cuts: {
      narrated: { media: "n6-day-on-the-grid/narrated.mp4", captions: "n6-day-on-the-grid/narrated.vtt" },
      ciso: { media: "n6-day-on-the-grid/ciso.mp4", captions: "n6-day-on-the-grid/ciso.vtt" },
    },
  },
  {
    slug: "c1-the-refusal",
    id: "c1",
    title: "The Refusal",
    claim: "An agent cannot act outside its authority, because the runtime stops it before execution.",
    synopsis: "An agent is told to approve a credit limit five times higher than the card allows. The rule runs first, and the approval never happens.",
    audiences: ["CISO", "CTO"],
    runtimeSec: 79,
    poster: "c1-the-refusal.webp",
    cuts: {
      narrated: { media: "c1-the-refusal/narrated.mp4", captions: "c1-the-refusal/narrated.vtt" },
      ciso: { media: "c1-the-refusal/ciso.mp4", captions: "c1-the-refusal/ciso.vtt" },
    },
  },
  {
    slug: "c0-the-grid",
    id: "c0",
    title: "The Grid",
    claim: "Agents are becoming a workforce inside production systems, and Covia is the substrate that makes their actions ordered, authorised and recorded.",
    synopsis: "An agent refused before it writes, a catalogue of work it can pick up, the same operation proven identical on two clouds, and a person signing for what the agent could not do.",
    audiences: ["Investor", "CTO", "CISO", "Partners"],
    runtimeSec: 59,
    poster: "c0-the-grid.webp",
    cuts: {
      narrated: { media: "c0-the-grid/narrated.mp4", captions: "c0-the-grid/narrated.vtt" },
      ciso: { media: "c0-the-grid/ciso.mp4", captions: "c0-the-grid/ciso.vtt" },
    },
  },
  {
    slug: "c2-reconstruction",
    id: "c2",
    title: "Reconstruction",
    claim: "The record is authoritative, readable outside the product, and complete enough to reconstruct a decision.",
    synopsis: "A refused decision explained entirely from the record it left behind: what was asked, who asked, and every step in between.",
    audiences: ["CISO", "CTO"],
    runtimeSec: 59,
    poster: "c2-reconstruction.webp",
    cuts: {
      narrated: { media: "c2-reconstruction/narrated.mp4", captions: "c2-reconstruction/narrated.vtt" },
      ciso: { media: "c2-reconstruction/ciso.mp4", captions: "c2-reconstruction/ciso.vtt" },
    },
  },
  {
    slug: "c3-governed-escalation",
    id: "c3",
    title: "Governed Escalation",
    claim: "When an agent reaches the edge of its authority the decision goes to a human, and what the human grants is a real capability with a real expiry.",
    synopsis: "An agent hits a limit it cannot raise by itself. A person looks at the evidence and signs one narrow capability that stops working on its own.",
    audiences: ["CISO", "Board"],
    runtimeSec: 83,
    poster: "c3-governed-escalation.webp",
    cuts: {
      narrated: { media: "c3-governed-escalation/narrated.mp4", captions: "c3-governed-escalation/narrated.vtt" },
      ciso: { media: "c3-governed-escalation/ciso.mp4", captions: "c3-governed-escalation/ciso.vtt" },
    },
  },
  {
    slug: "c4-many-clouds",
    id: "c4",
    title: "One Grid, Many Clouds",
    claim: "The same capability executes across independent venues on different clouds, with no central point of control.",
    synopsis: "The same operation run on two independent venues, one on Amazon and one on Azure, with the content address proving both ran the identical thing.",
    audiences: ["Investor", "CTO"],
    runtimeSec: 51,
    poster: "c4-many-clouds.webp",
    cuts: {
      narrated: { media: "c4-many-clouds/narrated.mp4", captions: "c4-many-clouds/narrated.vtt" },
      ciso: { media: "c4-many-clouds/ciso.mp4", captions: "c4-many-clouds/ciso.vtt" },
    },
  },
  {
    slug: "n3-fork-provenance",
    id: "n3",
    title: "Fork and Provenance",
    claim: "A fork is an action on the record, so where an agent came from has a durable answer.",
    synopsis: "Copying an agent. Where the copy came from is a permanent record of the moment it was made, rather than a label someone typed.",
    audiences: ["CISO", "CTO", "Developers"],
    runtimeSec: 50,
    poster: "n3-fork-provenance.webp",
    cuts: {
      narrated: { media: "n3-fork-provenance/narrated.mp4", captions: "n3-fork-provenance/narrated.vtt" },
      ciso: { media: "n3-fork-provenance/ciso.mp4", captions: "n3-fork-provenance/ciso.vtt" },
    },
  },
  {
    slug: "n5-connections",
    id: "n5",
    title: "Connections",
    claim: "A venue declares what it can reach into, connecting publishes a scoped capability, and checking that reach is an operation on the record.",
    synopsis: "The outside services this system can reach, how you connect one safely, and what happens when you check that a connection still works.",
    audiences: ["CTO", "CISO", "Partners"],
    runtimeSec: 75,
    poster: "n5-connections.webp",
    cuts: {
      narrated: { media: "n5-connections/narrated.mp4", captions: "n5-connections/narrated.vtt" },
      ciso: { media: "n5-connections/ciso.mp4", captions: "n5-connections/ciso.vtt" },
    },
  },
  {
    slug: "c5-sdk-job",
    id: "c5",
    title: "Run a Job with the SDK",
    claim: "A developer reaches execution in a few lines, and the audit record arrives without being asked for.",
    synopsis: "A few lines of code, and the work runs. Nobody sets up any logging, and a full record of what happened appears anyway.",
    audiences: ["Developers"],
    runtimeSec: 62,
    poster: "c5-sdk-job.webp",
    cuts: {
      narrated: { media: "c5-sdk-job/narrated.mp4", captions: "c5-sdk-job/narrated.vtt" },
    },
  },
  {
    slug: "c6-operations-catalogue",
    id: "c6",
    title: "One Catalogue, Every Capability",
    claim: "Capability on the grid is discoverable, reusable and identified by content rather than by location.",
    synopsis: "Everything this system can do, in one searchable list, and what you get when you open one of them.",
    audiences: ["Developers", "Partners"],
    runtimeSec: 49,
    poster: "c6-operations-catalogue.webp",
    cuts: {
      narrated: { media: "c6-operations-catalogue/narrated.mp4", captions: "c6-operations-catalogue/narrated.vtt" },
    },
  },
  {
    slug: "c8-mcp-surface",
    id: "c8",
    title: "Covia Inside Your Tools",
    claim: "Any MCP client can call this venue's capabilities over a protocol it already speaks, and the venue records the call like any other.",
    synopsis: "Everything this system can do, offered to other software through a standard it already speaks. Then a real call from a separate program.",
    audiences: ["Developers", "Partners"],
    runtimeSec: 59,
    poster: "c8-mcp-surface.webp",
    cuts: {
      narrated: { media: "c8-mcp-surface/narrated.mp4", captions: "c8-mcp-surface/narrated.vtt" },
    },
  },
  {
    slug: "n2-make-it-native",
    id: "n2",
    title: "Make It Native",
    claim: "An agent you already have becomes a native agent on the grid, governed and discoverable, without being rebuilt.",
    synopsis: "An agent that already exists somewhere else is brought in as it is, without being rewritten, and works like anything else here.",
    audiences: ["Developers", "CTO", "Partners"],
    runtimeSec: 59,
    poster: "n2-make-it-native.webp",
    cuts: {
      narrated: { media: "n2-make-it-native/narrated.mp4", captions: "n2-make-it-native/narrated.vtt" },
    },
  },
  {
    slug: "n4-context-memory",
    id: "n4",
    title: "Workspace and Context",
    claim: "An agent's context is grounded in what actually happened, at addressable paths, rather than in a conversation transcript.",
    synopsis: "Where an agent's memory actually lives: real files in real folders, including a note an agent wrote while doing its job.",
    audiences: ["CTO", "Developers", "CISO"],
    runtimeSec: 54,
    poster: "n4-context-memory.webp",
    cuts: {
      narrated: { media: "n4-context-memory/narrated.mp4", captions: "n4-context-memory/narrated.vtt" },
    },
  },
];
