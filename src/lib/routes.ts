import { assetHash, parseDidUrl } from "@covia/covia-sdk";

// An asset or operation reference as the address its routes take. A venue
// listing can hand back a full DID URL ("did:key:z6…/a/<hash>", see
// CoviaAPI.getAssets); pushing one raw splits it into extra path segments the
// routes never match (frontend#382), so only the DID is stripped. A
// namespace-relative id ("v/ops/…") already is the address, and a bare DID has
// nothing sensible to link to, so it is empty.
function addressOf(ref: string): string {
  if (!ref.startsWith("did:")) return ref;
  const { namespace, path } = parseDidUrl(ref);
  return [namespace, path].filter(Boolean).join("/");
}

/**
 * A reference as encoded path segments for the catch-all operation routes
 * (`operations/[...id]`, `operation/[...path]`): each namespace segment
 * ("v/ops/…", "a/<hash>") encoded on its own.
 */
export function operationPathSegments(ref: string): string {
  return addressOf(ref).split("/").map(encodeURIComponent).join("/");
}

/**
 * A venue-scoped link to an asset or operation. `assets/[id]` is one segment,
 * so an asset resolves to its bare hash (the link AssetHeader generates) and
 * anything not hash-addressed is encoded whole; `operations/[...id]` takes the
 * address as separate segments.
 */
export function venueScopedHref(venueId: string, type: string, ref: string): string {
  const base = `/venues/${encodeURIComponent(venueId)}/${type}`;
  const address = addressOf(ref);
  if (!address) return base;
  if (type !== "assets") return `${base}/${operationPathSegments(ref)}`;
  return `${base}/${assetHash(ref) ?? encodeURIComponent(address)}`;
}

/**
 * A job's page: venue-scoped when the venue is known, else the venue-less
 * `/job/[id]` route. The id is encoded like any other path segment.
 */
export function jobPath(venueId: string | undefined, jobId: string): string {
  const id = encodeURIComponent(jobId);
  return venueId ? `/venues/${encodeURIComponent(venueId)}/jobs/${id}` : `/job/${id}`;
}

/** An agent's chat page. */
export function agentChatPath(agentId: string): string {
  return `/agents/chat?agentId=${encodeURIComponent(agentId)}`;
}
