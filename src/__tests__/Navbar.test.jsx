import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Navbar from '../components/Layout/Navbar';

describe('Navbar Component', () => {
  it('renders all expected tabs', () => {
    render(<Navbar activeTab="plan" setActiveTab={() => {}} />);

    expect(screen.getByText('My Plan')).toBeInTheDocument();
    expect(screen.getByText('Nutrition')).toBeInTheDocument();
    expect(screen.getByText('Health')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('applies the active class to the currently active tab', () => {
    const { container } = render(<Navbar activeTab="health" setActiveTab={() => {}} />);

    // The button containing 'Health' should have the 'active' class
    const healthButton = screen.getByText('Health').closest('button');
    expect(healthButton).toHaveClass('active');

    // Other buttons shouldn't have it
    const planButton = screen.getByText('My Plan').closest('button');
    expect(planButton).not.toHaveClass('active');
  });

  it('calls setActiveTab with the correct id when a tab is clicked', () => {
    const setActiveTabMock = vi.fn();
    render(<Navbar activeTab="plan" setActiveTab={setActiveTabMock} />);

    const profileButton = screen.getByText('Profile').closest('button');
    fireEvent.click(profileButton);

    expect(setActiveTabMock).toHaveBeenCalledTimes(1);
    expect(setActiveTabMock).toHaveBeenCalledWith('profile');
  });
});
