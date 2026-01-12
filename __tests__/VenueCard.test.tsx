
import React from 'react';
import { render, screen, fireEvent, within, getByRole, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AssetCard } from '@/components/AssetCard';
import { Asset, DataAsset, Operation, Venue } from '@covia-ai/covialib';
import { VenueCard } from '@/components/VenueCard';

// Mock child components
jest.mock('@/components/Iconbutton', () => ({
  Iconbutton: ({ icon, message }: any) => (
    <button data-testid="icon-button">{message}</button>
  ),
}));
jest.mock('next/navigation');
jest.mock('@/components/RemoveVenueModal', () => ({
  AssetInfoSheet: () => <div data-testid="remove-venue">Remove Venue</div>,
}));



const mockVenue = new Venue({
                           baseUrl: "https://venue-test.covia.ai", 
                            venueId:"did:web:venue-test.covia.ai", name:"TestVenue"})

describe('AssetCard with asset', () => {
    it('should render asset card with name and description', () => {
      render(<VenueCard venue={mockVenue} />);
      expect(screen.getByTestId('venue-name')).toHaveTextContent('TestVenue');
      expect(screen.getByTestId('venue-desc')).toHaveTextContent(
        'AA Covia venue for managing assets and operations.'
      );
    });
    
   
    it('should show Cancel Asset button', () => {
         render(<VenueCard venue={mockVenue} />);

      // Look for the Iconbutton with CopyIcon
      const iconButtons = screen.getAllByTestId('icon-button');
      expect(iconButtons.length).toBeGreaterThan(0);
    });
   
    it('should show tooltip on hover for Cancel button', async () => {
      render(<VenueCard venue={mockVenue} />);

      const iconButtons = screen.getAllByRole('button')
      fireEvent.mouseOver(iconButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Disconnect Venue')).toBeInTheDocument();
      });
    });
     it('should show dialog on click for Copy Asset button', async () => {
      render(<VenueCard venue={mockVenue} />);

      const iconButtons = screen.getAllByRole('button')
      fireEvent.click(iconButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Remove Venue')).toBeInTheDocument();
      });
    });
     it('should show dialog on hover for View Asset button', async () => {
       render(<VenueCard venue={mockVenue} />);

      const iconButtons = screen.getAllByRole('button')
      fireEvent.click(iconButtons[1]);

      await waitFor(() => {
        expect(screen.getByText('View Asset')).toBeInTheDocument();
      });
    });
   

});