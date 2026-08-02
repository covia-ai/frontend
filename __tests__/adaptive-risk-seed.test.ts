import '@testing-library/jest-dom';
import {
  seedAdaptiveRisk,
  teardownAdaptiveRisk,
  verbatimVenueError,
} from '@/components/adaptive-risk/seed';
import {
  APPLICANTS,
  DEFAULT_ADDRESSES,
  agentConfigs,
  limitGateMetadata,
  policyCheckMetadata,
} from '@/components/adaptive-risk/fixtures';

// Stub venue in the style of job-free-reads.test.ts: only the surfaces the
// seeding library touches.
function stubVenue(overrides: {
  existingPaths?: Set<string>;
  existingAgents?: Set<string>;
  failWriteWith?: Error;
} = {}) {
  const existingPaths = overrides.existingPaths ?? new Set<string>();
  const existingAgents = overrides.existingAgents ?? new Set<string>();
  const writes: Array<{ path: string; value: unknown }> = [];
  const deletes: string[] = [];
  const created: string[] = [];
  const venue = {
    venueId: 'did:key:zTestVenue',
    baseUrl: 'http://venue.test',
    workspace: {
      read: jest.fn(async (path: string) => ({ exists: existingPaths.has(path) })),
      write: jest.fn(async (path: string, value: unknown) => {
        if (overrides.failWriteWith) throw overrides.failWriteWith;
        writes.push({ path, value });
        existingPaths.add(path);
        return {};
      }),
      delete: jest.fn(async (path: string) => {
        deletes.push(path);
        return {};
      }),
    },
    assets: {
      register: jest.fn(async () => ({ id: 'abc123policyhash' })),
      getMetadata: jest.fn(async (id: string) => {
        if (id === 'my-own-policy') return { name: 'mine' };
        throw new Error(`Asset not found: ${id}`);
      }),
    },
    agents: {
      info: jest.fn(async (id: string) => {
        if (existingAgents.has(id)) return { agentId: id, status: 'SLEEPING' };
        throw new Error('404');
      }),
      create: jest.fn(async (input: { agentId: string }) => {
        created.push(input.agentId);
        existingAgents.add(input.agentId);
        return { agentId: input.agentId, status: 'SLEEPING', created: true };
      }),
      delete: jest.fn(async () => ({})),
    },
  };
  return { venue: venue as never, writes, deletes, created };
}

describe('fixtures', () => {
  it('plants APP-1071 wrong twice: amount over authority and a shared device', () => {
    expect(APPLICANTS).toHaveLength(12);
    const planted = APPLICANTS.find((a) => a.id === 'APP-1071')!;
    const sibling = APPLICANTS.find((a) => a.id === 'APP-1063')!;
    expect(planted.requestedAmount).toBe(2500);
    expect(planted.device).toBe('dev-9903');
    expect(sibling.device).toBe('dev-9903');
    const otherDevices = APPLICANTS.filter((a) => a.device === 'dev-9903');
    expect(otherDevices).toHaveLength(2);
  });

  it('encodes the policy as the output schema of a content-addressed op', () => {
    const policy = policyCheckMetadata();
    const schema = policy.operation.output.properties.result;
    expect(schema.properties.amount.maximum).toBe(500);
    expect(schema.properties.deviceFlagged).toEqual({ const: false });
  });

  it('gate runs strict so the policy schema is actually enforced', () => {
    const gate = limitGateMetadata('somehash', DEFAULT_ADDRESSES);
    expect(gate.operation.strict).toBe(true);
    expect(gate.operation.steps[1].op).toBe('somehash');
  });

  it("gates the assessor's issue-limit grant and denies it to the others", () => {
    const agents = agentConfigs({ ...DEFAULT_ADDRESSES, policyAsset: 'somehash' });
    const assessorGrant = agents.assessor.config.caps.find(
      (cap) => cap.with === DEFAULT_ADDRESSES.issueLimit,
    );
    expect(assessorGrant).toMatchObject({
      can: 'invoke',
      nb: { gate: DEFAULT_ADDRESSES.limitGate },
    });
    for (const other of [agents.sentinel, agents.monitor]) {
      expect(
        other.config.caps.some((cap) => cap.with === DEFAULT_ADDRESSES.issueLimit),
      ).toBe(false);
    }
  });
});

