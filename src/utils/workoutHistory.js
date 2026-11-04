// Workout history & analytics engine.
// Everything is derived from the set log built by progressiveOverload.js, so there is
// no extra storage: sessions, tonnage, streaks of activity and exercise trends.
import {
  sanitizeSetLog,
  normalizeExerciseKey,
  estimateOneRepMax
} from './progressiveOverload';
import { toDateKey, daysBetween } from './streaks';

export const HEATMAP_WEEKS = 8;
export const TREND_WEEKS = 8;
export const BREAKDOWN_LIMIT = 6;
export const CSV_HEADER = 'Date,Exercise,Weight (kg),Reps,Est. 1RM (kg),Volume (kg)';

const WEEK_DAYS = 7;
const HEATMAP_LEVELS = 4;
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

const noon = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);

// Monday-based week start, local time.
export const startOfWeek = (date = new Date()) => {
  const d = noon(date instanceof Date ? date : new Date(date));
  const offset = (d.getDay() + 6) % 7; // Mon = 0 … Sun = 6
  return addDays(d, -offset);
};

export const formatShortDate = (dateOrKey) => {
  const d = typeof dateOrKey === 'string' ? keyToNoon(dateOrKey) : dateOrKey;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '';
  return `${MONTH_LABELS[d.getMonth()]} ${d.getDate()}`;
};

// All distinct training days, oldest first, with per-session aggregates.
export const getSessions = (log) => {
  const byDate = new Map();
  Object.values(sanitizeSetLog(log)).forEach(entry => {
    entry.sets.forEach(set => {
      if (!byDate.has(set.date)) {
        byDate.set(set.date, { date: set.date, sets: [], exercises: new Set() });
      }
      const session = byDate.get(set.date);
      session.sets.push({ ...set, exercise: entry.exercise });
      session.exercises.add(normalizeExerciseKey(entry.exercise));
    });
  });

  return [...byDate.values()]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map(session => {
      const volumeKg = session.sets.reduce((sum, s) => sum + s.weightKg * s.reps, 0);
      const reps = session.sets.reduce((sum, s) => sum + s.reps, 0);
      const topSet = session.sets.reduce((best, s) => {
        if (!best) return s;
        const a = estimateOneRepMax(s.weightKg, s.reps) ?? 0;
        const b = estimateOneRepMax(best.weightKg, best.reps) ?? 0;
        return a > b ? s : best;
      }, null);
      return {
        date: session.date,
        totalSets: session.sets.length,
        totalReps: reps,
        exerciseCount: session.exercises.size,
        volumeKg: roundInt(volumeKg),
        topSet: topSet
          ? {
            exercise: topSet.exercise,
            weightKg: topSet.weightKg,
            reps: topSet.reps,
            e1rm: estimateOneRepMax(topSet.weightKg, topSet.reps)
          }
          : null
      };
    });
};

// Calendar-week buckets (Monday start), oldest first, including the current week.
export const getWeeklyTrend = (log, { today = new Date(), weeks = TREND_WEEKS } = {}) => {
  const count = Math.max(1, Math.floor(weeks) || TREND_WEEKS);
  const currentWeek = startOfWeek(today);
  const todayKey = toDateKey(today);
  const buckets = [];

  for (let i = count - 1; i >= 0; i -= 1) {
    const start = addDays(currentWeek, -i * WEEK_DAYS);
    buckets.push({
      weekStart: toDateKey(start),
      weekEnd: toDateKey(addDays(start, WEEK_DAYS - 1)),
      label: formatShortDate(start),
      volumeKg: 0,
      sets: 0,
      sessions: 0,
      activeDays: new Set()
    });
  }

  const indexByStart = new Map(buckets.map((bucket, i) => [bucket.weekStart, i]));
  Object.values(sanitizeSetLog(log)).forEach(entry => {
    entry.sets.forEach(set => {
      if (set.date > todayKey) return;
      const bucketIndex = indexByStart.get(toDateKey(startOfWeek(keyToNoon(set.date))));
      if (bucketIndex === undefined) return;
      const bucket = buckets[bucketIndex];
      bucket.volumeKg += set.weightKg * set.reps;
      bucket.sets += 1;
      bucket.activeDays.add(set.date);
    });
  });

  return buckets.map(bucket => ({
    weekStart: bucket.weekStart,
    weekEnd: bucket.weekEnd,
    label: bucket.label,
    volumeKg: roundInt(bucket.volumeKg),
    sets: bucket.sets,
    sessions: bucket.activeDays.size,
    isCurrent: bucket.weekStart === toDateKey(currentWeek)
  }));
};

