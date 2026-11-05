import { describe, it, expect } from 'vitest';
import {
  getAcuteChronicLoad,
  getDailyLoads,
  getLoadAdvice,
  getLoadZone,
  getZoneLabel,
  getTrainingLoadCoach,
  ACUTE_DAYS,
  DELOAD_RATIO,
  MONOTONY_CAP,
  SWEET_SPOT_MAX,
  SWEET_SPOT_MIN,
  HIGH_RISK_RATIO
} from '../utils/trainingLoad';
import { logSet } from '../utils/progressiveOverload';
import { toDateKey } from '../utils/streaks';

const TODAY = new Date(2026, 10, 15, 10, 0, 0);
const daysAgo = (n) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - n);
  return toDateKey(d);
};

const buildLog = (entries) => entries.reduce((log, entry) => logSet(log, entry), {});

// Trains every `step` days inside [from, to] (both offsets counted back from today).
const periodic = ({ from, to, step = 1, weightKg = 100, reps = 10, exercise = 'Squat' }) => {
  const entries = [];
  for (let offset = from; offset <= to; offset += step) {
    entries.push({ exercise, weightKg, reps, date: daysAgo(offset) });
  }
  return entries;
};

// Four sessions per calendar week (offsets 0, 2, 4, 6 of each 7-day block).
const weeklyBlock = ({ weeksFrom = 0, weeks = 1, weightKg = 100, reps = 10 } = {}) => {
  const entries = [];
  for (let w = weeksFrom; w < weeksFrom + weeks; w += 1) {
    [0, 2, 4, 6].forEach(day => {
      entries.push({ exercise: 'Squat', weightKg, reps, date: daysAgo(w * 7 + day) });
    });
  }
  return entries;
};

const balancedLog = () => buildLog(weeklyBlock({ weeks: 4 }));
const spikeLog = () => buildLog([
  ...weeklyBlock({ weeksFrom: 1, weeks: 3 }),
  ...periodic({ from: 0, to: 6, step: 1, weightKg: 300, reps: 10 })
]);
const detrainingLog = () => buildLog([
  ...weeklyBlock({ weeksFrom: 1, weeks: 3, weightKg: 200 }),
  { exercise: 'Squat', weightKg: 50, reps: 10, date: daysAgo(0) }
]);
const rampLog = () => buildLog([
  ...weeklyBlock({ weeksFrom: 2, weeks: 2, weightKg: 125 }),
  ...weeklyBlock({ weeksFrom: 1, weeks: 1, weightKg: 100 }),
  ...[0, 1, 2, 4, 5, 6].map(offset => ({ exercise: 'Squat', weightKg: 100, reps: 10, date: daysAgo(offset) }))
]);
const cautionLog = () => buildLog([
  ...weeklyBlock({ weeksFrom: 1, weeks: 3, weightKg: 250 }),
  ...[0, 1, 2, 4, 5, 6].map(offset => ({ exercise: 'Squat', weightKg: 250, reps: 10, date: daysAgo(offset) }))
]);

describe('trainingLoad · zone bands', () => {
  it('maps ratios onto the reference bands', () => {
    expect(getLoadZone(null)).toBe('baseline');
    expect(getLoadZone(0.5)).toBe('detraining');
    expect(getLoadZone(SWEET_SPOT_MIN)).toBe('sweet');
    expect(getLoadZone(1.1)).toBe('sweet');
    expect(getLoadZone(SWEET_SPOT_MAX)).toBe('sweet');
    expect(getLoadZone(1.4)).toBe('caution');
    expect(getLoadZone(HIGH_RISK_RATIO)).toBe('caution');
    expect(getLoadZone(1.8)).toBe('high');
  });

  it('labels every zone', () => {
    expect(getZoneLabel('baseline')).toBe('Baseline');
    expect(getZoneLabel('detraining')).toBe('Undertrained');
    expect(getZoneLabel('sweet')).toBe('Sweet spot');
    expect(getZoneLabel('caution')).toBe('Caution');
    expect(getZoneLabel('high')).toBe('Overreaching');
    expect(getZoneLabel('nonsense')).toBe('Baseline');
  });
});

