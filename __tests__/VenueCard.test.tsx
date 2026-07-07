
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Venue } from '@covia/covia-sdk';
import { VenueCard } from '@/components/VenueCard';

// Mock dependencies
jest.mock('@/hooks/use-venues', () => ({
  useVenues: () => ({
    removeVenue: jest.fn(),
  }),
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('@/components/RemoveVenueModal', () => ({
  RemoveVenueModal: ({ venueId }: any) => (
    <button data-testid="remove-venue-btn">Remove Venue</button>
  ),
}));

const mockVenue = new Venue({
                           baseUrl: "https://venue-test.covia.ai",
                            venueId:"did:web:venue-test.covia.ai", name:"TestVenue"})

describe('AssetCard with asset', () => {
    it('should render asset card with name and description', () => {
      render(<VenueCard venue={mockVenue} compact={false} />);
      expect(screen.getByTestId('venue-name')).toHaveTextContent('TestVenue');
      expect(screen.getByTestId('venue-desc')).toHaveTextContent(
        'A Covia venue for managing assets and operations'
      );
    });

    it('should show Remove Venue button', () => {
      render(<VenueCard venue={mockVenue} compact={false} />);
      const removeBtn = screen.getByTestId('remove-venue-btn');
      expect(removeBtn).toBeInTheDocument();
    });

    it('should show Remove Venue text on button', () => {
      render(<VenueCard venue={mockVenue} compact={false} />);
      const removeBtn = screen.getByTestId('remove-venue-btn');
      expect(removeBtn).toHaveTextContent('Remove Venue');
    });

    it('should render venue URL in badge', () => {
      render(<VenueCard venue={mockVenue} compact={false} />);
      expect(screen.getByText('https://venue-test.covia.ai')).toBeInTheDocument();
    });

    it('should render compact variant', () => {
      render(<VenueCard venue={mockVenue} compact={true} />);
      expect(screen.getByTestId('venue-name')).toHaveTextContent('TestVenue');
    });

});
