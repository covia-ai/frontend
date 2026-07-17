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
   })
  
];

export default eslintConfig;
