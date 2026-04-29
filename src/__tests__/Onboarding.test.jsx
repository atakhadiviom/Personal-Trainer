import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Onboarding from '../components/Onboarding/Onboarding';

describe('Onboarding Component', () => {
  let mockOnFinish;

  beforeEach(() => {
    mockOnFinish = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders the first slide correctly', () => {
    render(<Onboarding onFinish={mockOnFinish} />);

    expect(screen.getByText('Your AI Personal Trainer')).toBeInTheDocument();
    expect(screen.getByText('NovaFit builds a fully personalized 12-week gym plan around your body, goals, and schedule — powered by Gemini AI.')).toBeInTheDocument();
    expect(screen.getByText('Next →')).toBeInTheDocument();
    expect(screen.getByText('Skip')).toBeInTheDocument();
    expect(screen.getByText('1 / 4')).toBeInTheDocument();
  });

  it('calls onFinish immediately when Skip is clicked', () => {
    render(<Onboarding onFinish={mockOnFinish} />);

    const skipButton = screen.getByText('Skip');
    fireEvent.click(skipButton);

    expect(mockOnFinish).toHaveBeenCalledTimes(1);
  });

  it('advances to the next slide when Next is clicked', async () => {
    render(<Onboarding onFinish={mockOnFinish} />);

    const nextButton = screen.getByText('Next →');

    await act(async () => {
      fireEvent.click(nextButton);
      vi.advanceTimersByTime(280);
    });

    expect(screen.getByText('A Plan That Adapts To You')).toBeInTheDocument();
    expect(screen.getByText('2 / 4')).toBeInTheDocument();
  });

  it('shows Get Started button on the last slide and calls onFinish when clicked', async () => {
    render(<Onboarding onFinish={mockOnFinish} />);

    // Slide 1 to 2
    await act(async () => {
      fireEvent.click(screen.getByText('Next →'));
      vi.advanceTimersByTime(280);
    });

    // Slide 2 to 3
    await act(async () => {
      fireEvent.click(screen.getByText('Next →'));
      vi.advanceTimersByTime(280);
    });

    // Slide 3 to 4
    await act(async () => {
      fireEvent.click(screen.getByText('Next →'));
      vi.advanceTimersByTime(280);
    });

    expect(screen.getByText("Let's Build Your Body")).toBeInTheDocument();
    expect(screen.getByText('4 / 4')).toBeInTheDocument();

    const getStartedButton = screen.getByText('Get Started 🚀');
    expect(getStartedButton).toBeInTheDocument();

    // Skip button shouldn't be there on the last slide
    expect(screen.queryByText('Skip')).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(getStartedButton);
    });

    expect(mockOnFinish).toHaveBeenCalledTimes(1);
  });
});
