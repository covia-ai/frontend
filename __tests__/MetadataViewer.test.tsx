import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import {MetadataViewer} from '@/components/MetadataViewer';
import { DataAsset, Venue } from '@covia/covia-sdk';


describe('MetadataViewer Component with only inputs', () => {
  test('renders MetadataViewer ',  async () => {
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
    render(<MetadataViewer asset={mockAsset}/>);

    expect(screen.getByTestId('creator_label')).toBeInTheDocument();
    expect(screen.getByTestId('license_label')).toBeInTheDocument();
    expect(screen.getByTestId('dateCreated_label')).toBeInTheDocument();
    expect(screen.getByTestId('dateModified_label')).toBeInTheDocument();
    expect(screen.getByTestId('dateModified_label')).toBeInTheDocument();
    expect(screen.getByTestId('keywords_label')).toBeInTheDocument();
    expect(screen.getByTestId('notes_label')).toBeInTheDocument();

    expect(screen.getByTestId('creator_value')).toHaveTextContent('William Shakespeare');
    expect(screen.getByTestId('license_value')).toHaveTextContent('Public Domain');
    expect(screen.getByTestId('dateCreated_value')).toHaveTextContent('2025-06-05T06:53:59Z')
    expect(screen.getByTestId('dateModified_value')).toHaveTextContent('2025-06-05T06:53:59Z')
    expect(screen.getByTestId('keywords_value')).toBeInTheDocument()
    expect(screen.getByTestId('notes_value')).toHaveTextContent('Uploaded by Mike Anderson for use as an example Covia Asset')

    
  });

});
