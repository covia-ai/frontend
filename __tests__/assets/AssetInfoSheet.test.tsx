import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {AssetInfoSheet} from '@/components/AssetInfoSheet';
import { DataAsset, Venue } from '@covia/covia-sdk';
import userEvent from '@testing-library/user-event';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe('AssetInfoSheet Component with only inputs', () => {
  test('renders AssetInfoSheet ',  async () => {
    const mockMetadata = {
	"name": "Delay Operation",
	"description": "Runs another op after a delay",
	"dateCreated":"2025-06-09T07:22:59Z",
	"dateModified": "2025-06-09T07:22:59Z",
	"operation": {
		"adapter": "test:delay",
		"input": {
			"type":"object",
			"properties":{
				"operation":{
					"type":"asset",
					"description":"The operation to run after a delay."
				},
				"delay":{
					"type":"number",
					"description":"The number of milliseconds to delay calling the operation."
				},
				"input":{
					"type":"object",
					"description":"The input to the target operation."
				}
			}
		},
		"output": {
			"description":"The output of the delayed operation."
		}
	}
    };
    const mockVenue = new Venue({baseUrl: "https://venue-test.covia.ai", venueId:"did:web:venue-test.covia.ai", name:"TestVenue"})
    const mockAsset = new DataAsset("test-asset", mockVenue, mockMetadata)
    const user = userEvent.setup();
    render(<AssetInfoSheet asset={mockAsset} venueId={mockVenue.venueId}/>);

    const triggerButton = screen.getByTestId('info_btn');
    expect(triggerButton).toBeInTheDocument();
    await user.click(triggerButton);

    const infoTitle = screen.getByTestId('info_assetname');
    const infoInputs = screen.queryByTestId ('info_assetinputs');
    const infoOutputs = screen.queryByTestId ('info_assetoutputs');

    expect(infoTitle).toHaveTextContent(mockAsset.metadata.name || "");
    expect(infoInputs).toBeInTheDocument();
    expect(infoOutputs).not.toBeInTheDocument();


  });

});
describe('AssetInfoSheet Component with asset with no input /output', () => {
  test('renders AssetInfoSheet ',  async () => {
    const mockMetadata = {
    "name": "Fail Operation",
	"description": "Always fails, regardless of input",
	"dateCreated":"2025-06-09T07:22:59Z",
	"dateModified": "2025-06-09T07:22:59Z",
	"operation": {
		"toolName":"alwaysFail",
		"adapter": "test:error",
		"input": {},
		"output": {}
	}
    };
    const mockVenue = new Venue({baseUrl: "https://venue-test.covia.ai", venueId:"did:web:venue-test.covia.ai", name:"TestVenue"})
    const mockAsset = new DataAsset("test-asset", mockVenue, mockMetadata)
    const user = userEvent.setup();
    render(<AssetInfoSheet asset={mockAsset} venueId={mockVenue.venueId}/>);

    const triggerButton = screen.getByTestId('info_btn');
    expect(triggerButton).toBeInTheDocument();
    await user.click(triggerButton);

    const infoTitle = screen.getByTestId('info_assetname');
    const infoInputs = screen.queryByTestId ('info_assetinputs');
    const infoOutputs = screen.queryByTestId ('info_assetoutputs');

    expect(infoTitle).toHaveTextContent(mockAsset.metadata.name || "");
    expect(infoInputs).not.toBeInTheDocument();
    expect(infoOutputs).not.toBeInTheDocument();



  });

});
