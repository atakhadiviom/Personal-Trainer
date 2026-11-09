import { describe, it, expect } from 'vitest';
import {
  getWeeklyScorecard,
  summarizeTraining,
  summarizeNutrition,
  summarizeBody,
  getWindowDates,
  formatWindowLabel,
  DEFAULT_PLANNED_DAYS,
  CALORIE_TOLERANCE
} from '../utils/weeklyScorecard';
import { toDateKey } from '../utils/streaks';

const TODAY = new Date(2026, 10, 15, 10, 0, 0);
const daysAgo = (n) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - n);
  return toDateKey(d);
};

const activity = (dates) => dates.reduce((log, date) => ({
  ...log,
  [date]: { exercises: 1, labels: ['Upper Body Push'] }
}), {});

const nutrition = (entries) => entries.map(([offset, cals, protein]) => ({
  date: daysAgo(offset),
  cals,
  protein,
  meals: 3
}));

const body = (points) => points.map(([offset, weightKg]) => ({
  date: daysAgo(offset),
  weightKg
}));

describe('weekly scorecard window', () => {
  it('returns seven dates ending today', () => {
    const dates = getWindowDates(TODAY);
    expect(dates).toHaveLength(7);
    expect(dates[6]).toBe(toDateKey(TODAY));
    expect(dates[0]).toBe(daysAgo(6));
  });

  it('labels the window with short month and day', () => {
    expect(formatWindowLabel('2026-11-09', '2026-11-15')).toBe('Nov 9 – Nov 15');
    expect(formatWindowLabel(null, null)).toBe(' – ');
  });
});

describe('summarizeTraining', () => {
  it('reports no data before the first session', () => {
    const result = summarizeTraining({ activityLog: {}, today: TODAY, plannedDays: 4 });
    expect(result.sessions).toBe(0);
    expect(result.status).toBe('no-data');
    expect(result.score).toBe(0);
    expect(result.value).toBe('0 / 4');
  });

  it('falls back to three planned days', () => {
    const result = summarizeTraining({ activityLog: activity([daysAgo(1)]), today: TODAY });
    expect(result.planned).toBe(DEFAULT_PLANNED_DAYS);
    expect(result.ratio).toBe(0.3);
    expect(result.status).toBe('behind');
  });

  it('counts only dates inside the window', () => {
    const result = summarizeTraining({
      activityLog: activity([daysAgo(0), daysAgo(6), daysAgo(7), daysAgo(20)]),
      today: TODAY,
      plannedDays: 3
    });
    expect(result.sessions).toBe(2);
    expect(result.trainedDates).toEqual([daysAgo(6), daysAgo(0)]);
  });

  it('is on track at half the plan and complete at 100%', () => {
    const half = summarizeTraining({
      activityLog: activity([daysAgo(1), daysAgo(3), daysAgo(5)]),
      today: TODAY,
      plannedDays: 5
    });
    expect(half.score).toBe(60);
    expect(half.status).toBe('on-track');

    const full = summarizeTraining({
      activityLog: activity([daysAgo(1), daysAgo(2), daysAgo(4), daysAgo(6)]),
      today: TODAY,
      plannedDays: 4
    });
    expect(full.score).toBe(100);
    expect(full.status).toBe('complete');
  });

  it('never scores above 100 when training more than planned', () => {
    const result = summarizeTraining({
      activityLog: activity([daysAgo(0), daysAgo(1), daysAgo(2), daysAgo(3), daysAgo(4), daysAgo(5)]),
      today: TODAY,
      plannedDays: 3
    });
    expect(result.score).toBe(100);
    expect(result.ratio).toBe(2);
  });

  it('clamps a nonsensical plan to the 1–7 day range', () => {
    const zero = summarizeTraining({ activityLog: {}, today: TODAY, plannedDays: 0 });
    expect(zero.planned).toBe(1);
    const huge = summarizeTraining({ activityLog: {}, today: TODAY, plannedDays: 40 });
    expect(huge.planned).toBe(7);
  });
});

