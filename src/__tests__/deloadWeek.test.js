import { describe, it, expect, beforeEach } from 'vitest';
import {
  getWeeklyExerciseBests,
  compareRecentWeeks,
  detectDeloadNeed,
  buildDeloadSchedule,
  getDeloadWeightKg,
  roundToPlate,
  saveDeloadState,
  loadDeloadState,
  clearDeloadState,
  saveDeloadSnapshot,
  loadDeloadSnapshot,
  clearDeloadSnapshot,
  DELOAD_LOAD_RATIO
} from '../utils/deloadWeek';
import { logSet } from '../utils/progressiveOverload';
import { toDateKey } from '../utils/streaks';

const TODAY = new Date(2026, 10, 15, 10, 0, 0); // Sunday 15 Nov 2026
const daysAgo = (n) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - n);
  return toDateKey(d);
};

const buildLog = (entries) => entries.reduce((log, entry) => logSet(log, entry), {});

const EXERCISES = ['Squat', 'Bench Press', 'Deadlift'];

// Two sessions in each of the two completed weeks (Mon 26 Oct and Mon 2 Nov).
const weeklySets = (weightFor) => EXERCISES.flatMap(name => [
  { exercise: name, weightKg: weightFor('older', name), reps: 8, date: daysAgo(17) },
  { exercise: name, weightKg: weightFor('older', name), reps: 8, date: daysAgo(14) },
  { exercise: name, weightKg: weightFor('latest', name), reps: 8, date: daysAgo(10) },
  { exercise: name, weightKg: weightFor('latest', name), reps: 8, date: daysAgo(7) }
]);

const flatLog = buildLog(weeklySets(() => 100));
const progressLog = buildLog(weeklySets((phase) => (phase === 'older' ? 100 : 105)));

const makeSchedule = () => ([
  {
    id: 'day1',
    label: 'Day 1',
    warmup: [],
    cooldown: [],
    exercises: [
      { name: 'Squat', sets: 4, reps: '8-10', rest: '90s', weight: '100 kg' },
      { name: 'Bench Press', sets: 3, reps: '8-12', rest: '90s', weight: 'Start: 60kg' },
      { name: 'Bodyweight Row', sets: 3, reps: '10', rest: '60s', weight: 'BW' },
      { name: 'Sled Push', sets: 2, reps: '20m', rest: '90s', weight: 'Progressive' }
    ]
  }
]);

describe('getWeeklyExerciseBests', () => {
  it('buckets sets by Monday-start week and tracks the best estimated 1RM', () => {
    const buckets = getWeeklyExerciseBests(flatLog, { today: TODAY, weeks: 3 });
    expect(buckets).toHaveLength(3);
    expect(buckets[2].isCurrent).toBe(true);
    expect(buckets[1].sessions).toBe(2);
    expect(buckets[1].exercises.squat.bestE1rm).toBeGreaterThan(100);
    expect(buckets[1].exercises.squat.sessions).toBe(2);
    expect(buckets[1].tonnageKg).toBe(4800); // 3 lifts × 2 days × 100 kg × 8 reps
  });
});

describe('compareRecentWeeks', () => {
  it('is not ready with fewer than two completed weeks', () => {
    const log = buildLog([{ exercise: 'Squat', weightKg: 100, reps: 8, date: daysAgo(1) }]);
    expect(compareRecentWeeks(log, { today: TODAY }).ready).toBe(false);
  });

  it('marks every lift as stalled when loads repeat', () => {
    const comparison = compareRecentWeeks(flatLog, { today: TODAY });
    expect(comparison.ready).toBe(true);
    expect(comparison.tracked).toHaveLength(3);
    expect(comparison.stalled).toHaveLength(3);
    expect(comparison.progressing).toHaveLength(0);
  });

  it('detects progress between the two completed weeks', () => {
    const comparison = compareRecentWeeks(progressLog, { today: TODAY });
    expect(comparison.stalled).toHaveLength(0);
    expect(comparison.progressing).toHaveLength(3);
    expect(comparison.progressing[0].deltaKg).toBeGreaterThan(0);
  });
});

describe('detectDeloadNeed', () => {
  it('asks for more data when there is no history', () => {
    const detection = detectDeloadNeed({}, { today: TODAY });
    expect(detection.needed).toBe(false);
    expect(detection.status).toBe('insufficient');
    expect(detection.triggers).toHaveLength(0);
  });

  it('recommends a deload after two flat weeks', () => {
    const detection = detectDeloadNeed(flatLog, { today: TODAY });
    expect(detection.needed).toBe(true);
    expect(detection.status).toBe('plateau');
    expect(detection.triggers[0].type).toBe('plateau');
    expect(detection.stalled).toHaveLength(3);
    expect(detection.message).toContain('60–70%');
  });

  it('does not deload when lifts are progressing', () => {
    const detection = detectDeloadNeed(progressLog, { today: TODAY });
    expect(detection.needed).toBe(false);
    expect(detection.status).toBe('progressing');
    expect(detection.progressing).toHaveLength(3);
  });

  it('deloads on an overreaching load ratio even when lifts move', () => {
    const detection = detectDeloadNeed(progressLog, { today: TODAY, loadRatio: 1.8 });
    expect(detection.needed).toBe(true);
    expect(detection.status).toBe('overload');
    expect(detection.triggers.some(trigger => trigger.type === 'overload')).toBe(true);
    expect(detection.message).toContain('overreaching');
  });
});

