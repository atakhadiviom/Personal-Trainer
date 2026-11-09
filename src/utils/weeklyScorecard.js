// Weekly adherence scorecard.
// Joins three independent signals the app already stores — training days (activity log),
// meal logging (Firestore calorie log, passed in) and the body trend (local measurements)
// into one 7-day execution score plus a single next-week focus.
import { toDateKey, sanitizeLog, daysBetween } from './streaks';
import { getMetricSeries } from './bodyProgress';

export const WINDOW_DAYS = 7;
export const DEFAULT_PLANNED_DAYS = 3;
export const TRAINING_WEIGHT = 0.6;
export const NUTRITION_WEIGHT = 0.4;
export const CALORIE_TOLERANCE = 0.1;
export const PROTEIN_FLOOR = 0.9;
export const BODY_TREND_DAYS = 28;
export const GRADE_BANDS = Object.freeze([
  { min: 85, grade: 'A', label: 'Excellent', tone: 'good' },
  { min: 70, grade: 'B', label: 'Solid', tone: 'ok' },
  { min: 55, grade: 'C', label: 'Patchy', tone: 'warn' },
  { min: 0, grade: 'D', label: 'Off track', tone: 'bad' }
]);

const round1 = (n) => Math.round(n * 10) / 10;

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export const getWindowDates = (today = new Date(), days = WINDOW_DAYS) =>
  Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (days - 1 - i));
    return toDateKey(d);
  });

