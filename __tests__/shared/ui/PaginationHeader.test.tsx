import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { PaginationHeader } from '@/components/PaginationHeader';

describe('PaginationHeader', () => {
  // These render as <a href="#">; without preventDefault the browser follows
  // the hash on click, leaving a stray "#" in the URL and an inert entry in
  // history that back/forward has to step through for nothing.
  it('does not navigate to "#" when Next/Previous are clicked', async () => {
    const user = userEvent.setup();
    const onPageChange = jest.fn();
    render(<PaginationHeader currentPage={2} totalPages={5} onPageChange={onPageChange} />);

    await user.click(screen.getByLabelText(/go to next page/i));
    expect(onPageChange).toHaveBeenCalledWith(3);
    expect(window.location.hash).toBe('');

    await user.click(screen.getByLabelText(/go to previous page/i));
    expect(onPageChange).toHaveBeenCalledWith(1);
    expect(window.location.hash).toBe('');
  });

  it('does not call through when disabled', async () => {
    const user = userEvent.setup();
    const onPageChange = jest.fn();
    render(<PaginationHeader currentPage={2} totalPages={5} onPageChange={onPageChange} disabled />);

    await user.click(screen.getByLabelText(/go to next page/i));
    await user.click(screen.getByLabelText(/go to previous page/i));
    expect(onPageChange).not.toHaveBeenCalled();
  });
});
