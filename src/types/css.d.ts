// Side-effect stylesheet imports (`import "./globals.css"`). TypeScript 6
// checks side-effect imports (noUncheckedSideEffectImports) and Next's
// generated types only declare CSS modules, so plain .css needs this.
declare module "*.css";
