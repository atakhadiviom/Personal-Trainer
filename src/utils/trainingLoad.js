// Acute:chronic workload ratio (ACWR) & deload advisor.
// Everything is derived from the set log built by progressiveOverload.js, so there is
// no extra storage: daily tonnage, 7-day load, 4-week baseline and recovery advice.
import { sanitizeSetLog } from './progressiveOverload';
import { toDateKey, daysBetween } from './streaks';
import { getWeeklyTrend } from './workoutHistory';

export const ACUTE_DAYS = 7;
export const CHRONIC_DAYS = 28;
// Sports-science reference bands for the acute:chronic ratio.
export const SWEET_SPOT_MIN = 0.8;
export const SWEET_SPOT_MAX = 1.3;
export const HIGH_RISK_RATIO = 1.5;
// Week-over-week tonnage jump that usually means too much, too soon.
export const RAMP_WARN_PCT = 30;
// Deload weeks keep roughly 60% of the chronic weekly tonnage.
export const DELOAD_RATIO = 0.6;
export const CAP_RATIO = 1.1;
export const MAX_CONSECUTIVE_DAYS = 6;
export const MONOTONY_CAP = 4.5;
export const LOW_SLEEP_HOURS = 6;
export const TREND_WEEKS = 5;

const round = (n) => Math.round(n);
const round2 = (n) => Math.round(n * 100) / 100;
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

const noon = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);

const addDays = (date, days) => {
  const d = noon(date);
  d.setDate(d.getDate() + days);
  return d;
};

// One entry per day, oldest first, including today.
export const getDailyLoads = (log, { today = new Date(), days = ACUTE_DAYS } = {}) => {
  const count = Math.max(1, Math.floor(days) || ACUTE_DAYS);
  const todayKey = toDateKey(today);
  const volumeByDay = new Map();

  Object.values(sanitizeSetLog(log)).forEach(entry => {
    entry.sets.forEach(set => {
      if (set.date > todayKey) return;
      if (daysBetween(set.date, todayKey) >= count) return;
      volumeByDay.set(set.date, (volumeByDay.get(set.date) || 0) + set.weightKg * set.reps);
    });
  });

  return Array.from({ length: count }, (_, i) => {
    const key = toDateKey(addDays(today, -(count - 1 - i)));
    return { date: key, volumeKg: round(volumeByDay.get(key) || 0) };
  });
};

export const getLoadZone = (ratio) => {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) return 'baseline';
  if (ratio > HIGH_RISK_RATIO) return 'high';
  if (ratio > SWEET_SPOT_MAX) return 'caution';
  if (ratio < SWEET_SPOT_MIN) return 'detraining';
  return 'sweet';
};

export const getZoneLabel = (zone) => ({
  baseline: 'Baseline',
  detraining: 'Undertrained',
  sweet: 'Sweet spot',
  caution: 'Caution',
  high: 'Overreaching'
}[zone] || 'Baseline');

const countConsecutiveDays = (dates, todayKey) => {
  const sorted = [...dates].sort();
  if (!sorted.length) return 0;
  const last = sorted[sorted.length - 1];
  if (daysBetween(last, todayKey) > 1) return 0;
  let count = 1;
  for (let i = sorted.length - 2; i >= 0; i -= 1) {
    if (daysBetween(sorted[i], sorted[i + 1]) === 1) count += 1;
    else break;
  }
  return count;
};

const computeMonotony = (dailyLoads, mean) => {
  if (mean <= 0) return null;
  const variance = dailyLoads.reduce((sum, day) => sum + (day.volumeKg - mean) ** 2, 0) / dailyLoads.length;
  const sd = Math.sqrt(variance);
  if (sd === 0) return MONOTONY_CAP;
  return round2(Math.min(MONOTONY_CAP, mean / sd));
};

const computeRiskScore = (ratio, { consecutiveDays, rampPct, monotony }) => {
  let score = 0;
  if (ratio !== null && Number.isFinite(ratio)) {
    if (ratio < SWEET_SPOT_MIN) {
      score = clamp(round(ratio * 20), 0, 16);
    } else if (ratio <= SWEET_SPOT_MAX) {
      score = 20 + round(((ratio - SWEET_SPOT_MIN) / (SWEET_SPOT_MAX - SWEET_SPOT_MIN)) * 25);
    } else if (ratio <= HIGH_RISK_RATIO) {
      score = 45 + round(((ratio - SWEET_SPOT_MAX) / (HIGH_RISK_RATIO - SWEET_SPOT_MAX)) * 35);
    } else {
      score = 80 + round((ratio - HIGH_RISK_RATIO) * 40);
    }
  }
  if (consecutiveDays >= MAX_CONSECUTIVE_DAYS) score += 10;
  if (rampPct !== null && rampPct > RAMP_WARN_PCT) score += 5;
  if (monotony !== null && monotony > 2) score += 5;
  return clamp(round(score), 0, 100);
};

