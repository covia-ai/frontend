import { abbreviateDid } from "@/lib/utils";

type VenueDisplaySource = {
  venueId: string;
  baseUrl: string;
  metadata?: { name?: string };
};

function readableVenueId(venueId: string): string {
  let decoded = venueId;
  try {
    decoded = decodeURIComponent(venueId);
  } catch {
    // Keep malformed identifiers readable rather than failing to render a label.
  }

  if (decoded.startsWith("did:web:")) {
    const host = decoded.slice("did:web:".length).split(":", 1)[0];
    try {
      return decodeURIComponent(host);
    } catch {
      return host;
    }
  }

  return decoded.startsWith("did:") ? abbreviateDid(decoded) : decoded;
}

export function venueDisplayName(
  venue: VenueDisplaySource | undefined,
  fallbackVenueId?: string,
  emptyLabel = "Unknown venue",
): string {
  const venueId = venue?.venueId ?? fallbackVenueId;
  const name = venue?.metadata?.name?.trim();

  // Some venue responses use their DID as the default metadata name. That is
  // an identifier, not a useful navigation label, so prefer the public host.
  if (name && name !== venueId && !name.startsWith("did:")) return name;

  if (venue?.baseUrl) {
    try {
      return new URL(venue.baseUrl).host;
    } catch {
      // A custom/non-URL base still communicates more than a raw DID.
      return venue.baseUrl;
    }
  }

  return venueId ? readableVenueId(venueId) : emptyLabel;
}
