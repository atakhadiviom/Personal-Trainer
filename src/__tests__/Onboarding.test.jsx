import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Onboarding from '../components/Onboarding/Onboarding';

describe('Onboarding Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the first slide initially', () => {
    const mockOnFinish = vi.fn();
    render(<Onboarding onFinish={mockOnFinish} />);

    expect(screen.getByText('Your AI Personal Trainer')).toBeInTheDocument();
    expect(screen.getByText(/NovaFit builds a fully personalized 12-week gym plan/i)).toBeInTheDocument();
    expect(screen.getByText('1 / 4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Skip/i })).toBeInTheDocument();
  });

  it('calls onFinish when clicking Skip', async () => {
    const mockOnFinish = vi.fn();
    const user = userEvent.setup();
    render(<Onboarding onFinish={mockOnFinish} />);

    await user.click(screen.getByRole('button', { name: /Skip/i }));

    expect(mockOnFinish).toHaveBeenCalledTimes(1);
  });

  it('advances through slides when clicking Next', async () => {
    const mockOnFinish = vi.fn();
    const user = userEvent.setup();
    render(<Onboarding onFinish={mockOnFinish} />);

    // Click Next on slide 1
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Next/i }));
    });

    // Wait for slide 2
    await waitFor(() => {
      expect(screen.getByText('A Plan That Adapts To You')).toBeInTheDocument();
      expect(screen.getByText('2 / 4')).toBeInTheDocument();
    });

    // Click Next on slide 2
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Next/i }));
    });

    // Wait for slide 3
    await waitFor(() => {
      expect(screen.getByText('Connected to Your Health')).toBeInTheDocument();
      expect(screen.getByText('3 / 4')).toBeInTheDocument();
    });

    // Click Next on slide 3
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Next/i }));
    });

    // Wait for slide 4
    await waitFor(() => {
      expect(screen.getByText("Let's Build Your Body")).toBeInTheDocument();
      expect(screen.getByText('4 / 4')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Get Started 🚀/i })).toBeInTheDocument();
    });

    // Skip button should not be present on the last slide
    expect(screen.queryByRole('button', { name: /Skip/i })).not.toBeInTheDocument();
  });

  it('calls onFinish when clicking Get Started on the last slide', async () => {
    const mockOnFinish = vi.fn();
    const user = userEvent.setup();
    render(<Onboarding onFinish={mockOnFinish} />);

    // Go to the last slide
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await user.click(screen.getByRole('button', { name: /Next/i }));
      });
      // Need a small wait for the state transition to finish
      await waitFor(() => {
        expect(screen.getByText(`${i + 2} / 4`)).toBeInTheDocument();
      });
    }

    // Click Get Started
    await user.click(screen.getByRole('button', { name: /Get Started 🚀/i }));

    expect(mockOnFinish).toHaveBeenCalledTimes(1);
  });
});
