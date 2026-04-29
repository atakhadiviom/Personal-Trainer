import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateWorkoutPlan } from '../utils/aiService';
import { getGenerativeModel } from 'firebase/ai';

// Mock the ai instance from firebase
vi.mock('../firebase', () => ({
  aiInstance: {}
}));

// Mock firebase/ai
vi.mock('firebase/ai', () => ({
  getGenerativeModel: vi.fn()
}));

describe('generateWorkoutPlan', () => {
  const mockFormData = {
    age: 30,
    gender: 'male',
    weight: 80,
    height: 180,
    goal: 'build muscle'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('securely extracts and parses JSON even when surrounded by markdown and text', async () => {
    const mockValidJson = {
      overview: { title: "Test", subtitle: "Test", specialNote: "Test" },
      nutrition: { macros: { calories: 2000, protein: "180g", carbs: "180g", fat: "70g" }, mealPlan: [] },
      progression: [],
      workout: { schedule: [] },
      mindset: []
    };

    const aiResponseText = `
      Here is your plan!
      \`\`\`json
      ${JSON.stringify(mockValidJson, null, 2)}
      \`\`\`
      Good luck!
    `;

    const mockGenerateContent = vi.fn().mockResolvedValue({
      response: {
        text: () => aiResponseText
      }
    });

    getGenerativeModel.mockReturnValue({
      generateContent: mockGenerateContent
    });

    const result = await generateWorkoutPlan(mockFormData);
    expect(result).toEqual(mockValidJson);
  });

  it('throws an error if the extracted JSON is missing required schema keys', async () => {
    const mockInvalidJson = {
      overview: { title: "Test" },
      // missing nutrition, progression, workout, mindset
    };

    const aiResponseText = JSON.stringify(mockInvalidJson);

    const mockGenerateContent = vi.fn().mockResolvedValue({
      response: {
        text: () => aiResponseText
      }
    });

    getGenerativeModel.mockReturnValue({
      generateContent: mockGenerateContent
    });

    await expect(generateWorkoutPlan(mockFormData)).rejects.toThrowError(
      /Invalid JSON schema: Missing keys - nutrition, progression, workout, mindset/
    );
  });

  it('throws an error if no JSON block is found', async () => {
     const aiResponseText = `Sorry, I cannot help with that.`;

    const mockGenerateContent = vi.fn().mockResolvedValue({
      response: {
        text: () => aiResponseText
      }
    });

    getGenerativeModel.mockReturnValue({
      generateContent: mockGenerateContent
    });

    await expect(generateWorkoutPlan(mockFormData)).rejects.toThrowError(
      /Invalid response format: Missing JSON block/
    );
  });
});
