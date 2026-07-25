// Remembers the secret names a user has recently added on this browser, so the
// Add Secret form can suggest them again. Names only — never values.

const STORAGE_KEY = "secret-key-names";
const MAX = 6;

export function recentKeyNames(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function rememberKeyName(name: string): void {
  const n = name.trim();
  if (!n) return;
  try {
    const next = [n, ...recentKeyNames().filter((x) => x !== n)].slice(0, MAX);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // best-effort — storage may be unavailable
  }
}

// Grouped, de-duplicated name suggestions in the order recent → your keys →
// common, so the dropdown never lists the same name twice.
export function keyNameSuggestions(opts: {
  recent: string[];
  existing: string[];
  common: string[];
}): { label: string; names: string[] }[] {
  const seen = new Set<string>();
  const take = (names: string[]) =>
    names.filter((n) => !!n && !seen.has(n) && (seen.add(n), true));
  return [
    { label: "Recent", names: take(opts.recent) },
    { label: "Your keys", names: take(opts.existing) },
    { label: "Common", names: take(opts.common) },
  ].filter((g) => g.names.length > 0);
}
