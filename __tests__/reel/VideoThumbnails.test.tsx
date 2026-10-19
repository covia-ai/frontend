import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { VideoThumbnails } from '@/components/VideoThumbnails';

/**
 * The superset guard for the Resources page.
 *
 * The reel was added above these three videos, not instead of them, and the
 * redesign is only allowed to add. If a future tidy-up drops one of these ids
 * or changes where a card goes, that is a regression, and this is the test
 * that calls it one.
 */
const EXPECTED = [
  { id: 'b0HwKymJbnA', title: 'Covia.ai App Demo showing federated orchestration' },
  { id: '5FtCG8bYS3w', title: 'Covia.ai Venue Operation with Gemini Demo' },
  { id: 'qgfCdKwG4Rs', title: 'Covia.ai multi-agent coordination and agentic economics' },
];

describe('VideoThumbnails (preserved from the original page)', () => {
  it('still shows exactly the three videos, with their captions', () => {
    render(<VideoThumbnails />);
    for (const { title } of EXPECTED) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  it('still opens each video on YouTube in a new tab', async () => {
    const open = jest.spyOn(window, 'open').mockImplementation(() => null);
    const user = userEvent.setup();
    render(<VideoThumbnails />);

    for (const { id, title } of EXPECTED) {
      await user.click(screen.getByRole('button', { name: `Watch on YouTube: ${title}` }));
      expect(open).toHaveBeenLastCalledWith(
        `https://www.youtube.com/watch?v=${id}`,
        '_blank',
        'noopener,noreferrer',
      );
    }
    open.mockRestore();
  });

  it('keeps the middle card wider than its neighbours', () => {
    render(<VideoThumbnails />);
    const cards = screen.getAllByRole('button');
    expect(cards[0].className).toContain('w-64');
    expect(cards[1].className).toContain('w-80');
    expect(cards[2].className).toContain('w-64');
  });

  /** Was a plain div with an onClick, so it could not be reached by keyboard. */
  it('exposes each card as a real control', async () => {
    const user = userEvent.setup();
    render(<VideoThumbnails />);
    await user.tab();
    expect(screen.getAllByRole('button')[0]).toHaveFocus();
  });

  /** Was a non-wrapping flex row, so the third card ran off the page below ~900px. */
  it('wraps instead of overflowing', () => {
    const { container } = render(<VideoThumbnails />);
    expect(container.firstChild).toHaveClass('flex-wrap');
  });
});
