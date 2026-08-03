import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {MetadataViewer} from '@/components/MetadataViewer';
import { DataAsset, Venue } from '@covia/covia-sdk';

// Mock fetch for DataAsset.getContentURL()
global.fetch = jest.fn();

// Mock json-edit-react
jest.mock('json-edit-react', () => ({
  JsonEditor: ({ data: _data }: any) => <div data-testid="json-editor">JSON Editor</div>,
}));

// Mock dynamically imported components
jest.mock('next/dynamic', () => () => {
  const MockComponent = () => <div>Mock Dynamic Component</div>;
  MockComponent.displayName = 'MockDynamic';
  return MockComponent;
});

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
    expect(screen.getByTestId('keywords_label')).toBeInTheDocument();
    expect(screen.getByTestId('notes_label')).toBeInTheDocument();

    expect(screen.getByTestId('creator_value')).toHaveTextContent('William Shakespeare');
    expect(screen.getByTestId('license_value')).toHaveTextContent('Public Domain');
    // Dates are now formatted by formatDate() using Intl.DateTimeFormat
    expect(screen.getByTestId('dateCreated_value')).toHaveTextContent('Jun 5, 2025');
    expect(screen.getByTestId('dateModified_value')).toHaveTextContent('Jun 5, 2025');
    expect(screen.getByTestId('keywords_value')).toBeInTheDocument();
    expect(screen.getByTestId('notes_value')).toHaveTextContent('Uploaded by Mike Anderson for use as an example Covia Asset');


  });

});

