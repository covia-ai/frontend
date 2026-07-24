import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { generateIdenticonGrid, isDidKey, identiconGridForDid } from '@/lib/identicon';
import { Identicon } from '@/components/Identicon';

const DID_A = 'did:key:z6MkhK66YbPRiRuQAmM6KsZh7a7jWbkzp2HnkV2QyrPdTkBR';
const DID_B = 'did:key:z6MktDmHzDt4whm89ycf7PoBYUh4xLmtPej6ZLFbB9ZnNQwe';

describe('generateIdenticonGrid', () => {
  const bytes = new Uint8Array(Array.from({ length: 32 }, (_, i) => (i * 37 + 11) & 0xff));

  it('is deterministic and correctly sized', () => {
    expect(generateIdenticonGrid(bytes, 7)).toEqual(generateIdenticonGrid(bytes, 7));
    expect(generateIdenticonGrid(bytes, 7)).toHaveLength(49);
    expect(generateIdenticonGrid(bytes, 5)).toHaveLength(25);
  });

  it('is horizontally mirrored', () => {
    const g = generateIdenticonGrid(bytes, 7);
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        expect(g[y * 7 + x]).toBe(g[y * 7 + (6 - x)]);
      }
    }
  });

  it('returns all-zero for empty input', () => {
    expect(generateIdenticonGrid(new Uint8Array(0), 5).every((c) => c === 0)).toBe(true);
  });
});

describe('isDidKey / identiconGridForDid', () => {
  it('accepts did:key only', () => {
    expect(isDidKey(DID_A)).toBe(true);
    expect(isDidKey('did:web:venue-3.covia.ai')).toBe(false);
    expect(isDidKey(null)).toBe(false);
    expect(isDidKey(undefined)).toBe(false);
  });

  it('derives a grid from a real did:key', () => {
    const g = identiconGridForDid(DID_A);
    expect(g).not.toBeNull();
    expect(g).toHaveLength(49);
  });

  it('gives different grids for different keys', () => {
    expect(identiconGridForDid(DID_A)).not.toEqual(identiconGridForDid(DID_B));
  });

  it('derives from the owner key even with an agent path suffix', () => {
    // An agent DID URL resolves to its owner's key → the owner's identicon.
    expect(identiconGridForDid(`${DID_A}:g:skilled-agent`)).toEqual(identiconGridForDid(DID_A));
  });

  it('returns null for non-did:key or an undecodable key', () => {
    expect(identiconGridForDid('did:web:venue-3.covia.ai')).toBeNull();
    expect(identiconGridForDid('did:key:zNOTVALID')).toBeNull();
    expect(identiconGridForDid(undefined)).toBeNull();
  });
});

describe('<Identicon>', () => {
  it('renders an svg of grid cells for a did:key', () => {
    const { container } = render(<Identicon did={DID_A} gridSize={7} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.querySelectorAll('rect')).toHaveLength(49);
  });

  it('renders nothing for a non-did:key identity', () => {
    const { container } = render(<Identicon did="did:web:venue-3.covia.ai" />);
    expect(container).toBeEmptyDOMElement();
  });
});
