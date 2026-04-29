import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import MyPlan from '../components/Dashboard/MyPlan';
import * as aiModule from 'firebase/ai';

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
    getDoc: vi.fn(() => Promise.resolve({
      exists: () => true,
      data: () => ({
        completedExercises: {
          'w1_day1_0': true
        }
      })
    })),
    updateDoc: vi.fn(() => Promise.resolve()),
  };
});
vi.mock('firebase/ai', () => ({
  getGenerativeModel: vi.fn(),
}));
vi.mock('../utils/googleFitService', () => ({
  getToken: vi.fn(() => null),
  getSleep: vi.fn(() => Promise.resolve(null)),
  getRestingHeartRate: vi.fn(() => Promise.resolve(null)),
  getSteps: vi.fn(() => Promise.resolve(null)),
  getCaloriesBurned: vi.fn(() => Promise.resolve(null)),
  get7DayStepAverage: vi.fn(() => Promise.resolve(null)),
}));

describe('MyPlan AI Check-in failure', () => {
  const mockPlan = {
    workout: {
      schedule: [
        {
          id: 'day1',
          label: 'Day 1',
          warmup: [],
          cooldown: [],
          exercises: [
            { name: 'Ex 1', sets: 3, reps: 10, rest: '60s', weight: 'bw' },
          ],
        }
      ]
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays error message when AI check-in generation fails', async () => {
    // Mock getGenerativeModel to throw an error when generateContent is called
    aiModule.getGenerativeModel.mockReturnValue({
      generateContent: vi.fn().mockRejectedValue(new Error('AI generation failed'))
    });

    await act(async () => {
      render(<MyPlan aiPlan={mockPlan} formData={{ weight: 70 }} />);
    });

    // Verify check-in banner is displayed because we mocked completedExercises
    const checkinBtn = await screen.findByText(/Submit Check-In to Unlock Week 2/i);
    expect(checkinBtn).toBeTruthy();

    // Click to open check-in modal
    await act(async () => {
      fireEvent.click(checkinBtn);
    });

    // Modal should be visible, find the generate button
    const generateBtn = await screen.findByRole('button', { name: /Generate Week 2/i });
    expect(generateBtn).toBeTruthy();

    // Click generate button, which should trigger the AI call and fail
    await act(async () => {
      fireEvent.click(generateBtn);
    });

    // Check if error message is displayed
    const errorMessage = await screen.findByText('Failed to generate adjustment. Please try again.');
    expect(errorMessage).toBeTruthy();
  });
});
