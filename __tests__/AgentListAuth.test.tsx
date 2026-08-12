import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockList = jest.fn();
const mockLogout = jest.fn();
const mockPush = jest.fn();
let mockAccess: any = { state: 'rejected', detail: 'HTTP 403: User is not registered' };

const mockVenue = {
  venueId: 'did:web:venue.example',
  baseUrl: 'https://venue.example',
  agents: { list: mockList },
};

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/hooks/use-authenticated-venue', () => ({ useAuthenticatedVenue: () => mockVenue }));
jest.mock('@/hooks/use-auth', () => ({
  useCurrentAuth: () => ({ type: 'keypair', did: 'did:key:user', privateKeyHex: 'abc' }),
  useAuthStore: (selector: any) => selector({ logout: mockLogout }),
}));
jest.mock('@/hooks/use-venue-auth-health', () => ({
  useVenueAccessState: () => mockAccess,
  reportVenueAuthHealth: jest.fn(),
}));
jest.mock('@/components/admin-panel/TopBar', () => ({ TopBar: () => <div data-testid="top-bar" /> }));
jest.mock('@/components/AgentTemplates', () => ({ AgentTemplates: () => <div data-testid="templates" /> }));
jest.mock('@/components/AddNewAgent', () => ({ AddNewAgent: () => <button>Add agent</button> }));
jest.mock('@/components/PageHeading', () => ({ PageHeading: () => <div /> }));

import { AgentList } from '@/components/AgentList';

describe('AgentList authentication state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccess = { state: 'rejected', detail: 'HTTP 403: User is not registered' };
    mockList.mockResolvedValue({ agents: [] });
  });

  it('does not request agents and presents recovery when the account is rejected', () => {
    render(<AgentList />);
    expect(screen.getByTestId('agent-auth-rejected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /manage accounts/i })).toBeInTheDocument();
    expect(mockList).not.toHaveBeenCalled();
  });

  it('loads agents once account access is accepted', async () => {
    mockAccess = { state: 'accepted' };
    render(<AgentList />);
    await waitFor(() => expect(mockList).toHaveBeenCalledWith(true));
  });
});
