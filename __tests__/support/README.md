# Shared test doubles

Mocks for the three modules almost every feature test has to stub. Each factory
returns the **complete** export surface of the real module, so a test can never
be missing an export the component happens to call — the failure mode these
replaced, where a hand-written `jest.mock` declared `notifyError`/`notifySuccess`
and the component called `notifyWarning`, blowing up with "is not a function".

`jest.mock` factories are hoisted above imports, so reach these with `require`
inside the factory and import the handles normally for assertions:

```ts
import { notifyMock } from "@test/notify";

jest.mock("@/lib/notify", () => require("@test/notify").notifyMock);
```

Both resolve to the same module instance within a test file, so `notifyMock`
holds the very `jest.fn`s the component under test called:

```ts
expect(notifyMock.notifyError).toHaveBeenCalledWith(
  "Unable to load assets",
  expect.any(Error),
);
```

Every double is a `jest.fn`, so configure per test with `mockReturnValue`:

```ts
import { authMock } from "@test/use-auth";

jest.mock("@/hooks/use-auth", () => require("@test/use-auth").authMock);

authMock.useIsAuthenticated.mockReturnValue(true);
```

Call `resetSupportMocks()` from `@test/reset` in a `beforeEach` to clear call
history and restore each default return value — `jest.clearAllMocks()` alone
clears the implementations these defaults rely on.

Adding a module here is worth it once three or more suites stub it; below that,
a local `jest.mock` is clearer than the indirection.