// Acute load = last 7 days of tonnage. Chronic load = 4-week weekly average.
export const getAcuteChronicLoad = (log, { today = new Date() } = {}) => {
  const clean = sanitizeSetLog(log);
  const todayKey = toDateKey(today);
  const daily = getDailyLoads(clean, { today, days: ACUTE_DAYS });
  const acuteKg = daily.reduce((sum, day) => sum + day.volumeKg, 0);

  let chronicTotal = 0;
  let totalSets = 0;
  let priorKg = 0;
  const trainingDates = new Set();

  Object.values(clean).forEach(entry => {
    entry.sets.forEach(set => {
      const age = daysBetween(set.date, todayKey);
      if (age < 0 || age >= CHRONIC_DAYS) return;
      const volume = set.weightKg * set.reps;
      chronicTotal += volume;
      totalSets += 1;
      trainingDates.add(set.date);
      if (age >= ACUTE_DAYS && age < ACUTE_DAYS * 2) priorKg += volume;
    });
  });

  const chronicKg = round(chronicTotal / (CHRONIC_DAYS / ACUTE_DAYS));
  const ratio = chronicKg > 0 ? round2(acuteKg / chronicKg) : null;
  const rampPct = priorKg > 0 ? round(((acuteKg - priorKg) / priorKg) * 100) : null;
  const mean = acuteKg / ACUTE_DAYS;
  const monotony = computeMonotony(daily, mean);
  const trainingDays = daily.filter(day => day.volumeKg > 0).length;
  const sortedDates = [...trainingDates].sort();
  const lastTrainedKey = sortedDates.length ? sortedDates[sortedDates.length - 1] : null;
  const daysSinceLast = lastTrainedKey === null ? null : daysBetween(lastTrainedKey, todayKey);
  const consecutiveDays = countConsecutiveDays(trainingDates, todayKey);
  const zone = getLoadZone(ratio);

  return {
    acuteKg,
    chronicKg,
    priorKg: round(priorKg),
    ratio,
    zone,
    rampPct,
    monotony,
    strain: monotony === null ? 0 : round((acuteKg * monotony) / 1000),
    riskScore: computeRiskScore(ratio, { consecutiveDays, rampPct, monotony }),
    trainingDays,
    restDays: ACUTE_DAYS - trainingDays,
    consecutiveDays,
    daysSinceLast,
    lastTrainedKey,
    totalSets,
    daily,
    weeks: getWeeklyTrend(clean, { today, weeks: TREND_WEEKS })
  };
};

const BASE_RECOVERY_TIPS = [
  'Sleep 7–9 hours — recovery happens outside the gym',
  'Hit 1.6–2.2 g protein per kg of body weight',
  'Keep easy sessions truly easy (Zone 2, conversational pace)'
];

const formatKg = (kg) => `${round(kg).toLocaleString()} kg`;

