import {
  buildJobTree,
  findTreeRoot,
  loadJobTree,
  normalizeJobId,
  scanJobsSince,
  SCAN_LIMIT,
  type JobTreeRecord,
} from "@/lib/job-tree";

// A fake venue over an in-memory job index. Keys are bare hex in index
// (oldest-first) order, as the venue's `j` index pages them; `parent` carries
// the `0x` prefix and `created` is epoch ms, as real records do (covia#500).
type Row = { id: string; parent?: string; created: number; status?: string; name?: string; op?: string };

function fakeVenue(rows: Row[]) {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const listFields = jest.fn(async (_path: string, fields: string[], opts: { offset: number; limit: number }) => {
    const page = rows.slice(opts.offset, opts.offset + opts.limit);
    const values: Record<string, Record<string, { exists: boolean; value: unknown }>> = {};
    for (const row of page) {
      values[row.id] = Object.fromEntries(
        fields.map((f) => {
          const value = (row as Record<string, unknown>)[f];
          return [f, value === undefined ? { exists: false, value: null } : { exists: true, value }];
        }),
      );
    }
    return { exists: true, count: rows.length, offset: opts.offset, keys: page.map((r) => r.id), values };
  });
  const get = jest.fn(async (id: string) => {
    const row = byId.get(normalizeJobId(id));
    if (!row) throw new Error("Job not found");
    return { metadata: { ...row } };
  });
  const list = jest.fn(async () => ({ count: rows.length }));
  const run = jest.fn();
  return {
    venue: { jobs: { get }, workspace: { list, listFields }, operations: { run } } as any,
    listFields,
    get,
    run,
  };
}

const id = (n: number) => n.toString(16).padStart(32, "0");

describe("normalizeJobId", () => {
  it("strips 0x and lowercases, so index keys and parent links compare equal", () => {
    expect(normalizeJobId("0x01A0")).toBe("01a0");
    expect(normalizeJobId("01a0")).toBe("01a0");
    expect(normalizeJobId(undefined)).toBe("");
  });
});

describe("buildJobTree", () => {
  const root: JobTreeRecord = { id: "a", created: 1 };

  it("nests records under their parents, siblings oldest-first", () => {
    const records: JobTreeRecord[] = [
      { id: "c", parent: "a", created: 3 },
      { id: "b", parent: "a", created: 2 },
      { id: "d", parent: "b", created: 4 },
      { id: "x", parent: "elsewhere", created: 5 },
    ];
    const { node, size } = buildJobTree(root, records);
    expect(size).toBe(4);
    expect(node.children.map((c) => c.id)).toEqual(["b", "c"]);
    expect(node.children[0].children.map((c) => c.id)).toEqual(["d"]);
  });

  it("survives a cyclic parent link", () => {
    const records: JobTreeRecord[] = [
      { id: "b", parent: "a", created: 2 },
      { id: "a", parent: "b", created: 1 },
    ];
    expect(buildJobTree(root, records).size).toBe(2);
  });
});

describe("findTreeRoot", () => {
  it("walks parent links up to the top job", async () => {
    const { venue, get } = fakeVenue([
      { id: id(1), created: 1 },
      { id: id(2), parent: `0x${id(1)}`, created: 2 },
      { id: id(3), parent: `0x${id(2)}`, created: 3 },
    ]);
    const { root, truncatedAbove } = await findTreeRoot(venue, { id: id(3), parent: `0x${id(2)}`, created: 3 } as any);
    expect(root.id).toBe(id(1));
    expect(truncatedAbove).toBe(false);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("stops below a parent it can't read and says so", async () => {
    const { venue } = fakeVenue([{ id: id(2), parent: `0x${id(1)}`, created: 2 }]);
    const { root, truncatedAbove } = await findTreeRoot(venue, { id: id(2), parent: `0x${id(1)}`, created: 2 } as any);
    expect(root.id).toBe(id(2));
    expect(truncatedAbove).toBe(true);
  });
});

describe("scanJobsSince", () => {
  it("reads newest-first and stops once it passes the root", async () => {
    // 450 unrelated old jobs, then the root, then 3 newer jobs.
    const rows: Row[] = [];
    for (let i = 0; i < 450; i++) rows.push({ id: id(i + 1), created: i });
    rows.push({ id: id(1000), created: 1000 });
    rows.push({ id: id(1001), parent: `0x${id(1000)}`, created: 1001 });
    rows.push({ id: id(1002), created: 1002 });
    rows.push({ id: id(1003), parent: `0x${id(1001)}`, created: 1003 });
    const { venue, listFields } = fakeVenue(rows);

    const { records, complete } = await scanJobsSince(venue, { id: id(1000), created: 1000 });
    expect(complete).toBe(true);
    // One 200-row page reaches the root; the older 250 are never read.
    expect(listFields).toHaveBeenCalledTimes(1);
    expect(listFields.mock.calls[0][1]).not.toContain("input");
    expect(records.map((r) => r.id).sort()).toEqual([id(1001), id(1002), id(1003)].sort());
  });

  it("reports an incomplete scan when the limit runs out before the root", async () => {
    const rows: Row[] = [{ id: id(1), created: 1 }];
    for (let i = 0; i < SCAN_LIMIT + 10; i++) rows.push({ id: id(i + 2), created: i + 2 });
    const { venue } = fakeVenue(rows);
    const { complete } = await scanJobsSince(venue, { id: id(1), created: 1 });
    expect(complete).toBe(false);
  });
});

describe("loadJobTree", () => {
  it("builds the whole tree from a leaf, without invoking any operation", async () => {
    const { venue, run } = fakeVenue([
      { id: id(1), created: 1, name: "Grid Run" },
      { id: id(2), parent: `0x${id(1)}`, created: 2, name: "Grid Run" },
      { id: id(3), created: 3, name: "Unrelated" },
      { id: id(4), parent: `0x${id(2)}`, created: 4, name: "Merge" },
    ]);
    const tree = await loadJobTree(venue, { id: `0x${id(4)}`, parent: `0x${id(2)}`, created: 4 } as any);
    expect(tree.size).toBe(3);
    expect(tree.root.id).toBe(id(1));
    expect(tree.root.children[0].children[0].name).toBe("Merge");
    expect(tree.complete).toBe(true);
    expect(run).not.toHaveBeenCalled();
  });
});
