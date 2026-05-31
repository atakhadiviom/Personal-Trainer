import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateWorkoutPlan } from '../utils/aiService';
import { getGenerativeModel } from 'firebase/ai';
import { aiInstance } from '../firebase';

let mockResponseText = "";
vi.mock('firebase/ai', () => ({
  getGenerativeModel: vi.fn(() => ({
    generateContent: vi.fn().mockImplementation(async () => ({
      response: { text: () => mockResponseText }
    }))
  })),
}));

vi.mock('../firebase', () => ({
  aiInstance: {},
}));

describe('aiService - JSON parsing security', () => {
  it('parses pure JSON correctly', async () => {
    mockResponseText = '{ "overview": { "title": "Test JSON" } }';
    const result = await generateWorkoutPlan({});
    expect(result.overview.title).toBe('Test JSON');
  });

  it('parses JSON wrapped in markdown correctly', async () => {
    mockResponseText = "```json\n{\n  \"overview\": { \"title\": \"Test MD\" }\n}\n```";
    const result = await generateWorkoutPlan({});
    expect(result.overview.title).toBe('Test MD');
  });

  it('parses JSON mixed with conversational text', async () => {
    mockResponseText = "Here is your plan:\n```json\n{\n  \"overview\": { \"title\": \"Test Convo\" }\n}\n```\nGood luck!";
    const result = await generateWorkoutPlan({});
    expect(result.overview.title).toBe('Test Convo');
  });

  it('parses JSON correctly when JSON values contain backticks', async () => {
    // The vulnerability was that text.replace(/```/g, '') would corrupt string values like this.
    mockResponseText = "```json\n{\n  \"overview\": { \"title\": \"Test ``` backticks\" }\n}\n```";
    const result = await generateWorkoutPlan({});
    expect(result.overview.title).toBe('Test ``` backticks');
  });
});

describe('generateWorkoutPlan', () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses gemini-3-flash-preview with JSON response mode', async () => {
    mockResponseText = JSON.stringify(validResponseJson);
    await generateWorkoutPlan(mockFormData);
    expect(getGenerativeModel).toHaveBeenCalledWith(aiInstance, {
      model: "gemini-3-flash-preview",
      generationConfig: { responseMimeType: "application/json" }
    });
  });

  it('includes injury areas in the prompt', async () => {
    mockResponseText = JSON.stringify(validResponseJson);
    const mockGenerate = vi.fn().mockResolvedValue({ response: { text: () => mockResponseText } });
    getGenerativeModel.mockReturnValue({ generateContent: mockGenerate });

    await generateWorkoutPlan(mockFormData);

    const prompt = mockGenerate.mock.calls[0][0];
    expect(prompt).toContain('knees');
    expect(prompt).toContain('Get huge');
  });

  it('handles empty injury areas array', async () => {
    mockResponseText = JSON.stringify(validResponseJson);
    const mockGenerate = vi.fn().mockResolvedValue({ response: { text: () => mockResponseText } });
    getGenerativeModel.mockReturnValue({ generateContent: mockGenerate });

    await generateWorkoutPlan({ ...mockFormData, injuryAreas: [] });

    const prompt = mockGenerate.mock.calls[0][0];
    expect(prompt).toContain('Problem Areas / Injuries: None');
  });
});
