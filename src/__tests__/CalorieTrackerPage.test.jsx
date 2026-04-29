import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CalorieTrackerPage from '../components/Dashboard/CalorieTrackerPage';
import * as googleFit from '../utils/googleFitService';

vi.mock('../firebase', () => ({
  auth: { currentUser: { uid: 'test-user' } },
  db: {},
  aiInstance: {}
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false, data: () => ({}) }),
  setDoc: vi.fn()
}));

vi.mock('firebase/ai', () => ({
  getGenerativeModel: vi.fn()
}));

vi.mock('../utils/googleFitService', () => ({
  getToken: vi.fn(),
  getWeeklyAverageCalories: vi.fn().mockResolvedValue(null),
  getSteps: vi.fn(),
  getCaloriesBurned: vi.fn()
}));

// Mock scrollIntoView which is not implemented in jsdom
window.HTMLElement.prototype.scrollIntoView = vi.fn();

describe('CalorieTrackerPage - Activity Fetch Error', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles activity fetch error gracefully', async () => {
    // Setup mocks
    googleFit.getToken.mockReturnValue('fake-token');

    const mockError = new Error('Test fetch error');
    googleFit.getSteps.mockRejectedValue(mockError);
    googleFit.getCaloriesBurned.mockResolvedValue(500);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const formData = { weight: 75, goal: 'fatloss' };

    await act(async () => {
      render(<CalorieTrackerPage formData={formData} />);
    });

    await waitFor(() => {
      expect(googleFit.getSteps).toHaveBeenCalled();
    });

    expect(warnSpy).toHaveBeenCalledWith('Activity fetch error:', mockError);

    warnSpy.mockRestore();
  });
});
