import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { render, screen } from '@testing-library/react';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';

let mockResolvedTheme: string | undefined;
jest.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: mockResolvedTheme }),
}));

function Probe() {
  return <span data-testid="theme">{useResolvedTheme() ?? 'unknown'}</span>;
}

describe('useResolvedTheme', () => {
  it('hydrates against server markup that could not know the theme, then supplies it', async () => {
    // The server has no theme; next-themes has already read the stored one
    // when the client hydrates.
    mockResolvedTheme = undefined;
    const container = document.createElement('div');
    container.innerHTML = renderToString(<Probe />);
    document.body.appendChild(container);
    mockResolvedTheme = 'dark';

    const onRecoverableError = jest.fn();
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      await act(async () => {
        root = hydrateRoot(container, <Probe />, { onRecoverableError });
      });

      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(container.textContent).toBe('dark');
    } finally {
      act(() => root?.unmount());
      container.remove();
    }
  });

  it('is the theme straight away in a client-only render', () => {
    mockResolvedTheme = 'light';
    render(<Probe />);
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
  });

  it('never reports a theme it does not know', () => {
    mockResolvedTheme = 'system';
    render(<Probe />);
    expect(screen.getByTestId('theme')).toHaveTextContent('unknown');
  });
});
