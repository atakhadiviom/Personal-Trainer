import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ErrorBoundary from '../components/Layout/ErrorBoundary';

// A component that intentionally throws
const Bomb = () => {
  throw new Error('Kaboom');
};

describe('ErrorBoundary Component', () => {
  it('renders children flawlessly when there is no error', () => {
    render(
      <ErrorBoundary>
        <div data-testid="safe-child">Safe</div>
      </ErrorBoundary>
    );
    expect(screen.getByTestId('safe-child')).toBeInTheDocument();
  });

  it('catches runtime errors and renders the Crash Fallback UI', () => {
    // Suppress console.error strictly for this test so the terminal isn't noisy
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    // Should display the Super Title "System Crash."
    expect(screen.getByText('System Crash.')).toBeInTheDocument();
    
    // Should display the reboot button
    expect(screen.getByRole('button', { name: /REBOOT SYSTEM/i })).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
