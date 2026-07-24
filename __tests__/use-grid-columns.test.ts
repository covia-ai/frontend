import { countGridColumns } from '@/hooks/use-grid-columns';

// getComputedStyle resolves grid-template-columns to explicit pixel tracks, so
// the page size follows the grid's own responsive classes rather than a copy of
// its breakpoints kept in JS.
describe('countGridColumns', () => {
  it('counts resolved pixel tracks', () => {
    expect(countGridColumns('254.4px 254.4px 254.4px 254.4px')).toBe(4);
    expect(countGridColumns('180px 180px')).toBe(2);
  });

  it('handles irregular whitespace', () => {
    expect(countGridColumns('  100px   100px  100px  ')).toBe(3);
  });

  it('falls back to a single column when there is no grid to measure', () => {
    // A missing or unresolved value must never yield 0 — that would make the
    // page size zero and render an empty list.
    expect(countGridColumns('none')).toBe(1);
    expect(countGridColumns('')).toBe(1);
    expect(countGridColumns(undefined)).toBe(1);
    expect(countGridColumns(null)).toBe(1);
  });
});
