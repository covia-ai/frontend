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
  // Jest's default testMatch treats every file under __tests__ as a suite;
  // shared fixture/data modules (…-fixtures.ts) are helpers, not tests.
  resolvedConfig.testPathIgnorePatterns = [
    ...(resolvedConfig.testPathIgnorePatterns || ["/node_modules/"]),
    "[.-]fixtures\\.[jt]sx?$",
  ];
  return resolvedConfig;
};
