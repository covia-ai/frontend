import { renderHook, act } from '@testing-library/react';
import { computeGridRows, countGridColumns, useGridPageSize } from '@/hooks/use-grid-page-size';

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

// The bug this covers: a hardcoded "roughly what sits below the grid" guess
// either wasted up to a full row's worth of space (guess too generous) or
// clipped a row (guess too stingy). Measuring the grid's real next sibling
// (PaginationHeader in every current caller) instead of guessing fixes both.
describe('useGridPageSize DOM measurement', () => {
  const originalGetComputedStyle = window.getComputedStyle;

  beforeEach(() => {
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 1000 });
    window.getComputedStyle = jest.fn(() => ({
      gridTemplateColumns: '200px 200px',
      rowGap: '16',
    })) as unknown as typeof window.getComputedStyle;
  });

  afterEach(() => {
    window.getComputedStyle = originalGetComputedStyle;
  });

  function buildGrid({ siblingHeight, gridTop = 0 }: { siblingHeight: number; gridTop?: number }) {
    const grid = document.createElement('div');
    const card = document.createElement('div');
    Object.defineProperty(card, 'offsetHeight', { configurable: true, value: 200 });
    grid.appendChild(card);
    grid.getBoundingClientRect = () => ({ top: gridTop } as DOMRect);

    const sibling = document.createElement('div');
    sibling.getBoundingClientRect = () => ({ height: siblingHeight } as DOMRect);

    const parent = document.createElement('div');
    parent.appendChild(grid);
    parent.appendChild(sibling);
    document.body.appendChild(parent);

    return grid;
  }

  it('claims the space a slim pagination row leaves behind, instead of reserving a flat guess', () => {
    // 920px viewport, 2 cols, 200px cards + 16px gap, a 40px-tall pagination
    // row. Real measurement reserves 40+24=64px: available=856,
    // floor((856+16)/216)=4 rows -> 8 items. The old flat 96px guess would
    // have reserved 32px more, dropping a whole row: available=824,
    // floor((824+16)/216)=3 rows -> 6 items — exactly the "won't add
    // another row" bug this fixes.
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 920 });
    const grid = buildGrid({ siblingHeight: 40 });

    const { result } = renderHook(() => useGridPageSize());
    act(() => result.current.ref(grid));

    expect(result.current.pageSize).toBe(8);
  });

  it('reserves less when the row below the grid is short, fitting one more row than a flat guess would', () => {
    // Tight viewport where the old 96px guess would leave one row short but
    // a slim (24px) sibling leaves enough real room for it.
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 700 });
    const grid = buildGrid({ siblingHeight: 0 });

    const { result } = renderHook(() => useGridPageSize());
    act(() => result.current.ref(grid));

    // availableHeight = 700 - 0 - (0+24) = 676 -> floor(692/216) = 3 rows -> 6 items.
    // Old flat guess: 700-96=604 -> floor(620/216)=2 rows -> 4 items.
    expect(result.current.pageSize).toBe(6);
  });

  it('falls back to just the small buffer when the grid has no next sibling', () => {
    const grid = document.createElement('div');
    const card = document.createElement('div');
    Object.defineProperty(card, 'offsetHeight', { configurable: true, value: 200 });
    grid.appendChild(card);
    grid.getBoundingClientRect = () => ({ top: 0 } as DOMRect);
    document.body.appendChild(grid);

    const { result } = renderHook(() => useGridPageSize());
    act(() => result.current.ref(grid));

    // availableHeight = 1000 - 0 - (0+24) = 976 -> floor(992/216) = 4 rows -> 8 items.
    expect(result.current.pageSize).toBe(8);
  });
});
