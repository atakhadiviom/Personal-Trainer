import { describe, it, expect, beforeEach } from 'vitest';
import {
  SET_LOG_KEY,
  MAX_SETS_PER_EXERCISE,
  normalizeExerciseKey,
  parseWeightKg,
  parseRepTarget,
  estimateOneRepMax,
  sanitizeSetLog,
  loadSetLog,
  saveSetLog,
  mergeSetLogs,
  logSet,
  getExerciseSets,
  getPersonalRecord,
  getLastSessionSets,
  isNewPersonalRecord,
  getPersonalRecords,
  getRecentPersonalRecords,
  getWeeklyVolume,
  getNextLoadSuggestion,
  uniqueExercises,
  formatKg
} from '../utils/progressiveOverload';
import { toDateKey } from '../utils/streaks';

const TODAY = new Date(2026, 10, 15, 10, 0, 0);
const daysAgo = (n) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - n);
  return toDateKey(d);
};

const BENCH = { name: 'Bench Press', sets: 3, reps: '8-12', weight: 'Start: 60kg' };

describe('parseWeightKg', () => {
  it('reads plain numbers and kg strings', () => {
    expect(parseWeightKg(60)).toBe(60);
    expect(parseWeightKg('60kg')).toBe(60);
    expect(parseWeightKg('22.5 kg')).toBe(22.5);
    expect(parseWeightKg('Start: 20kg')).toBe(20);
  });

  it('converts pounds to kilograms', () => {
    expect(parseWeightKg('135 lbs')).toBe(61.2);
    expect(parseWeightKg('100 pounds')).toBe(45.4);
  });

  it('treats bodyweight markers as zero load', () => {
    expect(parseWeightKg('BW')).toBe(0);
    expect(parseWeightKg('bodyweight')).toBe(0);
  });

  it('returns null for unreadable or out-of-range values', () => {
    expect(parseWeightKg('')).toBeNull();
    expect(parseWeightKg('Start: Xkg')).toBeNull();
    expect(parseWeightKg('heavy')).toBeNull();
    expect(parseWeightKg(-5)).toBeNull();
    expect(parseWeightKg(900)).toBeNull();
    expect(parseWeightKg(null)).toBeNull();
  });
});

describe('parseRepTarget', () => {
  it('reads ranges and single targets', () => {
    expect(parseRepTarget('8-12')).toEqual({ min: 8, max: 12 });
    expect(parseRepTarget('8–12')).toEqual({ min: 8, max: 12 });
    expect(parseRepTarget('10')).toEqual({ min: 10, max: 10 });
    expect(parseRepTarget(12)).toEqual({ min: 12, max: 12 });
  });

  it('returns null for AMRAP or missing targets', () => {
    expect(parseRepTarget('AMRAP')).toBeNull();
    expect(parseRepTarget('to failure')).toBeNull();
    expect(parseRepTarget('')).toBeNull();
    expect(parseRepTarget(null)).toBeNull();
  });
});

describe('estimateOneRepMax', () => {
  it('applies the Epley formula', () => {
    expect(estimateOneRepMax(60, 10)).toBe(80);
    expect(estimateOneRepMax(100, 5)).toBe(116.7);
    expect(estimateOneRepMax(80, 1)).toBe(80);
  });

  it('ignores bodyweight and invalid input', () => {
    expect(estimateOneRepMax(0, 10)).toBeNull();
    expect(estimateOneRepMax(60, 0)).toBeNull();
    expect(estimateOneRepMax('heavy', 10)).toBeNull();
    expect(estimateOneRepMax(60, 101)).toBeNull();
  });
});

