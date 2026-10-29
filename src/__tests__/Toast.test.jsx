import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Toast from '../components/Layout/Toast';

describe('Toast Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when message is empty or null', () => {
    const { container } = render(<Toast message="" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders success toast with role status', () => {
    render(<Toast message="Plan saved!" type="success" />);
    const toast = screen.getByTestId('toast-notification');
    expect(toast).toHaveTextContent('Plan saved!');
    expect(toast).toHaveAttribute('role', 'status');
    expect(toast).toHaveClass('toast-success');
  });

  it('renders error toast with role alert', () => {
    render(<Toast message="Failed to load" type="error" />);
    const toast = screen.getByTestId('toast-notification');
    expect(toast).toHaveTextContent('Failed to load');
    expect(toast).toHaveAttribute('role', 'alert');
    expect(toast).toHaveClass('toast-error');
  });

  it('calls onClose when close button clicked', () => {
    const handleClose = vi.fn();
    render(<Toast message="Info alert" onClose={handleClose} />);
    const closeBtn = screen.getByLabelText(/close notification/i);
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('auto-dismisses after specified duration', () => {
    const handleClose = vi.fn();
    render(<Toast message="Auto dismiss me" duration={2000} onClose={handleClose} />);
    expect(handleClose).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
