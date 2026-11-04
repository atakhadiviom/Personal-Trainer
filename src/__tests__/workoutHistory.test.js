import { describe, it, expect } from 'vitest';
import {
  startOfWeek,
  getSessions,
  getWeeklyTrend,
  getHeatmap,
  getExerciseBreakdown,
  getAnalyticsSummary,
  toSessionCsv,
  CSV_HEADER,
  TREND_WEEKS,
  HEATMAP_WEEKS
} from '../utils/workoutHistory';
import { logSet } from '../utils/progressiveOverload';
import { toDateKey } from '../utils/streaks';

// Sunday 15 Nov 2026 — Monday-start week is 9–15 Nov.
const TODAY = new Date(2026, 10, 15, 10, 0, 0);
const daysAgo = (n) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - n);
  return toDateKey(d);
};

const buildLog = (entries) => entries.reduce(
  (log, entry) => logSet(log, entry),
  {}
);

describe('startOfWeek', () => {
  it('returns Monday for every day of the week', () => {
    [9, 10, 11, 12, 13, 14, 15].forEach(day => {
      const date = new Date(2026, 10, day, 18, 30);
      expect(toDateKey(startOfWeek(date))).toBe('2026-11-09');
    });
  });

  it('rolls back to the previous Monday for a Sunday timestamp', () => {
    expect(toDateKey(startOfWeek(new Date(2026, 10, 8, 1, 0)))).toBe('2026-11-02');
  });
});

describe('getSessions', () => {
  it('groups sets by date and aggregates volume, sets and exercises', () => {
    const log = buildLog([
      { exercise: 'Bench Press', weightKg: 60, reps: 10, date: daysAgo(1) },
      { exercise: 'Bench Press', weightKg: 60, reps: 8, date: daysAgo(1) },
      { exercise: 'Squat', weightKg: 100, reps: 5, date: daysAgo(1) },
      { exercise: 'Squat', weightKg: 100, reps: 5, date: daysAgo(3) }
    ]);
    const sessions = getSessions(log);
    expect(sessions).toHaveLength(2);
    expect(sessions[0].date).toBe(daysAgo(3));
    const latest = sessions[1];
    expect(latest.totalSets).toBe(3);
    expect(latest.exerciseCount).toBe(2);
    expect(latest.totalReps).toBe(23);
    // 60*10 + 60*8 + 100*5 = 1580
    expect(latest.volumeKg).toBe(1580);
    expect(latest.topSet.exercise).toBe('Squat');
    expect(latest.topSet.e1rm).toBe(116.7);
  });

  it('counts bodyweight sets without inflating tonnage', () => {
    const log = buildLog([{ exercise: 'Pull Up', weightKg: 0, reps: 12, date: daysAgo(2) }]);
    const [session] = getSessions(log);
    expect(session.totalSets).toBe(1);
    expect(session.volumeKg).toBe(0);
    expect(session.topSet.e1rm).toBeNull();
  });

  it('returns an empty array for an empty log', () => {
    expect(getSessions({})).toEqual([]);
    expect(getSessions(null)).toEqual([]);
  });
});

describe('getWeeklyTrend', () => {
  it('returns eight Monday-start buckets, oldest first, with the current week last', () => {
    const trend = getWeeklyTrend({}, { today: TODAY });
    expect(trend).toHaveLength(TREND_WEEKS);
    expect(trend[trend.length - 1].weekStart).toBe('2026-11-09');
    expect(trend[trend.length - 1].isCurrent).toBe(true);
    expect(trend[0].weekStart).toBe('2026-09-21');
    expect(trend[0].isCurrent).toBe(false);
    expect(trend.every(week => week.volumeKg === 0 && week.sessions === 0)).toBe(true);
  });

  it('sums tonnage and unique training days per calendar week', () => {
    const log = buildLog([
      { exercise: 'Bench Press', weightKg: 60, reps: 10, date: '2026-11-09' },
      { exercise: 'Bench Press', weightKg: 60, reps: 10, date: '2026-11-10' },
      { exercise: 'Squat', weightKg: 100, reps: 5, date: '2026-11-15' },
      { exercise: 'Squat', weightKg: 100, reps: 5, date: '2026-11-02' }
    ]);
    const trend = getWeeklyTrend(log, { today: TODAY });
    const current = trend[trend.length - 1];
    expect(current.volumeKg).toBe(1700);
    expect(current.sets).toBe(3);
    expect(current.sessions).toBe(3);
    expect(trend[trend.length - 2].volumeKg).toBe(500);
    expect(trend.reduce((sum, week) => sum + week.volumeKg, 0)).toBe(2200);
  });

  it('ignores sets dated in the future and outside the window', () => {
    const log = buildLog([
      { exercise: 'Bench Press', weightKg: 60, reps: 10, date: '2026-11-16' },
      { exercise: 'Bench Press', weightKg: 60, reps: 10, date: '2026-01-01' }
    ]);
    const trend = getWeeklyTrend(log, { today: TODAY });
    expect(trend.every(week => week.volumeKg === 0)).toBe(true);
  });

  it('honours the weeks option', () => {
    const trend = getWeeklyTrend({}, { today: TODAY, weeks: 4 });
    expect(trend).toHaveLength(4);
    expect(trend[0].weekStart).toBe('2026-10-19');
  });
});