describe('trainingLoad · daily loads', () => {
  it('returns seven days ending today, oldest first', () => {
    const log = buildLog([
      { exercise: 'Squat', weightKg: 100, reps: 5, date: daysAgo(0) },
      { exercise: 'Squat', weightKg: 80, reps: 5, date: daysAgo(6) },
      { exercise: 'Squat', weightKg: 999, reps: 5, date: daysAgo(9) }
    ]);
    const daily = getDailyLoads(log, { today: TODAY });
    expect(daily).toHaveLength(ACUTE_DAYS);
    expect(daily[0].date).toBe(daysAgo(6));
    expect(daily[6].date).toBe(daysAgo(0));
    expect(daily[6].volumeKg).toBe(500);
    expect(daily[0].volumeKg).toBe(400);
    expect(daily.reduce((sum, day) => sum + day.volumeKg, 0)).toBe(900);
  });

  it('ignores future-dated sets', () => {
    const log = buildLog([{ exercise: 'Squat', weightKg: 100, reps: 5, date: daysAgo(-2) }]);
    const summary = getAcuteChronicLoad(log, { today: TODAY });
    expect(summary.acuteKg).toBe(0);
    expect(summary.totalSets).toBe(0);
  });
});

describe('trainingLoad · acute:chronic ratio', () => {
  it('reports a baseline with no logged sets', () => {
    const summary = getAcuteChronicLoad({}, { today: TODAY });
    expect(summary.acuteKg).toBe(0);
    expect(summary.chronicKg).toBe(0);
    expect(summary.ratio).toBeNull();
    expect(summary.zone).toBe('baseline');
    expect(summary.trainingDays).toBe(0);
    expect(summary.restDays).toBe(7);
    expect(summary.monotony).toBeNull();
    expect(summary.riskScore).toBe(0);
  });

  it('computes the ratio for a steady athlete inside the sweet spot', () => {
    const summary = getAcuteChronicLoad(balancedLog(), { today: TODAY });
    // Acute: 4 sessions × 1,000 kg = 4,000. Chronic: 16 sessions × 1,000 / 4 = 4,000.
    expect(summary.acuteKg).toBe(4000);
    expect(summary.chronicKg).toBe(4000);
    expect(summary.ratio).toBe(1);
    expect(summary.zone).toBe('sweet');
    expect(summary.trainingDays).toBe(4);
    expect(summary.restDays).toBe(3);
    expect(summary.rampPct).toBe(0);
  });

  it('flags a load spike as overreaching', () => {
    const summary = getAcuteChronicLoad(spikeLog(), { today: TODAY });
    expect(summary.ratio).toBeGreaterThan(HIGH_RISK_RATIO);
    expect(summary.zone).toBe('high');
    expect(summary.riskScore).toBeGreaterThan(80);
  });

  it('flags a low week as detraining', () => {
    const summary = getAcuteChronicLoad(detrainingLog(), { today: TODAY });
    expect(summary.ratio).toBeLessThan(SWEET_SPOT_MIN);
    expect(summary.zone).toBe('detraining');
  });

  it('measures week-over-week ramp against the prior 7 days', () => {
    const summary = getAcuteChronicLoad(rampLog(), { today: TODAY });
    expect(summary.rampPct).toBe(50);
    expect(summary.zone).toBe('sweet');
    expect(summary.priorKg).toBe(4000);
  });

  it('caps training monotony when every day carries the same load', () => {
    const log = buildLog(periodic({ from: 0, to: 6, weightKg: 100, reps: 10 }));
    const summary = getAcuteChronicLoad(log, { today: TODAY });
    expect(summary.monotony).toBe(MONOTONY_CAP);
    expect(summary.strain).toBeGreaterThan(0);
  });

  it('counts consecutive training days ending today', () => {
    const log = buildLog(periodic({ from: 0, to: 5, weightKg: 100, reps: 10 }));
    const summary = getAcuteChronicLoad(log, { today: TODAY });
    expect(summary.consecutiveDays).toBe(6);
  });

  it('never exceeds a risk score of 100', () => {
    const log = buildLog(periodic({ from: 0, to: 6, step: 1, weightKg: 500, reps: 20 }));
    const summary = getAcuteChronicLoad(log, { today: TODAY });
    expect(summary.riskScore).toBeLessThanOrEqual(100);
  });
});

