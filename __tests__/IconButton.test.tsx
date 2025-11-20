// Mock FIRST, before any imports that use useRouter
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Iconbutton } from '@/components/Iconbutton';
import { PlusCircleIcon, SquareArrowOutUpRight } from 'lucide-react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';

const mockUseRouter = useRouter as jest.Mock;

describe('IconButton Component', () => {
  test('renders iconbutton with label', () => {
    render( <Iconbutton icon={PlusCircleIcon} message="Connect to new venue" label="Connect to venue"/>);
    expect(screen.getByTestId('btn-label')).toBeInTheDocument();
     expect(screen.getByTestId('btn-icon')).toBeInTheDocument();
  });

  test('renders iconbutton with no label', async () => {
    const user = userEvent.setup();
    const pushMock = jest.fn();
          
          // Setup the mock
          mockUseRouter.mockReturnValue(
            {
            push: pushMock,
            replace: jest.fn(),
            prefetch: jest.fn(),
            back: jest.fn(),
            forward: jest.fn(),
            refresh: jest.fn(),
          }
          )
     render(<Iconbutton icon={SquareArrowOutUpRight} message="View Asset" 
       path={"asset"} pathId={"xyz"} venueId={"venudId"}/>);
      
     const triggerButton = screen.getByTestId('btn-icon');
     expect(triggerButton).toBeInTheDocument();
     await user.click(triggerButton);
     expect(pushMock).toHaveBeenCalledWith(expect.stringContaining('xyz'));
     
  });

});