export const formatWindowLabel = (start, end) => {
  const fmt = (key) => {
    if (typeof key !== 'string' || key.length !== 10) return '';
    const [, m, d] = key.split('-').map(Number);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[m - 1]} ${d}`;
  };
  return `${fmt(start)} – ${fmt(end)}`;
};

export const summarizeTraining = ({ activityLog = {}, today = new Date(), plannedDays } = {}) => {
  const windowDates = getWindowDates(today);
  const clean = sanitizeLog(activityLog);
  const trainedDates = windowDates.filter(date => clean[date]);
  const sessions = trainedDates.length;
  const planned = clamp(Math.round(toNumber(plannedDays) ?? DEFAULT_PLANNED_DAYS), 1, WINDOW_DAYS);
  const ratio = sessions / planned;

  let status = 'on-track';
  if (sessions === 0) status = 'no-data';
  else if (ratio >= 1) status = 'complete';
  else if (ratio < 0.5) status = 'behind';

  const labels = trainedDates.flatMap(date => clean[date].labels || []);
  const focuses = [...new Set(labels.map(label => (label || '').split(' ')[0]).filter(Boolean))].slice(0, 4);

  return {
    sessions,
    planned,
    ratio: round1(ratio),
    score: Math.round(Math.min(1, ratio) * 100),
    status,
    trainedDates,
    focuses,
    value: `${sessions} / ${planned}`,
    unit: 'sessions'
  };
};

export const summarizeNutrition = ({
  nutritionDays = [],
  targetCals = null,
  proteinTarget = null,
  today = new Date()
} = {}) => {
  const windowDates = getWindowDates(today);
  const byDate = new Map();
  (Array.isArray(nutritionDays) ? nutritionDays : []).forEach(day => {
    if (day && typeof day.date === 'string' && !byDate.has(day.date)) byDate.set(day.date, day);
  });

  const days = windowDates.map(date => {
    const day = byDate.get(date);
    if (!day) return null;
    const cals = toNumber(day.cals);
    const meals = toNumber(day.meals);
    if ((cals === null || cals <= 0) && (meals === null || meals <= 0)) return null;
    return {
      date,
      cals: cals === null ? 0 : Math.round(cals),
      protein: toNumber(day.protein) === null ? 0 : Math.round(toNumber(day.protein)),
      meals: meals === null ? 0 : Math.round(meals)
    };
  });

  const loggedDays = days.filter(Boolean);
  const loggedCount = loggedDays.length;
  const coverage = loggedCount / windowDates.length;
  const avgCals = loggedCount
    ? Math.round(loggedDays.reduce((total, day) => total + day.cals, 0) / loggedCount)
    : null;

  const calorieTarget = toNumber(targetCals);
  const proteinGoal = toNumber(proteinTarget);
  const calorieHitDays = calorieTarget
    ? loggedDays.filter(day => Math.abs(day.cals - calorieTarget) <= calorieTarget * CALORIE_TOLERANCE).length
    : null;
  const proteinHitDays = proteinGoal
    ? loggedDays.filter(day => day.protein >= proteinGoal * PROTEIN_FLOOR).length
    : null;

  if (!loggedCount) {
    return {
      loggedDays: 0,
      targetDays: windowDates.length,
      coverage: 0,
      avgCals: null,
      targetCals: calorieTarget,
      calorieHitDays,
      proteinHitDays,
      proteinTarget: proteinGoal,
      score: null,
      status: 'no-data',
      days: [],
      value: '0 / 7',
      unit: 'days logged'
    };
  }

  const parts = [{ value: coverage, weight: 0.5 }];
  if (calorieTarget) parts.push({ value: calorieHitDays / loggedCount, weight: 0.3 });
  if (proteinGoal) parts.push({ value: proteinHitDays / loggedCount, weight: 0.2 });
  const weightTotal = parts.reduce((total, part) => total + part.weight, 0);
  const score = Math.round((parts.reduce((total, part) => total + part.value * part.weight, 0) / weightTotal) * 100);

  let status = 'behind';
  if (coverage >= 0.85) status = 'complete';
  else if (coverage >= 0.5) status = 'on-track';

  return {
    loggedDays: loggedCount,
    targetDays: windowDates.length,
    coverage: Math.round(coverage * 100) / 100,
    avgCals,
    targetCals: calorieTarget,
    calorieHitDays,
    proteinHitDays,
    proteinTarget: proteinGoal,
    score,
    status,
    days,
    value: `${loggedCount} / ${windowDates.length}`,
    unit: 'days logged'
  };
};

const BODY_RULES = {
  fatloss: { min: -1.0, max: -0.15, fast: -1.2, gain: 0.3 },
  muscle: { min: 0.1, max: 0.5, fast: 0.8, gain: -0.3 },
  recomp: { min: -0.4, max: 0.4, fast: -1.0, gain: 0.6 },
  strength: { min: -0.5, max: 0.5, fast: -1.2, gain: 0.7 },
  endurance: { min: -0.6, max: 0.6, fast: -1.2, gain: 0.7 }
};

export const summarizeBody = ({ bodyLog = [], goal = 'fatloss', today = new Date() } = {}) => {
  const weight = getMetricSeries(bodyLog, 'weightKg');
  if (weight.length < 2) return null;

  const windowDates = getWindowDates(today, BODY_TREND_DAYS);
  const recent = weight.filter(point => windowDates.includes(point.date));
  const points = recent.length >= 2 ? recent : weight.slice(-2);
  const first = points[0];
  const last = points[points.length - 1];
  const spanDays = Math.max(1, daysBetween(first.date, last.date));
  const delta = round1(last.value - first.value);
  const weeklyRate = round1((delta / spanDays) * 7);
  const rule = BODY_RULES[goal] || BODY_RULES.recomp;

  let tone = 'ok';
  let title = 'Weight is steady';
  let message = 'Scale weight is holding. Keep protein high and trust the training log.';

  if (goal === 'fatloss') {
    if (weeklyRate <= rule.fast) {
      tone = 'warn';
      title = 'Cutting too fast';
      message = `${Math.abs(weeklyRate)} kg/week is faster than 1% of body weight. Add ~200 kcal and keep protein high to protect muscle.`;
    } else if (weeklyRate <= rule.max) {
      tone = 'good';
      title = 'Fat loss on pace';
      message = `${Math.abs(weeklyRate)} kg/week is a sustainable pace — the plan is working.`;
    } else if (weeklyRate > rule.gain) {
      tone = 'warn';
      title = 'Trending up';
      message = `Weight is up ${weeklyRate} kg/week on a fat-loss goal. Re-check portions and weekend meals against your calorie target.`;
    } else {
      tone = 'ok';
      title = 'Scale is flat';
      message = 'A flat week is normal. If it holds for three weeks with good adherence, trim ~150 kcal.';
    }
  } else if (goal === 'muscle') {
    if (weeklyRate > rule.fast) {
      tone = 'warn';
      title = 'Gaining too fast';
      message = `${weeklyRate} kg/week is above the lean-gain range. Ease off ~200 kcal to limit fat gain.`;
    } else if (weeklyRate >= rule.min) {
      tone = 'good';
      title = 'Lean gain on pace';
      message = `${weeklyRate} kg/week is a clean surplus — enough to build with minimal fat.`;
    } else if (weeklyRate < rule.gain) {
      tone = 'warn';
      title = 'Losing weight on a build';
      message = `Weight is down ${Math.abs(weeklyRate)} kg/week. Add ~250 kcal so recovery and strength gains keep coming.`;
    } else {
      tone = 'ok';
      title = 'Surplus is flat';
      message = 'Weight is steady. Add ~200 kcal if strength has stalled for two weeks.';
    }
  } else if (Math.abs(weeklyRate) <= rule.max) {
    tone = 'good';
    title = 'Weight is stable';
    message = 'Stable weight with rising strength is the recomposition signal — keep the current intake.';
  } else {
    tone = 'ok';
    title = weeklyRate > 0 ? 'Weight drifting up' : 'Weight drifting down';
    message = `${weeklyRate > 0 ? '+' : ''}${weeklyRate} kg/week. Watch the trend for two more weeks before changing intake.`;
  }

  return {
    metric: 'weightKg',
    first: round1(first.value),
    firstDate: first.date,
    latest: round1(last.value),
    latestDate: last.date,
    delta,
    spanDays,
    weeklyRate,
    tone,
    title,
    message
  };
};

const buildHighlights = ({ training, nutrition, body }) => {
  const items = [];
  items.push({ label: 'Training', value: `${training.sessions}/${training.planned} planned days`, tone: training.status });
  if (nutrition.score === null) {
    items.push({ label: 'Nutrition', value: 'no meals logged', tone: 'no-data' });
  } else {
    const avg = nutrition.avgCals === null ? '' : ` · ${nutrition.avgCals.toLocaleString()} kcal avg`;
    items.push({ label: 'Nutrition', value: `${nutrition.loggedDays}/7 days logged${avg}`, tone: nutrition.status });
  }
  if (body) {
    items.push({
      label: 'Body trend',
      value: `${body.delta > 0 ? '+' : ''}${body.delta} kg over ${body.spanDays} days`,
      tone: body.tone
    });
  }
  return items;
};

const pickFocus = ({ training, nutrition, score, goal }) => {
  if (training.sessions === 0 && nutrition.score === null) {
    return {
      dimension: 'start',
      title: 'Start the feedback loop',
      message: 'Nothing logged in the last 7 days, so the scorecard has no signal yet.',
      action: 'Check off one workout and log one meal today — that is enough to open your score.'
    };
  }

  // A dimension with no data counts as a full gap — that is the blind spot to close first.
  const trainingGap = training.sessions === 0 ? 100 : 100 - training.score;
  const nutritionGap = nutrition.score === null ? 100 : 100 - nutrition.score;

  if (trainingGap === 0 && nutritionGap === 0 && score >= 85) {
    return {
      dimension: 'progress',
      title: 'Everything is on track',
      message: 'Training and nutrition both hit target this week. The next lever is progressive overload.',
      action: goal === 'endurance'
        ? 'Add 5 minutes to your longest cardio session or one extra interval.'
        : 'Add 1 rep to every set, or 2.5 kg to your main lift, next session.'
    };
  }

  if (trainingGap >= nutritionGap) {
    const missing = Math.max(0, training.planned - training.sessions);
    return {
      dimension: 'training',
      title: 'Training frequency is the gap',
      message: training.sessions === 0
        ? `No sessions logged against a ${training.planned}-day target.`
        : `${training.sessions} of ${training.planned} planned days done.`,
      action: training.sessions === 0
        ? 'Book your next session now and keep it to 30 minutes — starting is the whole win.'
        : `Schedule ${missing} more ${missing === 1 ? 'session' : 'sessions'} this week; put them in the calendar before Monday.`
    };
  }

  if (nutrition.status === 'no-data') {
    return {
      dimension: 'nutrition',
      title: 'Nutrition is invisible',
      message: 'No meals logged this week, so calories and protein cannot be checked.',
      action: 'Log breakfast and dinner for three days — those two meals carry most of your calories.'
    };
  }
  if (nutrition.loggedDays < 5) {
    return {
      dimension: 'nutrition',
      title: 'Logging is patchy',
      message: `${nutrition.loggedDays} of 7 days logged. The score is only as good as the days you track.`,
      action: `Log meals on ${5 - nutrition.loggedDays} more ${5 - nutrition.loggedDays === 1 ? 'day' : 'days'} next week — photos of the plate are enough.`
    };
  }
  if (nutrition.calorieHitDays !== null && nutrition.calorieHitDays < nutrition.loggedDays * 0.6) {
    return {
      dimension: 'nutrition',
      title: 'Calories are drifting',
      message: `Only ${nutrition.calorieHitDays} of ${nutrition.loggedDays} logged days landed within 10% of ${nutrition.targetCals.toLocaleString()} kcal.`,
      action: 'Pre-log your two biggest meals the night before so the day starts inside budget.'
    };
  }
  if (nutrition.proteinHitDays !== null && nutrition.proteinHitDays < nutrition.loggedDays * 0.7) {
    return {
      dimension: 'nutrition',
      title: 'Protein is short',
      message: `Protein target hit on ${nutrition.proteinHitDays} of ${nutrition.loggedDays} logged days.`,
      action: `Anchor each meal with ~${Math.round(nutrition.proteinTarget / 3)} g protein — that alone closes the gap.`
    };
  }
  return {
    dimension: 'nutrition',
    title: 'Nutrition consistency',
    message: 'Logging is good; the next gain is meal timing around training.',
    action: 'Put 30–40 g protein within two hours after training on your three hardest days.'
  };
};

export const getWeeklyScorecard = ({
  activityLog = {},
  nutritionDays = [],
  bodyLog = [],
  daysPerWeek,
  goal = 'fatloss',
  targetCals = null,
  proteinTarget = null,
  today = new Date()
} = {}) => {
  const training = summarizeTraining({ activityLog, today, plannedDays: daysPerWeek });
  const nutrition = summarizeNutrition({ nutritionDays, targetCals, proteinTarget, today });
  const body = summarizeBody({ bodyLog, goal, today });

  const parts = [];
  if (training.sessions > 0) parts.push({ score: training.score, weight: TRAINING_WEIGHT });
  if (nutrition.score !== null) parts.push({ score: nutrition.score, weight: NUTRITION_WEIGHT });
  const weightTotal = parts.reduce((total, part) => total + part.weight, 0);
  const score = weightTotal
    ? Math.round(parts.reduce((total, part) => total + part.score * part.weight, 0) / weightTotal)
    : null;

  const band = score === null
    ? { grade: '—', label: 'No data', tone: 'no-data' }
    : GRADE_BANDS.find(entry => score >= entry.min);

  const windowDates = getWindowDates(today);

  return {
    window: { start: windowDates[0], end: windowDates[windowDates.length - 1], days: WINDOW_DAYS },
    training,
    nutrition,
    body,
    score,
    grade: band.grade,
    gradeLabel: band.label,
    tone: band.tone,
    focus: pickFocus({ training, nutrition, body, score: score ?? 0, goal }),
    highlights: buildHighlights({ training, nutrition, body }),
    hasData: parts.length > 0
  };
};
