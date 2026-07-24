import { decodePublicKey } from "@covia/covia-sdk";

// Convex identicon — a mirrored colour grid derived from key bytes. Ported from
// convex.ts (packages/convex-client/src/identicon.ts) so covia's self-sovereign
// identities render with the same avatar Convex uses for accounts, without
// pulling in the whole convex-client package.
//
// The identicon grid resolution — a fixed constant, NOT a per-use option.
// Matches Convex's IdenticonBuilder.SIZE (7) so the same key renders the same
// identicon here and anywhere in the Convex ecosystem. Only the rendered pixel
// size varies; the grid must not, or one key would show two different patterns.
export const IDENTICON_GRID_SIZE = 7;

// Returns size*size 24-bit RGB ints (0xRRGGBB): the last 12 bytes pick four
// colours, the leading bytes lay out a bitmap mirrored across the vertical axis.
export function generateIdenticonGrid(input: Uint8Array, size = IDENTICON_GRID_SIZE): number[] {
  const data = input;
  const n = data.length;
  const total = size * size;
  const grid: number[] = new Array(total).fill(0);
  if (n === 0) return grid;

  const cols = new Array<number>(4);
  for (let i = 0; i < 4; i++) {
    const r = 0xff & data[(n - 12 + i * 3 + 0) % n];
    const g = 0xff & data[(n - 12 + i * 3 + 1) % n];
    const b = 0xff & data[(n - 12 + i * 3 + 2) % n];
    cols[i] = 0x800000 ^ ((r << 16) | (g << 8) | b);
  }

  const width = Math.floor((size + 1) / 2);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x <= width; x++) {
      const i = x + y * width;
      const byteIndex = Math.floor(i / 4);
      if (byteIndex >= n) break;
      const bits = 0x03 & (data[byteIndex] >> (2 * (3 - (i % 4))));
      const rgb = cols[bits] & 0xffffff;
      const left = y * size + x;
      const right = y * size + (size - x - 1);
      if (left < total) grid[left] = rgb;
      if (right < total) grid[right] = rgb;
    }
  }
  return grid;
}

/** Only did:key identities are self-sovereign keys we render an identicon for. */
export function isDidKey(did: string | null | undefined): did is string {
  return typeof did === "string" && did.startsWith("did:key:");
}

// The multikey is the token right after `did:key:`, before any path suffix —
// both an agent DID URL (`did:key:z…:g:agent`) and a namespace path
// (`did:key:z…/w/x`) resolve to the owner's key, hence the owner's identicon.
function multikeyOf(did: string): string {
  return did.replace(/^did:key:/, "").split(/[:/]/)[0];
}

/** Identicon grid for a did:key, or null for any other identity or a bad key. */
export function identiconGridForDid(did: string | null | undefined, size = IDENTICON_GRID_SIZE): number[] | null {
  if (!isDidKey(did)) return null;
  try {
    return generateIdenticonGrid(decodePublicKey(multikeyOf(did)), size);
  } catch {
    return null;
  }
}