describe('getHeatmap', () => {
  it('builds a full 8×7 grid ending today', () => {
    const heatmap = getHeatmap({}, { today: TODAY });
    expect(heatmap.weeks).toBe(HEATMAP_WEEKS);
    expect(heatmap.days).toHaveLength(HEATMAP_WEEKS * 7);
    expect(heatmap.columns).toHaveLength(HEATMAP_WEEKS);
    expect(heatmap.days[0].key).toBe('2026-09-21');
    expect(heatmap.days[heatmap.days.length - 1].key).toBe('2026-11-15');
    expect(heatmap.maxVolumeKg).toBe(0);
    expect(heatmap.activeDays).toBe(0);
  });

  it('scales intensity levels against the busiest day', () => {
    const log = buildLog([
      { exercise: 'Squat', weightKg: 100, reps: 10, date: daysAgo(1) }, // 1000 kg
      { exercise: 'Squat', weightKg: 100, reps: 5, date: daysAgo(2) },  // 500 kg
      { exercise: 'Squat', weightKg: 100, reps: 1, date: daysAgo(3) }   // 100 kg
    ]);
    const heatmap = getHeatmap(log, { today: TODAY });
    const byKey = Object.fromEntries(heatmap.days.map(day => [day.key, day]));
    expect(byKey[daysAgo(1)].level).toBe(4);
    expect(byKey[daysAgo(2)].level).toBe(2);
    expect(byKey[daysAgo(3)].level).toBe(1);
    expect(byKey[daysAgo(4)].level).toBe(0);
    expect(heatmap.maxVolumeKg).toBe(1000);
    expect(heatmap.activeDays).toBe(3);
  });

  it('flags today, future days and completed days', () => {
    const log = buildLog([{ exercise: 'Bench Press', weightKg: 60, reps: 10, date: daysAgo(0) }]);
    const heatmap = getHeatmap(log, { today: TODAY });
    const todayCell = heatmap.days.find(day => day.isToday);
    expect(todayCell.key).toBe('2026-11-15');
    expect(todayCell.sets).toBe(1);
    expect(todayCell.isFuture).toBe(false);
    expect(heatmap.days.filter(day => day.isFuture)).toHaveLength(0);
    // 15 Nov 2026 is the last day of the grid, so nothing is future.
    const midWeek = getHeatmap(log, { today: new Date(2026, 10, 11, 10, 0) }); // Wednesday
    expect(midWeek.days.filter(day => day.isFuture).length).toBe(4);
  });
});

describe('getExerciseBreakdown', () => {
  it('totals sets, sessions, tonnage and best estimated 1RM per exercise', () => {
    const log = buildLog([
      { exercise: 'Bench Press', weightKg: 60, reps: 10, date: daysAgo(1) },
      { exercise: 'Bench Press', weightKg: 65, reps: 8, date: daysAgo(5) },
      { exercise: 'Squat', weightKg: 100, reps: 5, date: daysAgo(2) }
    ]);
    const items = getExerciseBreakdown(log, { today: TODAY });
    expect(items).toHaveLength(2);
    const bench = items.find(item => item.exercise === 'Bench Press');
    expect(bench.sets).toBe(2);
    expect(bench.sessions).toBe(2);
    expect(bench.volumeKg).toBe(1120);
    expect(bench.bestE1rm).toBe(82.3);
    expect(bench.daysSince).toBe(1);
    expect(items[0].exercise).toBe('Bench Press');
  });

  it('computes a 14-day volume trend against the previous fortnight', () => {
    const log = buildLog([
      { exercise: 'Squat', weightKg: 100, reps: 5, date: daysAgo(2) },  // recent: 500
      { exercise: 'Squat', weightKg: 100, reps: 10, date: daysAgo(20) } // prior: 1000
    ]);
    const [squat] = getExerciseBreakdown(log, { today: TODAY });
    expect(squat.recentVolumeKg).toBe(500);
    expect(squat.trendPct).toBe(-50);
  });

  it('reports 100% growth when all work is new and null when there is no prior history', () => {
    const log = buildLog([{ exercise: 'Squat', weightKg: 100, reps: 5, date: daysAgo(1) }]);
    const [squat] = getExerciseBreakdown(log, { today: TODAY });
    expect(squat.trendPct).toBe(100);

    const old = buildLog([{ exercise: 'Deadlift', weightKg: 120, reps: 5, date: daysAgo(40) }]);
    const [deadlift] = getExerciseBreakdown(old, { today: TODAY });
    expect(deadlift.trendPct).toBeNull();
  });

  it('sorts by tonnage and respects the limit', () => {
    const log = buildLog([
      { exercise: 'Curl', weightKg: 10, reps: 10, date: daysAgo(1) },
      { exercise: 'Squat', weightKg: 100, reps: 10, date: daysAgo(1) },
      { exercise: 'Bench Press', weightKg: 60, reps: 10, date: daysAgo(1) }
    ]);
    const limited = getExerciseBreakdown(log, { today: TODAY, limit: 2 });
    expect(limited.map(item => item.exercise)).toEqual(['Squat', 'Bench Press']);
    expect(getExerciseBreakdown(log, { today: TODAY, limit: 0 })).toEqual([]);
  });
});

