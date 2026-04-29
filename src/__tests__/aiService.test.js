import { describe, it, expect, vi } from 'vitest';
import { generateWorkoutPlan } from '../utils/aiService';
import { getGenerativeModel } from 'firebase/ai';

vi.mock('firebase/ai', () => ({
  getGenerativeModel: vi.fn(() => ({
    generateContent: vi.fn(async (prompt) => {
      return {
        response: {
          text: () => JSON.stringify({ mock: "data", promptCaptured: prompt })
        }
      };
    })
  }))
}));

vi.mock('../firebase', () => ({
  aiInstance: {}
}));

describe('generateWorkoutPlan', () => {
  it('handles empty injuryAreas array by defaulting to None/none in prompt', async () => {
    const formData = {
      injuryAreas: []
    };

    const result = await generateWorkoutPlan(formData);

    expect(result.promptCaptured).toContain('Problem Areas / Injuries: None');
    expect(result.promptCaptured).toContain('AVOID all exercises that stress: none');
  });

  it('handles missing injuryAreas array by defaulting to None/none in prompt', async () => {
    const formData = {};

    const result = await generateWorkoutPlan(formData);

    expect(result.promptCaptured).toContain('Problem Areas / Injuries: None');
    expect(result.promptCaptured).toContain('AVOID all exercises that stress: none');
  });
});
