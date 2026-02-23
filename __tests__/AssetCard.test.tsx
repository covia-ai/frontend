
import React from 'react';
import { render, screen, fireEvent, within, getByRole, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AssetCard } from '@/components/AssetCard';
import { Asset, DataAsset, Operation, Venue } from '@covia/covia-sdk';

// Mock child components
jest.mock('@/components/Iconbutton', () => ({
  Iconbutton: ({ icon, message }: any) => (
    <button data-testid="icon-button">{message}</button>
  ),
}));
jest.mock('next/navigation');
jest.mock('@/components/AssetInfoSheet', () => ({
  AssetInfoSheet: () => <div data-testid="asset-info-sheet">Asset Info Sheet</div>,
}));
jest.mock('json-edit-react', () => ({
  JsonEditor: ({ data, setData }: any) => (
    <div data-testid="json-editor">
      <button onClick={() => setData({ test: 'data' })}>Update JSON</button>
    </div>
  ),
}));
const mockMetadata = {
          "name": "Hamlet",
          "creator": "William Shakespeare",
          "description": "A play by a celebrated English playwright.",
          "dateCreated": "2025-06-05T06:53:59Z",
          "dateModified": "2025-06-05T06:53:59Z",
          "license": {
            "name": "Public Domain",
            "url": "https://creativecommons.org/licenses/by/4.0/"
          },
          "keywords": [
            "text",
            "script",
            "creative-work"
        ],
        "content": {
            "contentType": "text/csv",
            "sha256": "74f16013e2b7ce83d5f5c8d4b3c42f279242f6ddfa7bab0f31320301e60c81d6",
            "encoding": "UTF-8",
            "inLanguage": "en-GB"
        },
        "additionalInformation": {
            "notes": [
              "Uploaded by Mike Anderson for use as an example Covia Asset"
            ]
        }
    }
const mockVenue = new Venue({baseUrl: "https://venue-test.covia.ai", 
                                venueId:"did:web:venue-test.covia.ai", name:"TestVenue"})
const mockAsset = new DataAsset("test-asset", mockVenue, mockMetadata)

const mockOpData = {
	"name": "Random Data Generator",
	"description": "Generates a specified number of random bytes using a cryptographically secure random number generator",
	"dateCreated":"2025-06-09T07:22:59Z",
	"dateModified": "2025-06-09T07:22:59Z",
	"operation": {
		"adapter": "test:random",
		"input": {
			"type": "object",
			"properties": {
				"length": {
					"type": "string",
					"description": "Number of random bytes to generate (1-1024)"
				}
			},
			"required": ["length"]
		},
		"output": {
			"type": "object",
			"properties": {
				"bytes": {
					"type": "string",
					"description": "Hex-encoded random bytes"
				}
			}
		}
	}
}
const mockOperation = new Operation("test-op", mockVenue, mockOpData);

describe('AssetCard with asset', () => {
    it('should render asset card with name and description', () => {
      render(<AssetCard asset={mockAsset} type="assets" />);
      expect(screen.getByTestId('asset-header')).toHaveTextContent('Hamlet');
      expect(screen.getByTestId('asset-description')).toHaveTextContent(
        'A play by a celebrated English playwright.'
      );
    });
    it('should render "Unnamed Asset" when name is missing', () => {
      const assetWithoutName = {
        ...mockAsset,
        metadata: { description: 'A play by a celebrated English playwright.' },
      } as Asset;

      render(<AssetCard asset={assetWithoutName} type="assets" />);

      expect(screen.getByTestId('asset-header')).toHaveTextContent('Unnamed Asset');
    });
    it('should render "No description available" when description is missing', () => {
      const assetWithoutDesc = {
        ...mockAsset,
        metadata: { name: 'Hamlet' },
      } as Asset;

      render(<AssetCard asset={assetWithoutDesc} type="assets" />);

      expect(screen.getByTestId('asset-description')).toHaveTextContent(
        'No description available'
      );
    });
    it('should show Copy Asset button for assets type', () => {
      render(<AssetCard asset={mockAsset} type="assets" />);

      // Look for the Iconbutton with CopyIcon
      const iconButtons = screen.getAllByTestId('icon-button');
      expect(iconButtons.length).toBeGreaterThan(0);
    });
    it('should not show Copy Asset for operations type', () => {
      render(<AssetCard asset={mockAsset} type="operations" />);

      // Copy functionality should not be available for operations
      const iconButtons = screen.getAllByTestId('icon-button');
      // Should only have the "View Asset" button, not "Copy Asset"
      expect(iconButtons.length).toBe(1);
    });
    it('should show tooltip on hover for Copy Asset button', async () => {
      render(<AssetCard asset={mockAsset} type="assets" />);

      const iconButtons = screen.getAllByRole('button')
      fireEvent.mouseOver(iconButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Copy Asset')).toBeInTheDocument();
      });
    });
     it('should show dialog on click for Copy Asset button', async () => {
      render(<AssetCard asset={mockAsset} type="assets" />);

      const iconButtons = screen.getAllByRole('button')
      fireEvent.click(iconButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Copy Asset')).toBeInTheDocument();
      });
    });
     it('should show dialog on hover for View Asset button', async () => {
      render(<AssetCard asset={mockAsset} type="assets" />);

      const iconButtons = screen.getAllByRole('button')
      fireEvent.click(iconButtons[1]);

      await waitFor(() => {
        expect(screen.getByText('View Asset')).toBeInTheDocument();
      });
    });
   

});

describe('AssetCard with operation', () => {
    it('should render asset card with name and description', () => {
      render(<AssetCard asset={mockOperation} type="operations" />);
      expect(screen.getByTestId('asset-header')).toHaveTextContent('Random Data Generator');
      expect(screen.getByTestId('asset-description')).toHaveTextContent(
        'Generates a specified number of random bytes using a cryptographically secure random number generator'
      );
    });
    it('should render "Unnamed Asset" when name is missing', () => {
      const assetWithoutName = {
        ...mockOperation,
        metadata: { description: 'Generates a specified number of random bytes using a cryptographically secure random number generator.' },
      } as Asset;

      render(<AssetCard asset={assetWithoutName} type="operations" />);

      expect(screen.getByTestId('asset-header')).toHaveTextContent('Unnamed Asset');
    });
    it('should render "No description available" when description is missing', () => {
      const mockOperationWithoutDesc = {
        ...mockOperation,
        metadata: { name: 'Random Data Generator' },
      } as Asset;

      render(<AssetCard asset={mockOperationWithoutDesc} type="operations" />);

      expect(screen.getByTestId('asset-description')).toHaveTextContent(
        'No description available'
      );
    });
    it('should show Info  button for operation type', () => {
      render(<AssetCard asset={mockOperation} type="operations" />);

      // Look for the Iconbutton with CopyIcon
      const iconButtons = screen.getAllByTestId('icon-button');
      expect(iconButtons.length).toBeGreaterThan(0);
    });
    it('should show tooltip on hover for Info button', async () => {
      render(<AssetCard asset={mockOperation} type="operations" />);

      const assetInfoSheetBtn = screen.getByTestId('asset-info-sheet')
      expect(assetInfoSheetBtn).toBeInTheDocument();
     
    });
     it('should show sheet on click for Info button', async () => {
      render(<AssetCard asset={mockOperation} type="operations" />);

      const iconButtons = screen.getAllByRole('button')
      fireEvent.click(iconButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Random Data Generator')).toBeInTheDocument();
      });
    });
   
   

});
