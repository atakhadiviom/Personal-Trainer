import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateWorkoutPlan } from '../utils/aiService';
import { getGenerativeModel } from 'firebase/ai';

// Mock dependencies
vi.mock('firebase/ai', () => ({
  getGenerativeModel: vi.fn(),
}));

vi.mock('../firebase', () => ({
  aiInstance: {},
}));

describe('generateWorkoutPlan', () => {
  const mockGenerateContent = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementation
    getGenerativeModel.mockReturnValue({
      generateContent: mockGenerateContent,
    });
  });

  const baseFormData = {
    age: '30',
    gender: 'male',
    weight: '80',
    height: '180',
    goal: 'Build muscle',
    fitnessLevel: 'intermediate',
    injuryAreas: ['none'],
    dietPreference: 'high protein',
    dietControl: 'strict',
    sleepHours: '7-8 hours',
    trainingEnv: 'full gym',
    gymName: 'Gold Gym',
    daysPerWeek: '4',
    sessionLength: '60'
  };

  const validJsonResponse = {
    overview: { title: 'Test Plan', subtitle: 'Test', specialNote: '' },
    nutrition: { macros: { calories: 2500, protein: '150g', carbs: '200g', fat: '80g' }, mealPlan: [] },
    progression: [],
    workout: { schedule: [] },
    mindset: []
  };

  it('should call getGenerativeModel with correct configuration', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify(validJsonResponse)
      }
    });

    await generateWorkoutPlan(baseFormData);

    expect(getGenerativeModel).toHaveBeenCalledWith(
      expect.anything(), // aiInstance
      {
        model: 'gemini-2.5-flash-lite',
        generationConfig: { responseMimeType: 'application/json' }
      }
    );
  });

  it('should successfully parse a valid JSON response without markdown', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify(validJsonResponse)
      }
    });

    const result = await generateWorkoutPlan(baseFormData);
    expect(result).toEqual(validJsonResponse);
  });

  it('should successfully strip markdown backticks and parse JSON', async () => {
    const markdownResponse = `\`\`\`json\n${JSON.stringify(validJsonResponse)}\n\`\`\``;
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => markdownResponse
      }
    });

    const result = await generateWorkoutPlan(baseFormData);
    expect(result).toEqual(validJsonResponse);
  });

  it('should correctly format injury areas in the prompt', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify(validJsonResponse)
      }
    });

    const formDataWithInjuries = {
      ...baseFormData,
      injuryAreas: ['shoulders', 'knees', 'none']
    };

    await generateWorkoutPlan(formDataWithInjuries);

    // Verify the prompt contains the formatted injuries
    const callArgs = mockGenerateContent.mock.calls[0][0];
    expect(callArgs).toContain('AVOID all exercises that stress: shoulders, knees');
    expect(callArgs).toContain('Problem Areas / Injuries: shoulders, knees');
  });

  it('should handle undefined injury areas gracefully', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify(validJsonResponse)
      }
    });

    const formDataWithoutInjuries = {
      ...baseFormData
    };
    delete formDataWithoutInjuries.injuryAreas;

    await generateWorkoutPlan(formDataWithoutInjuries);

    // Verify the prompt uses 'None'
    const callArgs = mockGenerateContent.mock.calls[0][0];
    expect(callArgs).toContain('Problem Areas / Injuries: None');
  });

  it('should throw an error if JSON parsing fails', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => 'Invalid JSON string'
      }
    });

    await expect(generateWorkoutPlan(baseFormData)).rejects.toThrow();
  });
});
