import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Surface the prefetch prop the component hands to next/link, so the test can
// see when it switches from "off" to Next's default.
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, prefetch, children, ...rest }: any) => (
    <a href={href} data-prefetch={String(prefetch)} {...rest}>
      {children}
    </a>
  ),
}));

import { HoverPrefetchLink } from '@/components/admin-panel/hover-prefetch-link';

describe('HoverPrefetchLink', () => {
  it('does not prefetch until hovered', () => {
    render(<HoverPrefetchLink href="/jobs">Jobs</HoverPrefetchLink>);
    const link = screen.getByRole('link', { name: 'Jobs' });
    expect(link).toHaveAttribute('data-prefetch', 'false');
    fireEvent.mouseEnter(link);
    expect(link).toHaveAttribute('data-prefetch', 'null');
  });

  it('prefetches on keyboard focus', () => {
    render(<HoverPrefetchLink href="/jobs">Jobs</HoverPrefetchLink>);
    const link = screen.getByRole('link', { name: 'Jobs' });
    fireEvent.focus(link);
    expect(link).toHaveAttribute('data-prefetch', 'null');
  });

  it('still calls handlers passed in by asChild wrappers', () => {
    const onMouseEnter = jest.fn();
    const onFocus = jest.fn();
    render(
      <HoverPrefetchLink href="/jobs" onMouseEnter={onMouseEnter} onFocus={onFocus}>
        Jobs
      </HoverPrefetchLink>,
    );
    const link = screen.getByRole('link', { name: 'Jobs' });
    fireEvent.mouseEnter(link);
    fireEvent.focus(link);
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    expect(onFocus).toHaveBeenCalledTimes(1);
  });
});
