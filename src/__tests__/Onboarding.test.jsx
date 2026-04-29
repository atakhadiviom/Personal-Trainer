import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Onboarding from '../components/Onboarding/Onboarding';

describe('Onboarding Component', () => {
  const mockOnFinish = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the first slide correctly', () => {
    render(<Onboarding onFinish={mockOnFinish} />);
    expect(screen.getByText('Your AI Personal Trainer')).toBeInTheDocument();
    expect(screen.getByText(/NovaFit builds a fully personalized/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next →/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Skip/i })).toBeInTheDocument();
    expect(screen.getByText('1 / 4')).toBeInTheDocument();
  });

  it('navigates to the next slide when clicking Next', async () => {
    const user = userEvent.setup();
    render(<Onboarding onFinish={mockOnFinish} />);

    await user.click(screen.getByRole('button', { name: /Next →/i }));

    await waitFor(() => {
      expect(screen.getByText('A Plan That Adapts To You')).toBeInTheDocument();
    });
    expect(screen.getByText('2 / 4')).toBeInTheDocument();
  });

  it('calls onFinish when clicking Skip', async () => {
    const user = userEvent.setup();
    render(<Onboarding onFinish={mockOnFinish} />);

    await user.click(screen.getByRole('button', { name: /Skip/i }));

    expect(mockOnFinish).toHaveBeenCalledTimes(1);
  });

  it('navigates to the last slide and calls onFinish', async () => {
    const user = userEvent.setup();
    render(<Onboarding onFinish={mockOnFinish} />);

    // Slide 1 to 2
    await user.click(screen.getByRole('button', { name: /Next →/i }));
    await waitFor(() => expect(screen.getByText('A Plan That Adapts To You')).toBeInTheDocument());

    // Slide 2 to 3
    await user.click(screen.getByRole('button', { name: /Next →/i }));
    await waitFor(() => expect(screen.getByText('Connected to Your Health')).toBeInTheDocument());

    // Slide 3 to 4 (Last slide)
    await user.click(screen.getByRole('button', { name: /Next →/i }));
    await waitFor(() => expect(screen.getByText("Let's Build Your Body")).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Get Started 🚀/i })).toBeInTheDocument();

    // Click Get Started
    await user.click(screen.getByRole('button', { name: /Get Started 🚀/i }));

    expect(mockOnFinish).toHaveBeenCalledTimes(1);
  });
});
