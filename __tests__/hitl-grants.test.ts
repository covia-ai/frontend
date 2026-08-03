import {
  grantAskOf, offeredGrantsOf, signAccessToken, tokenSpecOf,
  type HitlAsk,
} from '@/lib/hitl';

const tokenAsk: HitlAsk = {
  id: 't', type: 'token', prompt: 'Grant access',
  token: { caps: [{ with: 'w/reports/', can: 'crud/read' }], exp: 3600, audience: 'did:key:zAUD', venue: 'did:key:zVENUE' },
};

const grantAsk: HitlAsk = {
  id: 'g', type: 'approval', prompt: 'Grant?',
  grants: [{ with: 'w/x', can: 'crud/read', exp: 1795000000 }],
};

describe('tokenSpecOf / offeredGrantsOf', () => {
  it('reads a token spec from a token ask', () => {
    expect(tokenSpecOf(tokenAsk)?.caps).toEqual([{ with: 'w/reports/', can: 'crud/read' }]);
  });
  it('rejects a token ask with no caps', () => {
    expect(tokenSpecOf({ id: 't', type: 'token', prompt: 'x', token: { caps: [] } })).toBeNull();
    expect(tokenSpecOf({ id: 't', type: 'token', prompt: 'x' })).toBeNull();
  });
  it('is not a token ask when the type is wrong', () => {
    expect(tokenSpecOf({ ...tokenAsk, type: 'approval' })).toBeNull();
  });
  it('reads offered grants from an approval ask', () => {
    expect(offeredGrantsOf(grantAsk)).toHaveLength(1);
    expect(offeredGrantsOf({ id: 'a', type: 'approval', prompt: 'x' })).toEqual([]);
  });
});

describe('grantAskOf', () => {
  it('classifies a token request', () => {
    expect(grantAskOf({ asks: [tokenAsk] })).toEqual({ ask: tokenAsk, kind: 'token' });
  });
  it('classifies a grant request', () => {
    expect(grantAskOf({ asks: [grantAsk] })).toEqual({ ask: grantAsk, kind: 'grant' });
  });
  it('is null for a plain request', () => {
    expect(grantAskOf({ asks: [{ id: 'a', type: 'approval', prompt: 'ok?' }] })).toBeNull();
  });
  it('returns the first grant surface in declared order', () => {
    expect(grantAskOf({ asks: [grantAsk, tokenAsk] })?.kind).toBe('grant');
    expect(grantAskOf({ asks: [tokenAsk, grantAsk] })?.kind).toBe('token');
  });
});

describe('signAccessToken', () => {
  const KEY = '97a6a86402aaf2b52c24240389e870a6ad866ee208ba6652ce2ac6c71437a68e';
  const OWNER = 'did:key:z6MkhK66YbPRiRuQAmM6KsZh7a7jWbkzp2HnkV2QyrPdTkBR';

  it('signs a self-sovereign UCAN rooted in the user, bound to the audience', () => {
    const jwt = signAccessToken({
      privateKeyHex: KEY,
      audience: 'did:key:zAGENT',
      caps: [{ with: 'w/reports/', can: 'crud/read' }],
      lifetimeSeconds: 3600,
    });
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString());
    // iss = the user (self-sovereign root), aud = the requester, att = the caps.
    expect(payload.iss).toBe(OWNER);
    expect(payload.aud).toBe('did:key:zAGENT');
    expect(payload.att).toEqual([{ with: 'w/reports/', can: 'crud/read' }]);
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('carries only with/can into att, dropping any stray fields', () => {
    const jwt = signAccessToken({
      privateKeyHex: KEY, audience: 'did:key:zA',
      caps: [{ with: 'w/a', can: 'crud/read', exp: 123 } as any],
      lifetimeSeconds: 60,
    });
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString());
    expect(payload.att).toEqual([{ with: 'w/a', can: 'crud/read' }]);
  });
});