describe('seedAdaptiveRisk', () => {
  it('creates everything on a fresh venue and reports each address', async () => {
    const { venue, created } = stubVenue();
    const outcome = await seedAdaptiveRisk(venue, DEFAULT_ADDRESSES);
    expect(outcome.ok).toBe(true);
    expect(outcome.policyRef).toBe('abc123policyhash');
    // policy + 2 ops + 12 applications + 2 windows + pointer + 3 agents
    expect(outcome.report.items).toHaveLength(21);
    expect(outcome.report.items.every((i) => i.status === 'created')).toBe(true);
    expect(created).toEqual(['rk-sentinel', 'rk-assessor', 'rk-monitor']);
  });

  it('is idempotent: a second run creates nothing', async () => {
    const { venue } = stubVenue();
    await seedAdaptiveRisk(venue, DEFAULT_ADDRESSES);
    const second = await seedAdaptiveRisk(
      venue,
      { ...DEFAULT_ADDRESSES, policyAsset: 'my-own-policy' },
    );
    expect(second.ok).toBe(true);
    expect(second.report.items.filter((i) => i.status === 'created')).toHaveLength(0);
  });

  it('uses a caller-supplied policy address instead of registering', async () => {
    const { venue } = stubVenue();
    const outcome = await seedAdaptiveRisk(venue, {
      ...DEFAULT_ADDRESSES,
      policyAsset: 'my-own-policy',
    });
    expect(outcome.policyRef).toBe('my-own-policy');
    const stub = venue as unknown as { assets: { register: jest.Mock } };
    expect(stub.assets.register).not.toHaveBeenCalled();
  });

  it("stops on refusal and reports the venue's error verbatim", async () => {
    const denial =
      'Capability denied: requires crud/write on did:key:zX/w/ops/risk/limit-gate. Your capabilities are: crud/read on w/';
    const { venue } = stubVenue({ failWriteWith: new Error(denial) });
    const outcome = await seedAdaptiveRisk(venue, DEFAULT_ADDRESSES);
    expect(outcome.ok).toBe(false);
    const failed = outcome.report.items.at(-1)!;
    expect(failed.status).toBe('failed');
    expect(failed.error).toBe(denial);
    // Nothing after the failed item ran.
    expect(outcome.report.items.filter((i) => i.kind === 'agent')).toHaveLength(0);
  });
});

describe('teardownAdaptiveRisk', () => {
  it('removes the subtree, both op addresses, and the agents', async () => {
    const { venue, deletes } = stubVenue({
      existingAgents: new Set(['rk-sentinel', 'rk-assessor', 'rk-monitor']),
    });
    const result = await teardownAdaptiveRisk(venue, DEFAULT_ADDRESSES);
    expect(result.ok).toBe(true);
    expect(deletes).toEqual(['w/risk', 'w/ops/risk/limit-gate', 'w/ops/risk/issue-limit']);
    const stub = venue as unknown as { agents: { delete: jest.Mock } };
    expect(stub.agents.delete).toHaveBeenCalledTimes(3);
  });
});

describe('verbatimVenueError', () => {
  it('prefers the job error string over the exception message', () => {
    const err = Object.assign(new Error('Job failed'), {
      jobData: { error: 'Capability denied by gate: gate w/ops/risk/limit-gate: ...' },
    });
    expect(verbatimVenueError(err)).toMatch(/^Capability denied by gate/);
  });

  it('falls back to the message, never rewriting it', () => {
    expect(verbatimVenueError(new Error('403 Forbidden from venue'))).toBe(
      '403 Forbidden from venue',
    );
  });
});
