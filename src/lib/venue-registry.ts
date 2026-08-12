import { Venue } from "@covia/covia-sdk";
import type { VenueAuth } from "@/hooks/use-auth";
import { createAuthProvider } from "@/lib/auth-provider";

export type VenueDescriptorLike = {
  venueId: string;
  baseUrl: string;
  metadata?: { name?: string };
};

type CachedVenue = {
  baseUrl: string;
  venue: Venue;
};

// Auth objects are immutable values in the Zustand store. Keying the inner
// map by object identity gives each active credential its own SDK instance,
// while keeping signed-out access in the null slot.
const instances = new Map<string, Map<VenueAuth | null, CachedVenue>>();
const connections = new Map<string, Map<VenueAuth | null, Promise<Venue>>>();

function authMapFor<T>(
  registry: Map<string, Map<VenueAuth | null, T>>,
  venueId: string,
): Map<VenueAuth | null, T> {
  let byAuth = registry.get(venueId);
  if (!byAuth) {
    byAuth = new Map();
    registry.set(venueId, byAuth);
  }
  return byAuth;
}

export function getVenueFor(
  descriptor: VenueDescriptorLike,
  auth: VenueAuth | null,
): Venue {
  const byAuth = authMapFor(instances, descriptor.venueId);
  const cached = byAuth.get(auth);
  if (cached && cached.baseUrl === descriptor.baseUrl) return cached.venue;

  const venue = new Venue({
    baseUrl: descriptor.baseUrl,
    venueId: descriptor.venueId,
    name: descriptor.metadata?.name,
    auth: createAuthProvider(auth),
  });
  byAuth.set(auth, { baseUrl: descriptor.baseUrl, venue });
  return venue;
}

export function adoptVenueInstance(
  venue: Venue,
  auth: VenueAuth | null = null,
): Venue {
  const byAuth = authMapFor(instances, venue.venueId);
  const cached = byAuth.get(auth);
  if (cached && cached.baseUrl === venue.baseUrl) return cached.venue;
  byAuth.set(auth, { baseUrl: venue.baseUrl, venue });
  return venue;
}

export function connectVenue(
  identifier: string,
  auth: VenueAuth | null = null,
  timeoutMs = 2_000,
): Promise<Venue> {
  const byAuth = authMapFor(connections, identifier);
  const pending = byAuth.get(auth);
  if (pending) return pending;

  const connection = new Promise<Venue>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out connecting to ${identifier}`)),
      timeoutMs,
    );
    Venue.connect(identifier, createAuthProvider(auth)).then(
      (venue) => {
        clearTimeout(timer);
        resolve(adoptVenueInstance(venue, auth));
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  }).finally(() => {
    byAuth.delete(auth);
    if (byAuth.size === 0) connections.delete(identifier);
  });

  byAuth.set(auth, connection);
  return connection;
}

export function evictVenueInstances(venueId: string): void {
  instances.delete(venueId);
  connections.delete(venueId);
}
