import '@testing-library/jest-dom';
import { render, screen, fireEvent, within } from '@testing-library/react';
import {DarkLightToggle} from '@/components/DarkLightToggle';
import userEvent from '@testing-library/user-event';

jest.mock('next-themes', () => ({
  useTheme: jest.fn(() => ({
    theme: 'light',
    setTheme: jest.fn(),
    themes: ['light', 'dark'],
    systemTheme: 'light',
    resolvedTheme: 'light',
  }))
}));
describe('DarkLightToggle Component', () => {

 test('toggleDarkLightComponent ',  async() => {
    const user = userEvent.setup();
    render(<DarkLightToggle/>);
    const moonBtn = screen.getByTestId('btn_toggle_light');
    expect(moonBtn).toBeInTheDocument();
    await user.click(moonBtn)
    const sunBtn = screen.queryByTestId('btn_toggle_light');
    expect(sunBtn).toBeInTheDocument();

 });
});