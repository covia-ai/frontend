import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { DarkLightToggle } from '@/components/DarkLightToggle';
import userEvent from '@testing-library/user-event';

const mockSetTheme = jest.fn();
let mockResolvedTheme: string | undefined = 'light';
jest.mock('next-themes', () => ({
  useTheme: () => ({ setTheme: mockSetTheme, resolvedTheme: mockResolvedTheme }),
}));

beforeEach(() => {
  mockSetTheme.mockClear();
});

describe('DarkLightToggle', () => {
  it('switches a light page to dark, and a dark page to light', async () => {
    const user = userEvent.setup();
    mockResolvedTheme = 'light';
    const { unmount } = render(<DarkLightToggle />);
    await user.click(screen.getByTestId('btn_toggle_theme'));
    expect(mockSetTheme).toHaveBeenLastCalledWith('dark');
    unmount();

    mockResolvedTheme = 'dark';
    render(<DarkLightToggle />);
    await user.click(screen.getByTestId('btn_toggle_theme'));
    expect(mockSetTheme).toHaveBeenLastCalledWith('light');
  });

  it('toggles from the keyboard shortcut too', () => {
    mockResolvedTheme = 'dark';
    render(<DarkLightToggle />);
    fireEvent.keyDown(window, { key: 'x', ctrlKey: true });
    expect(mockSetTheme).toHaveBeenLastCalledWith('light');
  });

  // Ctrl/Cmd+X is cut: the shortcut must not take it from a field.
  it('leaves Ctrl/Cmd+X to the browser while typing in a field', () => {
    render(<><DarkLightToggle /><input data-testid="field" /></>);
    const notPrevented = fireEvent.keyDown(screen.getByTestId('field'), { key: 'x', metaKey: true });

    expect(notPrevented).toBe(true);
    expect(mockSetTheme).not.toHaveBeenCalled();
  });

  it('leaves Ctrl/Cmd+X alone while text is selected', () => {
    render(<><DarkLightToggle /><p data-testid="prose">some words</p></>);
    const range = document.createRange();
    range.selectNodeContents(screen.getByTestId('prose'));
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
    try {
      expect(fireEvent.keyDown(window, { key: 'x', ctrlKey: true })).toBe(true);
      expect(mockSetTheme).not.toHaveBeenCalled();
    } finally {
      window.getSelection()!.removeAllRanges();
    }
  });

  // The server can't know the theme, so markup that varied with it could never
  // hydrate: CSS on the <html> theme class chooses what shows instead.
  it('renders the same markup whatever the theme', () => {
    mockResolvedTheme = undefined;
    const unknown = render(<DarkLightToggle />).container.innerHTML;
    mockResolvedTheme = 'light';
    const light = render(<DarkLightToggle />).container.innerHTML;
    mockResolvedTheme = 'dark';
    const dark = render(<DarkLightToggle />).container.innerHTML;

    expect(light).toBe(unknown);
    expect(dark).toBe(unknown);
  });
});