describe('getAnalyticsSummary', () => {
  it('reports lifetime totals and this-week versus last-week tonnage', () => {
    const log = buildLog([
      { exercise: 'Squat', weightKg: 100, reps: 10, date: daysAgo(1) },  // this week 1000
      { exercise: 'Squat', weightKg: 100, reps: 5, date: daysAgo(8) },   // last week 500
      { exercise: 'Squat', weightKg: 100, reps: 2, date: daysAgo(30) }   // older 200
    ]);
    const summary = getAnalyticsSummary(log, { today: TODAY });
    expect(summary.totalSessions).toBe(3);
    expect(summary.totalSets).toBe(3);
    expect(summary.totalVolumeKg).toBe(1700);
    expect(summary.sessionsThisWeek).toBe(1);
    expect(summary.sessionsLastWeek).toBe(1);
    expect(summary.volumeThisWeekKg).toBe(1000);
    expect(summary.volumeLastWeekKg).toBe(500);
    expect(summary.volumeTrendPct).toBe(100);
    expect(summary.avgSessionVolumeKg).toBe(567);
    expect(summary.firstSessionDate).toBe(daysAgo(30));
    expect(summary.lastSessionDate).toBe(daysAgo(1));
  });

  it('leaves the trend null when there is no prior week to compare', () => {
    const log = buildLog([{ exercise: 'Squat', weightKg: 100, reps: 5, date: daysAgo(1) }]);
    const summary = getAnalyticsSummary(log, { today: TODAY });
    expect(summary.volumeTrendPct).toBeNull();
  });

  it('returns zeroed metrics for an empty log', () => {
    const summary = getAnalyticsSummary({}, { today: TODAY });
    expect(summary).toMatchObject({
      totalSessions: 0,
      totalSets: 0,
      totalVolumeKg: 0,
      avgSessionVolumeKg: 0,
      bestWeekVolumeKg: 0,
      bestWeekLabel: null,
      firstSessionDate: null,
      lastSessionDate: null
    });
  });
});

describe('toSessionCsv', () => {
  it('exports a header and one row per set sorted by date', () => {
    const log = buildLog([
      { exercise: 'Bench Press', weightKg: 60, reps: 10, date: daysAgo(2) },
      { exercise: 'Squat', weightKg: 100, reps: 5, date: daysAgo(4) }
    ]);
    const csv = toSessionCsv(log).split('\n');
    expect(csv[0]).toBe(CSV_HEADER);
    expect(csv).toHaveLength(3);
    expect(csv[1]).toBe(`${daysAgo(4)},Squat,100,5,116.7,500`);
    expect(csv[2]).toBe(`${daysAgo(2)},Bench Press,60,10,80,600`);
  });

  it('quotes exercise names that contain commas', () => {
    const log = buildLog([{ exercise: 'Row, Chest Supported', weightKg: 40, reps: 12, date: daysAgo(1) }]);
    const row = toSessionCsv(log).split('\n')[1];
    expect(row).toContain('"Row, Chest Supported"');
  });

  it('leaves estimated 1RM blank for bodyweight sets', () => {
    const log = buildLog([{ exercise: 'Pull Up', weightKg: 0, reps: 12, date: daysAgo(1) }]);
    const row = toSessionCsv(log).split('\n')[1];
    expect(row).toBe(`${daysAgo(1)},Pull Up,0,12,,0`);
  });

  it('returns just the header for an empty log', () => {
    expect(toSessionCsv({})).toBe(CSV_HEADER);
  });
});
