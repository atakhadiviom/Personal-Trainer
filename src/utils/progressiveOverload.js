// Personal records & progressive overload engine.
// The set log is a map keyed by a normalized exercise name:
// { 'bench press': { exercise: 'Bench Press', sets: [{ date: 'YYYY-MM-DD', weightKg: 60, reps: 10 }] } }
import { toDateKey, daysBetween } from './streaks';
import { roundToStep } from './loadSteps';

export const SET_LOG_KEY = 'novafit_set_log';
export const MAX_SETS_PER_EXERCISE = 120;
export const INCREASE_KG = 2.5;
export const DELOAD_RATIO = 0.9;
export const STALL_SESSIONS = 3;
export const RECENT_PR_DAYS = 30;

const MAX_WEIGHT_KG = 500;
const MAX_REPS = 100;
const LB_TO_KG = 0.45359237;

const round1 = (n) => Math.round(n * 10) / 10;
// Rounds to the athlete's smallest available jump (defaults to a 2.5 kg bar pair).
export const roundPlate = (n, step = INCREASE_KG) => roundToStep(n, step, 'nearest');

export const formatKg = (kg) => `${round1(kg)} kg`;
export const formatDelta = (kg) => `${kg > 0 ? '+' : ''}${round1(kg)} kg`;

export const normalizeExerciseKey = (name) =>
  String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');

// Accepts "60", 60, "60kg", "60 kg", "135 lbs", "Start: 20kg", "BW"/"bodyweight".
// Returns kilograms, 0 for bodyweight-only, or null when it cannot be read.
export const parseWeightKg = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 && value <= MAX_WEIGHT_KG ? round1(value) : null;
  }
  if (typeof value !== 'string' || !value.trim()) return null;
  const str = value.trim().toLowerCase();
  const hasNumber = /\d/.test(str);
  if (!hasNumber) {
    return /\b(bw|bodyweight|body weight|body-weight)\b/.test(str) ? 0 : null;
  }
  const match = str.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const amount = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(amount) || amount < 0) return null;
  const kg = /\b(lbs?|pounds?)\b/.test(str) ? amount * LB_TO_KG : amount;
  if (kg > MAX_WEIGHT_KG) return null;
  return round1(kg);
};

// Target rep range from "8-12", "10", "8–12" or a number. Returns null for AMRAP.
export const parseRepTarget = (reps) => {
  if (typeof reps === 'number' && Number.isFinite(reps) && reps > 0) {
    return { min: Math.floor(reps), max: Math.floor(reps) };
  }
  if (typeof reps !== 'string') return null;
  const str = reps.trim().toLowerCase();
  if (!str || str.includes('amrap') || str.includes('max')) return null;
  const numbers = str.match(/\d+/g);
  if (!numbers || !numbers.length) return null;
  const values = numbers.map(Number).filter(n => n > 0 && n <= MAX_REPS);
  if (!values.length) return null;
  return { min: Math.min(...values), max: Math.max(...values) };
};

// Epley formula. Bodyweight sets (0 kg) have no meaningful 1RM estimate.
export const estimateOneRepMax = (weightKg, reps) => {
  const weight = Number(weightKg);
  const count = Number(reps);
  if (!Number.isFinite(weight) || weight <= 0) return null;
  if (!Number.isFinite(count) || count < 1 || count > MAX_REPS) return null;
  if (count === 1) return round1(weight);
  return round1(weight * (1 + count / 30));
};

const isValidDateKey = (key) => typeof key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(key);

const cleanSet = (set) => {
  if (!set || typeof set !== 'object') return null;
  const weightKg = Number(set.weightKg);
  const reps = Number(set.reps);
  if (!Number.isFinite(weightKg) || weightKg < 0 || weightKg > MAX_WEIGHT_KG) return null;
  if (!Number.isFinite(reps) || reps < 1 || reps > MAX_REPS) return null;
  const date = isValidDateKey(set.date) ? set.date : toDateKey(new Date());
  return { date, weightKg: round1(weightKg), reps: Math.floor(reps) };
};

const sessionKey = (set) => `${set.date}|${set.weightKg}|${set.reps}`;

export const sanitizeSetLog = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const clean = {};
  Object.entries(raw).forEach(([key, entry]) => {
    if (!entry || typeof entry !== 'object' || !Array.isArray(entry.sets)) return;
    const sets = entry.sets.map(cleanSet).filter(Boolean);
    if (!sets.length) return;
    const name = typeof entry.exercise === 'string' && entry.exercise.trim()
      ? entry.exercise.trim()
      : String(key || '').trim() || 'Exercise';
    const normalized = normalizeExerciseKey(name);
    const existing = clean[normalized];
    const mergedSets = existing ? [...existing.sets, ...sets] : sets;
    const deduped = [];
    const seen = new Set();
    mergedSets
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      .forEach(set => {
        const id = sessionKey(set);
        if (seen.has(id)) return;
        seen.add(id);
        deduped.push(set);
      });
    clean[normalized] = {
      exercise: existing ? existing.exercise : name,
      sets: deduped.slice(-MAX_SETS_PER_EXERCISE)
    };
  });
  return clean;
};

