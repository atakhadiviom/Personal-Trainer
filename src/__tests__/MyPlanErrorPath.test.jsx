import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import MyPlan from '../components/Dashboard/MyPlan';
import { getGenerativeModel } from 'firebase/ai';

// Mock dependencies
vi.mock('../firebase', () => {
  return {
    auth: { currentUser: { uid: 'test-user' } },
    db: {},
    aiInstance: {}
  };
});

vi.mock('firebase/firestore', () => {
  return {
    doc: vi.fn(),
    getDoc: vi.fn(() => Promise.resolve({ exists: () => true, data: () => ({ completedExercises: {} }) })),
    updateDoc: vi.fn(() => Promise.resolve()),
  };
});

vi.mock('firebase/ai', () => ({
  getGenerativeModel: vi.fn(),
}));

// Mock utils
vi.mock('../utils/googleFitService', () => ({
  getToken: vi.fn(() => null),
  getSleep: vi.fn(() => Promise.resolve(null)),
  getRestingHeartRate: vi.fn(() => Promise.resolve(null)),
  getSteps: vi.fn(() => Promise.resolve(null)),
  getCaloriesBurned: vi.fn(() => Promise.resolve(null)),
  get7DayStepAverage: vi.fn(() => Promise.resolve(null)),
}));

describe('MyPlan Error Paths', () => {
  const mockPlan = {
    workout: {
      schedule: [
        {
          id: 'day1',
          label: 'Day 1',
          warmup: [],
          cooldown: [],
          exercises: [
            { name: 'Push Up', sets: 3, reps: 10, rest: '60s', weight: 'bw', guide: 'test' },
          ],
        }
      ]
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles AI swap error gracefully', async () => {
    // Setup AI to throw
    getGenerativeModel.mockReturnValue({
      generateContent: vi.fn().mockRejectedValue(new Error('AI generation failed'))
    });

    // Mock console.error to avoid cluttering test output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<MyPlan aiPlan={mockPlan} formData={{}} />);

    // Wait for render
    const swapButton = await screen.findByText('🔄 Swap');

    // Click swap
    await act(async () => {
      fireEvent.click(swapButton);
    });

    // Check loading state (wait for it to disappear)
    await waitFor(() => {
      expect(screen.queryByText('⏳ Swapping...')).not.toBeInTheDocument();
    });

    // Button should revert
    expect(swapButton).toHaveTextContent('🔄 Swap');
    expect(swapButton).not.toBeDisabled();

    // Check if error was logged
    expect(consoleSpy).toHaveBeenCalledWith('AI Swap failed:', expect.any(Error));

    // verify UI shows an error
    expect(screen.getByText('AI Swap failed.')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
