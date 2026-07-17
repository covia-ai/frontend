import { Venue } from "@covia/covia-sdk";

export type AssetEntry = { id: string; metadata: any };

// An asset id IS the content hash of its metadata, so id → metadata is
// immutable: safe to cache indefinitely, across venues and sessions. This
// makes revisits to asset listings near-free — only ids never seen on this
// browser are fetched.
const CACHE_PREFIX = "asset-meta:";

// Per-batch fan-out for cache misses. Bounded so a large catalog doesn't
// fire hundreds of concurrent GETs into the browser's connection limit;
// batches resolve incrementally so callers can render as metadata arrives.
const BATCH_SIZE = 16;

function cacheGet(id: string): any | null {
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + id);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function cachePut(id: string, metadata: any): void {
  try {
    window.localStorage.setItem(CACHE_PREFIX + id, JSON.stringify(metadata));
  } catch {
    // Quota exceeded or storage unavailable — cache is best-effort only.
  }
}

/**
 * Resolve metadata for a list of asset ids: instantly from the local
 * content-addressed cache where possible, fetching only the misses in
 * bounded-concurrency batches. `onProgress` receives the full accumulated
 * entry list (input order, failures skipped) after the cached tranche and
 * after each batch, so callers can render incrementally instead of blocking
 * on the slowest of N individual GETs.
 */
export async function loadAssetEntries(
  venue: Venue,
  ids: string[],
  onProgress?: (entries: AssetEntry[]) => void,
): Promise<AssetEntry[]> {
  const resolved = new Map<string, any>();
  const misses: string[] = [];

  for (const id of ids) {
    const cached = cacheGet(id);
    if (cached) resolved.set(id, cached);
    else misses.push(id);
  }

  const snapshot = () =>
    ids.filter((id) => resolved.has(id)).map((id) => ({ id, metadata: resolved.get(id) }));

  if (resolved.size > 0 || misses.length === 0) onProgress?.(snapshot());

  for (let i = 0; i < misses.length; i += BATCH_SIZE) {
    const batch = misses.slice(i, i + BATCH_SIZE);
    const fetched = await Promise.all(
      batch.map((id) => venue.getAsset(id).then((a) => ({ id, metadata: a?.metadata })).catch(() => null)),
    );
    for (const entry of fetched) {
      if (!entry || entry.metadata == null) continue;
      resolved.set(entry.id, entry.metadata);
      cachePut(entry.id, entry.metadata);
    }
    onProgress?.(snapshot());
  }

  return snapshot();
}
