import { describe, it, expect, vi } from 'vitest';
import { generateWorkoutPlan } from '../utils/aiService';

let mockResponseText = "";
vi.mock('firebase/ai', () => ({
  getGenerativeModel: () => ({
    generateContent: vi.fn().mockImplementation(async () => {
      return {
        response: {
          text: () => mockResponseText
        }
      }
    })
  })
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
