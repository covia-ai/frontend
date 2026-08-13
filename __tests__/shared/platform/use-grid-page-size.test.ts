import { computeGridRows, countGridColumns } from '@/hooks/use-grid-page-size';

// getComputedStyle resolves grid-template-columns to explicit pixel tracks, so
// the page size follows the grid's own responsive rule rather than a copy of
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

describe('computeGridRows', () => {
  const card = { cardHeight: 200, rowGap: 16 };

  it('fits rows to the available height', () => {
    // 3 rows occupy 3*200 + 2*16 = 632; a 4th needs 848.
    expect(computeGridRows({ ...card, availableHeight: 700 })).toBe(3);
    expect(computeGridRows({ ...card, availableHeight: 847 })).toBe(3);
    expect(computeGridRows({ ...card, availableHeight: 848 })).toBe(4);
  });

  it('gives a taller window more rows', () => {
    const short = computeGridRows({ ...card, availableHeight: 700 });
    const tall = computeGridRows({ ...card, availableHeight: 1400 });
    expect(tall).toBeGreaterThan(short);
    expect(tall).toBe(6);
  });

  it('never drops below minRows, even with no room', () => {
    // A short window, or a grid pushed far down the page, must still render
    // something rather than an empty page.
    expect(computeGridRows({ ...card, availableHeight: 10 })).toBe(1);
    expect(computeGridRows({ ...card, availableHeight: -500 })).toBe(1);
    expect(computeGridRows({ ...card, availableHeight: -500, minRows: 2 })).toBe(2);
  });

  it('returns minRows when nothing has rendered to measure', () => {
    expect(computeGridRows({ availableHeight: 900, cardHeight: 0, rowGap: 16 })).toBe(1);
  });

  it('accounts for the gap between rows', () => {
    // With no gap the same space fits one more row.
    expect(computeGridRows({ cardHeight: 200, rowGap: 0, availableHeight: 800 })).toBe(4);
    expect(computeGridRows({ cardHeight: 200, rowGap: 16, availableHeight: 800 })).toBe(3);
  });
});
