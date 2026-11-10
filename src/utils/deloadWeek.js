// Auto-regulated deload week.
// Reads the set log, compares the best estimated 1RM of every lift across the two most
// recent *completed* calendar weeks, and — when enough lifts are flat or the acute:chronic
// ratio is overreaching — rewrites a week of the plan at 60–70% load with one fewer set.
import {
  sanitizeSetLog,
  normalizeExerciseKey,
  estimateOneRepMax,
  parseWeightKg,
  getLastSessionSets,
  INCREASE_KG
} from './progressiveOverload';
import { toDateKey, daysBetween } from './streaks';
import { startOfWeek, formatShortDate } from './workoutHistory';
import { getAcuteChronicLoad } from './trainingLoad';

export const DELOAD_LOAD_RATIO = 0.65;
export const MIN_LOAD_RATIO = 0.6;
export const MAX_LOAD_RATIO = 0.7;
export const DELOAD_SET_DROP = 1;
export const MIN_DELOAD_SETS = 2;
export const TRACKED_WEEKS = 3;
export const MIN_SESSIONS_PER_WEEK = 2;
export const PLATEAU_TOLERANCE_KG = 0.5;
export const PLATEAU_TOLERANCE_PCT = 0.01;
export const PLATEAU_SHARE = 0.5;
export const MIN_PLATEAU_EXERCISES = 2;
export const OVERREACH_RATIO = 1.5;

export const DELOAD_STATE_PREFIX = 'novafit_deload_w';
export const DELOAD_SNAPSHOT_PREFIX = 'novafit_deload_restore_w';

const WEEK_DAYS = 7;
const round1 = (n) => Math.round(n * 10) / 10;
const roundInt = (n) => Math.round(n);

const keyToNoon = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
};

const addDays = (date, days) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
};

// Always rounds *down* to the nearest plate so the result is never above the ratio target.
export const roundToPlate = (kg) => {
  if (!Number.isFinite(kg) || kg <= 0) return 0;
  return Math.max(0, Math.floor(kg / INCREASE_KG) * INCREASE_KG);
};

export const getDeloadWeightKg = (baseKg, ratio = DELOAD_LOAD_RATIO) => {
  if (!Number.isFinite(baseKg) || baseKg <= 0) return 0;
  const safeRatio = Number.isFinite(ratio) ? Math.min(MAX_LOAD_RATIO, Math.max(MIN_LOAD_RATIO, ratio)) : DELOAD_LOAD_RATIO;
  return roundToPlate(baseKg * safeRatio);
};

const weekLabel = (start, end) => `${formatShortDate(start)}–${formatShortDate(end)}`;

// One bucket per calendar week, Monday start, oldest first and including the current
// (partial) week. Exercises carry the week's best estimated 1RM and tonnage.
export const getWeeklyExerciseBests = (log, { today = new Date(), weeks = TRACKED_WEEKS } = {}) => {
  const count = Math.max(2, Math.floor(weeks) || TRACKED_WEEKS);
  const currentWeek = startOfWeek(today);
  const todayKey = toDateKey(today);
  const buckets = [];

  for (let i = count - 1; i >= 0; i -= 1) {
    const start = addDays(currentWeek, -i * WEEK_DAYS);
    const end = addDays(start, WEEK_DAYS - 1);
    buckets.push({
      weekStart: toDateKey(start),
      weekEnd: toDateKey(end),
      label: weekLabel(start, end),
      isCurrent: i === 0,
      tonnageKg: 0,
      activeDays: new Set(),
      exercises: {}
    });
  }

  const indexByStart = new Map(buckets.map((bucket, i) => [bucket.weekStart, i]));

  Object.values(sanitizeSetLog(log)).forEach(entry => {
    const key = normalizeExerciseKey(entry.exercise);
    entry.sets.forEach(set => {
      if (set.date > todayKey) return;
      const bucketIndex = indexByStart.get(toDateKey(startOfWeek(keyToNoon(set.date))));
      if (bucketIndex === undefined) return;
      const bucket = buckets[bucketIndex];
      bucket.tonnageKg += set.weightKg * set.reps;
      bucket.activeDays.add(set.date);

      const current = bucket.exercises[key] || {
        exercise: entry.exercise,
        dates: new Set(),
        sets: 0,
        bestE1rm: null,
        topWeightKg: 0
      };
      current.dates.add(set.date);
      current.sets += 1;
      const e1rm = estimateOneRepMax(set.weightKg, set.reps);
      if (e1rm !== null && (current.bestE1rm === null || e1rm > current.bestE1rm)) {
        current.bestE1rm = e1rm;
      }
      if (set.weightKg > current.topWeightKg) current.topWeightKg = set.weightKg;
      bucket.exercises[key] = current;
    });
  });

  return buckets.map(bucket => ({
    weekStart: bucket.weekStart,
    weekEnd: bucket.weekEnd,
    label: bucket.label,
    isCurrent: bucket.isCurrent,
    tonnageKg: roundInt(bucket.tonnageKg),
    sessions: bucket.activeDays.size,
    exercises: Object.fromEntries(Object.entries(bucket.exercises).map(([key, item]) => [
      key,
      {
        exercise: item.exercise,
        sessions: item.dates.size,
        sets: item.sets,
        topWeightKg: round1(item.topWeightKg),
        bestE1rm: item.bestE1rm === null ? null : round1(item.bestE1rm)
      }
    ]))
  }));
};

