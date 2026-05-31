import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import MyPlan from '../components/Dashboard/MyPlan';

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

const mockGenerateContent = vi.fn(() => Promise.resolve({
  response: {
    text: () => JSON.stringify({
      schedule: [
        {
          id: 'day1',
          label: 'Upper Body Push',
          warmup: [],
          cooldown: [],
          exercises: [
            { name: 'Dumbbell Flat Bench Press', sets: 3, reps: '10', rest: '60s', weight: 'bw' },
            { name: 'Cable Chest Fly', sets: 3, reps: '10', rest: '60s', weight: 'bw' }
          ]
        }
      ]
    })
  }
}));

vi.mock('firebase/ai', () => ({
  getGenerativeModel: vi.fn(() => ({
    generateContent: mockGenerateContent
  })),
}));

vi.mock('../utils/googleFitService', () => ({
  getToken: vi.fn(() => null),
  getSleepHistory: vi.fn(() => Promise.resolve([])),
  getHeartRate: vi.fn(() => Promise.resolve(null)),
}));

describe('MyPlan checkin feedback logic', () => {
  const mockPlan = {
    workout: {
      schedule: [
        {
          id: 'day1',
          label: 'Upper Body Push',
          warmup: [],
          cooldown: [],
          exercises: [
            { name: 'Dumbbell Flat Bench Press', sets: 3, reps: 10, rest: '60s', weight: 'bw' },
            { name: 'Pec Deck Machine', sets: 3, reps: 10, rest: '60s', weight: 'bw' }
          ],
        }
      ]
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollTo = vi.fn();
  });

  it('incorporates empty user feedback correctly into the AI prompt', async () => {
    render(<MyPlan aiPlan={mockPlan} formData={{ goal: 'test', age: 30, gender: 'male', weight: 80, daysPerWeek: 1 }} />);

    // Complete the two exercises to show the checkin banner
    const checkboxes = await screen.findAllByRole('checkbox');
    await act(async () => {
        fireEvent.click(checkboxes[0]);
        fireEvent.click(checkboxes[1]);
    });

    const banner = await screen.findByText(/Submit Check-In to Unlock Week/i);
    await act(async () => {
        fireEvent.click(banner);
    });

    // Modal should be open. Let's find the "Generate Week 2" button
    const generateBtn = await screen.findByRole('button', { name: /Generate Week 2/i });

    // Leave the feedback inputs empty
    await act(async () => {
        fireEvent.click(generateBtn);
    });

    // Wait for the AI model to be called
    await waitFor(() => {
        expect(mockGenerateContent).toHaveBeenCalled();
    });

    const promptCall = mockGenerateContent.mock.calls[0][0];

    // Check that it gracefully falls back to 'none' when input is empty
    expect(promptCall).toContain('- Pain notes: none');
    expect(promptCall).toContain('- Extra notes: none');
  });
});
