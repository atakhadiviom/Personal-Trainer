import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateWorkoutPlan } from '../utils/aiService';
import { getGenerativeModel } from 'firebase/ai';
import { aiInstance } from '../firebase';

vi.mock('firebase/ai', () => ({
  getGenerativeModel: vi.fn(),
}));

vi.mock('../firebase', () => ({
  aiInstance: {},
}));

describe('generateWorkoutPlan', () => {
  let mockGenerateContent;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateContent = vi.fn();
    getGenerativeModel.mockReturnValue({
      generateContent: mockGenerateContent,
    });
  });

  const mockFormData = {
    age: '30',
    gender: 'Male',
    weight: '80',
    height: '180',
    goal: 'muscle',
    fitnessLevel: 'intermediate',
    injuryAreas: ['knees'],
    dietPreference: 'vegan',
    dietControl: 'strict',
    sleepHours: '8',
    trainingEnv: 'gym',
    gymName: 'Gold Gym',
    daysPerWeek: '4',
    sessionLength: '60',
    exactGoal: 'Get huge'
  };

  const validResponseJson = {
    overview: { title: "Test Plan", subtitle: "Test", specialNote: "" },
    nutrition: { macros: { calories: 2500, protein: "150g", carbs: "300g", fat: "80g" }, mealPlan: [] },
    progression: [],
    workout: { schedule: [] },
    mindset: []
  };

  it('correctly sets the model parameters', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify(validResponseJson) }
    });

    await generateWorkoutPlan(mockFormData);

    expect(getGenerativeModel).toHaveBeenCalledWith(aiInstance, {
      model: "gemini-2.5-flash-lite",
      generationConfig: { responseMimeType: "application/json" }
    });
  });

  it('successfully parses standard JSON output', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify(validResponseJson) }
    });

    const result = await generateWorkoutPlan(mockFormData);
    expect(result).toEqual(validResponseJson);
  });

  it('successfully trims markdown ticks before parsing JSON', async () => {
    const markdownResponse = `\`\`\`json
${JSON.stringify(validResponseJson)}
\`\`\``;

    mockGenerateContent.mockResolvedValue({
      response: { text: () => markdownResponse }
    });

    const result = await generateWorkoutPlan(mockFormData);
    expect(result).toEqual(validResponseJson);
  });

  it('correctly formats formData into the AI prompt', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify(validResponseJson) }
    });

    await generateWorkoutPlan(mockFormData);

    const prompt = mockGenerateContent.mock.calls[0][0];

    expect(prompt).toContain('Age: 30');
    expect(prompt).toContain('Gender: Male');
    expect(prompt).toContain('Target Weight: not specifiedkg'); // Check default fallback handling
    expect(prompt).toContain('Problem Areas / Injuries: knees');
    expect(prompt).toContain('Exact Goal Description: Get huge');
  });

  it('handles "none" in injuryAreas correctly', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify(validResponseJson) }
    });

    await generateWorkoutPlan({ ...mockFormData, injuryAreas: ['none'] });

    const prompt = mockGenerateContent.mock.calls[0][0];
    // Filtered 'none' means injuryList is empty, fallback is 'None' or 'none' depending on line
    expect(prompt).toContain('Problem Areas / Injuries: None');
    expect(prompt).toContain('AVOID all exercises that stress: none');
  });

  it('propagates errors from generateContent', async () => {
    const error = new Error("Quota exceeded");
    mockGenerateContent.mockRejectedValue(error);

    await expect(generateWorkoutPlan(mockFormData)).rejects.toThrow("Quota exceeded");
  });
});