const isFlat = (prev, next) => {
  if (prev === null || next === null || !Number.isFinite(prev) || !Number.isFinite(next)) return false;
  const tolerance = Math.max(PLATEAU_TOLERANCE_KG, Math.abs(prev) * PLATEAU_TOLERANCE_PCT);
  return Math.abs(next - prev) <= tolerance;
};

// Compares the last two completed weeks lift by lift.
export const compareRecentWeeks = (log, { today = new Date() } = {}) => {
  const buckets = getWeeklyExerciseBests(log, { today, weeks: TRACKED_WEEKS });
  const completed = buckets.filter(bucket => !bucket.isCurrent && bucket.sessions > 0);
  if (completed.length < 2) {
    return { ready: false, weeks: completed, tracked: [], stalled: [], progressing: [] };
  }
  const [prevWeek, lastWeek] = completed.slice(-2);
  const tracked = [];

  Object.entries(lastWeek.exercises).forEach(([key, last]) => {
    const prev = prevWeek.exercises[key];
    if (!prev) return;
    if (prev.sessions < MIN_SESSIONS_PER_WEEK || last.sessions < MIN_SESSIONS_PER_WEEK) return;
    if (prev.bestE1rm === null || last.bestE1rm === null) return;
    const deltaKg = round1(last.bestE1rm - prev.bestE1rm);
    tracked.push({
      exercise: last.exercise,
      prevE1rm: prev.bestE1rm,
      lastE1rm: last.bestE1rm,
      deltaKg,
      deltaPct: prev.bestE1rm ? round1((deltaKg / prev.bestE1rm) * 100) : 0,
      sessions: Math.min(prev.sessions, last.sessions),
      stalled: isFlat(prev.bestE1rm, last.bestE1rm)
    });
  });

  tracked.sort((a, b) => Math.abs(b.deltaKg) - Math.abs(a.deltaKg));
  return {
    ready: true,
    weeks: [prevWeek, lastWeek],
    tracked,
    stalled: tracked.filter(item => item.stalled),
    progressing: tracked.filter(item => !item.stalled)
  };
};

const ratioOf = (comparison) => {
  if (!comparison.tracked.length) return 0;
  return comparison.stalled.length / comparison.tracked.length;
};

// Decides whether the athlete should deload and returns the evidence for the card.
export const detectDeloadNeed = (log, { today = new Date(), loadRatio } = {}) => {
  const comparison = compareRecentWeeks(log, { today });
  const ratio = Number.isFinite(loadRatio)
    ? loadRatio
    : getAcuteChronicLoad(log, { today }).ratio;

  if (!comparison.ready) {
    return {
      needed: false,
      status: 'insufficient',
      title: 'Two more weeks of data',
      message: 'Log sets on at least two lifts in two complete weeks and NovaFit can auto-regulate your recovery week.',
      weeks: comparison.weeks,
      tracked: [],
      stalled: [],
      progressing: [],
      plateauShare: null,
      ratio,
      triggers: []
    };
  }

  const share = ratioOf(comparison);
  const plateauTrigger = comparison.tracked.length >= MIN_PLATEAU_EXERCISES
    && comparison.stalled.length >= MIN_PLATEAU_EXERCISES
    && share >= PLATEAU_SHARE;
  const overloadTrigger = Number.isFinite(ratio) && ratio > OVERREACH_RATIO;
  const triggers = [];

  if (plateauTrigger) {
    triggers.push({
      type: 'plateau',
      label: `${comparison.stalled.length} of ${comparison.tracked.length} lifts flat for two weeks`
    });
  }
  if (overloadTrigger) {
    triggers.push({ type: 'overload', label: `Acute:chronic load ${ratio.toFixed(2)}× — overreaching` });
  }

  if (!triggers.length) {
    return {
      needed: false,
      status: 'progressing',
      title: 'No deload needed',
      message: comparison.progressing.length
        ? `${comparison.progressing.length} of ${comparison.tracked.length} lifts improved last week. Keep adding load or a rep.`
        : 'Your recent weeks look stable without overreaching. Keep building.',
      weeks: comparison.weeks,
      tracked: comparison.tracked,
      stalled: comparison.stalled,
      progressing: comparison.progressing,
      plateauShare: share,
      ratio,
      triggers
    };
  }

  const reason = plateauTrigger
    ? `${comparison.stalled.length} of ${comparison.tracked.length} lifts have not moved in two weeks`
    : 'your 7-day load is well above your 4-week baseline';
  const overloadNote = overloadTrigger ? ' Your acute:chronic ratio is overreaching.' : '';

  return {
    needed: true,
    status: plateauTrigger ? 'plateau' : 'overload',
    title: 'Deload week recommended',
    message: `${reason}.${overloadNote} Cutting to 60–70% for one week restores recovery without losing strength.`,
    weeks: comparison.weeks,
    tracked: comparison.tracked,
    stalled: comparison.stalled,
    progressing: comparison.progressing,
    plateauShare: share,
    ratio,
    triggers
  };
};

