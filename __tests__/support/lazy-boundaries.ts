/**
 * Resolve the module behind a `React.lazy` boundary before a test asserts on
 * what that boundary renders.
 *
 * #473 moved the remark/rehype pipeline and the chart bundle out of pages'
 * initial JS and behind `React.lazy`, so the first render of either shows a
 * fallback and swaps once a dynamic `import()` resolves. Jest compiles that
 * module graph the first time it is imported, and on a loaded machine the
 * compile takes longer than the one second `findBy*` waits — so the assertion
 * was racing the compiler rather than the component. That is why the suites
 * rendering these passed alone and failed in a full parallel run, and why the
 * set of failures grew as the machine got busier.
 *
 * Awaiting the same import first moves the compile outside the timed window.
 * The component's own `import()` then resolves from the module registry on the
 * next microtask, so the swap happens within a tick of the render rather than
 * at the mercy of how many workers are competing. That makes the assertion
 * deterministic, which raising the timeout would not: a longer deadline only
 * makes the race less likely to be lost, and loses it anyway on a slower
 * machine or a bigger suite.
 *
 * Use these in a `beforeAll` of any suite that renders a lazy boundary and
 * then asserts on what is behind it. The same goes for `next/dynamic`, which
 * defers its import the same way. A suite reaches a boundary through whatever
 * it renders, so the component under test need not be the lazy one: JobList
 * reaches the sparkline through its stat tiles.
 */

/** Behind `LazyMarkdownMessage` — the remark/rehype pipeline. */
export function warmMarkdownPipeline(): Promise<unknown> {
  return import("@/components/MarkdownMessage");
}

/** Behind `StatTile`'s trend — the sparkline chart. */
export function warmSparkline(): Promise<unknown> {
  return import("@/components/charts/Sparkline");
}

/** Behind the `next/dynamic` JSON views (schemas, typed results, workspace values). */
export function warmThemedJsonEditor(): Promise<unknown> {
  return import("@/components/ThemedJsonEditor");
}

/**
 * Behind `ShikiCodeBlock` — the highlighter, and the grammar for each language
 * named. Grammars are lazy imports of their own inside `@/lib/shiki`, so the
 * highlighter is run once per language rather than only imported.
 */
export function warmShikiHighlighter(...languages: string[]): () => Promise<void> {
  return async () => {
    const { highlightCode } = await import("@/lib/shiki");
    for (const language of languages) await highlightCode("", language);
  };
}
