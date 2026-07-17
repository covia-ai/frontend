
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AssetCard } from '@/components/AssetCard';
import { useIsAuthenticated } from '@/hooks/use-auth';
import { Asset, DataAsset, Operation, Venue } from '@covia/covia-sdk';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('@/hooks/use-venue', () => ({
  useVenue: Object.assign(() => null, {
    getState: () => ({
      currentVenue: {
        baseUrl: 'https://venue-test.covia.ai',
        venueId: 'did:web:venue-test.covia.ai',
        metadata: { name: 'TestVenue' },
      },
      getCurrentVenue: () => ({
        baseUrl: 'https://venue-test.covia.ai',
        venueId: 'did:web:venue-test.covia.ai',
        metadata: { name: 'TestVenue' },
      }),
    }),
    subscribe: () => () => {},
  }),
}));
jest.mock('zustand', () => {
  const actualZustand = jest.requireActual('zustand');
  return {
    ...actualZustand,
    useStore: (store: any, selector: any) => {
      const state = store.getState();
      return selector(state);
    },
  };
});
jest.mock('@/hooks/use-authenticated-venue', () => ({
  useAuthenticatedVenue: () => null,
}));
jest.mock('@/hooks/use-auth', () => ({
  useIsAuthenticated: jest.fn(() => true),
}));
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
	"keywords": ["random", "bytes", "crypto"],
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
    beforeEach(() => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
    });
    it('should render asset card with name and description', () => {
      render(<AssetCard asset={mockAsset} type="assets" compact={false} />);
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

      render(<AssetCard asset={assetWithoutName} type="assets" compact={false} />);

      expect(screen.getByTestId('asset-header')).toHaveTextContent('Unnamed Asset');
    });
    it('should render "No description available" when description is missing', () => {
      const assetWithoutDesc = {
        ...mockAsset,
        metadata: { name: 'Hamlet' },
      } as Asset;

      render(<AssetCard asset={assetWithoutDesc} type="assets" compact={false} />);

      expect(screen.getByTestId('asset-description')).toHaveTextContent(
        'No description available'
      );
    });
    it('should show Copy icon for assets type', () => {
      render(<AssetCard asset={mockAsset} type="assets" compact={false} />);

      const copyBtn = screen.getByTestId('copy_btn');
      expect(copyBtn).toBeInTheDocument();
    });
    it('should not show Copy icon for operations type', () => {
      render(<AssetCard asset={mockAsset} type="operations" compact={false} />);

      const copyBtn = screen.queryByTestId('copy_btn');
      expect(copyBtn).not.toBeInTheDocument();
    });
    it('should show AssetInfoSheet for operations type', () => {
      render(<AssetCard asset={mockOperation} type="operations" compact={false} />);

      const assetInfoSheet = screen.getByTestId('asset-info-sheet');
      expect(assetInfoSheet).toBeInTheDocument();
    });
    it('should not show AssetInfoSheet for assets type', () => {
      render(<AssetCard asset={mockAsset} type="assets" compact={false} />);

      const assetInfoSheet = screen.queryByTestId('asset-info-sheet');
      expect(assetInfoSheet).not.toBeInTheDocument();
    });
    it('should render all keywords when not compact', () => {
      render(<AssetCard asset={mockAsset} type="assets" compact={false} />);

      const keywords = screen.getByTestId('asset-keywords');
      expect(keywords).toHaveTextContent('text');
      expect(keywords).toHaveTextContent('script');
      expect(keywords).toHaveTextContent('creative-work');
      expect(keywords).not.toHaveTextContent('+');
    });
    it('should truncate keywords with a "+N" badge when compact', () => {
      render(<AssetCard asset={mockAsset} type="assets" compact={true} />);

      const keywords = screen.getByTestId('asset-keywords');
      expect(keywords).toHaveTextContent('text');
      expect(keywords).toHaveTextContent('script');
      expect(keywords).not.toHaveTextContent('creative-work');
      expect(keywords).toHaveTextContent('+1');
    });
    it('should not render a keywords row when metadata.keywords is absent', () => {
      const assetWithoutKeywords = {
        ...mockAsset,
        metadata: { name: 'Hamlet', description: 'A play.' },
      } as Asset;

      render(<AssetCard asset={assetWithoutKeywords} type="assets" compact={false} />);

      expect(screen.queryByTestId('asset-keywords')).not.toBeInTheDocument();
    });

});

describe('AssetCard when unauthenticated', () => {
    beforeEach(() => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(false);
    });

    it('should show a locked icon instead of the Copy icon for assets type', () => {
      render(<AssetCard asset={mockAsset} type="assets" compact={false} />);

      expect(screen.queryByTestId('copy_btn')).not.toBeInTheDocument();
      expect(screen.getByTestId('copy_btn_locked')).toBeInTheDocument();
    });
});

describe('AssetCard with operation', () => {
    it('should render asset card with name and description', () => {
      render(<AssetCard asset={mockOperation} type="operations" compact={false} />);
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

      render(<AssetCard asset={assetWithoutName} type="operations" compact={false} />);

      expect(screen.getByTestId('asset-header')).toHaveTextContent('Unnamed Asset');
    });
    it('should render "No description available" when description is missing', () => {
      const mockOperationWithoutDesc = {
        ...mockOperation,
        metadata: { name: 'Random Data Generator' },
      } as Asset;

      render(<AssetCard asset={mockOperationWithoutDesc} type="operations" compact={false} />);

      expect(screen.getByTestId('asset-description')).toHaveTextContent(
        'No description available'
      );
    });
    it('should show AssetInfoSheet for operation type', () => {
      render(<AssetCard asset={mockOperation} type="operations" compact={false} />);

      const assetInfoSheet = screen.getByTestId('asset-info-sheet');
      expect(assetInfoSheet).toBeInTheDocument();
    });
    it('should show both the adapter badge and keyword badges', () => {
      render(<AssetCard asset={mockOperation} type="operations" compact={false} />);

      expect(screen.getByText('test')).toBeInTheDocument(); // adapter badge, unchanged
      const keywords = screen.getByTestId('asset-keywords');
      expect(keywords).toHaveTextContent('random');
      expect(keywords).toHaveTextContent('bytes');
      expect(keywords).toHaveTextContent('crypto');
    });
    it('should not render a keywords row when the operation has no keywords', () => {
      const opWithoutKeywords = {
        ...mockOperation,
        metadata: { name: 'Random Data Generator', operation: { adapter: 'test:random' } },
      } as Asset;

      render(<AssetCard asset={opWithoutKeywords} type="operations" compact={false} />);

      expect(screen.queryByTestId('asset-keywords')).not.toBeInTheDocument();
    });

});
