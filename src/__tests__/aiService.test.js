import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateWorkoutPlan } from '../utils/aiService';
import { getGenerativeModel } from 'firebase/ai';

// Mock firebase/ai
vi.mock('firebase/ai', () => ({
  getGenerativeModel: vi.fn(),
}));

// Mock firebase
vi.mock('../firebase', () => ({
  aiInstance: {},
}));

describe('generateWorkoutPlan', () => {
  let mockGenerateContent;

  beforeEach(() => {
    vi.clearAllMocks();

    mockGenerateContent = vi.fn().mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          overview: { title: "Test Plan" },
          nutrition: { macros: { calories: 2000 } },
          progression: [],
          workout: { schedule: [] },
          mindset: []
        })
      }
    });

    getGenerativeModel.mockReturnValue({
      generateContent: mockGenerateContent,
    });
  });

  it('should handle empty injuryAreas array and default to None in the prompt', async () => {
    const formData = {
      injuryAreas: [],
      age: 30, gender: 'male', weight: 80, height: 180, goal: 'gain muscle', gymName: 'Test Gym'
    };

    await generateWorkoutPlan(formData);

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const prompt = mockGenerateContent.mock.calls[0][0];

    expect(prompt).toContain('AVOID all exercises that stress: none');
    expect(prompt).toContain('- Problem Areas / Injuries: None');
  });

  it('should handle undefined injuryAreas and default to None in the prompt', async () => {
    const formData = {
      age: 30, gender: 'male', weight: 80, height: 180, goal: 'gain muscle', gymName: 'Test Gym'
    };

    await generateWorkoutPlan(formData);

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const prompt = mockGenerateContent.mock.calls[0][0];

    expect(prompt).toContain('AVOID all exercises that stress: none');
    expect(prompt).toContain('- Problem Areas / Injuries: None');
  });
});
