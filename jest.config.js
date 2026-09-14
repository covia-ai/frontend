// Jest loads this configuration as CommonJS.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

/** @type {import("jest").Config} */
const config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  collectCoverage: false,
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/components/ui/**",
    "!src/app/**/layout.tsx",
    "!src/app/**/page.tsx",
  ],
  coverageProvider: "v8",
  coveragePathIgnorePatterns: ["/node_modules/", "/.next/"],
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
