import { identityTokenFor } from "@/lib/identity-token";
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
