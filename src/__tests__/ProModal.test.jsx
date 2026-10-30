import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn(key => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = String(value); }),
    removeItem: vi.fn(key => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock, configurable: true, writable: true });
Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true, writable: true });

import ProModal from '../components/Dashboard/ProModal';
import { upgradeToPro } from '../utils/subscription';

describe('ProModal Component', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<ProModal isOpen={false} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders pro modal header, billing toggle, and features when open', () => {
    render(<ProModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByTestId('pro-modal-card')).toBeInTheDocument();
    expect(screen.getByText('NOVAFIT PRO ATHLETE')).toBeInTheDocument();
    expect(screen.getByText('Unlimited AI Workout Adjustments')).toBeInTheDocument();
    expect(screen.getByText('Deep Biometric Sleep & HRV Integration')).toBeInTheDocument();
    expect(screen.getByText('Custom Macro Targets & Meal Optimization')).toBeInTheDocument();
    expect(screen.getByText('Priority 24/7 DeepSeek AI Coach')).toBeInTheDocument();
  });

  it('switches between monthly and annual billing cycles', () => {
    render(<ProModal isOpen={true} onClose={vi.fn()} />);

    const monthlyBtn = screen.getByTestId('cycle-monthly-btn');
    const annualBtn = screen.getByTestId('cycle-annual-btn');

    // Default is monthly ($9.99 / month)
    expect(screen.getByText('$9.99 / month')).toBeInTheDocument();

    // Switch to annual
    fireEvent.click(annualBtn);
    expect(screen.getByText('$79.99 / year')).toBeInTheDocument();
    expect(screen.getByText('Save 33%')).toBeInTheDocument();

    // Switch back to monthly
    fireEvent.click(monthlyBtn);
    expect(screen.getByText('$9.99 / month')).toBeInTheDocument();
  });

  it('handles upgrade action and fires onSuccess callback', async () => {
    const mockSuccess = vi.fn();
    const mockClose = vi.fn();

    render(<ProModal isOpen={true} onClose={mockClose} onSuccess={mockSuccess} />);

    const upgradeBtn = screen.getByTestId('btn-confirm-upgrade');
    fireEvent.click(upgradeBtn);

    // Shows loading text
    expect(screen.getByText('Activating NovaFit Pro...')).toBeInTheDocument();

    // Fast forward timer
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining('Welcome to NovaFit Pro!'));
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('displays active banner and downgrade button when user is already Pro', () => {
    upgradeToPro('monthly');

    render(<ProModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByTestId('pro-active-banner')).toBeInTheDocument();
    expect(screen.getByText('NovaFit Pro is Active')).toBeInTheDocument();
    expect(screen.getByTestId('btn-cancel-pro')).toBeInTheDocument();
  });

  it('allows downgrading / cancelling Pro from the modal', () => {
    upgradeToPro('monthly');
    const mockSuccess = vi.fn();
    const mockClose = vi.fn();

    render(<ProModal isOpen={true} onClose={mockClose} onSuccess={mockSuccess} />);

    const cancelBtn = screen.getByTestId('btn-cancel-pro');
    fireEvent.click(cancelBtn);

    expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining('returned to the Free tier'));
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('closes on close button or backdrop click', () => {
    const mockClose = vi.fn();
    render(<ProModal isOpen={true} onClose={mockClose} />);

    // Click close button
    const closeBtn = screen.getByLabelText('Close modal');
    fireEvent.click(closeBtn);
    expect(mockClose).toHaveBeenCalledTimes(1);

    // Click backdrop
    const backdrop = screen.getByTestId('pro-modal-backdrop');
    fireEvent.click(backdrop);
    expect(mockClose).toHaveBeenCalledTimes(2);
  });

  it('closes when pressing the Escape key', () => {
    const mockClose = vi.fn();
    render(<ProModal isOpen={true} onClose={mockClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});
