import {
  isWorkspaceNamespaceRoot,
  ROOT_NAMESPACES,
  workspaceNamespaceForPath,
} from "@/lib/workspace-namespaces";

describe("workspace namespaces", () => {
  it("includes the venue's virtual public namespace", () => {
    expect(ROOT_NAMESPACES[0]).toMatchObject({
      key: "v",
      label: "Venue Public",
    });
  });

  it("uses the root segment to describe nested paths", () => {
    expect(workspaceNamespaceForPath("g/manager/sessions")?.label).toBe("Agents");
    expect(workspaceNamespaceForPath("unknown/path")).toBeNull();
  });

  it("distinguishes an empty namespace root from a missing nested path", () => {
    expect(isWorkspaceNamespaceRoot("w")).toBe(true);
    expect(isWorkspaceNamespaceRoot("w/missing")).toBe(false);
  });
});
