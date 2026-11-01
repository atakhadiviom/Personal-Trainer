import { describe, it, expect, beforeEach } from 'vitest';
import {
  ACTIVITY_LOG_KEY,
  toDateKey,
  daysBetween,
  sanitizeLog,
  loadActivityLog,
  saveActivityLog,
  recordWorkout,
  mergeActivityLogs,
  computeStreak,
  consecutiveTrainingDays,
  getWeekStrip,
  getNextMilestone,
  getMilestoneHit,
  detectFocus,
  getRecoveryAdvice
} from '../utils/streaks';

const TODAY = new Date(2026, 10, 15, 10, 0, 0); // Sun Nov 15 2026, local

const daysAgo = (n) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - n);
  return toDateKey(d);
};

const logFor = (offsets, label = 'Full Body') =>
  Object.fromEntries(offsets.map(n => [daysAgo(n), { exercises: 4, labels: [label] }]));

describe('streak date helpers', () => {
  it('formats local date keys with zero padding', () => {
    expect(toDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('counts calendar days between keys, including across months', () => {
    expect(daysBetween('2026-10-30', '2026-11-02')).toBe(3);
    expect(daysBetween('2026-11-02', '2026-11-02')).toBe(0);
  });
});

describe('activity log persistence', () => {
  beforeEach(() => localStorage.clear());

  it('sanitizes invalid keys and entries', () => {
    const clean = sanitizeLog({
      '2026-11-01': { exercises: 3, labels: ['Push', 42, ''] },
      'not-a-date': { exercises: 1, labels: [] },
      '2026-11-02': null,
      '2026-11-03': { exercises: -2 }
    });
    expect(clean).toEqual({
      '2026-11-01': { exercises: 3, labels: ['Push'] },
      '2026-11-03': { exercises: 1, labels: [] }
    });
    expect(sanitizeLog(['bad'])).toEqual({});
    expect(sanitizeLog(null)).toEqual({});
  });

  it('round-trips through localStorage and survives corrupt data', () => {
    const log = logFor([0, 1]);
    saveActivityLog(log);
    expect(loadActivityLog()).toEqual(log);
    localStorage.setItem(ACTIVITY_LOG_KEY, '{broken');
    expect(loadActivityLog()).toEqual({});
  });

  it('records workouts per day, counting exercises and unique labels', () => {
    let log = recordWorkout({}, { date: TODAY, label: 'Upper Body Push' });
    log = recordWorkout(log, { date: TODAY, label: 'Upper Body Push' });
    log = recordWorkout(log, { date: TODAY, label: 'Core' });
    log = recordWorkout(log, { date: TODAY });
    expect(log[toDateKey(TODAY)]).toEqual({ exercises: 4, labels: ['Upper Body Push', 'Core'] });
  });

  it('merges local and cloud logs without losing days', () => {
    const merged = mergeActivityLogs(
      { '2026-11-01': { exercises: 2, labels: ['Push'] } },
      { '2026-11-01': { exercises: 5, labels: ['Pull'] }, '2026-11-03': { exercises: 1, labels: [] } }
    );
    expect(merged).toEqual({
      '2026-11-01': { exercises: 5, labels: ['Push', 'Pull'] },
      '2026-11-03': { exercises: 1, labels: [] }
    });
  });
});

describe('computeStreak', () => {
  it('returns zeros for an empty log', () => {
    expect(computeStreak({}, TODAY)).toMatchObject({ current: 0, longest: 0, totalWorkouts: 0, trainedToday: false, daysSinceLast: null });
  });

  it('keeps the streak alive across up to 2 rest days', () => {
    const streak = computeStreak(logFor([0, 2, 5, 6]), TODAY);
    expect(streak.current).toBe(4);
    expect(streak.longest).toBe(4);
    expect(streak.trainedToday).toBe(true);
  });

  it('breaks the chain after 3 rest days and tracks the longest streak', () => {
    const streak = computeStreak(logFor([0, 1, 10, 11, 12, 13]), TODAY);
    expect(streak.current).toBe(2);
    expect(streak.longest).toBe(4);
    expect(streak.totalWorkouts).toBe(6);
  });

  it('reports remaining rest days before the streak ends', () => {
    expect(computeStreak(logFor([1]), TODAY).restDaysLeft).toBe(2);
    expect(computeStreak(logFor([2]), TODAY).restDaysLeft).toBe(1);
    expect(computeStreak(logFor([3]), TODAY)).toMatchObject({ current: 1, restDaysLeft: 0 });
  });

  it('drops the current streak to 0 once it has lapsed', () => {
    expect(computeStreak(logFor([4, 5]), TODAY)).toMatchObject({ current: 0, longest: 2, daysSinceLast: 4 });
  });

  it('ignores future-dated entries', () => {
    const log = { ...logFor([1]), [toDateKey(new Date(2026, 10, 20))]: { exercises: 1, labels: [] } };
    expect(computeStreak(log, TODAY).totalWorkouts).toBe(1);
  });
});

describe('consecutiveTrainingDays', () => {
  it('counts back-to-back days ending today or yesterday', () => {
    expect(consecutiveTrainingDays(logFor([0, 1, 2]), TODAY)).toBe(3);
    expect(consecutiveTrainingDays(logFor([1, 2, 3, 5]), TODAY)).toBe(3);
    expect(consecutiveTrainingDays(logFor([2, 3]), TODAY)).toBe(0);
  });
});

describe('getWeekStrip', () => {
  it('returns 7 days ending today with trained flags', () => {
    const strip = getWeekStrip(logFor([0, 3]), TODAY);
    expect(strip).toHaveLength(7);
    expect(strip[6]).toMatchObject({ key: daysAgo(0), trained: true, isToday: true });
    expect(strip[3]).toMatchObject({ key: daysAgo(3), trained: true, isToday: false });
    expect(strip.filter(d => d.trained)).toHaveLength(2);
    expect(strip[6].initial).toBe('S');
  });
});

describe('milestones', () => {
  it('finds the next milestone and detects exact hits', () => {
    expect(getNextMilestone(0)).toBe(3);
    expect(getNextMilestone(7)).toBe(14);
    expect(getNextMilestone(100)).toBeNull();
    expect(getMilestoneHit(7)).toBe(7);
    expect(getMilestoneHit(8)).toBeNull();
  });
});

describe('detectFocus', () => {
  it('maps day labels to muscle focus', () => {
    expect(detectFocus('Upper Body Push')).toBe('push');
    expect(detectFocus('Back & Biceps Pull')).toBe('pull');
    expect(detectFocus('Lower Body')).toBe('legs');
    expect(detectFocus('Full Body Conditioning')).toBe('fullbody');
    expect(detectFocus()).toBe('fullbody');
  });
});

describe('getRecoveryAdvice', () => {
  it('prompts a new user to start', () => {
    expect(getRecoveryAdvice({}, { today: TODAY }).status).toBe('start');
  });

  it('recommends rest after low sleep, without breaking the streak', () => {
    const advice = getRecoveryAdvice(logFor([1]), { today: TODAY, sleepHours: '5.2' });
    expect(advice.status).toBe('rest');
    expect(advice.message).toContain('5.2 hrs');
    expect(advice.message).toContain("won't break your streak");
  });

  it('recommends rest after 3+ consecutive training days', () => {
    const advice = getRecoveryAdvice(logFor([1, 2, 3], 'Lower Body'), { today: TODAY });
    expect(advice.status).toBe('rest');
    expect(advice.title).toContain('3 days in a row');
    expect(advice.tips.some(t => t.includes('Foam roll'))).toBe(true);
  });

  it('gives post-workout recovery advice when trained today', () => {
    const advice = getRecoveryAdvice(logFor([0], 'Upper Body Push'), { today: TODAY, sleepHours: 4 });
    expect(advice.status).toBe('recover');
    expect(advice.tips.some(t => t.includes('pec stretch'))).toBe(true);
  });

  it('warns when today is the last chance to keep the streak', () => {
    const advice = getRecoveryAdvice(logFor([3, 5]), { today: TODAY });
    expect(advice.status).toBe('train');
    expect(advice.title).toBe('Train today to keep your streak');
  });

  it('suggests easing back in after a lapse', () => {
    const advice = getRecoveryAdvice(logFor([6]), { today: TODAY });
    expect(advice.status).toBe('comeback');
    expect(advice.message).toContain('6 days');
  });

  it('marks the athlete ready after a rest day', () => {
    const advice = getRecoveryAdvice(logFor([2], 'Pull Day'), { today: TODAY, sleepHours: 8 });
    expect(advice.status).toBe('train');
    expect(advice.title).toBe('Recovered and ready to train');
    expect(advice.tips.some(t => t.includes('Dead hang'))).toBe(true);
  });
});
