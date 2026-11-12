import { describe, it, expect } from 'vitest';
import {
  parseRpe,
  repsInReserve,
  suggestNextSet,
  RPE_MAX,
  RPE_MIN
} from '../utils/autoregulation';

const TARGET = { min: 8, max: 12 };

describe('autoregulation engine', () => {
  it('parses RPE defensively', () => {
    expect(parseRpe(8)).toBe(8);
    expect(parseRpe('8')).toBe(8);
    expect(parseRpe(8.5)).toBe(8.5);
    expect(parseRpe(RPE_MIN)).toBe(RPE_MIN);
    expect(parseRpe(RPE_MAX)).toBe(RPE_MAX);
    expect(parseRpe(5)).toBeNull();
    expect(parseRpe(11)).toBeNull();
    expect(parseRpe('')).toBeNull();
    expect(parseRpe(undefined)).toBeNull();
    expect(parseRpe('hard')).toBeNull();
  });

  it('turns RPE into reps in reserve', () => {
    expect(repsInReserve(10)).toBe(0);
    expect(repsInReserve(9)).toBe(1);
    expect(repsInReserve(8)).toBe(2);
    expect(repsInReserve(6)).toBe(4);
    expect(repsInReserve(null)).toBeNull();
    expect(repsInReserve(11)).toBeNull();
  });

  it('adds two plates when the set was far from failure at the top of the range', () => {
    const plan = suggestNextSet({ weightKg: 40, reps: 12, rpe: 8, repTarget: TARGET, remainingSets: 2 });
    expect(plan).toMatchObject({
      action: 'increase',
      weightKg: 45,
      reps: 8,
      deltaKg: 5,
      rir: 2,
      basis: 'rpe',
      remainingSets: 2
    });
    expect(plan.message).toContain('45 kg');
  });

  it('adds a single plate when only one rep is in reserve above the range', () => {
    const plan = suggestNextSet({ weightKg: 40, reps: 12, rpe: 9, repTarget: TARGET, remainingSets: 2 });
    expect(plan).toMatchObject({ action: 'increase', weightKg: 42.5, reps: 8, deltaKg: 2.5 });
  });

  it('holds load when the top of the range was a true grind', () => {
    const plan = suggestNextSet({ weightKg: 40, reps: 12, rpe: 10, repTarget: TARGET, remainingSets: 1 });
    expect(plan).toMatchObject({ action: 'hold', weightKg: 40, reps: 12, deltaKg: 0, rir: 0 });
    expect(plan.message).toMatch(/hold 40 kg/i);
  });

  it('holds load and raises the rep target mid-range', () => {
    const plan = suggestNextSet({ weightKg: 40, reps: 9, rpe: 9, repTarget: TARGET, remainingSets: 2 });
    expect(plan).toMatchObject({ action: 'hold', weightKg: 40, reps: 10 });
  });

  it('drops one plate when the set fell short of the range', () => {
    const plan = suggestNextSet({ weightKg: 40, reps: 6, rpe: 10, repTarget: TARGET, remainingSets: 2 });
    expect(plan).toMatchObject({ action: 'reduce', weightKg: 37.5, reps: 8, deltaKg: -2.5 });
  });

  it('drops two plates when the set was well short and maxed out', () => {
    const plan = suggestNextSet({ weightKg: 40, reps: 5, rpe: 10, repTarget: TARGET, remainingSets: 2 });
    expect(plan).toMatchObject({ action: 'reduce', weightKg: 35, reps: 8, deltaKg: -5 });
  });

  it('never suggests a negative load at light weights', () => {
    const plan = suggestNextSet({ weightKg: 2.5, reps: 3, rpe: 10, repTarget: TARGET, remainingSets: 2 });
    expect(plan.weightKg).toBe(0);
  });

  it('moves the rep target only for bodyweight sets', () => {
    const plan = suggestNextSet({ weightKg: 0, reps: 10, rpe: 8, repTarget: TARGET, remainingSets: 2 });
    expect(plan).toMatchObject({ action: 'bodyweight', weightKg: 0, reps: 12, deltaKg: 0 });
    expect(plan.message).toMatch(/bodyweight/i);
  });

  it('falls back to reps alone when no RPE was given', () => {
    const over = suggestNextSet({ weightKg: 40, reps: 13, repTarget: TARGET, remainingSets: 2 });
    expect(over).toMatchObject({ action: 'increase', weightKg: 42.5, reps: 8, basis: 'reps', rir: null });

    const atTop = suggestNextSet({ weightKg: 40, reps: 12, repTarget: TARGET, remainingSets: 2 });
    expect(atTop).toMatchObject({ action: 'hold', weightKg: 40, reps: 12 });
  });

  it('uses RPE alone when the plan has no rep range', () => {
    const easy = suggestNextSet({ weightKg: 60, reps: 5, rpe: 7, remainingSets: 2 });
    expect(easy).toMatchObject({ action: 'increase', weightKg: 62.5, reps: 5 });

    const hard = suggestNextSet({ weightKg: 60, reps: 5, rpe: 10, remainingSets: 2 });
    expect(hard).toMatchObject({ action: 'reduce', weightKg: 57.5, reps: 5 });

    const even = suggestNextSet({ weightKg: 60, reps: 5, rpe: 9, remainingSets: 2 });
    expect(even).toMatchObject({ action: 'hold', weightKg: 60, reps: 5 });
  });

  it('has nothing to adjust once the exercise is finished', () => {
    const plan = suggestNextSet({ weightKg: 40, reps: 12, rpe: 8, repTarget: TARGET, remainingSets: 0 });
    expect(plan).toMatchObject({ action: 'done', weightKg: 40, reps: 12, deltaKg: 0 });
  });

  it('rejects impossible input', () => {
    expect(suggestNextSet({ weightKg: -5, reps: 10 })).toBeNull();
    expect(suggestNextSet({ weightKg: 40, reps: 0 })).toBeNull();
    expect(suggestNextSet({ weightKg: 40, reps: Number.NaN })).toBeNull();
    expect(suggestNextSet()).toBeNull();
  });
});
