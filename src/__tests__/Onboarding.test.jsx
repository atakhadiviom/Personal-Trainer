import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Onboarding from '../components/Onboarding/Onboarding';

describe('Onboarding', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders the initial slide correctly', () => {
    const onFinish = vi.fn();
    render(<Onboarding onFinish={onFinish} />);

    expect(screen.getByText('Your AI Personal Trainer')).toBeInTheDocument();
    expect(screen.getByText('1 / 4')).toBeInTheDocument();
    expect(screen.getByText('Next →')).toBeInTheDocument();
    expect(screen.getByText('Skip')).toBeInTheDocument();
  });

  it('progresses to the next slide when clicking Next', async () => {
    const onFinish = vi.fn();
    render(<Onboarding onFinish={onFinish} />);

    expect(screen.getByText('Your AI Personal Trainer')).toBeInTheDocument();

    const nextButton = screen.getByText('Next →');

    await act(async () => {
      fireEvent.click(nextButton);
      vi.advanceTimersByTime(280);
    });

    expect(screen.getByText('A Plan That Adapts To You')).toBeInTheDocument();
    expect(screen.getByText('2 / 4')).toBeInTheDocument();
  });

  it('calls onFinish when clicking Skip', () => {
    const onFinish = vi.fn();
    render(<Onboarding onFinish={onFinish} />);

    const skipButton = screen.getByText('Skip');
    fireEvent.click(skipButton);

    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('calls onFinish when clicking Get Started on the last slide', async () => {
    const onFinish = vi.fn();
    render(<Onboarding onFinish={onFinish} />);

    // Advance through the slides
    for (let i = 0; i < 3; i++) {
      const nextButton = screen.getByText('Next →');
      await act(async () => {
        fireEvent.click(nextButton);
        vi.advanceTimersByTime(280);
      });
    }

    // Verify we are on the last slide
    expect(screen.getByText("Let's Build Your Body")).toBeInTheDocument();
    expect(screen.getByText('4 / 4')).toBeInTheDocument();

    // The "Skip" button should not be present on the last slide
    expect(screen.queryByText('Skip')).not.toBeInTheDocument();

    // Click "Get Started 🚀"
    const getStartedButton = screen.getByText('Get Started 🚀');
    fireEvent.click(getStartedButton);

    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
