import { isEditingTarget } from "@/lib/keyboard";

describe("isEditingTarget", () => {
  it("is true for the controls a person types into", () => {
    for (const tag of ["input", "textarea", "select"]) {
      expect(isEditingTarget(document.createElement(tag))).toBe(true);
    }
  });

  it("is true inside a contenteditable region", () => {
    const editor = document.createElement("div");
    editor.contentEditable = "true";
    const child = document.createElement("span");
    editor.appendChild(child);
    document.body.appendChild(editor);
    try {
      // jsdom does not compute isContentEditable; a browser does, for the
      // region and everything inside it.
      Object.defineProperty(child, "isContentEditable", { value: true });
      expect(isEditingTarget(child)).toBe(true);
    } finally {
      editor.remove();
    }
  });

  it("is false for everything else", () => {
    expect(isEditingTarget(document.createElement("button"))).toBe(false);
    expect(isEditingTarget(document.createElement("div"))).toBe(false);
    expect(isEditingTarget(window)).toBe(false);
    expect(isEditingTarget(null)).toBe(false);
  });
});
