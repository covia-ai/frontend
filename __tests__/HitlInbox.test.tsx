import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('@/hooks/use-hitl', () => ({ useHitlRequests: jest.fn() }));
jest.mock('@/hooks/use-authenticated-venue', () => ({
  useAuthenticatedVenue: () => ({ venueId: 'did:key:zVENUE', baseUrl: 'http://venue.test' }),
}));
// Stands in for the current venue's stored credentials; the DID is what marks
// a request as raised by the signed-in user themselves.
jest.mock('@/hooks/use-auth', () => ({
  useAuthStore: () => ({ type: 'keypair', privateKeyHex: 'x', did: 'did:key:zSELF' }),
}));
// Mocked wholesale so the component test never pulls in the SDK.
// missingRequiredAnswers has its own unit tests in hitl.test.ts.
jest.mock('@/lib/hitl', () => ({
  respondToHitl: jest.fn(() => Promise.resolve({ status: 'answered' })),
  missingRequiredAnswers: jest.fn(() => []),
}));

import { HitlInbox } from '@/components/HitlInbox';
import { useHitlRequests } from '@/hooks/use-hitl';
import { respondToHitl } from '@/lib/hitl';

const mockUseHitlRequests = useHitlRequests as jest.MockedFunction<typeof useHitlRequests>;
const mockRespond = respondToHitl as jest.MockedFunction<typeof respondToHitl>;

const req = (over: Record<string, unknown> = {}) => ({
  id: 'r1', title: 'Approve something', status: 'open', asks: [], ...over,
}) as any;

const approvalAsk = { id: 'approve', type: 'approval', prompt: 'Allow this write?', required: true };

const withRequests = (requests: unknown[]) =>
  mockUseHitlRequests.mockReturnValue({
    requests: requests as any, loading: false, error: null, refresh: jest.fn(),
  } as any);

beforeEach(() => mockRespond.mockClear());

describe('requester attribution', () => {
  it('credits the agent and links to it', () => {
    withRequests([req({ agent: 'guarded-writer', from: 'did:key:zOWNER' })]);
    render(<HitlInbox />);
    expect(screen.getByTestId('hitl-view-agent'))
      .toHaveAttribute('href', '/agents/explorer?agentId=guarded-writer');
  });

  it('encodes an agent id that is not URL-safe', () => {
    withRequests([req({ agent: 'team/writer bot' })]);
    render(<HitlInbox />);
    expect(screen.getByTestId('hitl-view-agent'))
      .toHaveAttribute('href', '/agents/explorer?agentId=team%2Fwriter%20bot');
  });

  it('shows no agent link for a person-raised request', () => {
    withRequests([req({ from: 'did:key:zSOMEONE' })]);
    render(<HitlInbox />);
    expect(screen.queryByTestId('hitl-view-agent')).not.toBeInTheDocument();
  });
});

describe('one-click resolution', () => {
  it('answers a lone approval straight from the card, without expanding', async () => {
    withRequests([req({ asks: [approvalAsk] })]);
    render(<HitlInbox />);

    // No form to open — the decision is on the card.
    expect(screen.queryByTestId('hitl-respond-toggle')).not.toBeInTheDocument();
    const [approve] = screen.getAllByTestId('hitl-quick-answer');
    await userEvent.click(approve);

    expect(mockRespond).toHaveBeenCalledWith(expect.anything(), {
      id: 'r1', outcome: 'answer', answers: { approve: true },
    });
  });

  it('sends approve:false for Decline rather than rejecting', async () => {
    withRequests([req({ asks: [approvalAsk] })]);
    render(<HitlInbox />);

    const decline = screen.getAllByTestId('hitl-quick-answer')[1];
    await userEvent.click(decline);

    // Declining answers the question; rejecting refuses the request outright,
    // which fails the requester's job instead of completing it.
    expect(mockRespond).toHaveBeenCalledWith(expect.anything(), {
      id: 'r1', outcome: 'answer', answers: { approve: false },
    });
  });

  it('resolves a lone choice in one click, one button per option', async () => {
    withRequests([req({ asks: [{
      id: 'window', type: 'choice', prompt: 'When?', required: true,
      options: [{ id: 'now', label: 'Now' }, { id: 'later', label: 'Later' }],
    }] })]);
    render(<HitlInbox />);

    const buttons = screen.getAllByTestId('hitl-quick-answer');
    expect(buttons).toHaveLength(2);
    await userEvent.click(buttons[1]);

    expect(mockRespond).toHaveBeenCalledWith(expect.anything(), {
      id: 'r1', outcome: 'answer', answers: { window: 'later' },
    });
  });

  it('rejects without answers', async () => {
    withRequests([req({ asks: [approvalAsk] })]);
    render(<HitlInbox />);

    await userEvent.click(screen.getByTestId('hitl-reject'));
    expect(mockRespond).toHaveBeenCalledWith(expect.anything(), { id: 'r1', outcome: 'reject' });
  });
});

describe('inline form', () => {
  const multi = req({
    asks: [
      approvalAsk,
      { id: 'notes', type: 'text', prompt: 'Notes?' },
    ],
  });

  it('needs a form for multi-ask requests and expands in place', async () => {
    withRequests([multi]);
    render(<HitlInbox />);

    expect(screen.queryByTestId('hitl-quick-answer')).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId('hitl-respond-toggle'));

    // Still one card — expanded inline, not swapped for a dialog.
    expect(screen.getByTestId('hitl-request')).toBeInTheDocument();
    expect(screen.getByTestId('hitl-submit')).toBeInTheDocument();
  });

  it('submits the collected answers', async () => {
    withRequests([multi]);
    render(<HitlInbox />);

    await userEvent.click(screen.getByTestId('hitl-respond-toggle'));
    await userEvent.click(screen.getAllByTestId('hitl-ask-option')[0]); // approval → Yes
    await userEvent.click(screen.getByTestId('hitl-submit'));

    expect(mockRespond).toHaveBeenCalledWith(expect.anything(), {
      id: 'r1', outcome: 'answer', answers: { approve: true },
    });
  });

  it('never fast-paths a request offering capability grants', () => {
    withRequests([req({
      asks: [{ ...approvalAsk, grants: [{ with: 'w/', can: 'write' }] }],
    })]);
    render(<HitlInbox />);

    // Grants must be read before answering, so this gets the form.
    expect(screen.queryByTestId('hitl-quick-answer')).not.toBeInTheDocument();
    expect(screen.getByTestId('hitl-respond-toggle')).toBeInTheDocument();
  });
});
