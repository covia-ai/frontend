import type { Venue, WorkspaceProjectedList } from "@covia/covia-sdk";
import {
  fallbackModelOptions,
  modelCatalogPath,
  modelOptionsFromCatalog,
  readModelOptions,
} from "@/lib/venue-models";
import { LLM_PROVIDERS } from "@/config/llm-providers";

function catalog(models: Record<string, string[]>): WorkspaceProjectedList {
  return {
    exists: true,
    type: "Map",
    keys: Object.keys(models),
    count: Object.keys(models).length,
    values: Object.fromEntries(
      Object.entries(models).map(([id, tags]) => [
        id,
        { "model/tags": { exists: true, value: tags } },
      ]),
    ),
  };
}

describe("modelCatalogPath", () => {
  it("names the catalogue after the provider operation", () => {
    expect(modelCatalogPath("anthropic")).toBe("v/models/anthropic");
    expect(modelCatalogPath("openai")).toBe("v/models/openai");
  });

  it("has none for a provider outside the curated list", () => {
    expect(modelCatalogPath("__custom_provider__")).toBeNull();
  });
});

describe("modelOptionsFromCatalog", () => {
  it("splits previous models from current ones, each in id order", () => {
    const options = modelOptionsFromCatalog(catalog({
      "claude-sonnet-5-5": ["balanced"],
      "claude-haiku-4-5": ["previous"],
      "claude-opus-5-5": ["quality"],
      "claude-sonnet-5": ["previous"],
      "claude-fable-5-1": ["long-running"],
    }));

    expect(options).toEqual({
      current: ["claude-fable-5-1", "claude-opus-5-5", "claude-sonnet-5-5"],
      previous: ["claude-haiku-4-5", "claude-sonnet-5"],
    });
  });

  it("treats an untagged model as current", () => {
    const page = catalog({ qwen: [] });
    delete page.values.qwen["model/tags"];
    expect(modelOptionsFromCatalog(page)).toEqual({ current: ["qwen"], previous: [] });
  });

  it("is null when the venue lists no models, so the curated list applies", () => {
    expect(modelOptionsFromCatalog({ keys: undefined, values: {} })).toBeNull();
    expect(modelOptionsFromCatalog(catalog({}))).toBeNull();
  });
});

describe("readModelOptions", () => {
  it("reads the catalogue with one job-free projected list", async () => {
    const listFields = jest.fn().mockResolvedValue(catalog({ "gpt-5.6-terra": ["balanced"] }));
    const invoke = jest.fn();
    const venue = { workspace: { listFields }, invoke } as unknown as Venue;

    await expect(readModelOptions(venue, "openai")).resolves.toEqual({
      current: ["gpt-5.6-terra"],
      previous: [],
    });
    expect(listFields).toHaveBeenCalledWith("v/models/openai", ["model/tags"]);
    expect(invoke).not.toHaveBeenCalled();
  });

  it("reads nothing for a provider with no catalogue path", async () => {
    const listFields = jest.fn();
    const venue = { workspace: { listFields } } as unknown as Venue;

    await expect(readModelOptions(venue, "__default_provider__")).resolves.toBeNull();
    expect(listFields).not.toHaveBeenCalled();
  });
});

describe("fallbackModelOptions", () => {
  it("is the curated list, with nothing marked previous", () => {
    expect(fallbackModelOptions("anthropic")).toEqual({
      current: LLM_PROVIDERS.anthropic.models,
      previous: [],
    });
    expect(fallbackModelOptions("openai")).toEqual({ current: [], previous: [] });
  });
});