const copySchedule = (schedule) => schedule.map(day => ({
  ...day,
  exercises: Array.isArray(day.exercises) ? day.exercises.map(ex => ({ ...ex })) : []
}));

// Rewrites a week's exercises at the deload ratio. Never mutates the input schedule.
export const buildDeloadSchedule = (schedule, log = {}, { ratio = DELOAD_LOAD_RATIO } = {}) => {
  const safeRatio = Math.min(MAX_LOAD_RATIO, Math.max(MIN_LOAD_RATIO, Number.isFinite(ratio) ? ratio : DELOAD_LOAD_RATIO));
  if (!Array.isArray(schedule) || !schedule.length) {
    return { schedule: [], changes: [], ratio: safeRatio, totalSetsBefore: 0, totalSetsAfter: 0 };
  }

  const next = copySchedule(schedule);
  const changes = [];
  let totalSetsBefore = 0;
  let totalSetsAfter = 0;

  next.forEach(day => {
    day.exercises.forEach(ex => {
      const name = String(ex.name || '').trim();
      if (!name) return;
      const originalWeight = ex.weight ?? null;
      const setsBefore = Math.max(0, Math.round(Number(ex.sets) || 0));
      const setsAfter = setsBefore > MIN_DELOAD_SETS
        ? Math.max(MIN_DELOAD_SETS, setsBefore - DELOAD_SET_DROP)
        : setsBefore;
      totalSetsBefore += setsBefore;
      totalSetsAfter += setsAfter;

      const lastSets = getLastSessionSets(log, name);
      const lastSet = lastSets.length ? lastSets[lastSets.length - 1] : null;
      const planKg = parseWeightKg(ex.weight);
      let source = 'none';
      let baseKg = null;

      if (lastSet && lastSet.weightKg > 0) {
        baseKg = lastSet.weightKg;
        source = 'log';
      } else if (planKg !== null) {
        baseKg = planKg;
        source = planKg === 0 ? 'bodyweight' : 'plan';
      }

      let toWeightKg = null;
      let weight = ex.weight;

      if (source === 'bodyweight') {
        toWeightKg = 0;
        weight = 'BW';
      } else if (baseKg !== null) {
        toWeightKg = getDeloadWeightKg(baseKg, safeRatio);
        weight = toWeightKg > 0 ? `${toWeightKg} kg` : 'BW';
      } else {
        weight = 'BW / easy effort';
      }

      ex.weight = weight;
      ex.sets = setsAfter;
      ex.deload = true;
      if (originalWeight !== null) ex.deloadFrom = originalWeight;

      changes.push({
        name,
        fromWeight: originalWeight,
        fromKg: baseKg,
        toKg: toWeightKg,
        weight,
        setsFrom: setsBefore,
        setsTo: setsAfter,
        source
      });
    });
  });

  return { schedule: next, changes, ratio: safeRatio, totalSetsBefore, totalSetsAfter };
};

const safeStorage = () => {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
};

export const saveDeloadSnapshot = (week, schedule) => {
  const storage = safeStorage();
  if (!storage) return false;
  try {
    storage.setItem(`${DELOAD_SNAPSHOT_PREFIX}${week}`, JSON.stringify(schedule));
    return true;
  } catch {
    return false;
  }
};

export const loadDeloadSnapshot = (week) => {
  const storage = safeStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(`${DELOAD_SNAPSHOT_PREFIX}${week}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const clearDeloadSnapshot = (week) => {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.removeItem(`${DELOAD_SNAPSHOT_PREFIX}${week}`);
  } catch { /* ignore */ }
};

export const saveDeloadState = (week, state) => {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.setItem(`${DELOAD_STATE_PREFIX}${week}`, JSON.stringify(state));
  } catch { /* ignore */ }
};

export const loadDeloadState = (week) => {
  const storage = safeStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(`${DELOAD_STATE_PREFIX}${week}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

export const clearDeloadState = (week) => {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.removeItem(`${DELOAD_STATE_PREFIX}${week}`);
  } catch { /* ignore */ }
};

export const formatRatioPct = (ratio) => `${Math.round(ratio * 100)}%`;

// Weeks with training in the lookback window, used by the card's evidence chips.
export const getLookbackSessions = (log, { today = new Date() } = {}) => {
  const todayKey = toDateKey(today);
  const days = new Set();
  Object.values(sanitizeSetLog(log)).forEach(entry => {
    entry.sets.forEach(set => {
      const age = daysBetween(set.date, todayKey);
      if (age >= 0 && age < TRACKED_WEEKS * WEEK_DAYS) days.add(set.date);
    });
  });
  return days.size;
};
