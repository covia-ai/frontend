
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { RemoveVenueModal } from '@/components/RemoveVenueModal';

// Mock use-venues to avoid top-level await in the module
jest.mock('@/hooks/use-venues', () => ({
  useVenues: () => ({
    removeVenue: jest.fn(),
  }),
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe('RemoveVenueModal', () => {
    it('should have title', async () => {
      const user = userEvent.setup();
      render(<RemoveVenueModal venueId='did:web:venue-test.covia.ai' />);

      // Click the trigger to open the alert dialog
      const trigger = screen.getByTestId('remove_btn');
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByTestId('remove-title')).toHaveTextContent('Are you sure you want to disconnect this venue?');
        expect(screen.getByTestId('remove-desc')).toHaveTextContent(
          'This action cannot be undone.'
        );
      });
    });
    it('should have yes and no button', async () => {
        const user = userEvent.setup();
        render(<RemoveVenueModal venueId='did:web:venue-test.covia.ai' />);

        const trigger = screen.getByTestId('remove_btn');
        await user.click(trigger);

        await waitFor(() => {
          const yesBtn = screen.getByRole('button', { name: /yes/i });
          const noBtn = screen.getByRole('button', { name: /no/i });
          expect(yesBtn).toBeInTheDocument();
          expect(noBtn).toBeInTheDocument();
        });
    });


});