describe('summarizeNutrition', () => {
  it('is no-data with no logged meals', () => {
    const result = summarizeNutrition({ nutritionDays: [], targetCals: 2000, proteinTarget: 150, today: TODAY });
    expect(result.score).toBeNull();
    expect(result.status).toBe('no-data');
    expect(result.avgCals).toBeNull();
    expect(result.value).toBe('0 / 7');
  });

  it('scores logging coverage alone when no targets are supplied', () => {
    const result = summarizeNutrition({
      nutritionDays: nutrition([[0, 2000, 150], [2, 2100, 140], [4, 1900, 160]]),
      today: TODAY
    });
    expect(result.loggedDays).toBe(3);
    expect(result.coverage).toBe(0.43);
    expect(result.score).toBe(43);
    expect(result.status).toBe('behind');
  });

  it('rewards calorie accuracy and protein on a full week', () => {
    const days = Array.from({ length: 7 }, (_, i) => [i, 2000, 160]);
    const result = summarizeNutrition({
      nutritionDays: nutrition(days),
      targetCals: 2000,
      proteinTarget: 160,
      today: TODAY
    });
    expect(result.coverage).toBe(1);
    expect(result.calorieHitDays).toBe(7);
    expect(result.proteinHitDays).toBe(7);
    expect(result.score).toBe(100);
    expect(result.status).toBe('complete');
  });

  it('applies a 10% calorie tolerance', () => {
    const inside = summarizeNutrition({
      nutritionDays: nutrition([[0, 2180, 0]]),
      targetCals: 2000,
      today: TODAY
    });
    expect(inside.calorieHitDays).toBe(1);

    const outside = summarizeNutrition({
      nutritionDays: nutrition([[0, 2000 * (1 + CALORIE_TOLERANCE) + 20, 0]]),
      targetCals: 2000,
      today: TODAY
    });
    expect(outside.calorieHitDays).toBe(0);
  });

  it('ignores empty, malformed and out-of-window days', () => {
    const result = summarizeNutrition({
      nutritionDays: [
        { date: daysAgo(10), cals: 2500, meals: 4 },
        { date: daysAgo(1), cals: 0, meals: 0 },
        null,
        { date: 'not-a-date', cals: 1200, meals: 2 },
        { date: daysAgo(2), cals: '1800', protein: '90', meals: 2 }
      ],
      today: TODAY
    });
    expect(result.loggedDays).toBe(1);
    expect(result.avgCals).toBe(1800);
    expect(result.days.filter(Boolean)[0].protein).toBe(90);
  });

  it('averages only the logged days', () => {
    const result = summarizeNutrition({
      nutritionDays: nutrition([[0, 1500, 100], [3, 2500, 180]]),
      today: TODAY
    });
    expect(result.avgCals).toBe(2000);
  });
});

describe('summarizeBody', () => {
  it('needs two measurements', () => {
    expect(summarizeBody({ bodyLog: body([[0, 82]]), today: TODAY })).toBeNull();
    expect(summarizeBody({ bodyLog: [], today: TODAY })).toBeNull();
  });

  it('praises a sustainable fat-loss pace', () => {
    const result = summarizeBody({ bodyLog: body([[14, 84], [0, 82]]), goal: 'fatloss', today: TODAY });
    expect(result.delta).toBe(-2);
    expect(result.weeklyRate).toBe(-1);
    expect(result.tone).toBe('good');
    expect(result.title).toBe('Fat loss on pace');
  });

  it('warns when fat loss is too fast', () => {
    const result = summarizeBody({ bodyLog: body([[14, 86], [0, 82]]), goal: 'fatloss', today: TODAY });
    expect(result.weeklyRate).toBe(-2);
    expect(result.tone).toBe('warn');
    expect(result.title).toBe('Cutting too fast');
    expect(result.message).toContain('Add ~200 kcal');
  });

  it('flags weight climbing on a fat-loss goal', () => {
    const result = summarizeBody({ bodyLog: body([[14, 80], [0, 82]]), goal: 'fatloss', today: TODAY });
    expect(result.tone).toBe('warn');
    expect(result.title).toBe('Trending up');
  });

  it('rewards a lean surplus on a muscle goal', () => {
    const result = summarizeBody({ bodyLog: body([[21, 75], [0, 76]]), goal: 'muscle', today: TODAY });
    expect(result.weeklyRate).toBe(0.3);
    expect(result.tone).toBe('good');
    expect(result.title).toBe('Lean gain on pace');
  });

  it('warns about gaining too fast', () => {
    const result = summarizeBody({ bodyLog: body([[7, 78], [0, 80]]), goal: 'muscle', today: TODAY });
    expect(result.tone).toBe('warn');
    expect(result.title).toBe('Gaining too fast');
  });

  it('treats a flat scale as a good sign for recomposition', () => {
    const result = summarizeBody({ bodyLog: body([[21, 80], [0, 80.2]]), goal: 'recomp', today: TODAY });
    expect(result.tone).toBe('good');
    expect(result.title).toBe('Weight is stable');
  });

  it('prefers measurements inside the 28-day window', () => {
    const result = summarizeBody({
      bodyLog: body([[60, 95], [14, 84], [0, 82]]),
      goal: 'fatloss',
      today: TODAY
    });
    expect(result.first).toBe(84);
    expect(result.spanDays).toBe(14);
  });
});

