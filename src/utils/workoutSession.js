// Guided workout session engine.
// A session is a plain serialisable object so an in-progress workout survives a
// refresh (or a locked phone) and can be restored without touching Firestore.
//
// {
//   dayId: 'day1',
//   label: 'Upper Body Push',
//   startedAt: 1730000000000,
//   exercises: [
//     { name: 'Bench Press', targetSets: 3, reps: '8-12', rest: '90s', weight: '40kg',
//       guide: '...', skipped: false, logged: [{ weightKg: 40, reps: 10, at: 173... }] }
//   ]
// }

import { parseRepTarget, parseWeightKg, getNextLoadSuggestion, getLastSessionSets } from './progressiveOverload';

export const ACTIVE_SESSION_KEY = 'novafit_active_session';
export const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;
export const DEFAULT_SETS = 3;
export const MAX_SETS = 10;
export const MAX_REPS = 100;
export const MAX_WEIGHT_KG = 500;

const round1 = (n) => Math.round(n * 10) / 10;
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

// "4" | 4 | "3-4" | "4 x 10" → planned working sets (default 3, capped at 10).
export const parseTargetSets = (value) => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return clamp(Math.floor(value), 1, MAX_SETS);
  }
  if (typeof value !== 'string') return DEFAULT_SETS;
  const match = value.match(/\d+/);
  if (!match) return DEFAULT_SETS;
  const parsed = Number(match[0]);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_SETS;
  return clamp(Math.floor(parsed), 1, MAX_SETS);
};

const normalizeExercise = (exercise = {}) => {
  const name = String(exercise.name || '').trim() || 'Exercise';
  return {
    name,
    targetSets: parseTargetSets(exercise.sets),
    reps: typeof exercise.reps === 'string' ? exercise.reps : String(exercise.reps ?? ''),
    rest: exercise.rest ?? '90s',
    weight: exercise.weight ?? '',
    guide: exercise.guide ?? '',
    skipped: false,
    logged: []
  };
};

export const createSession = (day = {}, { now = new Date() } = {}) => {
  const startedAt = now instanceof Date ? now.getTime() : Number(now);
  const exercises = Array.isArray(day?.exercises) ? day.exercises.map(normalizeExercise) : [];
  return {
    dayId: String(day?.id || 'day1'),
    label: String(day?.label || 'Workout'),
    startedAt: Number.isFinite(startedAt) ? startedAt : Date.now(),
    exercises
  };
};

// First exercise that still has unlogged planned sets and was not skipped.
export const currentExerciseIndex = (session) => {
  const exercises = session?.exercises;
  if (!Array.isArray(exercises)) return -1;
  return exercises.findIndex(ex => !ex?.skipped && (ex?.logged?.length ?? 0) < (ex?.targetSets ?? 0));
};

export const isSessionComplete = (session) => currentExerciseIndex(session) === -1;

export const sessionProgress = (session) => {
  const exercises = Array.isArray(session?.exercises) ? session.exercises : [];
  const totalSets = exercises.reduce((sum, ex) => sum + (ex?.targetSets || 0), 0);
  const doneSets = exercises.reduce(
    (sum, ex) => sum + Math.min(ex?.logged?.length || 0, ex?.targetSets || 0),
    0
  );
  const totalExercises = exercises.length;
  const doneExercises = exercises.filter(
    ex => ex?.skipped || (ex?.logged?.length || 0) >= (ex?.targetSets || 0)
  ).length;
  return {
    totalSets,
    doneSets,
    totalExercises,
    doneExercises,
    percent: totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0
  };
};

const cleanSet = (set) => {
  const { weightKg, reps, at } = set || {};
  const weight = Number(weightKg);
  const count = Number(reps);
  if (!Number.isFinite(weight) || weight < 0 || weight > MAX_WEIGHT_KG) return null;
  if (!Number.isFinite(count) || count < 1 || count > MAX_REPS) return null;
  return {
    weightKg: round1(weight),
    reps: Math.round(count),
    at: Number.isFinite(at) ? at : Date.now()
  };
};

// Logs one set against the current exercise. Invalid input returns the same session.
export const logSessionSet = (session, { weightKg, reps, at = Date.now(), exerciseIndex } = {}) => {
  const exercises = Array.isArray(session?.exercises) ? session.exercises : null;
  if (!exercises) return session;
  const index = Number.isInteger(exerciseIndex) ? exerciseIndex : currentExerciseIndex(session);
  const exercise = exercises[index];
  if (!exercise || exercise.skipped) return session;
  if ((exercise.logged?.length || 0) >= (exercise.targetSets || 0)) return session;
  const set = cleanSet({ weightKg, reps, at });
  if (!set) return session;
  return {
    ...session,
    exercises: exercises.map((ex, i) => (
      i === index ? { ...ex, logged: [...(ex.logged || []), set] } : ex
    ))
  };
};