describe('MetadataViewer skill / inline content', () => {
  const venue = new Venue({ baseUrl: 'https://venue-test.covia.ai', venueId: 'did:web:venue-test.covia.ai', name: 'TestVenue' });
  const asset = (metadata: any) => new DataAsset('abc', venue, metadata);

  const SKILL = {
    name: 'models',
    description: 'Discover which LLM providers are ready.',
    content: { contentType: 'text/markdown', inline: '## Models\nCall v/ops/langchain/models' },
    skill: { tools: ['v/ops/langchain/models'] },
  };

  test('renders the inline skill body instead of a broken download link', () => {
    render(<MetadataViewer asset={asset(SKILL)} />);
    // The markdown body lives in metadata and 500s at the content URL, so it is
    // shown directly and no Download link is offered.
    expect(screen.getByTestId('inline-content')).toHaveTextContent('## Models');
    expect(screen.queryByText('Download')).not.toBeInTheDocument();
  });

  test('lists the skill tools', () => {
    render(<MetadataViewer asset={asset(SKILL)} />);
    expect(screen.getByTestId('skill-tools')).toHaveTextContent('v/ops/langchain/models');
  });

  test('still offers Download for a blob-backed artifact', () => {
    render(<MetadataViewer asset={asset({ name: 'Iris Dataset', content: { contentType: 'text/csv' } })} />);
    expect(screen.queryByTestId('inline-content')).not.toBeInTheDocument();
    expect(screen.getByText('Download')).toBeInTheDocument();
  });

  test('shows no content blocks for an operation asset', () => {
    render(<MetadataViewer asset={asset({ name: 'op', operation: { adapter: 'x' } })} />);
    expect(screen.queryByTestId('inline-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('skill-tools')).not.toBeInTheDocument();
    expect(screen.queryByText('Download')).not.toBeInTheDocument();
  });

  test('does not offer a Download link for a bare reference asset (no content, no operation)', () => {
    render(<MetadataViewer asset={asset({ name: 'a reference', description: 'points elsewhere' })} />);
    expect(screen.queryByText('Download')).not.toBeInTheDocument();
  });

  test('collapses the left column instead of an empty bordered box when no fields apply', () => {
    render(<MetadataViewer asset={asset(SKILL)} />);
    expect(screen.queryByTestId('asset-fields')).not.toBeInTheDocument();
  });
});

describe('MetadataViewer operation fields', () => {
  const venue = new Venue({ baseUrl: 'https://venue-test.covia.ai', venueId: 'did:web:venue-test.covia.ai', name: 'TestVenue' });
  const asset = (metadata: any) => new DataAsset('op-asset', venue, metadata);

  const OPERATION = {
    name: 'resize',
    description: 'Resize an image.',
    operation: {
      adapter: 'http:image',
      input: {
        properties: {
          width: { type: 'number', description: 'Target width in pixels' },
          height: { type: 'number', description: 'Target height in pixels' },
        },
        required: ['width'],
      },
      output: {
        properties: {
          url: { type: 'string', description: 'Resized image URL' },
        },
      },
      steps: ['fetch', 'resize', 'store'],
    },
  };

  // Operation assets start with the accordion collapsed (existing behavior —
  // OperationViewer shows the run form below it by default), and Radix
  // unmounts collapsed content, so these open it first.
  test('shows the adapter, input schema, output schema and step count', () => {
    render(<MetadataViewer asset={asset(OPERATION)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Asset Metadata' }));
    expect(screen.getByTestId('operation-fields')).toHaveTextContent('http:image');
    expect(screen.getByTestId('operation-input')).toHaveTextContent('Width');
    expect(screen.getByTestId('operation-input')).toHaveTextContent('Target width in pixels');
    expect(screen.getByTestId('operation-output')).toHaveTextContent('Resized image URL');
    expect(screen.getByTestId('operation-steps')).toHaveTextContent('3 steps');
  });

  test('marks required input fields', () => {
    render(<MetadataViewer asset={asset(OPERATION)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Asset Metadata' }));
    const inputSection = screen.getByTestId('operation-input');
    expect(inputSection).toHaveTextContent('Width *');
    expect(inputSection).not.toHaveTextContent('Height *');
  });

  test('an operation with none of adapter/input/output/steps shows no operation-fields block', () => {
    render(<MetadataViewer asset={asset({ name: 'bare op', operation: {} })} />);
    expect(screen.queryByTestId('operation-fields')).not.toBeInTheDocument();
  });
});

describe('MetadataViewer agent template fields', () => {
  const venue = new Venue({ baseUrl: 'https://venue-test.covia.ai', venueId: 'did:web:venue-test.covia.ai', name: 'TestVenue' });
  const asset = (metadata: any) => new DataAsset('template-asset', venue, metadata);

  // covia-ai/frontend follow-up: the exact shape reported as rendering blank —
  // v/agents/templates/skilled has none of the operation/artifact/reference
  // fields MetadataViewer originally checked for.
  const SKILLED_TEMPLATE = {
    name: 'Skilled Agent Template',
    description: 'Recommended default: a lean read/list base plus the full skills index.',
    systemPrompt: 'You are a general-purpose agent on the Covia platform...',
    tools: ['v/ops/covia/read', 'v/ops/covia/list'],
    skills: ['w/skills', 'v/skills'],
    llmOperation: 'v/ops/langchain/openai',
    model: 'gpt-5.4-mini',
    defaultTools: false,
  };

  test('shows model, tools, skills and system prompt instead of an empty panel', () => {
    render(<MetadataViewer asset={asset(SKILLED_TEMPLATE)} />);
    expect(screen.getByTestId('asset-fields')).toBeInTheDocument();
    expect(screen.getByTestId('agent-template-fields')).toHaveTextContent('gpt-5.4-mini');
    expect(screen.getByTestId('agent-template-tools')).toHaveTextContent('v/ops/covia/read');
    expect(screen.getByTestId('agent-template-tools')).toHaveTextContent('v/ops/covia/list');
    expect(screen.getByTestId('agent-template-skills')).toHaveTextContent('w/skills');
    expect(screen.getByTestId('system-prompt')).toHaveTextContent('general-purpose agent');
  });

  test('falls back to the llmOperation address when model is absent', () => {
    render(<MetadataViewer asset={asset({ name: 'bare template', llmOperation: 'v/ops/langchain/openai', skills: ['v/skills'] })} />);
    expect(screen.getByTestId('agent-template-fields')).toHaveTextContent('v/ops/langchain/openai');
  });

  test('an agent template with no tools/skills/model shows no agent-template-fields block', () => {
    render(<MetadataViewer asset={asset({ name: 'quiet template', skills: [] })} />);
    expect(screen.queryByTestId('agent-template-fields')).not.toBeInTheDocument();
  });
});