// GitHub-style grid: `weeks` columns × 7 rows, Monday first, ending with the current week.
export const getHeatmap = (log, { today = new Date(), weeks = HEATMAP_WEEKS } = {}) => {
  const count = Math.max(1, Math.floor(weeks) || HEATMAP_WEEKS);
  const todayKey = toDateKey(today);
  const firstDay = addDays(startOfWeek(today), -(count - 1) * WEEK_DAYS);
  const volumeByDay = new Map();
  const setsByDay = new Map();

  Object.values(sanitizeSetLog(log)).forEach(entry => {
    entry.sets.forEach(set => {
      if (set.date > todayKey) return;
      volumeByDay.set(set.date, (volumeByDay.get(set.date) || 0) + set.weightKg * set.reps);
      setsByDay.set(set.date, (setsByDay.get(set.date) || 0) + 1);
    });
  });

  const days = [];
  for (let i = 0; i < count * WEEK_DAYS; i += 1) {
    const date = addDays(firstDay, i);
    const key = toDateKey(date);
    days.push({
      key,
      volumeKg: roundInt(volumeByDay.get(key) || 0),
      sets: setsByDay.get(key) || 0,
      isFuture: key > todayKey,
      isToday: key === todayKey
    });
  }

  const maxVolume = days.reduce((max, day) => Math.max(max, day.volumeKg), 0);
  days.forEach(day => {
    if (day.volumeKg <= 0) {
      day.level = 0;
    } else if (maxVolume <= 0) {
      day.level = 1;
    } else {
      day.level = Math.min(
        HEATMAP_LEVELS,
        Math.max(1, Math.ceil((day.volumeKg / maxVolume) * HEATMAP_LEVELS))
      );
    }
  });

  const columns = [];
  for (let week = 0; week < count; week += 1) {
    columns.push(days.slice(week * WEEK_DAYS, (week + 1) * WEEK_DAYS));
  }

  return {
    weeks: count,
    days,
    columns,
    maxVolumeKg: roundInt(maxVolume),
    activeDays: days.filter(day => day.sets > 0).length
  };
};

const volumeBetween = (sets, fromKey, toKey) => sets
  .filter(set => set.date >= fromKey && set.date <= toKey)
  .reduce((sum, set) => sum + set.weightKg * set.reps, 0);

