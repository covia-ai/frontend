import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { TagFilterDropdown } from '@/components/TagFilterDropdown';

// Radix's dropdown-menu relies on pointer-capture / scrollIntoView APIs jsdom
// doesn't implement — no-op them so the portal-based menu can open in tests.
beforeAll(() => {
  Element.prototype.hasPointerCapture = jest.fn().mockReturnValue(false);
  Element.prototype.setPointerCapture = jest.fn();
  Element.prototype.releasePointerCapture = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
});

describe('TagFilterDropdown', () => {
  it('disables the trigger when there are no options', () => {
    render(<TagFilterDropdown adapterOptions={[]} keywordOptions={[]} selected={[]} onChange={jest.fn()} />);
    expect(screen.getByTestId('tag-filter-trigger')).toBeDisabled();
  });

  it('shows a selected-count badge when tags are selected', () => {
    render(
      <TagFilterDropdown
        adapterOptions={['langchain']}
        keywordOptions={['LLM']}
        selected={['LLM']}
        onChange={jest.fn()}
      />
    );
    expect(screen.getByTestId('tag-filter-trigger')).toHaveTextContent('1');
  });

  it('lists adapter and keyword options under separate groups', async () => {
    const user = userEvent.setup();
    render(
      <TagFilterDropdown
        adapterOptions={['langchain']}
        keywordOptions={['LLM', 'model']}
        selected={[]}
        onChange={jest.fn()}
      />
    );

    await user.click(screen.getByTestId('tag-filter-trigger'));

    const menu = await screen.findByTestId('tag-filter-menu');
    expect(within(menu).getByText('Adapter')).toBeInTheDocument();
    expect(within(menu).getByText('Keyword')).toBeInTheDocument();
    expect(within(menu).getByText('langchain')).toBeInTheDocument();
    expect(within(menu).getByText('LLM')).toBeInTheDocument();
    expect(within(menu).getByText('model')).toBeInTheDocument();
  });

  it('adds a tag to the selection when an unselected option is clicked', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <TagFilterDropdown
        adapterOptions={['langchain']}
        keywordOptions={[]}
        selected={[]}
        onChange={onChange}
      />
    );

    await user.click(screen.getByTestId('tag-filter-trigger'));
    await user.click(await screen.findByText('langchain'));

    expect(onChange).toHaveBeenCalledWith(['langchain']);
  });

  it('removes a tag from the selection when an already-selected option is clicked', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <TagFilterDropdown
        adapterOptions={['langchain']}
        keywordOptions={[]}
        selected={['langchain']}
        onChange={onChange}
      />
    );

    await user.click(screen.getByTestId('tag-filter-trigger'));
    await user.click(await screen.findByText('langchain'));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('clears all selected tags via "Clear all"', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <TagFilterDropdown
        adapterOptions={['langchain']}
        keywordOptions={['LLM']}
        selected={['langchain', 'LLM']}
        onChange={onChange}
      />
    );

    await user.click(screen.getByTestId('tag-filter-trigger'));
    await user.click(await screen.findByText('Clear all'));

    expect(onChange).toHaveBeenCalledWith([]);
  });
});
