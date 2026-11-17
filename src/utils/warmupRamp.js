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

// One heavy double for lifts that need the pattern primed but not three sets of volume:
// isolation work, a second session of the day, or an athlete short on time.
export const PRIMER_RUNG = Object.freeze({
  id: 'primer85',
  percent: 0.85,
  reps: 2,
  note: 'prime the top set'
});

// How much warm-up an exercise gets. The choice is the athlete's, remembered per exercise.
export const WARMUP_MODES = Object.freeze([
  { id: 'full', label: 'Full ramp', detail: '50 %, 70 %, 85 %' },
  { id: 'primer', label: '1 primer', detail: 'One heavy double' },
  { id: 'off', label: 'Off', detail: 'Straight to work sets' }
]);

export const DEFAULT_WARMUP_MODE = 'full';

// Anything unreadable falls back to the full ramp rather than silently skipping warm-up.
export const parseWarmupMode = (value) => (
  WARMUP_MODES.some(mode => mode.id === value) ? value : DEFAULT_WARMUP_MODE
);

export const isWarmupMode = (value) => WARMUP_MODES.some(mode => mode.id === value);

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
// Returns [] for bodyweight work, unreadable loads, mode "off", and loads too light to
// build a ramp (one buildable plate below the working weight means there is nothing to
// ramp through). A single primer is deliberate, so it survives the two-rung guard.
export const buildWarmupRamp = (workingWeightKg, { step = DEFAULT_STEP_KG, mode = DEFAULT_WARMUP_MODE } = {}) => {
  const weight = toWeight(workingWeightKg);
  if (!Number.isFinite(weight) || weight <= 0 || weight > MAX_WORKING_WEIGHT_KG) return [];
  const chosen = parseWarmupMode(mode);
  if (chosen === 'off') return [];
  const jump = parseLoadStep(step) ?? DEFAULT_STEP_KG;
  if (weight <= jump) return [];

  const rungs = chosen === 'primer' ? [PRIMER_RUNG] : WARMUP_RUNGS;
  const seen = new Set();
  const ramp = [];
  rungs.forEach(rung => {
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

  // A single rung is not a ramp — it is one arbitrary set. Show nothing instead,
  // unless the athlete asked for exactly one primer.
  if (chosen === 'primer') {
    // On a coarse jump a light load can round the primer down to half the work weight,
    // which primes nothing. Keep it only when it stays a genuinely heavy set.
    return ramp.filter(rung => rung.weightKg >= weight * 0.6);
  }
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
export const warmupRampNote = (workingWeightKg, ramp = [], mode = DEFAULT_WARMUP_MODE) => {
  const weight = toWeight(workingWeightKg);
  if (!ramp.length || !Number.isFinite(weight) || weight <= 0) return '';
  if (parseWarmupMode(mode) === 'primer') {
    return `One heavy double to ${formatWarmupSet(ramp[0])} primes ${round1(weight)} kg — then work sets.`;
  }
  return `Ramp to ${round1(weight)} kg — short sets, no grinding. Work sets start after the last rung.`;
};

// Whether a warm-up can exist at all for this load (used to hide the whole control on
// bodyweight work or a weight with nothing buildable underneath it).
export const hasWarmupLoad = (workingWeightKg, { step = DEFAULT_STEP_KG } = {}) => {
  const weight = toWeight(workingWeightKg);
  if (!Number.isFinite(weight) || weight <= 0 || weight > MAX_WORKING_WEIGHT_KG) return false;
  const jump = parseLoadStep(step) ?? DEFAULT_STEP_KG;
  return weight > jump;
};
