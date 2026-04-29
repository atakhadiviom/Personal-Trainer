import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateWorkoutPlan } from '../utils/aiService';
import { getGenerativeModel } from 'firebase/ai';

vi.mock('firebase/ai', () => ({
  getGenerativeModel: vi.fn()
}));

vi.mock('../firebase', () => ({
  aiInstance: {}
}));

describe('aiService - generateWorkoutPlan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles empty injuryAreas array correctly', async () => {
    const mockGenerateContent = vi.fn().mockResolvedValue({
      response: {
        text: () => JSON.stringify({ overview: { title: "Test Plan" } })
      }
    });

    getGenerativeModel.mockReturnValue({
      generateContent: mockGenerateContent
    });

    const formData = {
      age: 30,
      gender: 'Male',
      weight: 80,
      height: 180,
      goal: 'Muscle Gain',
      injuryAreas: [] // empty array
    };

    const result = await generateWorkoutPlan(formData);

    expect(result.overview.title).toBe('Test Plan');
    expect(mockGenerateContent).toHaveBeenCalled();
    const passedPrompt = mockGenerateContent.mock.calls[0][0];

    // It should contain Problem Areas / Injuries: None
    expect(passedPrompt).toContain('- Problem Areas / Injuries: None');
  });

  it('handles completely missing injuryAreas correctly', async () => {
    const mockGenerateContent = vi.fn().mockResolvedValue({
      response: {
        text: () => JSON.stringify({ overview: { title: "Test Plan 2" } })
      }
    });

    getGenerativeModel.mockReturnValue({
      generateContent: mockGenerateContent
    });

    const formData = {
      age: 30,
      gender: 'Male',
      weight: 80,
      height: 180,
      goal: 'Muscle Gain'
      // injuryAreas omitted
    };

    const result = await generateWorkoutPlan(formData);

    expect(result.overview.title).toBe('Test Plan 2');
    expect(mockGenerateContent).toHaveBeenCalled();
    const passedPrompt = mockGenerateContent.mock.calls[0][0];

    expect(passedPrompt).toContain('- Problem Areas / Injuries: None');
  });
});
