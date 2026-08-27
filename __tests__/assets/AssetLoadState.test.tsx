import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AssetLoadState } from '@/components/AssetLoadState';

describe('AssetLoadState', () => {
  it('shows a spinner while loading', () => {
    render(<AssetLoadState loading />);
    expect(screen.getByTestId('asset-load-spinner')).toBeInTheDocument();
  });

  it('shows the error over notFound when both are somehow set', () => {
    // ErrorDisplay maps an unrecognized message to a friendly summary
    // ("Boom" itself sits behind the collapsed "Details" toggle).
    render(<AssetLoadState error="Boom" notFound />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.queryByTestId('asset-load-not-found')).not.toBeInTheDocument();
  });

  it('shows a not-found message with the caller-supplied text', () => {
    render(<AssetLoadState notFound notFoundMessage='The asset ID "abc" does not exist on this venue.' />);
    expect(screen.getByTestId('asset-load-not-found')).toHaveTextContent('Asset Not Found');
    expect(screen.getByTestId('asset-load-not-found')).toHaveTextContent('abc');
  });

  it('renders nothing once none of the three states apply', () => {
    const { container } = render(<AssetLoadState />);
    expect(container).toBeEmptyDOMElement();
  });

  it('loading takes priority over a stale error or notFound', () => {
    render(<AssetLoadState loading error="stale error" notFound />);
    expect(screen.getByTestId('asset-load-spinner')).toBeInTheDocument();
    expect(screen.queryByText('stale error')).not.toBeInTheDocument();
  });
});
