/** @type {import("jest").Config} */
const config = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.jest.json",
      },
    ],
  },
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

module.exports = config;