describe('getWeeklyScorecard', () => {
  const base = {
    activityLog: activity([daysAgo(0), daysAgo(2), daysAgo(4), daysAgo(5)]),
    nutritionDays: nutrition([[0, 2000, 160], [1, 2050, 155], [2, 1950, 150], [3, 2100, 165], [4, 2000, 160], [5, 1980, 158], [6, 2020, 162]]),
    bodyLog: body([[14, 84], [0, 82]]),
    daysPerWeek: 4,
    goal: 'fatloss',
    targetCals: 2000,
    proteinTarget: 160,
    today: TODAY
  };

  it('returns a perfect A when every dimension hits target', () => {
    const card = getWeeklyScorecard(base);
    expect(card.score).toBe(100);
    expect(card.grade).toBe('A');
    expect(card.tone).toBe('good');
    expect(card.hasData).toBe(true);
    expect(card.focus.dimension).toBe('progress');
    expect(card.focus.action).toContain('Add 1 rep');
  });

  it('weights training 60% and nutrition 40%', () => {
    const card = getWeeklyScorecard({
      ...base,
      targetCals: null,
      proteinTarget: null,
      nutritionDays: nutrition([[0, 2000, 160], [1, 2000, 160], [2, 2000, 160]])
    });
    // training 100, nutrition = coverage only → 3/7 = 43
    expect(card.training.score).toBe(100);
    expect(card.nutrition.score).toBe(43);
    expect(card.score).toBe(77);
    expect(card.grade).toBe('B');
  });

  it('renormalises to training only when nothing is logged', () => {
    const card = getWeeklyScorecard({
      ...base,
      nutritionDays: [],
      bodyLog: []
    });
    expect(card.score).toBe(100);
    expect(card.nutrition.score).toBeNull();
    expect(card.hasData).toBe(true);
  });

  it('reports no data for a brand-new account', () => {
    const card = getWeeklyScorecard({ activityLog: {}, nutritionDays: [], bodyLog: [], daysPerWeek: 3, today: TODAY });
    expect(card.score).toBeNull();
    expect(card.grade).toBe('—');
    expect(card.tone).toBe('no-data');
    expect(card.hasData).toBe(false);
    expect(card.focus.dimension).toBe('start');
  });

  it('grades D below 55', () => {
    const card = getWeeklyScorecard({
      activityLog: activity([daysAgo(0)]),
      nutritionDays: [],
      daysPerWeek: 5,
      today: TODAY
    });
    expect(card.score).toBe(20);
    expect(card.grade).toBe('D');
    expect(card.tone).toBe('bad');
  });

  it('focuses on training when it is the bigger gap', () => {
    const card = getWeeklyScorecard({
      ...base,
      activityLog: activity([daysAgo(0)]),
      daysPerWeek: 5
    });
    expect(card.focus.dimension).toBe('training');
    expect(card.focus.action).toContain('Schedule 4 more sessions');
  });

  it('focuses on logging when nutrition data is missing', () => {
    const card = getWeeklyScorecard({ ...base, nutritionDays: [] });
    expect(card.training.status).toBe('complete');
    expect(card.focus.dimension).toBe('nutrition');
    expect(card.focus.title).toBe('Nutrition is invisible');
    expect(card.focus.action).toContain('three days');
  });

  it('prioritises logging over a partial training week', () => {
    const card = getWeeklyScorecard({
      ...base,
      activityLog: activity([daysAgo(0), daysAgo(2), daysAgo(4)]),
      daysPerWeek: 4,
      nutritionDays: []
    });
    expect(card.focus.dimension).toBe('nutrition');
  });

  it('asks for more protein when coverage is good but protein is short', () => {
    const card = getWeeklyScorecard({
      ...base,
      nutritionDays: nutrition([[0, 2000, 80], [1, 2000, 80], [2, 2000, 80], [3, 2000, 80], [4, 2000, 80], [5, 2000, 80]])
    });
    expect(card.nutrition.loggedDays).toBe(6);
    expect(card.focus.title).toBe('Protein is short');
    expect(card.focus.action).toContain('53 g protein');
  });

  it('builds highlight chips from the three signals', () => {
    const card = getWeeklyScorecard(base);
    expect(card.highlights).toHaveLength(3);
    expect(card.highlights[0]).toMatchObject({ label: 'Training', value: '4/4 planned days' });
    expect(card.highlights[1].value).toContain('7/7 days logged');
    expect(card.highlights[2].value).toBe('-2 kg over 14 days');
  });
});
