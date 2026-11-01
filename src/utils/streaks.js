// Workout consistency streaks & rest-day recovery advice.
// The activity log is a map keyed by local date: { 'YYYY-MM-DD': { exercises: number, labels: string[] } }.

export const ACTIVITY_LOG_KEY = 'novafit_activity_log';
// Up to 2 consecutive rest days keep a streak alive (typical 3–5 day/week programs).
export const MAX_REST_GAP_DAYS = 2;
export const STREAK_MILESTONES = Object.freeze([3, 7, 14, 30, 50, 100]);

const DAY_MS = 86400000;

export const toDateKey = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const keyToNoon = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
};

export const daysBetween = (fromKey, toKey) =>
  Math.round((keyToNoon(toKey).getTime() - keyToNoon(fromKey).getTime()) / DAY_MS);

const isValidKey = (key) => /^\d{4}-\d{2}-\d{2}$/.test(key);

export const sanitizeLog = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const clean = {};
  Object.entries(raw).forEach(([key, entry]) => {
    if (!isValidKey(key) || !entry || typeof entry !== 'object') return;
    const exercises = Number.isFinite(entry.exercises) && entry.exercises > 0 ? Math.floor(entry.exercises) : 1;
    const labels = Array.isArray(entry.labels) ? entry.labels.filter(l => typeof l === 'string' && l).slice(0, 10) : [];
    clean[key] = { exercises, labels };
  });
  return clean;
};

export const loadActivityLog = () => {
  try {
    const raw = localStorage.getItem(ACTIVITY_LOG_KEY);
    return raw ? sanitizeLog(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
};

export const saveActivityLog = (log) => {
  try {
    localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(log));
  } catch { /* ignore storage unavailable */ }
};

export const recordWorkout = (log, { date = new Date(), label } = {}) => {
  const key = toDateKey(date);
  const prev = log?.[key] || { exercises: 0, labels: [] };
  const labels = label && !prev.labels.includes(label) ? [...prev.labels, label] : prev.labels;
  return { ...log, [key]: { exercises: prev.exercises + 1, labels } };
};

export const mergeActivityLogs = (a, b) => {
  const left = sanitizeLog(a);
  const right = sanitizeLog(b);
  const merged = { ...left };
  Object.entries(right).forEach(([key, entry]) => {
    const existing = merged[key];
    merged[key] = existing
      ? {
          exercises: Math.max(existing.exercises, entry.exercises),
          labels: [...new Set([...existing.labels, ...entry.labels])]
        }
      : entry;
  });
  return merged;
};

const sortedKeys = (log) => Object.keys(sanitizeLog(log)).sort();

const streakChains = (keys) => {
  const chains = [];
  keys.forEach((key, i) => {
    if (i === 0 || daysBetween(keys[i - 1], key) - 1 > MAX_REST_GAP_DAYS) chains.push([key]);
    else chains[chains.length - 1].push(key);
  });
  return chains;
};

export const computeStreak = (log, today = new Date()) => {
  const todayKey = toDateKey(today);
  const keys = sortedKeys(log).filter(k => k <= todayKey);
  if (!keys.length) {
    return { current: 0, longest: 0, totalWorkouts: 0, trainedToday: false, lastWorkoutKey: null, daysSinceLast: null, restDaysLeft: 0 };
  }

  const chains = streakChains(keys);
  const longest = Math.max(...chains.map(c => c.length));
  const lastKey = keys[keys.length - 1];
  const daysSinceLast = daysBetween(lastKey, todayKey);
  const alive = daysSinceLast - 1 <= MAX_REST_GAP_DAYS;
  const current = alive ? chains[chains.length - 1].length : 0;
  const restDaysLeft = alive ? Math.max(0, MAX_REST_GAP_DAYS - Math.max(0, daysSinceLast - 1)) : 0;

  return {
    current,
    longest,
    totalWorkouts: keys.length,
    trainedToday: daysSinceLast === 0,
    lastWorkoutKey: lastKey,
    daysSinceLast,
    restDaysLeft
  };
};

export const consecutiveTrainingDays = (log, today = new Date()) => {
  const clean = sanitizeLog(log);
  const cursor = new Date(today);
  if (!clean[toDateKey(cursor)]) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (clean[toDateKey(cursor)]) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
};

export const getWeekStrip = (log, today = new Date(), days = 7) => {
  const clean = sanitizeLog(log);
  const todayKey = toDateKey(today);
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (days - 1 - i));
    const key = toDateKey(d);
    return {
      key,
      initial: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
      trained: !!clean[key],
      isToday: key === todayKey
    };
  });
};

export const getNextMilestone = (current) => STREAK_MILESTONES.find(m => m > current) || null;

