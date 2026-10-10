import type { Venue, WorkspaceProjectedList } from "@covia/covia-sdk";
import { LLM_PROVIDERS } from "@/config/llm-providers";

/** The model ids the picker offers for a provider: current models, then the
 *  ones the venue keeps for existing agents (tagged `previous`). */
export type ModelOptions = { current: string[]; previous: string[] };

const TAGS_FIELD = "model/tags";
const PREVIOUS_TAG = "previous";

/** The curated list, for a venue that publishes no model catalogue. */
export function fallbackModelOptions(providerId: string): ModelOptions {
  return { current: LLM_PROVIDERS[providerId]?.models ?? [], previous: [] };
}

// A provider operation `v/ops/langchain/<name>` publishes one model preset per
// model it serves at `v/models/<name>/<model id>` (covia 0.9.9+).
export function modelCatalogPath(providerId: string): string | null {
  const name = LLM_PROVIDERS[providerId]?.operation.split("/").pop();
  return name ? `v/models/${name}` : null;
}

/** Null when the venue lists no models there — an older venue, or a provider
 *  it doesn't run — so the caller falls back to the curated list. */
export function modelOptionsFromCatalog(
  page: Pick<WorkspaceProjectedList, "keys" | "values">,
): ModelOptions | null {
  const ids = page.keys ?? [];
  if (ids.length === 0) return null;
  const isPrevious = (id: string) => {
    const tags = page.values?.[id]?.[TAGS_FIELD]?.value;
    return Array.isArray(tags) && tags.includes(PREVIOUS_TAG);
  };
  // The venue's key order is its storage order, which means nothing to a reader.
  const byId = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });
  return {
    current: ids.filter((id) => !isPrevious(id)).sort(byId),
    previous: ids.filter(isPrevious).sort(byId),
  };
}

/** One job-free read of the venue's model catalogue for a curated provider. */
export async function readModelOptions(
  venue: Venue,
  providerId: string,
): Promise<ModelOptions | null> {
  const path = modelCatalogPath(providerId);
  if (!path) return null;
  return modelOptionsFromCatalog(await venue.workspace.listFields(path, [TAGS_FIELD]));
}
