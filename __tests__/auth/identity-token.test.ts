import { identityTokenFor, decodeJwtClaims } from "@/lib/identity-token";
import { generateKeyPair, privateKeyToHex } from "@covia/covia-sdk";

const decodeClaims = (token: string) =>
  JSON.parse(
    Buffer.from(
      token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString(),
  );

describe("identityTokenFor", () => {
  it("mints an aud-bound JWT with the requested lifetime for device keys", () => {
    const { privateKey } = generateKeyPair();
    const token = identityTokenFor(
      { type: "keypair", privateKeyHex: privateKeyToHex(privateKey), did: "did:key:zMe" },
      "did:key:zVenue",
      3_600,
    );

    expect(token.split(".")).toHaveLength(3);
    const claims = decodeClaims(token);
    expect(claims.aud).toBe("did:key:zVenue");
    expect(claims.exp - claims.iat).toBe(3_600);
    expect(claims.sub).toMatch(/^did:key:z6Mk/);
    expect(claims.sub).toBe(claims.iss);
  });

  it("defaults device-key tokens to a 5 minute lifetime", () => {
    const { privateKey } = generateKeyPair();
    const token = identityTokenFor(
      { type: "keypair", privateKeyHex: privateKeyToHex(privateKey), did: "did:key:zMe" },
      "did:key:zVenue",
    );
    const claims = decodeClaims(token);
    expect(claims.exp - claims.iat).toBe(300);
  });

  it("returns the stored bearer token unchanged for OAuth accounts", () => {
    expect(
      identityTokenFor(
        { type: "bearer", token: "oauth-token-1", did: "did:a1" },
        "did:key:zVenue",
      ),
    ).toBe("oauth-token-1");
  });
});


describe('decodeJwtClaims', () => {
  function tokenWith(claims: Record<string, unknown>): string {
    const b64 = Buffer.from(JSON.stringify(claims), 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    return `header.${b64}.signature`;
  }

  it('reads the claims the venue puts in an OAuth token', () => {
    expect(
      decodeJwtClaims(tokenWith({ sub: 'did:web:venue:alice', email: 'alice@corp.com' })),
    ).toMatchObject({ sub: 'did:web:venue:alice', email: 'alice@corp.com' });
  });

  it('decodes non-ASCII claims as UTF-8', () => {
    // atob yields latin1, so a name or internationalised address would come
    // back mojibake without an explicit UTF-8 decode.
    expect(decodeJwtClaims(tokenWith({ name: 'Zoë Müller' }))?.name).toBe('Zoë Müller');
  });

  it('handles base64url payloads whose padding was stripped', () => {
    // Pick claim lengths that land on each remainder mod 4.
    for (const pad of ['a', 'ab', 'abc', 'abcd']) {
      expect(decodeJwtClaims(tokenWith({ p: pad }))?.p).toBe(pad);
    }
  });

  it.each([
    ['a token with no payload segment', 'header'],
    ['an empty string', ''],
    ['a payload that is not base64', 'header.!!!.signature'],
    ['a payload that is not JSON', `header.${Buffer.from('nope').toString('base64url')}.sig`],
    ['a payload that is a JSON array', `header.${Buffer.from('[1,2]').toString('base64url')}.sig`],
  ])('returns null for %s rather than throwing', (_label, token) => {
    expect(decodeJwtClaims(token)).toBeNull();
  });
});