describe('buildDeloadSchedule', () => {
  it('cuts loads to 65% of the last logged weight and drops one set', () => {
    const log = buildLog([
      { exercise: 'Squat', weightKg: 100, reps: 5, date: daysAgo(2) },
      { exercise: 'Bench Press', weightKg: 80, reps: 5, date: daysAgo(2) }
    ]);
    const schedule = makeSchedule();
    const result = buildDeloadSchedule(schedule, log);
    const exercises = result.schedule[0].exercises;

    expect(result.ratio).toBe(DELOAD_LOAD_RATIO);
    expect(exercises[0].weight).toBe('65 kg');
    expect(exercises[0].sets).toBe(3);
    expect(exercises[0].deload).toBe(true);
    expect(exercises[1].weight).toBe('50 kg');
    expect(exercises[1].sets).toBe(2);
    expect(result.changes[0].source).toBe('log');
    expect(result.totalSetsBefore).toBe(12);
    expect(result.totalSetsAfter).toBe(9);
  });

  it('never mutates the input plan', () => {
    const schedule = makeSchedule();
    buildDeloadSchedule(schedule, {});
    expect(schedule[0].exercises[0].weight).toBe('100 kg');
    expect(schedule[0].exercises[0].sets).toBe(4);
    expect(schedule[0].exercises[0].deload).toBeUndefined();
  });

  it('keeps bodyweight moves and drops sets only', () => {
    const result = buildDeloadSchedule(makeSchedule(), {});
    const row = result.schedule[0].exercises[2];
    expect(row.weight).toBe('BW');
    expect(row.sets).toBe(2);
    expect(result.changes[2].toKg).toBe(0);
  });

  it('falls back to an easy-effort label when the plan weight is unreadable', () => {
    const result = buildDeloadSchedule(makeSchedule(), {});
    const row = result.schedule[0].exercises[3];
    expect(row.weight).toBe('BW / easy effort');
    expect(row.sets).toBe(2);
    expect(result.changes[3].fromKg).toBeNull();
  });

  it('never raises the set count below the floor', () => {
    const schedule = [{ exercises: [{ name: 'Plank', sets: 1, reps: '60s', weight: 'BW' }] }];
    const result = buildDeloadSchedule(schedule, {});
    expect(result.schedule[0].exercises[0].sets).toBe(1);
  });

  it('clamps the ratio to the 60–70% band', () => {
    const schedule = [{ exercises: [{ name: 'Squat', sets: 4, reps: '5', weight: '100 kg' }] }];
    expect(buildDeloadSchedule(schedule, {}, { ratio: 0.1 }).ratio).toBe(0.6);
    expect(buildDeloadSchedule(schedule, {}, { ratio: 0.95 }).ratio).toBe(0.7);
    expect(buildDeloadSchedule(schedule, {}, { ratio: 0.6 }).schedule[0].exercises[0].weight).toBe('60 kg');
    expect(buildDeloadSchedule(schedule, {}, { ratio: 0.7 }).schedule[0].exercises[0].weight).toBe('70 kg');
  });

  it('returns zeros for an empty schedule', () => {
    expect(buildDeloadSchedule([], {}).changes).toEqual([]);
    expect(buildDeloadSchedule(null, {}).totalSetsBefore).toBe(0);
  });
});

describe('weight helpers', () => {
  it('rounds down to the nearest 2.5 kg plate', () => {
    expect(roundToPlate(65)).toBe(65);
    expect(roundToPlate(63.7)).toBe(62.5);
    expect(roundToPlate(-5)).toBe(0);
    expect(getDeloadWeightKg(100)).toBe(65);
    expect(getDeloadWeightKg(0)).toBe(0);
  });
});

describe('deload persistence', () => {
  beforeEach(() => {
    for (let week = 1; week <= 12; week += 1) {
      clearDeloadState(week);
      clearDeloadSnapshot(week);
    }
  });

  it('round-trips applied state', () => {
    saveDeloadState(3, { ratio: 0.65, setsDropped: 4 });
    expect(loadDeloadState(3)).toEqual({ ratio: 0.65, setsDropped: 4 });
    clearDeloadState(3);
    expect(loadDeloadState(3)).toBeNull();
  });

  it('round-trips the original plan snapshot', () => {
    const schedule = makeSchedule();
    saveDeloadSnapshot(2, schedule);
    expect(loadDeloadSnapshot(2)).toEqual(schedule);
    clearDeloadSnapshot(2);
    expect(loadDeloadSnapshot(2)).toBeNull();
  });

  it('ignores corrupt stored values', () => {
    localStorage.setItem('novafit_deload_w5', 'not json');
    localStorage.setItem('novafit_deload_restore_w5', '{"not":"an array"}');
    expect(loadDeloadState(5)).toBeNull();
    expect(loadDeloadSnapshot(5)).toBeNull();
  });
});