// Coaching advice for the athlete, driven only by the load summary.
export const getLoadAdvice = (summary = {}, { sleepHours = null } = {}) => {
  const {
    acuteKg = 0,
    chronicKg = 0,
    ratio = null,
    zone = 'baseline',
    rampPct = null,
    monotony = null,
    consecutiveDays = 0,
    daysSinceLast = null,
    totalSets = 0
  } = summary;

  const sleep = sleepHours === null || sleepHours === undefined || sleepHours === ''
    ? null
    : Number(sleepHours);
  const lowSleep = Number.isFinite(sleep) && sleep > 0 && sleep < LOW_SLEEP_HOURS;
  const deloadTargetKg = round(chronicKg * DELOAD_RATIO);
  const capKg = round(chronicKg * CAP_RATIO);

  if (!totalSets) {
    return {
      status: 'start',
      tone: 'neutral',
      title: 'Build your load baseline',
      message: 'Log a set on any exercise and NovaFit starts tracking your acute:chronic workload ratio, weekly ramp and deload timing.',
      tips: ['Aim for 3–5 sessions per week to build a clean baseline', ...BASE_RECOVERY_TIPS.slice(0, 2)],
      deloadTargetKg: null,
      capKg: null
    };
  }

  if (daysSinceLast !== null && daysSinceLast >= ACUTE_DAYS) {
    return {
      status: 'restart',
      tone: 'neutral',
      title: 'Comeback week — rebuild gradually',
      message: `${daysSinceLast} days since your last logged session. Start around 80% of your old loads and add 1–2 reps per week before chasing tonnage again.`,
      tips: ['Expect 2–3 weeks to return to previous loads', 'Keep the first two sessions 2–3 reps shy of failure', ...BASE_RECOVERY_TIPS.slice(0, 1)],
      deloadTargetKg: null,
      capKg: round(Math.max(acuteKg, chronicKg * 0.8))
    };
  }

  if (zone === 'high' || (lowSleep && (ratio >= SWEET_SPOT_MAX || (rampPct !== null && rampPct > RAMP_WARN_PCT)))) {
    const reason = zone === 'high'
      ? `Your 7-day load is ${ratio}× your 4-week average`
      : `Only ${sleep} hrs of sleep on top of a ${ratio}× load spike`;
    return {
      status: 'deload',
      tone: 'danger',
      title: 'Deload week recommended',
      message: `${reason}. Injury risk climbs above 1.5. Cut this week to about ${formatKg(deloadTargetKg)} — roughly 60% of your usual ${formatKg(chronicKg)} week — and keep the same exercises.`,
      tips: ['Drop 1–2 sets per exercise before dropping weight', 'Stay 3–4 reps shy of failure all week', lowSleep ? 'Prioritise sleep before adding volume again' : 'Rebuild with clean reps next week'],
      deloadTargetKg,
      capKg
    };
  }

  if (consecutiveDays >= MAX_CONSECUTIVE_DAYS) {
    return {
      status: 'rest',
      tone: 'warn',
      title: `${consecutiveDays} training days in a row`,
      message: 'Joints and connective tissue recover slower than muscle. Take a full rest day, then cap next week at your current tonnage instead of adding more.',
      tips: ['20–30 min easy walk or mobility only today', `Keep next week at or below ${formatKg(chronicKg)}`, ...BASE_RECOVERY_TIPS.slice(0, 1)],
      deloadTargetKg: null,
      capKg
    };
  }

  if (zone === 'caution' || (rampPct !== null && rampPct > RAMP_WARN_PCT) || (lowSleep && zone === 'sweet')) {
    const reason = rampPct !== null && rampPct > RAMP_WARN_PCT
      ? `Weekly tonnage jumped ${rampPct}%`
      : lowSleep
        ? `Short sleep (${sleep} hrs) at a ${ratio}× load ratio`
        : `Your 7-day load is ${ratio}× your 4-week average`;
    return {
      status: 'caution',
      tone: 'warn',
      title: 'Hold the line this week',
      message: `${reason}. Keep the next 7 days at or below ${formatKg(capKg)} and add a rest day rather than another hard session.`,
      tips: ['Repeat last week’s weights instead of adding load', monotony !== null && monotony > 2 ? 'Vary intensity — avoid six similar moderate days' : 'Alternate hard and easy days', ...BASE_RECOVERY_TIPS.slice(0, 1)],
      deloadTargetKg: null,
      capKg
    };
  }

  if (zone === 'detraining') {
    return {
      status: 'rebuild',
      tone: 'neutral',
      title: 'Room to build',
      message: `Your 7-day load (${formatKg(acuteKg)}) sits below 80% of your ${formatKg(chronicKg)} weekly average. Add one session or a few sets — aim for about ${formatKg(chronicKg)}.`,
      tips: ['Add 2–3 sets across the week, not a whole extra session at once', 'Keep the 10% weekly ramp rule', ...BASE_RECOVERY_TIPS.slice(2)],
      deloadTargetKg: null,
      capKg: round(chronicKg * 1.15)
    };
  }

  return {
    status: 'build',
    tone: 'good',
    title: 'Green light to progress',
    message: `Your ratio is ${ratio}× — inside the 0.8–1.3 sweet spot. Progress loads or add a set, keeping next week under ${formatKg(capKg)}.`,
    tips: ['Add 2.5 kg or one rep on your main lifts', monotony !== null && monotony > 2 ? 'Break up training monotony with one lighter day' : 'Keep one full rest day in the week', ...BASE_RECOVERY_TIPS.slice(0, 1)],
    deloadTargetKg: null,
    capKg
  };
};

export const getTrainingLoadCoach = (log, { today = new Date(), sleepHours = null } = {}) => {
  const summary = getAcuteChronicLoad(log, { today });
  return { ...summary, advice: getLoadAdvice(summary, { sleepHours }) };
};
