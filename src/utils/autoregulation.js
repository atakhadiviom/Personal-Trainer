// Intra-session autoregulation.
// Turns the set you just logged — reps plus an optional RPE — into the load and rep
// target for the *next* set of the same exercise. No new storage: RPE rides along on
// the logged set, so a restored session keeps its adjustments.
//
// RPE here is the standard 6–10 scale (10 = no reps left). Reps in reserve is derived
// from it, so "11 reps @ RPE 8" reads as "13 reps were available at this load".
import { INCREASE_KG, formatKg, formatDelta } from './progressiveOverload';

export const RPE_MIN = 6;
export const RPE_MAX = 10;
export const RIR_CAP = 4;
export const MAX_REPS = 100;

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const round1 = (n) => Math.round(n * 10) / 10;
const roundInt = (n) => Math.round(n);

// Accepts 6–10 (or half points) and returns a clean RPE, or null when unreadable.
export const parseRpe = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num < RPE_MIN || num > RPE_MAX) return null;
  return Math.round(num * 2) / 2;
};

export const repsInReserve = (rpe) => {
  const parsed = parseRpe(rpe);
  if (parsed === null) return null;
  return clamp(Math.round(RPE_MAX - parsed), 0, RIR_CAP);
};

const stepLoad = (kg, steps, step) => Math.max(0, round1(kg + (steps * step)));

const targetReps = (repTarget) => {
  if (!repTarget || !Number.isFinite(repTarget.min) || !Number.isFinite(repTarget.max)) return null;
  if (repTarget.max < 1) return null;
  return { min: Math.max(1, Math.round(repTarget.min)), max: Math.round(repTarget.max) };
};

const reserveLabel = (rir) => (rir === 0 ? 'nothing left' : `${rir} in reserve`);

// Suggests the next set from the one just logged.
// Returns null for unreadable input; action is one of:
// increase | hold | reduce | bodyweight | done.
export const suggestNextSet = ({
  weightKg,
  reps,
  rpe = null,
  repTarget = null,
  remainingSets = null,
  step = INCREASE_KG
} = {}) => {
  const weight = Number(weightKg);
  const count = Number(reps);
  if (!Number.isFinite(weight) || weight < 0) return null;
  if (!Number.isFinite(count) || count < 1) return null;

  const safeCount = clamp(roundInt(count), 1, MAX_REPS);
  const secondsStep = Number.isFinite(step) && step > 0 ? step : INCREASE_KG;
  const target = targetReps(repTarget);
  const rir = repsInReserve(rpe);
  const basis = rir === null ? 'reps' : 'rpe';
  const left = Number.isFinite(remainingSets) ? Math.max(0, Math.floor(remainingSets)) : null;

  const base = {
    weightKg: round1(weight),
    reps: safeCount,
    deltaKg: 0,
    rir,
    basis,
    remainingSets: left
  };

  if (left === 0) {
    return {
      ...base,
      action: 'done',
      message: 'Last set logged for this exercise — nothing left to adjust.'
    };
  }

  // Bodyweight: only the rep target can move.
  if (weight === 0) {
    let nextReps = safeCount;
    if (target) {
      const capacity = rir === null ? safeCount : safeCount + rir;
      if (capacity >= target.max) nextReps = Math.min(MAX_REPS, Math.max(target.max, safeCount + 1));
      else if (capacity < target.min) nextReps = target.min;
      else nextReps = Math.max(target.min, Math.round(capacity));
    } else {
      nextReps = Math.min(MAX_REPS, safeCount + (rir !== null && rir >= 2 ? 2 : 1));
    }
    return {
      ...base,
      action: 'bodyweight',
      reps: nextReps,
      message: `Bodyweight set — aim for ${nextReps} reps next${rir === null ? '' : ` (${reserveLabel(rir)} last set)`}.`
    };
  }

  // No rep range: use RPE alone to nudge the load.
  if (!target) {
    if (rir === null) {
      return {
        ...base,
        action: 'hold',
        message: `No rep range set — repeat ${formatKg(weight)} and beat ${safeCount} reps.`
      };
    }
    if (rir >= 2) {
      const next = stepLoad(weight, 1, secondsStep);
      return {
        ...base,
        action: 'increase',
        weightKg: next,
        deltaKg: round1(next - weight),
        message: `${reserveLabel(rir)} — add ${formatKg(secondsStep)} for the next set (${formatKg(next)}).`
      };
    }
    if (rir === 0) {
      const next = stepLoad(weight, -1, secondsStep);
      return {
        ...base,
        action: 'reduce',
        weightKg: next,
        deltaKg: round1(next - weight),
        message: `Nothing left — drop to ${formatKg(next)} and keep ${safeCount} clean reps.`
      };
    }
    return {
      ...base,
      action: 'hold',
      message: `${reserveLabel(rir)} — hold ${formatKg(weight)} for ${safeCount} reps.`
    };
  }

  const capacity = rir === null ? safeCount : safeCount + rir;
  const overshoot = capacity - target.max;

  if (overshoot >= 2 && (rir === null || rir >= 2)) {
    const next = stepLoad(weight, 2, secondsStep);
    return {
      ...base,
      action: 'increase',
      weightKg: next,
      reps: target.min,
      deltaKg: round1(next - weight),
      message: `Well past ${target.max} reps — jump ${formatDelta(next - weight)} to ${formatKg(next)} for ${target.min}+.`
    };
  }

  if (overshoot >= 1 && (rir === null || rir >= 1)) {
    const next = stepLoad(weight, 1, secondsStep);
    return {
      ...base,
      action: 'increase',
      weightKg: next,
      reps: target.min,
      deltaKg: round1(next - weight),
      message: `Past the top of ${target.min}–${target.max} — add ${formatKg(secondsStep)} to ${formatKg(next)}, back to ${target.min} reps.`
    };
  }

  if (capacity >= target.max) {
    return {
      ...base,
      action: 'hold',
      reps: target.max,
      message: `${capacity > safeCount ? reserveLabel(rir) : 'Top of the range'} — hold ${formatKg(weight)} and own ${target.max} clean reps.`
    };
  }

  if (capacity >= target.min) {
    return {
      ...base,
      action: 'hold',
      reps: clamp(Math.round(capacity), target.min, target.max),
      message: `In the ${target.min}–${target.max} window — hold ${formatKg(weight)} and aim for ${clamp(Math.round(capacity), target.min, target.max)} reps.`
    };
  }

  const steps = capacity <= target.min - 3 ? -2 : -1;
  const next = stepLoad(weight, steps, secondsStep);
  return {
    ...base,
    action: 'reduce',
    weightKg: next,
    reps: target.min,
    deltaKg: round1(next - weight),
    message: `Short of ${target.min} reps — drop ${formatKg(Math.abs(round1(next - weight)))} to ${formatKg(next)} and rebuild.`
  };
};

export const isAutoregulationAction = (value) =>
  ['increase', 'hold', 'reduce', 'bodyweight', 'done'].includes(value);