describe('set log storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('normalizes exercise keys consistently', () => {
    expect(normalizeExerciseKey('  Bench   PRESS ')).toBe('bench press');
  });

  it('logs a valid set under the normalized exercise name', () => {
    const log = logSet({}, { exercise: 'Bench Press', weightKg: 60, reps: 10, date: '2026-11-15' });
    expect(getExerciseSets(log, ' bench press ')).toEqual([{ date: '2026-11-15', weightKg: 60, reps: 10 }]);
    expect(log['bench press'].exercise).toBe('Bench Press');
  });

  it('rejects invalid sets without changing the log', () => {
    const base = logSet({}, { exercise: 'Squat', weightKg: 100, reps: 5, date: '2026-11-15' });
    expect(logSet(base, { exercise: '', weightKg: 100, reps: 5 })).toEqual(base);
    expect(logSet(base, { exercise: 'Squat', weightKg: -1, reps: 5 })).toEqual(base);
    expect(logSet(base, { exercise: 'Squat', weightKg: 100, reps: 0 })).toEqual(base);
    expect(logSet(base, { exercise: 'Squat', weightKg: 100, reps: 500 })).toEqual(base);
  });

  it('caps the stored history per exercise', () => {
    let log = {};
    for (let i = 0; i < MAX_SETS_PER_EXERCISE + 25; i += 1) {
      log = logSet(log, { exercise: 'Row', weightKg: 40 + (i % 5), reps: 10, date: daysAgo(200 - i) });
    }
    expect(getExerciseSets(log, 'Row')).toHaveLength(MAX_SETS_PER_EXERCISE);
  });

  it('sanitizes malformed logs', () => {
    const log = sanitizeSetLog({
      bench: { exercise: 'Bench', sets: [{ date: '2026-11-15', weightKg: 60, reps: 8 }, { reps: 'x' }] },
      bad: 'nope',
      empty: { sets: [] }
    });
    expect(Object.keys(log)).toEqual(['bench']);
    expect(log.bench.sets).toHaveLength(1);
    expect(sanitizeSetLog(null)).toEqual({});
    expect(sanitizeSetLog([1, 2])).toEqual({});
  });

  it('round-trips through localStorage and merges logs from another device', () => {
    const local = logSet({}, { exercise: 'Deadlift', weightKg: 120, reps: 5, date: daysAgo(2) });
    saveSetLog(local);
    expect(loadSetLog()).toEqual(local);

    const remote = logSet({}, { exercise: 'deadlift', weightKg: 125, reps: 5, date: daysAgo(1) });
    const merged = mergeSetLogs(loadSetLog(), remote);
    expect(getExerciseSets(merged, 'Deadlift')).toHaveLength(2);
    expect(getPersonalRecord(merged, 'Deadlift').weightKg).toBe(125);
  });

  it('keeps the first exercise name when merging duplicates', () => {
    const a = logSet({}, { exercise: 'Overhead Press', weightKg: 40, reps: 8, date: daysAgo(3) });
    const b = logSet({}, { exercise: 'overhead press', weightKg: 42.5, reps: 8, date: daysAgo(2) });
    const merged = mergeSetLogs(a, b);
    expect(Object.keys(merged)).toHaveLength(1);
    expect(merged['overhead press'].exercise).toBe('Overhead Press');
  });
});

describe('personal records', () => {
  const log = [
    { date: daysAgo(10), weightKg: 60, reps: 8 },
    { date: daysAgo(5), weightKg: 65, reps: 5 },
    { date: daysAgo(3), weightKg: 62.5, reps: 10 }
  ].reduce((acc, set) => logSet(acc, { exercise: 'Bench Press', ...set }), {});

  it('picks the best estimated 1RM as the PR', () => {
    const pr = getPersonalRecord(log, 'Bench Press');
    expect(pr.weightKg).toBe(62.5);
    expect(pr.reps).toBe(10);
    expect(pr.e1rm).toBe(83.3);
    expect(pr.date).toBe(daysAgo(3));
  });

  it('returns null when nothing has been logged', () => {
    expect(getPersonalRecord({}, 'Bench Press')).toBeNull();
    expect(getPersonalRecords({})).toEqual([]);
  });

  it('detects a new PR by estimated 1RM, not raw weight', () => {
    expect(isNewPersonalRecord(log, { exercise: 'Bench Press', weightKg: 65, reps: 10 })).toBe(true);
    expect(isNewPersonalRecord(log, { exercise: 'Bench Press', weightKg: 70, reps: 1 })).toBe(false);
    expect(isNewPersonalRecord(log, { exercise: 'Bench Press', weightKg: 60, reps: 5 })).toBe(false);
    expect(isNewPersonalRecord({}, { exercise: 'Bench Press', weightKg: 60, reps: 5 })).toBe(false);
  });

  it('groups the last session by date', () => {
    const sets = getLastSessionSets(log, 'Bench Press');
    expect(sets).toHaveLength(1);
    expect(sets[0].date).toBe(daysAgo(3));
    expect(getLastSessionSets({}, 'Bench Press')).toEqual([]);
  });

  it('lists records sorted by strength and filters recent PRs', () => {
    const multi = logSet(logSet({}, { exercise: 'Squat', weightKg: 140, reps: 3, date: daysAgo(1) }), {
      exercise: 'Curl', weightKg: 20, reps: 10, date: daysAgo(60)
    });
    const all = getPersonalRecords(multi);
    expect(all[0].exercise).toBe('Squat');
    const recent = getRecentPersonalRecords(multi, { today: TODAY, days: 30 });
    expect(recent.map(r => r.exercise)).not.toContain('Curl');
    expect(recent.map(r => r.exercise)).toContain('Squat');
  });
});

describe('weekly volume', () => {
  it('sums tonnage for the last seven days only', () => {
    let log = {};
    log = logSet(log, { exercise: 'Squat', weightKg: 100, reps: 5, date: daysAgo(0) });
    log = logSet(log, { exercise: 'Squat', weightKg: 100, reps: 5, date: daysAgo(6) });
    log = logSet(log, { exercise: 'Squat', weightKg: 100, reps: 5, date: daysAgo(7) });
    const volume = getWeeklyVolume(log, { today: TODAY });
    expect(volume.sets).toBe(2);
    expect(volume.reps).toBe(10);
    expect(volume.volumeKg).toBe(1000);
    expect(volume.activeDays).toBe(2);
  });

  it('returns zeros with no data', () => {
    expect(getWeeklyVolume({}, { today: TODAY })).toEqual({ volumeKg: 0, sets: 0, reps: 0, activeDays: 0 });
  });
});

