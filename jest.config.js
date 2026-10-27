// Jest loads this configuration as CommonJS.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

/** @type {import("jest").Config} */
const config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    // Stylesheet imports need no entry: next/jest maps them itself.
    "^@/(.*)$": "<rootDir>/src/$1",
    // Shared test doubles. `jest.mock` factories are hoisted above imports, so
    // they reach these through require("@test/...") rather than a top import.
    "^@test/(.*)$": "<rootDir>/__tests__/support/$1",
  },
  collectCoverage: false,
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/components/ui/**",
    "!src/app/**/layout.tsx",
    "!src/app/**/page.tsx",
  ],
  // Babel (istanbul), not v8. Collecting v8 coverage made the CI run about six
  // times slower (a whole-suite run on 3 workers: 344 s against 57 s), since
  // every file a test loads, node_modules included, is covered and then
  // filtered; istanbul instruments only the files collectCoverageFrom names.
  // Its counts are also exact and repeatable, where v8's vary with the code a
  // run happens to execute.
  coverageProvider: "babel",
  coveragePathIgnorePatterns: ["/node_modules/", "/.next/"],
  // A ratchet, not a target: set just under the coverage the suite actually
  // has, so an unrelated PR cannot quietly erode it. Istanbul counts
  // statements and branches more finely than v8 did, so the move to it set
  // these afresh from the suite's istanbul figures on 27 October 2026
  // (82.50 / 73.92 / 76.52 / 84.70; under v8 the same suite read 89.22 /
  // 83.34 / 77.83 / 89.22 against 85 / 80 / 74 / 85). Raise these numbers as
  // coverage climbs — never lower them to make a build pass.
  coverageThreshold: {
    global: {
      statements: 82,
      branches: 73,
      functions: 76,
      lines: 84,
    },
  },
};

const generatedConfig = createJestConfig(config);

module.exports = async (...args) => {
  const resolvedConfig = await generatedConfig(...args);
  // The unified/remark ecosystem and Shiki are ESM-only. Next's SWC
  // transformer can compile them, but next/jest normally ignores every
  // node_modules package except a short transpilePackages allowlist. The
  // Markdown dependency graph is deliberately granular, so transform the
  // modules actually loaded by a test rather than maintaining a fragile list
  // of dozens of transitive packages here.
  resolvedConfig.transformIgnorePatterns = ["^.+\\.module\\.(css|sass|scss)$"];
  // Agent/parallel work checks sibling git worktrees out *inside* the repo at
  // .claude/worktrees/<branch>/, each a full copy with its own __tests__. Jest
  // scans from rootDir, so from the root checkout it discovers those copies
  // too: every suite runs once per worktree (stale, on another branch), which
  // multiplies worker contention and amplifies timing-sensitive flakes, and
  // even `pnpm test -- __tests__/Foo.test.tsx` matches every copy. CI is
  // unaffected — a clean checkout has no worktrees (frontend#379).
  //
  // Anchored to <rootDir>, so it only ever hides worktrees *below* the checkout
  // being tested. A bare "/\.claude/worktrees/" would match the absolute path
  // of a worktree's own files, so running the suite from inside one would find
  // zero tests — breaking the very flow this exists to protect.
  const worktrees = "<rootDir>/\\.claude/worktrees/";
  // Jest's default testMatch treats every file under __tests__ as a suite;
  // shared fixture/data modules (…-fixtures.ts) are helpers, not tests.
  resolvedConfig.testPathIgnorePatterns = [
    ...(resolvedConfig.testPathIgnorePatterns || ["/node_modules/"]),
    "[.-]fixtures\\.[jt]sx?$",
    // Shared test doubles under __tests__/support/ are helpers, not suites;
    // Jest's default testMatch would otherwise run each one and fail it for
    // containing no tests.
    "<rootDir>/__tests__/support/",
    worktrees,
  ];
  // Not redundant with the above: haste still maps every worktree's files, so
  // each copy's package.json collides with the root's on the shared "mvp1.0"
  // name ("Haste module naming collision"). Hiding the path from the module
  // loader keeps resolution pointing at the root checkout.
  resolvedConfig.modulePathIgnorePatterns = [
    ...(resolvedConfig.modulePathIgnorePatterns || []),
    worktrees,
  ];
  return resolvedConfig;
};
