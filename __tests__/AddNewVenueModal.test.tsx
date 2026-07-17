
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { AddNewVenueModal } from '@/components/AddNewVenueModal';

// Mock dependencies
jest.mock('@/hooks/use-venues', () => ({
  useVenues: () => ({
    addVenue: jest.fn(),
    venues: [],
  }),
}));
jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { email: 'test@test.com' } } }),
}));
jest.mock('sonner', () => ({
  toast: jest.fn(),
}));
jest.mock('@/components/IconButton', () => ({
  IconButton: ({ icon, message, label }: any) => (
    <button data-testid="icon-button">{label || message}</button>
  ),
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
  gtmEvent: { buttonClick: jest.fn() },
}));

describe('AddNewVenueModal', () => {
    it('should have title', async () => {
      const user = userEvent.setup();
      render(<AddNewVenueModal />);
      // Click the trigger to open the dialog
      const triggerBtn = screen.getByTestId('icon-button');
      await user.click(triggerBtn);

      await waitFor(() => {
        expect(screen.getByTestId('add-title')).toHaveTextContent('Connect to a venue');
        expect(screen.getByTestId('venue-urlid')).toBeInTheDocument();
        expect(screen.getByTestId('venue-addbtn')).toBeInTheDocument();
      });
    });

    it('should have connect button', async () => {
        const user = userEvent.setup();
        render(<AddNewVenueModal />);
        const triggerBtn = screen.getByTestId('icon-button');
        await user.click(triggerBtn);

        await waitFor(() => {
          const connectBtn = screen.getByTestId('venue-addbtn');
          expect(connectBtn).toHaveTextContent('Connect');
        });
    });


});
