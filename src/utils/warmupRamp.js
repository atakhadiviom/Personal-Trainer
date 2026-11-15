// Warm-up ramp engine.
// A working set should never be the first thing a joint sees. From the day's working
// weight this builds the short ramp a lifter actually does: half the load for five,
// seventy percent for three, then a heavy double to prime the top set — each rung
// rounded DOWN to the athlete's own jump so no warm-up overshoots the plan.
import { parseLoadStep, roundToStep, DEFAULT_STEP_KG } from './loadSteps';

// Kept in one place so the coach's reasoning stays explicit and testable.
export const WARMUP_RUNGS = Object.freeze([
  { id: 'ramp50', percent: 0.5, reps: 5, note: 'prime the pattern' },
  { id: 'ramp70', percent: 0.7, reps: 3, note: 'add speed' },
  { id: 'ramp85', percent: 0.85, reps: 2, note: 'prime the top set' }
]);

export const MAX_WORKING_WEIGHT_KG = 500;

const round1 = (n) => Math.round(n * 10) / 10;

const toWeight = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : Number.NaN;
  if (typeof value !== 'string') return Number.NaN;
  // Same tolerance as the plan input: "40", "40 kg" and "40,5kg" all read.
  const match = value.trim().replace(',', '.').match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : Number.NaN;
};

// Ramp sets for one working weight, lightest first.
// Returns [] for bodyweight work, unreadable loads and loads too light to build a ramp
// (one buildable plate below the working weight means there is nothing to ramp through).
export const buildWarmupRamp = (workingWeightKg, { step = DEFAULT_STEP_KG } = {}) => {
  const weight = toWeight(workingWeightKg);
  if (!Number.isFinite(weight) || weight <= 0 || weight > MAX_WORKING_WEIGHT_KG) return [];
  const jump = parseLoadStep(step) ?? DEFAULT_STEP_KG;
  if (weight <= jump) return [];

  const seen = new Set();
  const ramp = [];
  WARMUP_RUNGS.forEach(rung => {
    // Down, never up: a warm-up must stay under its percentage of the work weight.
    const load = roundToStep(weight * rung.percent, jump, 'down');
    if (load <= 0 || load >= weight) return;
    if (seen.has(load)) return; // light loads collapse two rungs onto one plate
    seen.add(load);
    ramp.push({
      id: rung.id,
      weightKg: load,
      reps: rung.reps,
      percent: rung.percent,
      note: rung.note
    });
  });

  // A single rung is not a ramp — it is one arbitrary set. Show nothing instead.
  return ramp.length >= 2 ? ramp : [];
};

export const warmupRungIds = (ramp = []) => ramp.map(rung => rung.id);

// Ticked rungs only count while they still match the current ramp (a changed
// working weight rebuilds the card instead of leaving stale ticks behind).
export const sanitizeWarmupDone = (done, ramp = []) => {
  const allowed = new Set(warmupRungIds(ramp));
  if (!Array.isArray(done)) return [];
  const kept = [];
  done.forEach(id => {
    if (typeof id !== 'string' || !allowed.has(id) || kept.includes(id)) return;
    kept.push(id);
  });
  return kept;
};

export const toggleWarmupRung = (done, id, ramp = []) => {
  const current = sanitizeWarmupDone(done, ramp);
  if (!warmupRungIds(ramp).includes(id)) return current;
  return current.includes(id) ? current.filter(item => item !== id) : [...current, id];
};

export const isWarmupComplete = (ramp = [], done = []) => {
  const ids = warmupRungIds(ramp);
  if (!ids.length) return false;
  const ticked = sanitizeWarmupDone(done, ramp);
  return ids.every(id => ticked.includes(id));
};

// The next rung to do, or null once the ramp is finished.
export const nextWarmupSet = (ramp = [], done = []) => {
  const ticked = sanitizeWarmupDone(done, ramp);
  return ramp.find(rung => !ticked.includes(rung.id)) ?? null;
};

export const formatWarmupSet = (rung) => (
  rung ? `${round1(rung.weightKg)} kg × ${rung.reps}` : ''
);

export const describeWarmupRamp = (ramp = []) => {
  if (!ramp.length) return '';
  return ramp.map(rung => formatWarmupSet(rung)).join(' · ');
};

// One line the player can show under the card.
export const warmupRampNote = (workingWeightKg, ramp = []) => {
  const weight = toWeight(workingWeightKg);
  if (!ramp.length || !Number.isFinite(weight) || weight <= 0) return '';
  return `Ramp to ${round1(weight)} kg — short sets, no grinding. Work sets start after the last rung.`;
};
