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
  {
    id: 'b0HwKymJbnA',
    title: 'Covia.ai App Demo showing federated orchestration',
    audiences: ['CTO', 'Partners'],
  },
  {
    id: '5FtCG8bYS3w',
    title: 'Covia.ai Venue Operation with Gemini Demo',
    audiences: ['Developers', 'CTO'],
  },
  {
    id: 'qgfCdKwG4Rs',
    title: 'Covia.ai multi-agent coordination and agentic economics',
    audiences: ['Investor', 'CTO', 'Partners'],
  },
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

  it('tags each video with its audience, as the reel cards above do', () => {
    render(<VideoThumbnails />);
    for (const { title, audiences } of EXPECTED) {
      const card = screen.getByRole('button', { name: `Watch on YouTube: ${title}` });
      const tags = Array.from(card.querySelectorAll('[data-slot="badge"]')).map(
        (e) => e.textContent?.trim(),
      );
      expect(tags).toEqual(audiences);
    }
  });

  /** Fixed heights would clip the new tag row, so the cards grew a minimum. */
  it('lets a card grow past its minimum height', () => {
    render(<VideoThumbnails />);
    for (const card of screen.getAllByRole('button')) {
      const classes = card.className.split(/\s+/);
      expect(classes).not.toContain('h-60');
      expect(classes).not.toContain('h-68');
      expect(classes.some((c) => c === 'min-h-60' || c === 'min-h-68')).toBe(true);
    }
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