export const skipExercise = (session) => {
  const index = currentExerciseIndex(session);
  if (index === -1) return session;
  return {
    ...session,
    exercises: session.exercises.map((ex, i) => (i === index ? { ...ex, skipped: true } : ex))
  };
};

// Undo the last logged set (mis-taps happen mid-set).
export const undoLastSet = (session) => {
  const exercises = session?.exercises;
  if (!Array.isArray(exercises)) return session;
  for (let i = exercises.length - 1; i >= 0; i -= 1) {
    const logged = exercises[i]?.logged || [];
    if (logged.length) {
      return {
        ...session,
        exercises: exercises.map((ex, idx) => (
          idx === i ? { ...ex, skipped: false, logged: logged.slice(0, -1) } : ex
        ))
      };
    }
  }
  return session;
};

export const sessionTotals = (session) => {
  const exercises = Array.isArray(session?.exercises) ? session.exercises : [];
  let sets = 0;
  let reps = 0;
  let volumeKg = 0;
  exercises.forEach(ex => {
    (ex.logged || []).forEach(set => {
      sets += 1;
      reps += set.reps;
      volumeKg += set.weightKg * set.reps;
    });
  });
  return { sets, reps, volumeKg: Math.round(volumeKg) };
};

export const sessionDurationMs = (session, { now = Date.now() } = {}) => {
  const startedAt = Number(session?.startedAt);
  if (!Number.isFinite(startedAt)) return 0;
  return Math.max(0, now - startedAt);
};

export const formatSessionDuration = (ms) => {
  const totalSeconds = Math.max(0, Math.round((Number(ms) || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

// Prefill for the next set: coach's progression target first, then this session's
// last set, then the athlete's last logged session, then the plan's starting load.
export const getSetDefaults = (session, setLog = {}) => {
  const index = currentExerciseIndex(session);
  const exercise = index === -1 ? null : session.exercises[index];
  if (!exercise) return { weight: '', reps: '' };

  // Mid-session: repeat the load the athlete just used for this exercise.
  const lastLogged = exercise.logged?.[exercise.logged.length - 1];
  if (lastLogged) {
    return { weight: String(round1(lastLogged.weightKg)), reps: String(lastLogged.reps) };
  }

  const repTarget = parseRepTarget(exercise.reps);
  const suggestion = getNextLoadSuggestion(setLog, exercise);

  let weight = suggestion?.weightKg;
  if (weight === null || weight === undefined) {
    const previous = getLastSessionSets(setLog, exercise.name).slice(-1)[0];
    weight = previous ? previous.weightKg : parseWeightKg(exercise.weight);
  }

  let reps = suggestion?.reps;
  if (!Number.isFinite(reps) || reps < 1) {
    if (repTarget) {
      reps = repTarget.max;
    } else {
      const previous = getLastSessionSets(setLog, exercise.name).slice(-1)[0];
      reps = previous?.reps ?? '';
    }
  }

  return {
    weight: weight === null || weight === undefined || weight === '' ? '' : String(round1(Number(weight))),
    reps: reps === '' || reps === null || reps === undefined ? '' : String(Math.round(Number(reps)))
  };
};

const isValidSession = (session) => (
  session
  && typeof session === 'object'
  && typeof session.dayId === 'string'
  && Array.isArray(session.exercises)
  && session.exercises.length > 0
  && session.exercises.every(ex => ex && typeof ex.name === 'string')
);

// Rebuilds a stored session, discarding anything malformed or stale.
export const restoreSession = (raw, { now = Date.now(), maxAgeMs = SESSION_MAX_AGE_MS } = {}) => {
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!isValidSession(parsed)) return null;
  const startedAt = Number(parsed.startedAt);
  if (!Number.isFinite(startedAt)) return null;
  if (maxAgeMs > 0 && now - startedAt > maxAgeMs) return null;

  return {
    dayId: parsed.dayId,
    label: typeof parsed.label === 'string' && parsed.label.trim() ? parsed.label : 'Workout',
    startedAt,
    exercises: parsed.exercises.map(ex => ({
      name: ex.name,
      targetSets: parseTargetSets(ex.targetSets),
      reps: typeof ex.reps === 'string' ? ex.reps : String(ex.reps ?? ''),
      rest: ex.rest ?? '90s',
      weight: ex.weight ?? '',
      guide: typeof ex.guide === 'string' ? ex.guide : '',
      skipped: !!ex.skipped,
      logged: Array.isArray(ex.logged)
        ? ex.logged.map(set => cleanSet(set)).filter(Boolean).slice(0, MAX_SETS + 2)
        : []
    }))
  };
};

export const saveActiveSession = (session) => {
  try {
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
  } catch { /* storage unavailable — session still lives in memory */ }
};

export const loadActiveSession = (options = {}) => {
  try {
    return restoreSession(localStorage.getItem(ACTIVE_SESSION_KEY), options);
  } catch {
    return null;
  }
};

export const clearActiveSession = () => {
  try {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch { /* ignore */ }
};