export const getMilestoneHit = (current) => (STREAK_MILESTONES.includes(current) ? current : null);

const FOCUS_TIPS = {
  push: ['Doorway pec stretch — 2 × 30s per side', 'Band pull-aparts to balance shoulders — 2 × 15'],
  pull: ['Dead hang or lat stretch — 3 × 20s', 'Thoracic spine rotations — 10 per side'],
  legs: ['Foam roll quads, glutes and calves — 5 min', 'Kneeling hip-flexor stretch — 2 × 30s per side'],
  fullbody: ['20-minute easy walk to flush soreness', '5-minute full-body mobility flow (cat-cow, world’s greatest stretch)']
};

export const detectFocus = (label = '') => {
  const l = label.toLowerCase();
  if (l.includes('push') || l.includes('chest') || l.includes('shoulder')) return 'push';
  if (l.includes('pull') || l.includes('back')) return 'pull';
  if (l.includes('leg') || l.includes('lower') || l.includes('glute')) return 'legs';
  return 'fullbody';
};

const BASE_RECOVERY_TIPS = [
  'Hit your protein target (≈1.6–2.2 g per kg body weight)',
  'Drink 2.5–3 L of water across the day',
  'Aim for 7–9 hours of sleep tonight'
];

export const getRecoveryAdvice = (log, { today = new Date(), sleepHours = null } = {}) => {
  const clean = sanitizeLog(log);
  const streak = computeStreak(clean, today);
  const consecutive = consecutiveTrainingDays(clean, today);
  const lastLabels = streak.lastWorkoutKey ? clean[streak.lastWorkoutKey].labels : [];
  const focus = detectFocus(lastLabels[lastLabels.length - 1] || '');
  const focusTips = FOCUS_TIPS[focus];
  const sleep = sleepHours == null || sleepHours === '' ? null : parseFloat(sleepHours);
  const lowSleep = Number.isFinite(sleep) && sleep < 6;

  if (!streak.totalWorkouts) {
    return {
      status: 'start',
      title: 'Start your streak today',
      message: 'Tick off your first exercise to light the flame. Up to 2 rest days between sessions keep your streak alive.',
      tips: ['Warm up for 5–8 minutes before your first set', ...BASE_RECOVERY_TIPS.slice(1, 2)]
    };
  }

  if (lowSleep && !streak.trainedToday) {
    return {
      status: 'rest',
      title: 'Recovery day recommended',
      message: `Only ${sleep} hrs of sleep — heavy lifting today raises injury risk. A rest day won't break your streak.`,
      tips: ['Swap the session for a 20–30 min easy walk', ...focusTips.slice(0, 1), ...BASE_RECOVERY_TIPS.slice(2)]
    };
  }

  if (consecutive >= 3 && !streak.trainedToday) {
    return {
      status: 'rest',
      title: `${consecutive} days in a row — take a rest day`,
      message: 'Muscle grows while you recover. Resting today protects your progress and keeps your streak alive.',
      tips: [...focusTips, ...BASE_RECOVERY_TIPS]
    };
  }

  if (streak.trainedToday) {
    return {
      status: 'recover',
      title: 'Session logged — recovery starts now',
      message: 'Refuel within 2 hours and wind down tonight to lock in today’s gains.',
      tips: ['20–40 g protein with carbs in your next meal', ...focusTips.slice(0, 1), ...BASE_RECOVERY_TIPS.slice(1)]
    };
  }

  if (streak.current === 0) {
    return {
      status: 'comeback',
      title: 'Welcome back — ease in',
      message: `It's been ${streak.daysSinceLast} days since your last workout. Start lighter (≈80% of your usual loads) and rebuild momentum.`,
      tips: ['Add 2–3 extra warm-up sets', 'Leave 2–3 reps in reserve on every set', ...BASE_RECOVERY_TIPS.slice(2)]
    };
  }

  if (streak.restDaysLeft === 0) {
    return {
      status: 'train',
      title: 'Train today to keep your streak',
      message: `You've rested ${streak.daysSinceLast - 1} days — your ${streak.current}-workout streak ends tomorrow without a session.`,
      tips: ['Even a short 20-minute session counts', ...BASE_RECOVERY_TIPS.slice(0, 1)]
    };
  }

  return {
    status: 'train',
    title: 'Recovered and ready to train',
    message: streak.daysSinceLast === 1
      ? 'Yesterday was a training day. Train today, or take a planned rest day — your streak is safe.'
      : 'Rest day done. Your muscles are primed for the next session.',
    tips: [...focusTips.slice(0, 1), ...BASE_RECOVERY_TIPS.slice(0, 2)]
  };
};
