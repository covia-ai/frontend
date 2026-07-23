import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('@/hooks/use-hitl', () => ({ useHitlRequests: jest.fn() }));
jest.mock('@/hooks/use-authenticated-venue', () => ({ useAuthenticatedVenue: () => null }));
// Stands in for the current venue's stored credentials; the DID is what marks
// a request as raised by the signed-in user themselves.
jest.mock('@/hooks/use-auth', () => ({
  useAuthStore: () => ({ type: 'keypair', privateKeyHex: 'x', did: 'did:key:zSELF' }),
}));

import { HitlInbox } from '@/components/HitlInbox';
import { useHitlRequests } from '@/hooks/use-hitl';

const mockUseHitlRequests = useHitlRequests as jest.MockedFunction<typeof useHitlRequests>;

const req = (over: Record<string, unknown> = {}) => ({
  id: 'r1', title: 'Approve something', status: 'open', asks: [], ...over,
}) as any;

const withRequests = (requests: unknown[]) =>
  mockUseHitlRequests.mockReturnValue({
    requests: requests as any, loading: false, error: null, refresh: jest.fn(),
  } as any);

describe('HitlInbox requester attribution', () => {
  it('credits the agent and links to it when one raised the request', () => {
    withRequests([req({ id: 'a1', agent: 'guarded-writer', from: 'did:key:zOWNER' })]);
    render(<HitlInbox />);

    const link = screen.getByTestId('hitl-view-agent');
    expect(link).toHaveAttribute('href', '/agents/explorer?agentId=guarded-writer');
  });

  it('encodes an agent id that is not URL-safe', () => {
    withRequests([req({ id: 'a2', agent: 'team/writer bot' })]);
    render(<HitlInbox />);

    expect(screen.getByTestId('hitl-view-agent'))
      .toHaveAttribute('href', '/agents/explorer?agentId=team%2Fwriter%20bot');
  });

  it('shows no agent link for a request raised by a person', () => {
    withRequests([req({ id: 'p1', from: 'did:key:zSOMEONE' })]);
    render(<HitlInbox />);

    expect(screen.getByTestId('hitl-request')).toBeInTheDocument();
    expect(screen.queryByTestId('hitl-view-agent')).not.toBeInTheDocument();
  });

  it('renders one card per request, linking only the agent-raised one', () => {
    withRequests([
      req({ id: 'a3', agent: 'guarded-writer' }),
      req({ id: 'p2', from: 'did:key:zSELF' }),
    ]);
    render(<HitlInbox />);

    expect(screen.getAllByTestId('hitl-request')).toHaveLength(2);
    expect(screen.getAllByTestId('hitl-view-agent')).toHaveLength(1);
  });
});
