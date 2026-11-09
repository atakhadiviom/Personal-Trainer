// Reads the last 7 daily calorie-log documents for the weekly scorecard.
// Kept separate from the scorecard engine so the maths stays pure and testable.
import { doc, getDoc } from 'firebase/firestore';
import { getWindowDates } from './weeklyScorecard';

const toFinite = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

// Calorie entries are stored as { meal, cals, pro, carbs, fat }.
export const summarizeCalorieDay = (raw) => {
  if (!raw || !Array.isArray(raw.entries) || raw.entries.length === 0) return null;
  const totals = raw.entries.reduce(
    (acc, entry) => ({
      cals: acc.cals + toFinite(entry?.cals),
      protein: acc.protein + toFinite(entry?.pro),
      carbs: acc.carbs + toFinite(entry?.carbs),
      fat: acc.fat + toFinite(entry?.fat)
    }),
    { cals: 0, protein: 0, carbs: 0, fat: 0 }
  );
  return {
    meals: raw.entries.length,
    cals: Math.round(totals.cals),
    protein: Math.round(totals.protein),
    carbs: Math.round(totals.carbs),
    fat: Math.round(totals.fat)
  };
};

export const loadNutritionWeek = async ({ db, user, today = new Date() } = {}) => {
  if (!db || !user?.uid) return [];
  const dates = getWindowDates(today);
  const results = await Promise.allSettled(
    dates.map(date => getDoc(doc(db, 'users', user.uid, 'calorieLog', date)))
  );
  return results
    .map((result, index) => {
      if (result.status !== 'fulfilled') return null;
      const snap = result.value;
      if (!snap || typeof snap.exists !== 'function' || !snap.exists()) return null;
      const summary = summarizeCalorieDay(snap.data());
      return summary ? { date: dates[index], ...summary } : null;
    })
    .filter(Boolean);
};
