import { useAuthStore, type VenueAuth } from "@/hooks/use-auth";
import { useWatchedJobs } from "@/hooks/use-watched-jobs";
import { useNotificationLog } from "@/hooks/use-notification-log";
import { forgetVenueInstances } from "@/lib/venue-registry";
import { browserSessionStorage } from "@/lib/persist-storage";
import { resetIdentity } from "@/lib/analytics";

// "Sign out and forget this account on this device" (#436). A plain sign-out
// keeps a device key so it can be reactivated later; this removes it and
// everything this browser kept about the venues it was used on.
//
// Lives outside the auth store because it reaches into stores (watched jobs,
// notification log) that themselves import the auth store.

/**
 * Venues whose stored accounts would be removed by forgetting `auth`. A device
 * key is one identity on every venue, so this is every venue that signed in
 * with the same key. A bearer is only ever stored for its own venue.
 */
export function venuesForgottenWith(venueId: string, auth: VenueAuth): string[] {
  if (auth.type === "bearer") return [venueId];
  const { authMap, accountsMap } = useAuthStore.getState();
  const usesKey = (a: VenueAuth) =>
    a.type === "keypair" && a.privateKeyHex === auth.privateKeyHex;
  const ids = new Set<string>([venueId]);
  for (const [id, a] of Object.entries(authMap)) if (usesKey(a)) ids.add(id);
  for (const [id, list] of Object.entries(accountsMap)) if (list.some(usesKey)) ids.add(id);
  return [...ids];
}

/**
 * Signs out of `venueId` and forgets its active account on this device. For a
 * device key that means the private key itself, on every venue it was used on.
 * Returns the venues affected (empty if nothing was signed in).
 */
export function forgetAccountOnDevice(venueId: string): string[] {
  const auth = useAuthStore.getState().authMap[venueId];
  if (!auth) return [];
  const venueIds = venuesForgottenWith(venueId, auth);

  if (auth.type === "keypair") {
    useAuthStore.getState().removeDeviceKey(auth.privateKeyHex);
  } else {
    // Bearers are never persisted, so a sign-out already forgets the token;
    // removeAccount also drops it from this tab's account list.
    useAuthStore.getState().removeAccount(venueId, auth.did, "bearer");
  }

  const affected = new Set(venueIds);
  useWatchedJobs.setState((state) => ({
    jobs: state.jobs.filter((job) => !affected.has(job.venueId)),
  }));
  useNotificationLog.setState((state) => ({
    entries: state.entries.filter((entry) => !entry.venueId || !affected.has(entry.venueId)),
  }));
  clearOperationDrafts(venueIds);
  // Cached SDK clients hold the credential in memory until reload.
  forgetVenueInstances(venueIds);
  resetIdentity();
  return venueIds;
}

// Operation-input drafts (use-operation-input.ts) are kept per venue in
// sessionStorage and can hold values typed into an operation's form.
function clearOperationDrafts(venueIds: string[]): void {
  const storage = browserSessionStorage() as Partial<Storage>;
  if (typeof storage.key !== "function" || typeof storage.length !== "number") return;
  const prefixes = venueIds.map((id) => `operation_input_${id}_`);
  const doomed: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && prefixes.some((p) => key.startsWith(p))) doomed.push(key);
  }
  for (const key of doomed) storage.removeItem?.(key);
}
