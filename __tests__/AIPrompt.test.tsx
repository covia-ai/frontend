import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {AIPrompt} from '@/components/AIPrompt';

jest.mock('@/hooks/use-authenticated-venue', () => ({
  useAuthenticatedVenue: () => null,
}));

describe('Chat Component', () => {
  test('renders chat container', () => {
    render(<AIPrompt />);
    expect(screen.getByTestId('chat-container')).toBeInTheDocument();
  });

  test('renders input field', () => {
    render(<AIPrompt />);
    expect(screen.getByPlaceholderText('Add a prompt and click the magic wand...')).toBeInTheDocument();
  });

  test('renders chat button', () => {
    render(<AIPrompt />);
    expect(screen.getByTestId('chat-button')).toBeInTheDocument();
  });

  test('chat button is disabled when prompt is empty', () => {
    render(<AIPrompt />);
    expect(screen.getByTestId('chat-button')).toBeDisabled();
  });
});