export const loadSetLog = () => {
  try {
    const raw = localStorage.getItem(SET_LOG_KEY);
    return raw ? sanitizeSetLog(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
};

export const saveSetLog = (log) => {
  try {
    localStorage.setItem(SET_LOG_KEY, JSON.stringify(sanitizeSetLog(log)));
  } catch { /* ignore storage unavailable */ }
};

export const mergeSetLogs = (a, b) => {
  const left = sanitizeSetLog(a);
  const right = sanitizeSetLog(b);
  const combined = {};
  [...Object.values(left), ...Object.values(right)].forEach(entry => {
    const key = normalizeExerciseKey(entry.exercise);
    const current = combined[key];
    combined[key] = current
      ? { exercise: current.exercise, sets: [...current.sets, ...entry.sets] }
      : { exercise: entry.exercise, sets: [...entry.sets] };
  });
  return sanitizeSetLog(combined);
};

// Adds one set. Invalid input returns the unchanged log.
export const logSet = (log, { exercise, weightKg, reps, date = new Date() } = {}) => {
  const base = sanitizeSetLog(log);
  const name = String(exercise || '').trim();
  if (!name) return base;
  const clean = cleanSet({ weightKg, reps, date: isValidDateKey(date) ? date : toDateKey(date) });
  if (!clean) return base;
  const key = normalizeExerciseKey(name);
  const existing = base[key];
  return sanitizeSetLog({
    ...base,
    [key]: existing
      ? { exercise: existing.exercise, sets: [...existing.sets, clean] }
      : { exercise: name, sets: [clean] }
  });
};

export const getExerciseSets = (log, exercise) => {
  const entry = sanitizeSetLog(log)[normalizeExerciseKey(exercise)];
  return entry ? entry.sets : [];
};

const bestSet = (sets) => sets.reduce((best, set) => {
  if (!best) return set;
  const a = estimateOneRepMax(set.weightKg, set.reps) ?? 0;
  const b = estimateOneRepMax(best.weightKg, best.reps) ?? 0;
  if (a !== b) return a > b ? set : best;
  if (set.reps !== best.reps) return set.reps > best.reps ? set : best;
  return set.weightKg > best.weightKg ? set : best;
}, null);

export const getPersonalRecord = (log, exercise) => {
  const sets = getExerciseSets(log, exercise);
  if (!sets.length) return null;
  const best = bestSet(sets);
  return {
    date: best.date,
    weightKg: best.weightKg,
    reps: best.reps,
    e1rm: estimateOneRepMax(best.weightKg, best.reps)
  };
};

const sessionHistory = (sets) => {
  const byDate = new Map();
  sets.forEach(set => {
    if (!byDate.has(set.date)) byDate.set(set.date, []);
    byDate.get(set.date).push(set);
  });
  return [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([date, dateSets]) => ({ date, sets: dateSets, best: bestSet(dateSets) }));
};

export const getLastSessionSets = (log, exercise) => {
  const history = sessionHistory(getExerciseSets(log, exercise));
  return history.length ? history[history.length - 1].sets : [];
};

// True when this set would beat the athlete's stored best for the exercise.
export const isNewPersonalRecord = (log, { exercise, weightKg, reps } = {}) => {
  if (!exercise) return false;
  const candidate = estimateOneRepMax(weightKg, reps);
  const current = getPersonalRecord(log, exercise);
  if (candidate === null || !current || current.e1rm === null) return false;
  return candidate > current.e1rm;
};

export const getPersonalRecords = (log) => Object.entries(sanitizeSetLog(log))
  .map(([key, entry]) => {
    const record = bestSet(entry.sets);
    if (!record) return null;
    return {
      key,
      exercise: entry.exercise,
      sessions: sessionHistory(entry.sets).length,
      record: {
        date: record.date,
        weightKg: record.weightKg,
        reps: record.reps,
        e1rm: estimateOneRepMax(record.weightKg, record.reps)
      }
    };
  })
  .filter(Boolean)
  .sort((a, b) => (b.record.e1rm ?? 0) - (a.record.e1rm ?? 0));

export const getRecentPersonalRecords = (log, { today = new Date(), days = RECENT_PR_DAYS, limit = 3 } = {}) => {
  const todayKey = toDateKey(today);
  return getPersonalRecords(log)
    .filter(item => daysBetween(item.record.date, todayKey) <= days)
    .slice(0, Math.max(0, limit));
};

// Weekly tonnage: every logged set in the last 7 days (including today).
export const getWeeklyVolume = (log, { today = new Date() } = {}) => {
  const todayKey = toDateKey(today);
  let volumeKg = 0;
  let sets = 0;
  let reps = 0;
  const activeDays = new Set();
  Object.values(sanitizeSetLog(log)).forEach(entry => {
    entry.sets.forEach(set => {
      const age = daysBetween(set.date, todayKey);
      if (age < 0 || age > 6) return;
      volumeKg += set.weightKg * set.reps;
      reps += set.reps;
      sets += 1;
      activeDays.add(set.date);
    });
  });
  return { volumeKg: Math.round(volumeKg), sets, reps, activeDays: activeDays.size };
};

// Next-session load target for one exercise.
// actions: start | increase | hold | reduce | deload | bodyweight
// `step` is the athlete's smallest jump in kg, so targets land on buildable weights.
export const getNextLoadSuggestion = (log, exercise = {}, { step = INCREASE_KG } = {}) => {
  const name = String(exercise.name || '').trim();
  const target = parseRepTarget(exercise.reps);
  const startWeight = parseWeightKg(exercise.weight);
  const history = sessionHistory(getExerciseSets(log, name));
  const targetLabel = target ? (target.min === target.max ? `${target.max}` : `${target.min}–${target.max}`) : null;

  if (!history.length) {
    if (startWeight === 0) {
      return {
        action: 'start',
        weightKg: 0,
        reps: target?.max ?? null,
        message: `Bodyweight exercise — aim for ${targetLabel || 'clean'} reps and log them.`
      };
    }
    if (startWeight !== null) {
      return {
        action: 'start',
        weightKg: startWeight,
        reps: target?.max ?? null,
        message: `Start at ${formatKg(startWeight)} for ${targetLabel || 'your target'} reps.`
      };
    }
    return {
      action: 'start',
      weightKg: null,
      reps: target?.max ?? null,
      message: 'Log your first set to unlock load targets.'
    };
  }

  const last = history[history.length - 1];
  const lastBest = last.best;
  const lastWeight = lastBest.weightKg;
  const lastReps = lastBest.reps;

  if (lastWeight === 0) {
    return {
      action: 'increase',
      weightKg: 0,
      reps: Math.min(MAX_REPS, lastReps + 2),
      message: `Bodyweight PR logged — add 2 reps (target ${Math.min(MAX_REPS, lastReps + 2)}) or add load.`
    };
  }

  const recent = history.slice(-STALL_SESSIONS);
  const stagnant = recent.length >= STALL_SESSIONS
    && recent.every(session => session.best.weightKg === lastWeight)
    && Math.max(...recent.map(s => estimateOneRepMax(s.best.weightKg, s.best.reps) ?? 0))
      - Math.min(...recent.map(s => estimateOneRepMax(s.best.weightKg, s.best.reps) ?? 0)) < 0.5;

  if (stagnant) {
    const deload = roundPlate(Math.max(0, lastWeight * DELOAD_RATIO), step);
    return {
      action: 'deload',
      weightKg: deload,
      reps: target?.max ?? lastReps,
      message: `${STALL_SESSIONS} flat sessions — deload to ${formatKg(deload)} and rebuild with clean reps.`
    };
  }

  if (!target) {
    return {
      action: 'hold',
      weightKg: lastWeight,
      reps: lastReps,
      message: `No rep target set — repeat ${formatKg(lastWeight)} and beat ${lastReps} reps.`
    };
  }

  if (lastReps >= target.max) {
    const next = roundPlate(lastWeight + step, step);
    return {
      action: 'increase',
      weightKg: next,
      reps: target.min,
      message: `Top of range hit — go to ${formatKg(next)} for ${target.min}+ reps.`
    };
  }

  if (lastReps >= target.max - 1) {
    return {
      action: 'hold',
      weightKg: lastWeight,
      reps: target.max,
      message: `One rep from the top — repeat ${formatKg(lastWeight)} and add a rep before loading more.`
    };
  }

  if (lastReps < target.min) {
    const next = roundPlate(Math.max(0, lastWeight - step), step);
    return {
      action: 'reduce',
      weightKg: next,
      reps: target.min,
      message: `Below the rep range — drop to ${formatKg(next)} and rebuild to ${target.min} reps.`
    };
  }

  return {
    action: 'hold',
    weightKg: lastWeight,
    reps: Math.min(target.max, lastReps + 1),
    message: `Add one rep at ${formatKg(lastWeight)} before increasing load.`
  };
};

export const uniqueExercises = (exercises = []) => {
  const seen = new Set();
  return exercises.filter(ex => {
    const key = normalizeExerciseKey(ex?.name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
