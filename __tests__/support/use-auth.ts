// Complete double for `@/hooks/use-auth`.
//
//   import { authMock, setCurrentAuth } from "@test/use-auth";
//   jest.mock("@/hooks/use-auth", () => require("@test/use-auth").authMock);

export type MockVenueAuth = {
  type: "bearer" | "keypair";
  did: string;
  token?: string;
  privateKeyHex?: string;
};

/** A signed-in keypair account, for tests that just need *an* identity. */
export const sampleKeypairAuth: MockVenueAuth = {
  type: "keypair",
  did: "did:key:z6MkTestAccount",
  privateKeyHex: "00".repeat(32),
};

type AuthState = {
  authMap: Record<string, MockVenueAuth>;
  accountsMap: Record<string, MockVenueAuth[]>;
  deviceKeyHex: string | null;
  deviceKeys: string[];
};

const emptyState = (): AuthState => ({
  authMap: {},
  accountsMap: {},
  deviceKeyHex: null,
  deviceKeys: [],
});

let state: AuthState = emptyState();

// The real `useAuthStore` is a Zustand hook that also carries `getState`/
// `setState`, and is called both as `useAuthStore(selector)` and as
// `useAuthStore.getState()`. Reproduce both shapes.
const storeActions = {
  addDeviceKey: jest.fn(),
  removeDeviceKey: jest.fn(),
  loginWithToken: jest.fn(),
  loginWithKeypair: jest.fn(),
  switchAccount: jest.fn(),
  removeAccount: jest.fn(),
  getDeviceKeyHex: jest.fn(() => state.deviceKeyHex),
  setDeviceKeyHex: jest.fn(),
  logout: jest.fn(),
  purgeVenueAuth: jest.fn(),
  getAuthForVenue: jest.fn((venueId: string) => state.authMap[venueId] ?? null),
};

const getState = () => ({ ...state, ...storeActions });

const useAuthStore = Object.assign(
  jest.fn((selector?: (s: ReturnType<typeof getState>) => unknown) =>
    selector ? selector(getState()) : getState(),
  ),
  {
    getState: jest.fn(getState),
    setState: jest.fn((patch: Partial<AuthState>) => {
      state = { ...state, ...patch };
    }),
  },
);

export const authMock = {
  useCurrentAuth: jest.fn<MockVenueAuth | null, []>(() => null),
  useIsAuthenticated: jest.fn<boolean, []>(() => false),
  useAuthStore,
};

/**
 * Signs the tests in as `auth` (or out, with `null`), keeping
 * `useCurrentAuth` and `useIsAuthenticated` consistent with each other —
 * the pair most hand-written mocks let drift apart.
 */
export function setCurrentAuth(auth: MockVenueAuth | null, venueId = "v1"): void {
  authMock.useCurrentAuth.mockReturnValue(auth);
  authMock.useIsAuthenticated.mockReturnValue(auth !== null);
  state = auth
    ? { ...state, authMap: { ...state.authMap, [venueId]: auth } }
    : { ...state, authMap: {} };
}

export function resetAuthMock(): void {
  state = emptyState();
  Object.values(storeActions).forEach((fn) => fn.mockClear());
  storeActions.getDeviceKeyHex.mockImplementation(() => state.deviceKeyHex);
  storeActions.getAuthForVenue.mockImplementation(
    (venueId: string) => state.authMap[venueId] ?? null,
  );
  authMock.useCurrentAuth.mockReset();
  authMock.useCurrentAuth.mockReturnValue(null);
  authMock.useIsAuthenticated.mockReset();
  authMock.useIsAuthenticated.mockReturnValue(false);
  useAuthStore.mockClear();
  useAuthStore.getState.mockClear();
  useAuthStore.setState.mockClear();
}
