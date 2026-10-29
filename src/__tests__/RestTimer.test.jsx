import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import RestTimer from '../components/Dashboard/RestTimer';
import { parseRestSeconds, formatTimer } from '../utils/timer';

describe('RestTimer Utilities', () => {
  it('parses strings and numbers correctly', () => {
    expect(parseRestSeconds(45)).toBe(45);
    expect(parseRestSeconds('60s')).toBe(60);
    expect(parseRestSeconds('90 sec')).toBe(90);
    expect(parseRestSeconds('2 min')).toBe(120);
    expect(parseRestSeconds('1.5 min')).toBe(90);
    expect(parseRestSeconds('60-90s')).toBe(60);
    expect(parseRestSeconds('')).toBe(60);
    expect(parseRestSeconds(null)).toBe(60);
  });

  it('formats seconds into mm:ss display', () => {
    expect(formatTimer(0)).toBe('00:00');
    expect(formatTimer(5)).toBe('00:05');
    expect(formatTimer(60)).toBe('01:00');
    expect(formatTimer(90)).toBe('01:30');
    expect(formatTimer(125)).toBe('02:05');
  });
});

describe('RestTimer Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders initial formatted time and exercise name', () => {
    render(
      <RestTimer initialSeconds="90s" exerciseName="Incline Dumbbell Press" />
    );

    expect(screen.getByTestId('rest-timer-digits')).toHaveTextContent('01:30');
    expect(screen.getByText('Incline Dumbbell Press')).toBeInTheDocument();
    expect(screen.getByText('Resting')).toBeInTheDocument();
  });

  it('counts down each second when running', () => {
    render(<RestTimer initialSeconds={60} />);
    expect(screen.getByTestId('rest-timer-digits')).toHaveTextContent('01:00');

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByTestId('rest-timer-digits')).toHaveTextContent('00:55');
  });

  it('pauses and resumes when action button is toggled', () => {
    render(<RestTimer initialSeconds={60} />);

    // Pause
    const toggleBtn = screen.getByLabelText(/pause rest timer/i);
    fireEvent.click(toggleBtn);

    // Time should not advance
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId('rest-timer-digits')).toHaveTextContent('01:00');

    // Resume
    const resumeBtn = screen.getByLabelText(/resume rest timer/i);
    fireEvent.click(resumeBtn);

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId('rest-timer-digits')).toHaveTextContent('00:55');
  });

  it('adjusts time with +30s and -15s buttons', () => {
    render(<RestTimer initialSeconds={60} />);

    const addBtn = screen.getByLabelText(/add 30 seconds/i);
    fireEvent.click(addBtn);
    expect(screen.getByTestId('rest-timer-digits')).toHaveTextContent('01:30');

    const subBtn = screen.getByLabelText(/subtract 15 seconds/i);
    fireEvent.click(subBtn);
    expect(screen.getByTestId('rest-timer-digits')).toHaveTextContent('01:15');
  });

  it('resets timer when reset button is clicked', () => {
    render(<RestTimer initialSeconds={60} />);

    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(screen.getByTestId('rest-timer-digits')).toHaveTextContent('00:40');

    const resetBtn = screen.getByLabelText(/reset rest timer/i);
    fireEvent.click(resetBtn);
    expect(screen.getByTestId('rest-timer-digits')).toHaveTextContent('01:00');
  });

  it('completes when timer reaches zero and triggers onFinish', () => {
    const handleFinish = vi.fn();
    render(<RestTimer initialSeconds={3} onFinish={handleFinish} />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByTestId('rest-timer-digits')).toHaveTextContent('00:00');
    expect(screen.getByText('Rest Finished!')).toBeInTheDocument();
    expect(handleFinish).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button clicked', () => {
    const handleClose = vi.fn();
    render(<RestTimer initialSeconds={60} onClose={handleClose} />);

    const closeBtn = screen.getByLabelText(/close rest timer/i);
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
