import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CalorieTrackerPage from '../components/Dashboard/CalorieTrackerPage';
import * as googleFit from '../utils/googleFitService';
import { auth } from '../firebase';
import { getDoc } from 'firebase/firestore';

// Mock dependencies
vi.mock('../firebase', () => ({
  auth: { currentUser: { uid: 'test-user-123' } },
  db: {},
  aiInstance: {},
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
}));

vi.mock('firebase/ai', () => ({
  getGenerativeModel: vi.fn(),
}));

vi.mock('../utils/googleFitService', () => ({
  getToken: vi.fn(),
  getWeeklyAverageCalories: vi.fn(),
  getSteps: vi.fn(),
  getCaloriesBurned: vi.fn(),
}));

// Mock window.HTMLElement.prototype.scrollIntoView to avoid JS DOM errors
window.HTMLElement.prototype.scrollIntoView = function() {};

describe('CalorieTrackerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles Activity fetch error gracefully', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    googleFit.getToken.mockReturnValue('fake-token');
    googleFit.getSteps.mockRejectedValue(new Error('Network error'));
    googleFit.getCaloriesBurned.mockResolvedValue(500);

    getDoc.mockResolvedValue({
      exists: () => false,
      data: () => ({})
    });

    const formData = { weight: '75', goal: 'fatloss' };

    await act(async () => {
      render(<CalorieTrackerPage formData={formData} />);
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith('Activity fetch error:', expect.any(Error));

    consoleWarnSpy.mockRestore();
  });
});
