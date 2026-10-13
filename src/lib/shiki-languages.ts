// Which fence languages ShikiCodeBlock highlights, kept apart from the
// highlighter (src/lib/shiki.ts) so a code block can decide synchronously
// whether to highlight without pulling shiki/core into the page (#473).

export type ShikiLanguage =
  | "bash" | "c" | "clojure" | "cpp" | "css" | "csharp" | "dockerfile" | "go"
  | "graphql" | "html" | "java" | "javascript" | "json" | "jsonc" | "jsx"
  | "kotlin" | "markdown" | "python" | "ruby" | "rust" | "sql" | "tsx" | "toml"
  | "typescript" | "xml" | "yaml";

const aliases: Record<string, ShikiLanguage> = {
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

export function supportedShikiLanguage(language?: string): ShikiLanguage | undefined {
  if (!language) return undefined;
  return aliases[language.toLowerCase()];
}
