import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateWorkoutPlan } from '../utils/aiService';
import { getGenerativeModel } from 'firebase/ai';

// Mock the firebase/ai module
vi.mock('firebase/ai', () => ({
  getGenerativeModel: vi.fn()
}));

// Mock the firebase configuration
vi.mock('../firebase', () => ({
  aiInstance: {}
}));

describe('generateWorkoutPlan', () => {
  const mockGenerateContent = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up the getGenerativeModel mock to return our mockGenerateContent
    getGenerativeModel.mockReturnValue({
      generateContent: mockGenerateContent
    });
  });

  const baseFormData = {
    age: 30,
    gender: 'male',
    weight: 80,
    height: 180,
    goal: 'build muscle',
    fitnessLevel: 'intermediate',
    injuryAreas: ['knees']
  };

  const expectedPlan = {
    overview: { title: "Test Plan" },
    nutrition: { macros: { calories: 2500 } },
    progression: [],
    workout: { schedule: [] },
    mindset: []
  };

  it('should successfully generate and parse a workout plan', async () => {
    // Setup mock response
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify(expectedPlan)
      }
    });

    const result = await generateWorkoutPlan(baseFormData);

    expect(getGenerativeModel).toHaveBeenCalledWith(expect.anything(), {
      model: "gemini-2.5-flash-lite",
      generationConfig: { responseMimeType: "application/json" }
    });

    expect(mockGenerateContent).toHaveBeenCalled();
    const promptArg = mockGenerateContent.mock.calls[0][0];
    expect(promptArg).toContain('Age: 30');
    expect(promptArg).toContain('Gender: male');
    expect(promptArg).toContain('knees');
    expect(result).toEqual(expectedPlan);
  });

  it('should handle markdown block formatting in the AI response', async () => {
    // Setup mock response with markdown wrapper
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => `\`\`\`json\n${JSON.stringify(expectedPlan)}\n\`\`\``
      }
    });

    const result = await generateWorkoutPlan(baseFormData);
    expect(result).toEqual(expectedPlan);
  });

  it('should include exact goal when provided', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify(expectedPlan)
      }
    });

    await generateWorkoutPlan({
      ...baseFormData,
      exactGoal: 'I want to bench press 100kg'
    });

    const promptArg = mockGenerateContent.mock.calls[0][0];
    expect(promptArg).toContain('Exact Goal Description: I want to bench press 100kg');
  });

  it('should default missing values gracefully', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify(expectedPlan)
      }
    });

    await generateWorkoutPlan({
      age: 25,
      gender: 'female',
      weight: 60,
      height: 165,
      goal: 'lose weight'
    });

    const promptArg = mockGenerateContent.mock.calls[0][0];
    expect(promptArg).toContain('Target Weight: not specifiedkg');
    expect(promptArg).toContain('Estimated Body Fat: unknown%');
    expect(promptArg).toContain('Problem Areas / Injuries: None');
  });

  it('should throw an error if the model throws', async () => {
    mockGenerateContent.mockRejectedValue(new Error('API quota exceeded'));

    await expect(generateWorkoutPlan(baseFormData)).rejects.toThrow('API quota exceeded');
  });

  it('should throw an error if the response is not valid JSON', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => 'This is not JSON'
      }
    });

    await expect(generateWorkoutPlan(baseFormData)).rejects.toThrow();
  });
});
