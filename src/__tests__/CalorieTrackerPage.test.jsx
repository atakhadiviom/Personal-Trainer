import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CalorieTrackerPage from '../components/Dashboard/CalorieTrackerPage';
import * as googleFitService from '../utils/googleFitService';

// Mock the firebase modules
vi.mock('../firebase', () => ({
  auth: { currentUser: { uid: '123' } },
  db: {},
  aiInstance: {}
}));

// Mock firebase/firestore
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
  setDoc: vi.fn(),
}));

// Mock firebase/ai
vi.mock('firebase/ai', () => ({
  getGenerativeModel: vi.fn(() => ({
    generateContent: vi.fn()
  }))
}));

// Mock googleFitService
vi.mock('../utils/googleFitService', () => ({
  getToken: vi.fn(() => 'mock-token'), // Ensure token exists so fetchActivityData proceeds
  getSteps: vi.fn(),
  getCaloriesBurned: vi.fn(),
  getWeeklyAverageCalories: vi.fn(() => Promise.resolve(null)),
}));

describe('CalorieTrackerPage - Activity Fetch Error', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock scrollIntoView because jsdom does not implement it
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('handles activity fetch errors gracefully and falls back to default UI', async () => {
    // Make getSteps reject to trigger the catch block in fetchActivityData
    const mockError = new Error('Network failure');
    googleFitService.getSteps.mockRejectedValueOnce(mockError);
    googleFitService.getCaloriesBurned.mockResolvedValueOnce(500); // the promise.all will fail entirely

    // Spy on console.warn to verify the error is logged as expected
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const formData = { weight: '80', goal: 'fatloss' };

    render(<CalorieTrackerPage formData={formData} />);

    // Wait for the component to handle the asynchronous fetch
    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith('Activity fetch error:', mockError);
    });

    // Verify fallback UI state: The step bonus should NOT be displayed
    // "Steps bonus" is the text used for step calories feature
    expect(screen.queryByText(/Steps bonus/i)).not.toBeInTheDocument();

    // Verify fallback hydration goal: 2.5L is default when fitCalsBurned <= 500 or null
    expect(screen.getByText(/2.5L today/)).toBeInTheDocument();

    warnSpy.mockRestore();
  });
});
