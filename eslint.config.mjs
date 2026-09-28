import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// eslint-config-next 16 ships flat configs directly, so the FlatCompat bridge
// (and its @eslint/eslintrc dependency) that Next 15 needed is gone.
const eslintConfig = defineConfig([
  globalIgnores([
    ".next/**",
    "build/**",
    "coverage/**",
    "node_modules/**",
    "out/**",
    "next-env.d.ts",
  ]),
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-asserted-optional-chain": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" }],
      "react-hooks/rules-of-hooks": "error",
      // eslint-plugin-react-hooks 7 (via eslint-config-next 16) added the React
      // Compiler's rules to "recommended". They flagged 94 existing sites in 57
      // files when Next 16 landed — a refactor to take on its own, not with a
      // framework bump — so they report as warnings until then. Fix, then
      // promote each back to "error" as its count reaches zero.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/purity": "warn",
    },
  },
  {
    // Two AGENTS.md conventions that are easy to break by accident. The
    // ignored files are the single places allowed to touch the real thing.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/clipboard.ts", "src/lib/notify.ts", "src/app/layout.tsx"],
    rules: {
      "no-restricted-syntax": ["error", {
        selector: "MemberExpression[object.name='navigator'][property.name='clipboard']",
        message: "Use writeTextToClipboard (src/lib/clipboard.ts) or useCopyFeedback — navigator.clipboard does not exist outside a secure context.",
      }],
      "no-restricted-imports": ["error", {
        paths: [{ name: "sonner", message: "Notify through src/lib/notify.ts so every notification is logged and errors stay copyable." }],
      }],
    },
  },
  {
    // `jest.mock` factories are hoisted above every import, so a shared double
    // can only be reached from inside one with `require`. This is Jest's own
    // documented idiom, not a lapse back to CommonJS — the same files use ESM
    // imports everywhere else.
    files: ["__tests__/**/*.{ts,tsx}"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
]);

export default eslintConfig;
