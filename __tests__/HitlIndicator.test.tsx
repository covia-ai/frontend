import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('@/hooks/use-hitl', () => ({ useHitlOpenCount: jest.fn() }));

import { HitlIndicator } from '@/components/HitlIndicator';
import { useHitlOpenCount } from '@/hooks/use-hitl';

const mockCount = useHitlOpenCount as jest.MockedFunction<typeof useHitlOpenCount>;

describe('HitlIndicator', () => {
  it('renders nothing when no request is pending', () => {
    mockCount.mockReturnValue(0);
    const { container } = render(<HitlIndicator />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the pending count and links to the inbox', () => {
    mockCount.mockReturnValue(3);
    render(<HitlIndicator />);

    expect(screen.getByTestId('hitl-topbar-indicator')).toHaveAttribute('href', '/inbox');
    expect(screen.getByTestId('hitl-topbar-count')).toHaveTextContent('3');
  });

  it('caps the badge so a large inbox cannot blow out the layout', () => {
    mockCount.mockReturnValue(1204);
    render(<HitlIndicator />);
    expect(screen.getByTestId('hitl-topbar-count')).toHaveTextContent('99+');
  });
});
