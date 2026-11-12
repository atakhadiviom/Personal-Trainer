import { describe, it, expect, beforeEach } from 'vitest';
import {
  ACTIVE_SESSION_KEY,
  createSession,
  currentExerciseIndex,
  formatSessionDuration,
  getAutoRegulatedSet,
  getSetDefaults,
  isSessionComplete,
  logSessionSet,
  loadActiveSession,
  parseTargetSets,
  restoreSession,
  saveActiveSession,
  clearActiveSession,
  sessionDurationMs,
  sessionProgress,
  sessionTotals,
  skipExercise,
  undoLastSet,
  MAX_SETS
} from '../utils/workoutSession';
import { logSet } from '../utils/progressiveOverload';
import { toDateKey } from '../utils/streaks';

const DAY = {
  id: 'day2',
  label: 'Upper Body Pull',
  exercises: [
    { name: 'Lat Pulldown', sets: 2, reps: '8-12', rest: '90s', weight: '40kg', guide: 'Drive elbows down' },
    { name: 'Cable Row', sets: 3, reps: '10-12', rest: '60s', weight: '30kg' }
  ]
};

const NOW = new Date(2026, 10, 6, 9, 0, 0);

const dayAgo = () => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - 1);
  return toDateKey(d);
};

describe('workoutSession engine', () => {
  it('parses planned set counts defensively', () => {
    expect(parseTargetSets(4)).toBe(4);
    expect(parseTargetSets('3')).toBe(3);
    expect(parseTargetSets('4 x 10')).toBe(4);
    expect(parseTargetSets('3-4')).toBe(3);
    expect(parseTargetSets(99)).toBe(MAX_SETS);
    expect(parseTargetSets('nope')).toBe(3);
    expect(parseTargetSets(undefined)).toBe(3);
  });

  it('creates a session from a plan day with empty set logs', () => {
    const session = createSession(DAY, { now: NOW });
    expect(session.dayId).toBe('day2');
    expect(session.label).toBe('Upper Body Pull');
    expect(session.startedAt).toBe(NOW.getTime());
    expect(session.exercises.map(ex => ex.name)).toEqual(['Lat Pulldown', 'Cable Row']);
    expect(session.exercises[0]).toMatchObject({ targetSets: 2, reps: '8-12', rest: '90s', logged: [] });
    expect(isSessionComplete(session)).toBe(false);
    expect(currentExerciseIndex(session)).toBe(0);
  });

  it('falls back safely when a day is missing data', () => {
    const session = createSession({}, { now: NOW });
    expect(session.label).toBe('Workout');
    expect(session.exercises).toEqual([]);
    expect(isSessionComplete(session)).toBe(true);
  });

  it('logs sets against the current exercise and stops at the target', () => {
    let session = createSession(DAY, { now: NOW });
    session = logSessionSet(session, { weightKg: 40, reps: 10, at: NOW.getTime() });
    expect(session.exercises[0].logged).toHaveLength(1);
    expect(session.exercises[0].logged[0]).toMatchObject({ weightKg: 40, reps: 10 });

    session = logSessionSet(session, { weightKg: 42.5, reps: 8 });
    expect(session.exercises[0].logged).toHaveLength(2);

    // A set beyond the target belongs to the next exercise, not this one.
    const advanced = logSessionSet(session, { weightKg: 45, reps: 8 });
    expect(advanced.exercises[0].logged).toHaveLength(2);
    expect(advanced.exercises[1].logged).toHaveLength(1);
    expect(currentExerciseIndex(advanced)).toBe(1);
  });

  it('rejects impossible sets without mutating the session', () => {
    const session = createSession(DAY, { now: NOW });
    expect(logSessionSet(session, { weightKg: -5, reps: 10 })).toBe(session);
    expect(logSessionSet(session, { weightKg: 40, reps: 0 })).toBe(session);
    expect(logSessionSet(session, { weightKg: 40, reps: 101 })).toBe(session);
    expect(logSessionSet(session, { weightKg: 900, reps: 10 })).toBe(session);
    expect(logSessionSet(session, { weightKg: 40, reps: 10, exerciseIndex: 99 })).toBe(session);
  });

  it('reports progress across exercises', () => {
    let session = createSession(DAY, { now: NOW });
    expect(sessionProgress(session)).toMatchObject({
      totalSets: 5, doneSets: 0, totalExercises: 2, doneExercises: 0, percent: 0
    });

    session = logSessionSet(session, { weightKg: 40, reps: 10 });
    session = logSessionSet(session, { weightKg: 40, reps: 10 });
    session = logSessionSet(session, { weightKg: 30, reps: 12 });
    expect(sessionProgress(session)).toMatchObject({
      totalSets: 5, doneSets: 3, doneExercises: 1, percent: 60
    });
  });

  it('skips an exercise and moves to the next one', () => {
    const session = skipExercise(createSession(DAY, { now: NOW }));
    expect(session.exercises[0].skipped).toBe(true);
    expect(currentExerciseIndex(session)).toBe(1);

    const finished = skipExercise(skipExercise(createSession(DAY, { now: NOW })));
    expect(isSessionComplete(finished)).toBe(true);

    // No current exercise → skip is a no-op
    expect(skipExercise(finished)).toBe(finished);
  });

  it('un-does the most recent set, across exercise boundaries', () => {
    let session = createSession(DAY, { now: NOW });
    session = logSessionSet(session, { weightKg: 40, reps: 10 });
    session = logSessionSet(session, { weightKg: 40, reps: 10 });
    session = logSessionSet(session, { weightKg: 30, reps: 12 });

    session = undoLastSet(session);
    expect(session.exercises[0].logged).toHaveLength(2);
    expect(session.exercises[1].logged).toHaveLength(0);

    session = undoLastSet(undoLastSet(session));
    expect(session.exercises[0].logged).toHaveLength(0);
    expect(undoLastSet(session)).toBe(session);
  });

  it('computes session tonnage, reps and duration', () => {
    let session = createSession(DAY, { now: NOW });
    session = logSessionSet(session, { weightKg: 40, reps: 10 });
    session = logSessionSet(session, { weightKg: 42.5, reps: 8 });
    expect(sessionTotals(session)).toEqual({ sets: 2, reps: 18, volumeKg: 740 });

    session = logSessionSet(session, { weightKg: 30, reps: 12 });
    expect(sessionTotals(session)).toEqual({ sets: 3, reps: 30, volumeKg: 1100 });

    expect(sessionDurationMs(session, { now: NOW.getTime() + 905000 })).toBe(905000);
    expect(formatSessionDuration(905000)).toBe('15:05');
    expect(formatSessionDuration(3725000)).toBe('1h 2m');
    expect(formatSessionDuration(-10)).toBe('0:00');
  });

  it('prefills from the plan weight, then from the coach progression target', () => {
    const fresh = createSession(DAY, { now: NOW });
    expect(getSetDefaults(fresh, {})).toEqual({ weight: '40', reps: '12' });

    // Last session topped the 8-12 range → +2.5 kg, back to the bottom of the range.
    const setLog = logSet({}, {
      exercise: 'Lat Pulldown', weightKg: 40, reps: 12, date: dayAgo()
    });
    expect(getSetDefaults(fresh, setLog)).toEqual({ weight: '42.5', reps: '8' });
  });

  it('prefills bodyweight exercises at zero load', () => {
    const day = { id: 'd', label: 'Core', exercises: [{ name: 'Hollow Hold', sets: 3, reps: '30s', weight: 'BW' }] };
    expect(getSetDefaults(createSession(day, { now: NOW }), {})).toEqual({ weight: '0', reps: '30' });
  });

  it('stores RPE on a logged set and drops unreadable values', () => {
    let session = createSession(DAY, { now: NOW });
    session = logSessionSet(session, { weightKg: 40, reps: 10, rpe: 8 });
    expect(session.exercises[0].logged[0]).toMatchObject({ weightKg: 40, reps: 10, rpe: 8 });

    session = logSessionSet(session, { weightKg: 40, reps: 8, rpe: 15 });
    expect(session.exercises[0].logged[1].rpe).toBeNull();
  });

  it('autoregulates the next set only when the last set carries an RPE', () => {
    const withRpe = logSessionSet(createSession(DAY, { now: NOW }), { weightKg: 40, reps: 12, rpe: 8 });
    expect(getAutoRegulatedSet(withRpe)).toMatchObject({
      action: 'increase', weightKg: 45, reps: 8, rir: 2
    });
    expect(getSetDefaults(withRpe, {})).toEqual({ weight: '45', reps: '8' });

    const withoutRpe = logSessionSet(createSession(DAY, { now: NOW }), { weightKg: 40, reps: 12 });
    expect(getAutoRegulatedSet(withoutRpe)).toBeNull();
    expect(getSetDefaults(withoutRpe, {})).toEqual({ weight: '40', reps: '12' });
  });

  it('stops autoregulating on the last planned set of an exercise', () => {
    let session = createSession(DAY, { now: NOW });
    session = logSessionSet(session, { weightKg: 40, reps: 12, rpe: 8 });
    session = logSessionSet(session, { weightKg: 45, reps: 8, rpe: 9 });
    expect(session.exercises[0].logged).toHaveLength(2);
    expect(getAutoRegulatedSet(session)).toBeNull();
  });

  it('keeps RPE through a session restore', () => {
    const live = logSessionSet(createSession(DAY, { now: new Date() }), { weightKg: 40, reps: 9, rpe: 8 });
    saveActiveSession(live);
    expect(loadActiveSession().exercises[0].logged[0].rpe).toBe(8);
  });

  describe('persistence', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('saves, restores and clears an active session', () => {
      const live = logSessionSet(createSession(DAY, { now: new Date() }), { weightKg: 40, reps: 9 });
      saveActiveSession(live);
      expect(localStorage.getItem(ACTIVE_SESSION_KEY)).toBeTruthy();

      const restored = loadActiveSession();
      expect(restored.dayId).toBe('day2');
      expect(restored.exercises[0].logged).toHaveLength(1);

      clearActiveSession();
      expect(loadActiveSession()).toBeNull();
    });

    it('rejects malformed and stale sessions', () => {
      expect(restoreSession('{oops')).toBeNull();
      expect(restoreSession({})).toBeNull();
      expect(restoreSession({ dayId: 'd', startedAt: Date.now(), exercises: [] })).toBeNull();
      expect(restoreSession({
        dayId: 'd', startedAt: Date.now(), exercises: [{ name: 123 }]
      })).toBeNull();

      const stale = { dayId: 'd', label: 'Old', startedAt: Date.now() - 13 * 60 * 60 * 1000, exercises: [{ name: 'Squat' }] };
      expect(restoreSession(stale)).toBeNull();
    });

    it('sanitises restored set logs', () => {
      const restored = restoreSession({
        dayId: 'day1',
        label: 'Legs',
        startedAt: Date.now(),
        exercises: [{
          name: 'Squat',
          targetSets: '4',
          skipped: 1,
          logged: [
            { weightKg: 100, reps: 5 },
            { weightKg: -10, reps: 5 },
            { weightKg: 100, reps: 0 },
            null
          ]
        }]
      });
      expect(restored.exercises[0].targetSets).toBe(4);
      expect(restored.exercises[0].skipped).toBe(true);
      expect(restored.exercises[0].logged).toHaveLength(1);
      expect(restored.exercises[0].logged[0]).toMatchObject({ weightKg: 100, reps: 5 });
    });
  });
});
