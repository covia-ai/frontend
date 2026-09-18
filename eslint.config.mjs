import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "build/**",
      "coverage/**",
      "node_modules/**",
      "out/**",
      "next-env.d.ts",
    ],
  },
   ...compat.config({
      extends: ["next/core-web-vitals", "next/typescript"],
      rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      "@typescript-eslint/no-non-null-asserted-optional-chain" : "error",
      "@typescript-eslint/no-unused-vars" : ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_", "caughtErrors": "none" }],
      "react-hooks/rules-of-hooks" : "error"
    },
   }),
  {
    // `jest.mock` factories are hoisted above every import, so a shared double
    // can only be reached from inside one with `require`. This is Jest's own
    // documented idiom, not a lapse back to CommonJS — the same files use ESM
    // imports everywhere else.
    files: ["__tests__/**/*.{ts,tsx}"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
];

export default eslintConfig;
