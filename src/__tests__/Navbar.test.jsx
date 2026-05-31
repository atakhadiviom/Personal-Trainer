import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Navbar from '../components/Layout/Navbar';

describe('Navbar Component', () => {
  const tabs = [
    { id: 'plan', label: 'My Plan' },
    { id: 'calories', label: 'Nutrition' },
    { id: 'health', label: 'Health' },
    { id: 'profile', label: 'Profile' }
  ];

  it('renders all tabs', () => {
    render(<Navbar activeTab="plan" setActiveTab={() => {}} />);

    tabs.forEach(tab => {
      expect(screen.getByText(tab.label)).toBeInTheDocument();
    });
  });

  it('highlights the correct active tab based on activeTab prop', () => {
    const { rerender } = render(<Navbar activeTab="plan" setActiveTab={() => {}} />);

    let planButton = screen.getByText('My Plan').closest('button');
    expect(planButton).toHaveClass('active');

    let nutritionButton = screen.getByText('Nutrition').closest('button');
    expect(nutritionButton).not.toHaveClass('active');

    rerender(<Navbar activeTab="calories" setActiveTab={() => {}} />);

    planButton = screen.getByText('My Plan').closest('button');
    expect(planButton).not.toHaveClass('active');

    nutritionButton = screen.getByText('Nutrition').closest('button');
    expect(nutritionButton).toHaveClass('active');
  });

  it('calls setActiveTab with the correct tab.id when a tab is clicked', () => {
    const setActiveTabMock = vi.fn();
    render(<Navbar activeTab="plan" setActiveTab={setActiveTabMock} />);

    const nutritionButton = screen.getByText('Nutrition').closest('button');
    fireEvent.click(nutritionButton);

    expect(setActiveTabMock).toHaveBeenCalledTimes(1);
    expect(setActiveTabMock).toHaveBeenCalledWith('calories');
  });
});
