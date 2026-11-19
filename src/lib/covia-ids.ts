/**
 * Covia asset, job, task and session IDs may be bare hex or 0x-prefixed (venue
 * 0.12). Keep one comparison/selection form across SDK and wire responses.
 * Opaque IDs, including external A2A identifiers, must retain their spelling.
 */
export function normalizeCoviaId(id: string): string {
  return /^(?:0x)?[0-9a-f]+$/i.test(id)
    ? id.replace(/^0x/i, "").toLowerCase()
    : id;
}

export function sameCoviaId(left: string | null | undefined, right: string | null | undefined): boolean {
  return left === right || (
    typeof left === "string" && typeof right === "string" &&
    normalizeCoviaId(left) === normalizeCoviaId(right)
  );
}
