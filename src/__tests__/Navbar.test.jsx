import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Navbar from '../components/Layout/Navbar';

describe('Navbar Component', () => {
  it('renders all navigation tabs', () => {
    render(<Navbar activeTab="plan" setActiveTab={() => {}} />);

    expect(screen.getByRole('button', { name: /📋My Plan/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /🔥Nutrition/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /❤️Health/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /👤Profile/i })).toBeInTheDocument();
  });

  it('highlights the active tab', () => {
    render(<Navbar activeTab="calories" setActiveTab={() => {}} />);

    const caloriesTab = screen.getByRole('button', { name: /🔥Nutrition/i });
    expect(caloriesTab).toHaveClass('active');

    const planTab = screen.getByRole('button', { name: /📋My Plan/i });
    expect(planTab).not.toHaveClass('active');
  });

  it('calls setActiveTab when a tab is clicked', async () => {
    const setActiveTabMock = vi.fn();
    const user = userEvent.setup();

    render(<Navbar activeTab="plan" setActiveTab={setActiveTabMock} />);

    const healthTab = screen.getByRole('button', { name: /❤️Health/i });
    await user.click(healthTab);

    expect(setActiveTabMock).toHaveBeenCalledWith('health');
    expect(setActiveTabMock).toHaveBeenCalledTimes(1);
  });
});
