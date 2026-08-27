import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('@/hooks/use-venues', () => ({ useVenues: () => ({ venues: [] }) }));

const respondToHitl = jest.fn((..._a: unknown[]) => Promise.resolve({ status: 'answered' }));
const signAccessToken = jest.fn((..._a: unknown[]) => 'signed.jwt.token');
jest.mock('@/lib/hitl', () => {
  const actual = jest.requireActual('@/lib/hitl');
  return { ...actual, respondToHitl: (...a: unknown[]) => respondToHitl(...a), signAccessToken: (...a: unknown[]) => signAccessToken(...a) };
});

import { HitlGrantAsk } from '@/components/HitlGrantAsk';
import type { HitlAsk, HitlRequest } from '@/lib/hitl';

const venue = {} as any;
const baseReq = (ask: HitlAsk): HitlRequest => ({
  id: 'r1', title: 'req', status: 'open', from: 'did:key:zAGENT', asks: [ask],
});

beforeEach(() => { respondToHitl.mockClear(); signAccessToken.mockClear(); });

describe('HitlGrantAsk — token (COG-19)', () => {
  const tokenAsk: HitlAsk = {
    id: 't', type: 'token', prompt: 'Grant access',
    token: { caps: [{ with: 'w/reports/', can: 'crud/read' }], exp: 3600 },
  };

  it('signs with the device key and returns the JWT as the answer', async () => {
    render(<HitlGrantAsk request={baseReq(tokenAsk)} ask={tokenAsk} kind="token"
      venue={venue} signingKeyHex="deadbeef" onDone={jest.fn()} onCancel={jest.fn()} />);

    await userEvent.click(screen.getByTestId('hitl-grant-confirm'));

    expect(signAccessToken).toHaveBeenCalledWith(expect.objectContaining({
      privateKeyHex: 'deadbeef',
      audience: 'did:key:zAGENT',        // defaults to the request's from
      caps: [{ with: 'w/reports/', can: 'crud/read' }],
    }));
    expect(respondToHitl).toHaveBeenCalledWith(venue, {
      id: 'r1', outcome: 'answer', answers: { t: 'signed.jwt.token' },
    });
  });

  it('disables signing without a device key', () => {
    render(<HitlGrantAsk request={baseReq(tokenAsk)} ask={tokenAsk} kind="token"
      venue={venue} signingKeyHex={null} onDone={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.getByTestId('hitl-grant-confirm')).toBeDisabled();
    expect(screen.getByText(/device-key/i)).toBeInTheDocument();
  });

  it('lets the user edit caps up and down before signing', async () => {
    render(<HitlGrantAsk request={baseReq(tokenAsk)} ask={tokenAsk} kind="token"
      venue={venue} signingKeyHex="deadbeef" onDone={jest.fn()} onCancel={jest.fn()} />);

    // Add a second capability, then sign.
    await userEvent.click(screen.getByTestId('capability-add'));
    const withInputs = screen.getAllByPlaceholderText('w/reports/');
    const canInputs = screen.getAllByPlaceholderText('crud/read');
    await userEvent.type(withInputs[1], 'w/notes/');
    await userEvent.type(canInputs[1], 'crud/write');
    await userEvent.click(screen.getByTestId('hitl-grant-confirm'));

    expect(signAccessToken).toHaveBeenCalledWith(expect.objectContaining({
      caps: [
        { with: 'w/reports/', can: 'crud/read' },
        { with: 'w/notes/', can: 'crud/write' },
      ],
    }));
  });
});

describe('HitlGrantAsk — grant (COG-17)', () => {
  const grantAsk: HitlAsk = {
    id: 'g', type: 'approval', prompt: 'Grant?',
    grants: [
      { with: 'w/a', can: 'crud/read' },
      { with: 'w/b', can: 'crud/write' },
    ],
  };

  it('echoes the selected grants for the venue to mint — no client signing', async () => {
    render(<HitlGrantAsk request={baseReq(grantAsk)} ask={grantAsk} kind="grant"
      venue={venue} signingKeyHex={null} onDone={jest.fn()} onCancel={jest.fn()} />);

    // Deselect the second offered capability, then approve.
    const checkboxes = screen.getAllByRole('checkbox');
    await userEvent.click(checkboxes[1]);
    await userEvent.click(screen.getByTestId('hitl-grant-confirm'));

    expect(signAccessToken).not.toHaveBeenCalled();
    expect(respondToHitl).toHaveBeenCalledWith(venue, {
      id: 'r1', outcome: 'answer', answers: { g: true }, grants: [{ with: 'w/a', can: 'crud/read' }],
    });
  });

  it('approves & grants even without a device key (the venue signs)', () => {
    render(<HitlGrantAsk request={baseReq(grantAsk)} ask={grantAsk} kind="grant"
      venue={venue} signingKeyHex={null} onDone={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.getByTestId('hitl-grant-confirm')).toBeEnabled();
  });
});