describe('progressive overload suggestions', () => {
  const history = (sets) => sets.reduce((acc, set) => logSet(acc, { exercise: 'Bench Press', ...set }), {});

  it('starts from the plan weight when there is no history', () => {
    const suggestion = getNextLoadSuggestion({}, BENCH);
    expect(suggestion.action).toBe('start');
    expect(suggestion.weightKg).toBe(60);
    expect(suggestion.message).toMatch(/Start at 60 kg/);
  });

  it('handles a bodyweight exercise with no load', () => {
    const suggestion = getNextLoadSuggestion({}, { name: 'Push-Up', reps: '12-15', weight: 'BW' });
    expect(suggestion.action).toBe('start');
    expect(suggestion.weightKg).toBe(0);
    expect(suggestion.message).toMatch(/Bodyweight/);
  });

  it('asks for a first log when the plan has no numeric weight', () => {
    const suggestion = getNextLoadSuggestion({}, { name: 'Push-Up', reps: '12-15', weight: 'Start: Xkg' });
    expect(suggestion.action).toBe('start');
    expect(suggestion.weightKg).toBeNull();
    expect(suggestion.message).toMatch(/Log your first set/);
  });

  it('adds 2.5 kg after hitting the top of the rep range', () => {
    const log = history([{ date: daysAgo(2), weightKg: 60, reps: 12 }]);
    const suggestion = getNextLoadSuggestion(log, BENCH);
    expect(suggestion.action).toBe('increase');
    expect(suggestion.weightKg).toBe(62.5);
    expect(suggestion.message).toMatch(/Top of range hit/);
  });

  it('holds when one rep from the top of the range', () => {
    const log = history([{ date: daysAgo(2), weightKg: 60, reps: 11 }]);
    const suggestion = getNextLoadSuggestion(log, BENCH);
    expect(suggestion.action).toBe('hold');
    expect(suggestion.weightKg).toBe(60);
  });

  it('asks for one more rep mid-range', () => {
    const log = history([{ date: daysAgo(2), weightKg: 60, reps: 9 }]);
    const suggestion = getNextLoadSuggestion(log, BENCH);
    expect(suggestion.action).toBe('hold');
    expect(suggestion.reps).toBe(10);
    expect(suggestion.message).toMatch(/Add one rep/);
  });

  it('drops the load when reps fall below the range', () => {
    const log = history([{ date: daysAgo(2), weightKg: 60, reps: 5 }]);
    const suggestion = getNextLoadSuggestion(log, BENCH);
    expect(suggestion.action).toBe('reduce');
    expect(suggestion.weightKg).toBe(57.5);
  });

  it('deloads after three flat sessions', () => {
    const log = history([
      { date: daysAgo(9), weightKg: 60, reps: 8 },
      { date: daysAgo(6), weightKg: 60, reps: 8 },
      { date: daysAgo(3), weightKg: 60, reps: 8 }
    ]);
    const suggestion = getNextLoadSuggestion(log, BENCH);
    expect(suggestion.action).toBe('deload');
    expect(suggestion.weightKg).toBe(55);
    expect(suggestion.message).toMatch(/deload/i);
  });

  it('progresses bodyweight exercises by reps', () => {
    const log = logSet({}, { exercise: 'Push-Up', weightKg: 0, reps: 15, date: daysAgo(1) });
    const suggestion = getNextLoadSuggestion(log, { name: 'Push-Up', reps: '12-15', weight: 'BW' });
    expect(suggestion.action).toBe('increase');
    expect(suggestion.reps).toBe(17);
  });

  it('holds when the exercise has no rep target', () => {
    const log = history([{ date: daysAgo(1), weightKg: 60, reps: 8 }]);
    const suggestion = getNextLoadSuggestion(log, { name: 'Bench Press', reps: 'AMRAP' });
    expect(suggestion.action).toBe('hold');
    expect(suggestion.weightKg).toBe(60);
  });

  it('formats weights for display', () => {
    expect(formatKg(62.5)).toBe('62.5 kg');
    expect(formatKg(60)).toBe('60 kg');
  });
});

describe('uniqueExercises', () => {
  it('dedupes by normalized name and drops blanks', () => {
    const unique = uniqueExercises([
      { name: 'Bench Press' },
      { name: ' bench   press ' },
      { name: 'Squat' },
      { name: '' },
      null
    ]);
    expect(unique).toHaveLength(2);
    expect(unique.map(e => e.name)).toEqual(['Bench Press', 'Squat']);
  });
});

describe('storage key', () => {
  it('uses the namespaced key', () => {
    expect(SET_LOG_KEY).toBe('novafit_set_log');
  });
});