// Per-exercise totals with a 14-day vs previous-14-day volume trend.
export const getExerciseBreakdown = (
  log,
  { today = new Date(), limit = BREAKDOWN_LIMIT } = {}
) => {
  const todayKey = toDateKey(today);
  const recentStart = toDateKey(addDays(noon(today), -13));
  const priorEnd = toDateKey(addDays(noon(today), -14));
  const priorStart = toDateKey(addDays(noon(today), -27));

  const items = Object.entries(sanitizeSetLog(log)).map(([key, entry]) => {
    const sessions = new Set(entry.sets.map(set => set.date));
    const lastTrained = [...sessions].sort().slice(-1)[0] || null;
    const best = entry.sets.reduce((top, set) => {
      const a = estimateOneRepMax(set.weightKg, set.reps) ?? 0;
      const b = top ? estimateOneRepMax(top.weightKg, top.reps) ?? 0 : -1;
      return a > b ? set : top;
    }, null);
    const recentVolume = volumeBetween(entry.sets, recentStart, todayKey);
    const priorVolume = volumeBetween(entry.sets, priorStart, priorEnd);
    let trendPct = null;
    if (priorVolume > 0) trendPct = roundInt(((recentVolume - priorVolume) / priorVolume) * 100);
    else if (recentVolume > 0) trendPct = 100;

    return {
      key,
      exercise: entry.exercise,
      sessions: sessions.size,
      sets: entry.sets.length,
      volumeKg: roundInt(entry.sets.reduce((sum, set) => sum + set.weightKg * set.reps, 0)),
      bestE1rm: best ? estimateOneRepMax(best.weightKg, best.reps) : null,
      lastTrained,
      daysSince: lastTrained ? Math.max(0, daysBetween(lastTrained, todayKey)) : null,
      recentVolumeKg: roundInt(recentVolume),
      trendPct
    };
  });

  return items
    .sort((a, b) => (b.volumeKg - a.volumeKg) || (b.sets - a.sets) || a.exercise.localeCompare(b.exercise))
    .slice(0, Math.max(0, limit));
};

export const getAnalyticsSummary = (log, { today = new Date() } = {}) => {
  const sessions = getSessions(log);
  const todayKey = toDateKey(today);
  const last7Start = toDateKey(addDays(noon(today), -6));
  const prev7Start = toDateKey(addDays(noon(today), -13));
  const prev7End = toDateKey(addDays(noon(today), -7));

  const sumVolume = (list) => list.reduce((sum, s) => sum + s.volumeKg, 0);
  const thisWeek = sessions.filter(s => s.date >= last7Start && s.date <= todayKey);
  const lastWeek = sessions.filter(s => s.date >= prev7Start && s.date <= prev7End);
  const thisVolume = sumVolume(thisWeek);
  const lastVolume = sumVolume(lastWeek);
  const trend = getWeeklyTrend(log, { today, weeks: TREND_WEEKS });
  const bestWeek = trend.reduce((best, week) => (!best || week.volumeKg > best.volumeKg ? week : best), null);
  const totalVolume = sessions.length ? sessions.reduce((sum, s) => sum + s.volumeKg, 0) : 0;

  return {
    totalSessions: sessions.length,
    totalSets: sessions.reduce((sum, s) => sum + s.totalSets, 0),
    totalVolumeKg: roundInt(totalVolume),
    sessionsThisWeek: thisWeek.length,
    sessionsLastWeek: lastWeek.length,
    volumeThisWeekKg: thisVolume,
    volumeLastWeekKg: lastVolume,
    volumeTrendPct: lastVolume > 0 ? roundInt(((thisVolume - lastVolume) / lastVolume) * 100) : null,
    avgSessionVolumeKg: sessions.length ? roundInt(totalVolume / sessions.length) : 0,
    bestWeekVolumeKg: bestWeek ? bestWeek.volumeKg : 0,
    bestWeekLabel: bestWeek && bestWeek.volumeKg > 0 ? bestWeek.label : null,
    firstSessionDate: sessions.length ? sessions[0].date : null,
    lastSessionDate: sessions.length ? sessions[sessions.length - 1].date : null
  };
};

const csvCell = (value) => {
  const str = String(value ?? '');
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

// Flat, spreadsheet-friendly export: one row per logged set.
export const toSessionCsv = (log) => {
  const rows = [];
  Object.values(sanitizeSetLog(log))
    .slice()
    .sort((a, b) => a.exercise.localeCompare(b.exercise))
    .forEach(entry => {
      entry.sets.forEach(set => {
        rows.push({ ...set, exercise: entry.exercise });
      });
    });

  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  return [
    CSV_HEADER,
    ...rows.map(set => [
      set.date,
      csvCell(set.exercise),
      round1(set.weightKg),
      set.reps,
      estimateOneRepMax(set.weightKg, set.reps) ?? '',
      roundInt(set.weightKg * set.reps)
    ].join(','))
  ].join('\n');
};
