import { describe, it, expect } from 'vitest';
import {
  WARMUP_RUNGS,
  buildWarmupRamp,
  describeWarmupRamp,
  formatWarmupSet,
  isWarmupComplete,
  nextWarmupSet,
  sanitizeWarmupDone,
  toggleWarmupRung,
  warmupRampNote,
  warmupRungIds
} from '../utils/warmupRamp';
import {
  createSession,
  skipSessionWarmup,
  toggleSessionWarmup
} from '../utils/workoutSession';

const weights = (ramp) => ramp.map(rung => rung.weightKg);
const reps = (ramp) => ramp.map(rung => rung.reps);

describe('buildWarmupRamp', () => {
  it('ramps 50 %, 70 % and 85 % of the working weight on a standard bar', () => {
    const ramp = buildWarmupRamp(40, { step: 2.5 });
    expect(weights(ramp)).toEqual([20, 27.5, 32.5]);
    expect(reps(ramp)).toEqual([5, 3, 2]);
    expect(ramp.map(rung => rung.id)).toEqual(warmupRungIds(ramp));
  });

  it('never rounds a rung above its percentage of the working weight', () => {
    const ramp = buildWarmupRamp(37.5, { step: 2.5 });
    ramp.forEach(rung => {
      expect(rung.weightKg).toBeLessThanOrEqual(37.5 * rung.percent);
      expect(rung.weightKg).toBeLessThan(37.5);
    });
  });

  it('follows the machine stack jump', () => {
    expect(weights(buildWarmupRamp(100, { step: 5 }))).toEqual([50, 70, 85]);
    expect(weights(buildWarmupRamp(40, { step: 5 }))).toEqual([20, 25, 30]);
  });

  it('collapses rungs that land on the same plate', () => {
    // 20 kg on a 5 kg stack: 70 % (14) and 50 % (10) both round down to 10.
    const ramp = buildWarmupRamp(20, { step: 5 });
    expect(weights(ramp)).toEqual([10, 15]);
    expect(reps(ramp)).toEqual([5, 2]);
  });

  it('shows nothing when one plate is all that fits below the working weight', () => {
    expect(buildWarmupRamp(5, { step: 2.5 })).toEqual([]);
    expect(buildWarmupRamp(2.5, { step: 2.5 })).toEqual([]);
  });

  it('shows nothing for bodyweight or unreadable loads', () => {
    expect(buildWarmupRamp(0)).toEqual([]);
    expect(buildWarmupRamp('', { step: 2.5 })).toEqual([]);
    expect(buildWarmupRamp('BW')).toEqual([]);
    expect(buildWarmupRamp(Number.NaN)).toEqual([]);
    expect(buildWarmupRamp(-40)).toEqual([]);
    expect(buildWarmupRamp(900)).toEqual([]);
  });

  it('reads a numeric string and defaults to the 2.5 kg bar jump', () => {
    expect(weights(buildWarmupRamp('40'))).toEqual([20, 27.5, 32.5]);
    expect(weights(buildWarmupRamp('40 kg'))).toEqual([20, 27.5, 32.5]);
  });

  it('keeps the coach notes on every rung', () => {
    const ramp = buildWarmupRamp(60);
    expect(ramp).toHaveLength(3);
    expect(ramp.map(rung => rung.note)).toEqual(WARMUP_RUNGS.map(rung => rung.note));
    expect(describeWarmupRamp(ramp)).toBe('30 kg × 5 · 40 kg × 3 · 50 kg × 2');
  });
});

describe('warm-up ticks', () => {
  const ramp = buildWarmupRamp(40, { step: 2.5 });

  it('formats a rung for the player', () => {
    expect(formatWarmupSet(ramp[1])).toBe('27.5 kg × 3');
    expect(formatWarmupSet(null)).toBe('');
  });

  it('ticks and un-ticks a rung', () => {
    expect(toggleWarmupRung([], 'ramp50', ramp)).toEqual(['ramp50']);
    expect(toggleWarmupRung(['ramp50'], 'ramp50', ramp)).toEqual([]);
    expect(toggleWarmupRung([], 'nope', ramp)).toEqual([]);
  });

  it('drops ticks that no longer belong to the ramp', () => {
    expect(sanitizeWarmupDone(['ramp70', 'ramp70', 'stale'], ramp)).toEqual(['ramp70']);
    expect(sanitizeWarmupDone('ramp50', ramp)).toEqual([]);
    expect(sanitizeWarmupDone(null, ramp)).toEqual([]);
  });

  it('knows when the ramp is finished', () => {
    expect(isWarmupComplete(ramp, ['ramp50', 'ramp70'])).toBe(false);
    expect(isWarmupComplete(ramp, ['ramp50', 'ramp70', 'ramp85'])).toBe(true);
    expect(isWarmupComplete([], [])).toBe(false);
  });

  it('points at the next rung', () => {
    expect(nextWarmupSet(ramp, [])).toMatchObject({ id: 'ramp50', weightKg: 20, reps: 5 });
    expect(nextWarmupSet(ramp, ['ramp50'])).toMatchObject({ id: 'ramp70' });
    expect(nextWarmupSet(ramp, ['ramp50', 'ramp70', 'ramp85'])).toBeNull();
  });

  it('writes a note that names the working weight', () => {
    expect(warmupRampNote(40, ramp)).toContain('Ramp to 40 kg');
    expect(warmupRampNote(0, ramp)).toBe('');
    expect(warmupRampNote(40, [])).toBe('');
  });
});

describe('session warm-up state', () => {
  const session = createSession({
    id: 'day1',
    label: 'Push',
    exercises: [
      { name: 'Bench Press', sets: 3, reps: '8-12', weight: '40kg' },
      { name: 'Overhead Press', sets: 3, reps: '8-10', weight: '20kg' }
    ]
  });
  const ramp = buildWarmupRamp(40, { step: 2.5 });

  it('starts every exercise with an empty, unskipped ramp', () => {
    expect(session.exercises[0].warmupDone).toEqual([]);
    expect(session.exercises[0].warmupSkipped).toBe(false);
  });

  it('ticks one rung on the current exercise only', () => {
    const next = toggleSessionWarmup(session, 'ramp50', { ramp });
    expect(next.exercises[0].warmupDone).toEqual(['ramp50']);
    expect(next.exercises[1].warmupDone).toEqual([]);
    expect(session.exercises[0].warmupDone).toEqual([]);
  });

  it('ignores a rung that is not in the ramp', () => {
    expect(toggleSessionWarmup(session, 'stale', { ramp })).toBe(session);
  });

  it('lets the athlete skip the ramp and un-skips it on the next tick', () => {
    const skipped = skipSessionWarmup(session);
    expect(skipped.exercises[0].warmupSkipped).toBe(true);
    const ticked = toggleSessionWarmup(skipped, 'ramp70', { ramp });
    expect(ticked.exercises[0].warmupSkipped).toBe(false);
    expect(ticked.exercises[0].warmupDone).toEqual(['ramp70']);
  });
});
