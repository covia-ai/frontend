import React from 'react';
import { ReadableStream } from 'stream/web';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import {MetadataViewer} from '@/components/MetadataViewer';
import { DataAsset, Venue } from '@covia/covia-sdk';

jest.mock('@/lib/utils', () => ({
  ...jest.requireActual('@/lib/utils'),
  copyDataToClipBoard: jest.fn(),
}));
import { copyDataToClipBoard } from '@/lib/utils';

let mockAuthenticated = true;
jest.mock('@/hooks/use-auth', () => ({
  useIsAuthenticated: () => mockAuthenticated,
}));

jest.mock('json-edit-react', () => ({
  // Mirrors the real library's two callbacks: setData is the controlled
  // value setter (always called), onChange only fires on a genuine field
  // edit (absent on CopyAssetDialog's first render of the JSON step).
  JsonEditor: ({ setData, onChange }: any) => (
    <div data-testid="json-editor">
      <button onClick={() => {
        const newValue = { name: 'Iris Dataset (copy)' };
        setData(onChange ? onChange({ newValue }) : newValue);
      }}>Update JSON</button>
    </div>
  ),
}));

// Mock fetch for DataAsset.getContentURL()
global.fetch = jest.fn();

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

  // covia-ai/frontend#202: the inline-content preview had no copy affordance,
  // unlike comparable content areas elsewhere in the app.
  test('copies the inline content to the clipboard', () => {
    (copyDataToClipBoard as jest.Mock).mockClear();
    render(<MetadataViewer asset={asset(SKILL)} />);
    fireEvent.click(screen.getByTestId('copy-inline-content'));
    expect(copyDataToClipBoard).toHaveBeenCalledWith(
      '## Models\nCall v/ops/langchain/models',
      'Content copied to clipboard',
    );
  });

  test('still offers Download for a blob-backed artifact', () => {
    render(<MetadataViewer asset={asset({ name: 'Iris Dataset', content: { contentType: 'text/csv' } })} />);
    expect(screen.queryByTestId('inline-content')).not.toBeInTheDocument();
    expect(screen.getByText('Download')).toBeInTheDocument();
  });

  // A plain <a href download> only forces a save when the URL is
  // same-origin — the content endpoint lives on the venue's own origin, so
  // clicking it just navigated to/opened the URL instead (covia-ai/frontend
  // download-button report). Download must instead fetch the bytes and
  // save from a blob: URL, which always triggers a real download.
  test('downloads via a blob: URL instead of navigating to the cross-origin content URL', async () => {
    const testAsset = asset({ name: 'Iris Dataset', content: { contentType: 'text/csv' } });
    const bytes = new TextEncoder().encode('a,b,c\n1,2,3');
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    });
    const getContentSpy = jest
      .spyOn(venue.assets, 'getContent')
      .mockResolvedValue(stream as unknown as globalThis.ReadableStream<Uint8Array>);
    const createObjectURL = jest.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURL = jest.fn();
    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<MetadataViewer asset={testAsset} venue={venue} />);
    fireEvent.click(screen.getByText('Download'));

    await waitFor(() => expect(getContentSpy).toHaveBeenCalledWith('abc'));
    await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

    clickSpy.mockRestore();
    getContentSpy.mockRestore();
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

  test('a truly bare reference asset gets an explicit empty-state note, not blank space', () => {
    render(<MetadataViewer asset={asset({ name: 'a reference', description: 'points elsewhere' })} />);
    expect(screen.getByTestId('reference-empty-note')).toHaveTextContent('bare reference');
  });

  test('no empty-state note once there is something to show on the left', () => {
    render(<MetadataViewer asset={asset({ name: 'tagged', keywords: ['test'] })} />);
    expect(screen.queryByTestId('reference-empty-note')).not.toBeInTheDocument();
  });

  test('no empty-state note for a non-reference kind (e.g. a skill/artifact) even with nothing on the left', () => {
    render(<MetadataViewer asset={asset(SKILL)} />);
    expect(screen.queryByTestId('reference-empty-note')).not.toBeInTheDocument();
  });

  // covia-ai/frontend#217: moved from the /publicartifacts grid card onto
  // the asset detail page itself, next to View metadata.
  describe('Copy Asset', () => {
    afterEach(() => { mockAuthenticated = true; });

    test('shows a locked, disabled button instead when signed out', () => {
      mockAuthenticated = false;
      render(<MetadataViewer asset={asset({ name: 'Iris Dataset' })} venue={venue} />);

      const copyBtn = screen.getByRole('button', { name: /copy asset/i });
      expect(copyBtn).toBeDisabled();
    });

    test('is not offered at all without a venue (nothing to copy into)', () => {
      render(<MetadataViewer asset={asset({ name: 'Iris Dataset' })} />);
      expect(screen.queryByText('Copy Asset')).not.toBeInTheDocument();
    });

    test('opens on a Review Metadata form prepopulated from the source asset', () => {
      render(<MetadataViewer asset={asset({ name: 'Iris Dataset', creator: 'Ada' })} venue={venue} />);
      fireEvent.click(screen.getByRole('button', { name: /copy asset/i }));

      expect(screen.getByText('Review Metadata')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Iris Dataset')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Ada')).toBeInTheDocument();
    });

    test('registers the edited metadata as a new asset and navigates to it', async () => {
      const registerSpy = jest.fn().mockResolvedValue({ id: 'new-asset-id' });
      jest.spyOn(venue.assets, 'register').mockImplementation(registerSpy);

      render(<MetadataViewer asset={asset({ name: 'Iris Dataset' })} venue={venue} />);
      fireEvent.click(screen.getByRole('button', { name: /copy asset/i }));
      // Review Metadata (form) -> Edit metadata (JSON review)
      fireEvent.click(screen.getByRole('button', { name: /^review$/i }));
      // First click just seeds jsonData from baseData (no tracked edit yet);
      // the second is a genuine edit that flips metadataUpdated.
      fireEvent.click(await screen.findByText('Update JSON'));
      fireEvent.click(screen.getByText('Update JSON'));
      fireEvent.click(screen.getByTestId('copy-asset-register'));

      await waitFor(() =>
        expect(registerSpy).toHaveBeenCalledWith({ name: 'Iris Dataset (copy)' }),
      );

      registerSpy.mockRestore();
    });
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

  test('de-emphasizes generic fields with a divider once kind-specific fields are shown', () => {
    render(<MetadataViewer asset={asset({ ...OPERATION, keywords: ['image', 'resize'] })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Asset Metadata' }));
    const keywordsLabel = screen.getByTestId('keywords_label');
    // The muted wrapper is the parent of the grid renderMetadataFields returns.
    expect(keywordsLabel.closest('.opacity-70')).not.toBeNull();
  });

  test('does not mute generic fields when there are no kind-specific fields to rank them below', () => {
    const venueLocal = new Venue({ baseUrl: 'https://venue-test.covia.ai', venueId: 'did:web:venue-test.covia.ai', name: 'TestVenue' });
    const plain = new DataAsset('plain-asset', venueLocal, { name: 'plain', keywords: ['test'] });
    render(<MetadataViewer asset={plain} />);
    const keywordsLabel = screen.getByTestId('keywords_label');
    expect(keywordsLabel.closest('.opacity-70')).toBeNull();
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
