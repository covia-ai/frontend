import {
  createBundledHighlighter,
  createSingletonShorthands,
} from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

const languages = {
  bash: () => import("@shikijs/langs/bash"),
  c: () => import("@shikijs/langs/c"),
  clojure: () => import("@shikijs/langs/clojure"),
  cpp: () => import("@shikijs/langs/cpp"),
  css: () => import("@shikijs/langs/css"),
  csharp: () => import("@shikijs/langs/csharp"),
  dockerfile: () => import("@shikijs/langs/dockerfile"),
  go: () => import("@shikijs/langs/go"),
  graphql: () => import("@shikijs/langs/graphql"),
  html: () => import("@shikijs/langs/html"),
  java: () => import("@shikijs/langs/java"),
  javascript: () => import("@shikijs/langs/javascript"),
  json: () => import("@shikijs/langs/json"),
  jsonc: () => import("@shikijs/langs/jsonc"),
  jsx: () => import("@shikijs/langs/jsx"),
  kotlin: () => import("@shikijs/langs/kotlin"),
  markdown: () => import("@shikijs/langs/markdown"),
  python: () => import("@shikijs/langs/python"),
  ruby: () => import("@shikijs/langs/ruby"),
  rust: () => import("@shikijs/langs/rust"),
  sql: () => import("@shikijs/langs/sql"),
  tsx: () => import("@shikijs/langs/tsx"),
  toml: () => import("@shikijs/langs/toml"),
  typescript: () => import("@shikijs/langs/typescript"),
  xml: () => import("@shikijs/langs/xml"),
  yaml: () => import("@shikijs/langs/yaml"),
};

const themes = {
  "github-dark": () => import("@shikijs/themes/github-dark"),
};

const createHighlighter = createBundledHighlighter({
  langs: languages,
  themes,
  engine: () => createJavaScriptRegexEngine(),
});

const { codeToHtml } = createSingletonShorthands(createHighlighter);

const aliases: Record<string, keyof typeof languages> = {
  bash: "bash",
  c: "c",
  clj: "clojure",
  clojure: "clojure",
  cpp: "cpp",
  cs: "csharp",
  css: "css",
  csharp: "csharp",
  docker: "dockerfile",
  dockerfile: "dockerfile",
  go: "go",
  golang: "go",
  graphql: "graphql",
  html: "html",
  java: "java",
  js: "javascript",
  javascript: "javascript",
  json: "json",
  json5: "jsonc",
  jsonc: "jsonc",
  jsx: "jsx",
  kotlin: "kotlin",
  kt: "kotlin",
  md: "markdown",
  markdown: "markdown",
  py: "python",
  python: "python",
  rb: "ruby",
  ruby: "ruby",
  rs: "rust",
  rust: "rust",
  sh: "bash",
  shell: "bash",
  sql: "sql",
  ts: "typescript",
  tsx: "tsx",
  toml: "toml",
  typescript: "typescript",
  xml: "xml",
  yaml: "yaml",
  yml: "yaml",
  zsh: "bash",
};

const resultCache = new Map<string, Promise<string | null>>();
const MAX_CACHE_ENTRIES = 100;

export function supportedShikiLanguage(language?: string) {
  if (!language) return undefined;
  return aliases[language.toLowerCase()];
}

export function highlightCode(code: string, language: string) {
  const resolvedLanguage = supportedShikiLanguage(language);
  if (!resolvedLanguage) return Promise.resolve<string | null>(null);

  const key = `${resolvedLanguage}\0${code}`;
  const cached = resultCache.get(key);
  if (cached) return cached;

  if (resultCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = resultCache.keys().next().value;
    if (oldest !== undefined) resultCache.delete(oldest);
  }

  const result = codeToHtml(code, {
    lang: resolvedLanguage,
    theme: "github-dark",
  }).catch(() => null);
  resultCache.set(key, result);
  return result;
}
