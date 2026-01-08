
import React from 'react';
import { render, screen, fireEvent, within, getByRole, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Asset, DataAsset, Operation, Venue } from '@covia-ai/covialib';
import { VenueCard } from '@/components/VenueCard';
import { RemoveVenueModal } from '@/components/RemoveVenueModal';

// Mock child components
jest.mock('@/components/Iconbutton', () => ({
  Iconbutton: ({ icon, message }: any) => (
    <button data-testid="icon-button">{message}</button>
  ),
}));
jest.mock('next/navigation');

describe('AddNewVenueModal', () => {
    it('should have title', () => {
      render(<RemoveVenueModal venueId='did:web:venue-test.covia.ai' />);
      expect(screen.getByTestId('add-title')).toHaveTextContent('Connect to a venue');
      expect(screen.getByTestId('venue-urlid')).toBeInTheDocument();
      expect(screen.getByTestId('venue-addbtn')).toBeInTheDocument();
    });

    it('should show have connect button', () => {
        render(<RemoveVenueModal venueId='did:web:venue-test.covia.ai' />);
        const connectBtn = screen.getByRole('button', { name: /connect/i });

        expect(connectBtn).not.toBeNull();
    });
   

});