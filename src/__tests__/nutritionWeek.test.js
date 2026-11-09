import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((...args) => ({ path: args.join('/') })),
  getDoc: vi.fn()
}));

import { getDoc } from 'firebase/firestore';
import { summarizeCalorieDay, loadNutritionWeek } from '../utils/nutritionWeek';
import { toDateKey } from '../utils/streaks';

const TODAY = new Date(2026, 10, 15, 10, 0, 0);

describe('summarizeCalorieDay', () => {
  it('totals the stored cals/pro/carbs/fat fields', () => {
    const day = summarizeCalorieDay({
      entries: [
        { meal: 'Oats', cals: 350, pro: 12, carbs: 55, fat: 8 },
        { meal: 'Chicken rice', cals: 650, pro: 55, carbs: 70, fat: 14 }
      ]
    });
    expect(day).toEqual({ meals: 2, cals: 1000, protein: 67, carbs: 125, fat: 22 });
  });

  it('rounds floating totals and ignores junk values', () => {
    const day = summarizeCalorieDay({
      entries: [
        { cals: 100.4, pro: 10.6 },
        { cals: '50', pro: null },
        { cals: 'nope', pro: undefined }
      ]
    });
    expect(day).toEqual({ meals: 3, cals: 150, protein: 11, carbs: 0, fat: 0 });
  });

  it('returns null for a document with no entries', () => {
    expect(summarizeCalorieDay({})).toBeNull();
    expect(summarizeCalorieDay({ entries: [] })).toBeNull();
    expect(summarizeCalorieDay(null)).toBeNull();
  });
});

describe('loadNutritionWeek', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns only the days that exist and have entries', async () => {
    getDoc.mockImplementation((ref) => {
      if (ref.path.endsWith(toDateKey(TODAY))) {
        return Promise.resolve({
          exists: () => true,
          data: () => ({ entries: [{ cals: 500, pro: 40 }] })
        });
      }
      return Promise.resolve({ exists: () => false, data: () => ({}) });
    });

    const days = await loadNutritionWeek({ db: {}, user: { uid: 'u1' }, today: TODAY });
    expect(getDoc).toHaveBeenCalledTimes(7);
    expect(days).toEqual([{ date: toDateKey(TODAY), meals: 1, cals: 500, protein: 40, carbs: 0, fat: 0 }]);
  });

  it('survives a failed read without dropping the rest of the week', async () => {
    let call = 0;
    getDoc.mockImplementation(() => {
      call += 1;
      if (call === 2) return Promise.reject(new Error('offline'));
      if (call === 3) return Promise.resolve({ exists: () => true, data: () => ({ entries: [{ cals: 300, pro: 20 }] }) });
      return Promise.resolve({ exists: () => false, data: () => ({}) });
    });

    const days = await loadNutritionWeek({ db: {}, user: { uid: 'u1' }, today: TODAY });
    expect(days).toHaveLength(1);
    expect(days[0].cals).toBe(300);
  });

  it('does nothing without an authenticated user', async () => {
    expect(await loadNutritionWeek({ db: {}, user: null, today: TODAY })).toEqual([]);
    expect(await loadNutritionWeek({ db: null, user: { uid: 'u1' }, today: TODAY })).toEqual([]);
    expect(getDoc).not.toHaveBeenCalled();
  });
});
