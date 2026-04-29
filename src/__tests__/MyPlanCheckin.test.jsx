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

const generateContentMock = vi.fn();
vi.mock('firebase/ai', () => ({
  getGenerativeModel: vi.fn(() => ({
    generateContent: generateContentMock
  })),
}));

vi.mock('../utils/googleFitService', () => ({
  getToken: vi.fn(() => null),
  getSleep: vi.fn(() => Promise.resolve(null)),
  getRestingHeartRate: vi.fn(() => Promise.resolve(null)),
  getSteps: vi.fn(() => Promise.resolve(null)),
  getCaloriesBurned: vi.fn(() => Promise.resolve(null)),
  get7DayStepAverage: vi.fn(() => Promise.resolve(null)),
  getHeartRate: vi.fn(() => Promise.resolve(null)),
  getSleepHistory: vi.fn(() => Promise.resolve([])),
}));

describe('MyPlan Checkin', () => {
  const mockPlan = {
    workout: {
      schedule: [
        {
          id: 'day1',
          label: 'Upper Body Push',
          warmup: [],
          cooldown: [],
          exercises: [
            { name: 'Dumbbell Flat Bench Press', sets: 3, reps: '10', rest: '60s', weight: 'bw' },
          ],
        }
      ]
    }
  };

  const mockFormData = {
    goal: 'Muscle Gain',
    targetWeight: 80,
    fitnessLevel: 'intermediate',
    age: 30,
    gender: 'male',
    weight: 75,
    sessionLength: '45',
    daysPerWeek: 1
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock the window.scrollTo
    window.scrollTo = vi.fn();

    // Mock the generateContent to return a valid JSON plan string
    generateContentMock.mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          schedule: [
            {
              id: 'day1',
              label: 'Upper Body Push',
              warmup: [],
              cooldown: [],
              exercises: [
                { name: 'Cable Chest Fly', sets: 3, reps: '10', rest: '60s', weight: 'bw' },
              ],
            }
          ]
        })
      }
    });
  });

  it('uses default "none" for empty or whitespace-only notes and pain fields in the AI prompt', async () => {
    await act(async () => {
      render(<MyPlan aiPlan={mockPlan} formData={mockFormData} />);
    });

    // Complete the exercise to trigger check-in
    const checkboxes = screen.getAllByRole('checkbox');
    await act(async () => {
      fireEvent.click(checkboxes[0]);
    });

    // Checkin modal has a 600ms timeout
    await act(async () => {
      await new Promise(r => setTimeout(r, 700));
    });

    // Wait for modal to appear
    const generateBtn = await screen.findByText(/Generate Week 2/i);
    expect(generateBtn).toBeTruthy();

    // Verify textareas are initially empty, then fill them with whitespace
    const textareas = screen.getAllByRole('textbox');

    await act(async () => {
      fireEvent.change(textareas[0], { target: { value: '   ' } });
      fireEvent.change(textareas[1], { target: { value: ' \n  ' } });
    });

    // Click Generate button
    await act(async () => {
      fireEvent.click(generateBtn);
    });

    // Verify generateContent is called
    await waitFor(() => {
      expect(generateContentMock).toHaveBeenCalled();
    });

    // Check the prompt string
    const passedPrompt = generateContentMock.mock.calls[0][0];

    // Verify "none" fallback is used when inputs are only whitespace
    expect(passedPrompt).toContain('- Pain notes: none');
    expect(passedPrompt).toContain('- Extra notes: none');
  });
});
