import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { SidebarToggle } from '@/components/admin-panel/sidebar-toggle';

function renderToggle(setIsOpen: () => void) {
  return render(
    <>
      <SidebarToggle isOpen setIsOpen={setIsOpen} />
      <textarea data-testid="field" />
    </>,
  );
}

describe('SidebarToggle shortcut', () => {
  it('toggles the sidebar on Ctrl/Cmd+B', () => {
    const setIsOpen = jest.fn();
    renderToggle(setIsOpen);
    fireEvent.keyDown(window, { key: 'b', metaKey: true });
    expect(setIsOpen).toHaveBeenCalledTimes(1);
  });

  // Ctrl/Cmd+B is bold in an editor: a field being typed in keeps it.
  it('leaves Ctrl/Cmd+B to a field being typed in', () => {
    const setIsOpen = jest.fn();
    renderToggle(setIsOpen);
    const notPrevented = fireEvent.keyDown(screen.getByTestId('field'), { key: 'b', ctrlKey: true });

    expect(notPrevented).toBe(true);
    expect(setIsOpen).not.toHaveBeenCalled();
  });
});
