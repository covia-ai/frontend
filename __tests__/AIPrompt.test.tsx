import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import {AIPrompt} from '@/components/AIPrompt';
import userEvent from '@testing-library/user-event';

describe('Chat Component', () => {
  test('renders chat container', () => {
    render(<AIPrompt />);
    expect(screen.getByTestId('chat-container')).toBeInTheDocument();
  });

  test('renders input field', () => {
    render(<AIPrompt />);
    expect(screen.getByPlaceholderText('Build me an orchestration.....')).toBeInTheDocument();
  });

  test('renders chat button', () => {
    render(<AIPrompt />);
    expect(screen.getByTestId('chat-button')).toBeInTheDocument();
  });
});


  // ==================== OPENING DIALOG ====================
  
  describe('Opening Dialog', () => {
    test('opens dialog when trigger button is clicked', async () => {
      const user = userEvent.setup();
      render(<AIPrompt />);
      
      const triggerButton = screen.getByTestId('chat-button');
      await user.click(triggerButton);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

     test('displays correct dialog content', async () => {
      const user = userEvent.setup();
      render(<AIPrompt/>);
      
      await user.click(screen.getByTestId('chat-button'));
      
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText('Connect to AI Model')).toBeInTheDocument();
      expect(within(dialog).getByTestId('chat-connect-to-model')).toBeInTheDocument();
      expect(within(dialog).getByPlaceholderText('Provide api key')).toBeInTheDocument();
    });
   
  });