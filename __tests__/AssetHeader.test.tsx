
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AssetHeader } from '@/components/AssetHeader';
import { DataAsset, Venue } from '@covia-ai/covialib';

describe('AssetHeader Component', () => {
  test('renders AssetHeader', () => {
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
    render( <AssetHeader asset={mockAsset}/>);
     expect(screen.getByTestId('assetH_name')).toBeInTheDocument();
     expect(screen.getByTestId('assetH_descr')).toBeInTheDocument();
     expect(screen.getByTestId('assetH_name')).toHaveTextContent('Delay Operation');
     expect(screen.getByTestId('assetH_descr')).toHaveTextContent('Runs another op after a delay');
  });


});