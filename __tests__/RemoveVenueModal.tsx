
import React from 'react';
import { render, screen, fireEvent, within, getByRole, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Asset, DataAsset, Operation, Venue } from '@covia/covialib';
import { VenueCard } from '@/components/VenueCard';
import { RemoveVenueModal } from '@/components/RemoveVenueModal';

// Mock child components
jest.mock('@/components/Iconbutton', () => ({
  Iconbutton: ({ icon, message }: any) => (
    <button data-testid="icon-button">{message}</button>
  ),
}));
jest.mock('next/navigation');

describe('RemoveVenueModal', () => {
    it('should have title', () => {
      render(<RemoveVenueModal venueId='did:web:venue-test.covia.ai' />);
      expect(screen.getByTestId('remove-title')).toHaveTextContent('Are you sure you want to disconnect this venue?');
      expect(screen.getByTestId('remove-desc')).toHaveTextContent(
        ' This action cannot be undone.'
      );
    });
    it('should show have yes and no button', () => {
        render(<RemoveVenueModal venueId='did:web:venue-test.covia.ai' />);
        const yesBtn = screen.getByRole('button', { name: /yes/i });
        const noBtn = screen.getByRole('button', { name: /no/i });

        expect(yesBtn).not.toBeNull();
        expect(noBtn).not.toBeNull();
    });
   

});