describe('trainingLoad · coaching advice', () => {
  it('asks for a baseline before any set is logged', () => {
    const summary = getAcuteChronicLoad({}, { today: TODAY });
    const advice = getLoadAdvice(summary);
    expect(advice.status).toBe('start');
    expect(advice.deloadTargetKg).toBeNull();
    expect(advice.tips.length).toBeGreaterThan(1);
  });

  it('recommends a deload after a spike, with a 60% target', () => {
    const summary = getAcuteChronicLoad(spikeLog(), { today: TODAY });
    const advice = getLoadAdvice(summary);
    expect(advice.status).toBe('deload');
    expect(advice.tone).toBe('danger');
    expect(advice.deloadTargetKg).toBe(Math.round(summary.chronicKg * DELOAD_RATIO));
    expect(advice.title).toBe('Deload week recommended');
    expect(advice.message).toContain('60%');
    expect(advice.message).toContain(`${summary.ratio}×`);
  });

  it('greens-lights progression inside the sweet spot', () => {
    const summary = getAcuteChronicLoad(balancedLog(), { today: TODAY });
    const advice = getLoadAdvice(summary);
    expect(advice.status).toBe('build');
    expect(advice.tone).toBe('good');
    expect(advice.message).toContain('sweet spot');
  });

  it('suggests rebuilding after a detraining week', () => {
    const summary = getAcuteChronicLoad(detrainingLog(), { today: TODAY });
    const advice = getLoadAdvice(summary);
    expect(advice.status).toBe('rebuild');
    expect(advice.message).toMatch(/below 80%/);
  });

  it('cautions when weekly tonnage ramps too fast', () => {
    const summary = getAcuteChronicLoad(rampLog(), { today: TODAY });
    const advice = getLoadAdvice(summary);
    expect(summary.zone).toBe('sweet');
    expect(summary.rampPct).toBeGreaterThan(30);
    expect(advice.status).toBe('caution');
    expect(advice.message).toContain('50%');
  });

  it('caps the week when the ratio is in the caution band', () => {
    const summary = getAcuteChronicLoad(cautionLog(), { today: TODAY });
    expect(summary.zone).toBe('caution');
    const advice = getLoadAdvice(summary);
    expect(advice.status).toBe('caution');
    expect(advice.capKg).toBe(Math.round(summary.chronicKg * 1.1));
  });

  it('escalates a caution-band load to a deload on short sleep', () => {
    const summary = getAcuteChronicLoad(cautionLog(), { today: TODAY });
    expect(getLoadAdvice(summary).status).toBe('caution');
    const advice = getLoadAdvice(summary, { sleepHours: 5 });
    expect(advice.status).toBe('deload');
    expect(advice.message).toContain('5 hrs');
  });

  it('recommends rest after six straight training days', () => {
    const log = buildLog([
      ...weeklyBlock({ weeksFrom: 1, weeks: 3 }),
      ...periodic({ from: 0, to: 5, weightKg: 100, reps: 10 })
    ]);
    const summary = getAcuteChronicLoad(log, { today: TODAY });
    expect(summary.consecutiveDays).toBeGreaterThanOrEqual(6);
    expect(summary.zone).not.toBe('high');
    const advice = getLoadAdvice(summary);
    expect(advice.status).toBe('rest');
    expect(advice.title).toMatch(/training days in a row/);
  });

  it('sends an athlete returning after a week back to 80% loads', () => {
    const log = buildLog([
      { exercise: 'Squat', weightKg: 100, reps: 10, date: daysAgo(12) },
      { exercise: 'Squat', weightKg: 100, reps: 10, date: daysAgo(15) },
      { exercise: 'Squat', weightKg: 100, reps: 10, date: daysAgo(18) }
    ]);
    const summary = getAcuteChronicLoad(log, { today: TODAY });
    expect(summary.daysSinceLast).toBe(12);
    const advice = getLoadAdvice(summary);
    expect(advice.status).toBe('restart');
    expect(advice.message).toContain('12 days');
  });

  it('returns a complete coach payload', () => {
    const coach = getTrainingLoadCoach(balancedLog(), { today: TODAY, sleepHours: 8 });
    expect(coach.ratio).toBe(1);
    expect(coach.weeks).toHaveLength(5);
    expect(coach.advice.status).toBe('build');
  });
});
