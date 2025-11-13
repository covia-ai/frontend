import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Iconbutton } from '@/components/Iconbutton';
import { PlusCircleIcon, SquareArrowOutUpRight } from 'lucide-react';
import userEvent from '@testing-library/user-event';

jest.mock('next/router')

describe('IconButton Component', () => {
  test('renders iconbutton with label', () => {
    render( <Iconbutton icon={PlusCircleIcon} message="Connect to new venue" label="Connect to venue"/>);
    expect(screen.getByTestId('btn-label')).toBeInTheDocument();
     expect(screen.getByTestId('btn-icon')).toBeInTheDocument();
  });

  test('renders iconbutton with no label', async () => {
    const user = userEvent.setup();
     render(<Iconbutton icon={SquareArrowOutUpRight} message="View Asset" 
       path={"asset"} pathId={"xyz"} venueId={"venudId"}/>);

   
     const triggerButton = screen.getByTestId('btn-icon');
     expect(triggerButton).toBeInTheDocument();
     await user.click(triggerButton);
    
     
  });

});