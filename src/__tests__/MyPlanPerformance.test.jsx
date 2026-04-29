import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MyPlan from '../components/Dashboard/MyPlan';
import { updateDoc } from 'firebase/firestore';

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
vi.mock('../utils/googleFitService', () => ({
  getToken: vi.fn(() => null),
  getSleep: vi.fn(() => Promise.resolve(null)),
  getRestingHeartRate: vi.fn(() => Promise.resolve(null)),
  getSteps: vi.fn(() => Promise.resolve(null)),
  getCaloriesBurned: vi.fn(() => Promise.resolve(null)),
  get7DayStepAverage: vi.fn(() => Promise.resolve(null)),
}));

describe('MyPlan Performance Optimization', () => {
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
            { name: 'Ex 2', sets: 3, reps: 10, rest: '60s', weight: 'bw' },
            { name: 'Ex 3', sets: 3, reps: 10, rest: '60s', weight: 'bw' },
            { name: 'Ex 4', sets: 3, reps: 10, rest: '60s', weight: 'bw' },
            { name: 'Ex 5', sets: 3, reps: 10, rest: '60s', weight: 'bw' },
          ],
        }
      ]
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('measures the number of updateDoc calls when rapidly toggling exercises', async () => {
    render(<MyPlan aiPlan={mockPlan} formData={{}} />);

    // Wait for the plan to render
    const checkboxes = await screen.findAllByRole('checkbox');
    expect(checkboxes.length).toBe(5);

    // Rapidly toggle 5 checkboxes
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);
    fireEvent.click(checkboxes[2]);
    fireEvent.click(checkboxes[3]);
    fireEvent.click(checkboxes[4]);

    // Wait some time to let debounce (if any) to trigger
    await new Promise(r => setTimeout(r, 1500));

    // Test the expected debounced behaviour - expecting exactly 1 updateDoc call
    expect(updateDoc.mock.calls.length).toBe(1);

    // verify the final payload is correct
    const lastCall = updateDoc.mock.calls[0];
    const payload = lastCall[1].completedExercises;
    expect(payload).toEqual({
      'w1_day1_0': true,
      'w1_day1_1': true,
      'w1_day1_2': true,
      'w1_day1_3': true,
      'w1_day1_4': true,
    });
  });
});
