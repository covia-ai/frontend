/**
 * Next hands dynamic route params to a page still percent-encoded
 * (`/agents/agent/a%20b` arrives as "a%20b"), and every link builder encodes
 * with encodeURIComponent — so each param is decoded exactly once, here, at
 * the page boundary, and never again further down. A hand-typed URL can carry
 * a bare "%"; that falls back to the raw value rather than throwing, which
 * from a Server Component would render the error boundary instead of the page.
 */
export function routeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
