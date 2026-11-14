import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DEFAULT_STEP_KG,
  LOAD_STEP_KEY,
  LOAD_STEP_OPTIONS,
  describeLoadStep,
  getLoadStep,
  onLoadStepChange,
  parseLoadStep,
  roundToStep,
  setLoadStep
} from '../utils/loadSteps';
import { getNextLoadSuggestion, roundPlate } from '../utils/progressiveOverload';
import { suggestNextSet } from '../utils/autoregulation';
import { getDeloadWeightKg, roundToPlate } from '../utils/deloadWeek';
import { createSession, getSetDefaults, logSessionSet } from '../utils/workoutSession';

const dayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// A log where Bench Press last session hit 60 kg × 12 with a 8–12 target.
const benchLog = (weightKg = 60, reps = 12) => ({
  'bench press': { exercise: 'Bench Press', sets: [{ date: dayKey(), weightKg, reps }] }
});

describe('load steps preference', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('parses numbers, strings and preset ids', () => {
    expect(parseLoadStep(2.5)).toBe(2.5);
    expect(parseLoadStep('5')).toBe(5);
    expect(parseLoadStep('1.25 kg')).toBe(1.25);
    expect(parseLoadStep('2,5')).toBe(2.5);
    expect(parseLoadStep('standard')).toBe(2.5);
    expect(parseLoadStep('fractional')).toBe(1.25);
  });

  it('rejects nonsense and out-of-range steps', () => {
    expect(parseLoadStep(null)).toBeNull();
    expect(parseLoadStep('')).toBeNull();
    expect(parseLoadStep('abc')).toBeNull();
    expect(parseLoadStep(0)).toBeNull();
    expect(parseLoadStep(-2)).toBeNull();
    expect(parseLoadStep(100)).toBeNull();
  });

  it('defaults to a 2.5 kg bar when nothing is stored', () => {
    expect(getLoadStep()).toBe(DEFAULT_STEP_KG);
  });

  it('saves a chosen step and notifies subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = onLoadStepChange(listener);

    expect(setLoadStep(5)).toBe(5);
    expect(localStorage.getItem(LOAD_STEP_KEY)).toBe('5');
    expect(getLoadStep()).toBe(5);
    expect(listener).toHaveBeenCalledWith(5);

    unsubscribe();
    setLoadStep(2);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getLoadStep()).toBe(2);
  });

  it('falls back to the default when storage holds junk', () => {
    localStorage.setItem(LOAD_STEP_KEY, 'bogus');
    expect(getLoadStep()).toBe(DEFAULT_STEP_KG);
  });

  it('sanitizes a save of an unusable value', () => {
    expect(setLoadStep('nope')).toBe(DEFAULT_STEP_KG);
    expect(getLoadStep()).toBe(DEFAULT_STEP_KG);
  });

  it('labels every preset', () => {
    LOAD_STEP_OPTIONS.forEach(option => {
      expect(describeLoadStep(option.kg)).toBe(`${option.label} jumps`);
    });
    expect(describeLoadStep(3)).toBe('3 kg jumps');
  });
});

describe('roundToStep', () => {
  it('rounds to the nearest buildable weight', () => {
    expect(roundToStep(62.4, 2.5)).toBe(62.5);
    expect(roundToStep(61.2, 2.5)).toBe(60);
    expect(roundToStep(61, 5)).toBe(60);
    expect(roundToStep(63, 1.25)).toBe(62.5);
  });

  it('rounds down and up for deloads and targets', () => {
    expect(roundToStep(64.9, 2.5, 'down')).toBe(62.5);
    expect(roundToStep(60.1, 2.5, 'up')).toBe(62.5);
    expect(roundToStep(41, 1.25, 'down')).toBe(40);
  });

  it('treats zero, bodyweight and junk as no load', () => {
    expect(roundToStep(0, 2.5)).toBe(0);
    expect(roundToStep(-4, 2.5)).toBe(0);
    expect(roundToStep(null, 2.5)).toBe(0);
    expect(roundToStep(60, 0)).toBe(60);
  });
});

describe('engines honour the chosen step', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('rounds next-session increases to a 2.5 kg bar', () => {
    const suggestion = getNextLoadSuggestion(benchLog(60, 12), { name: 'Bench Press', reps: '8-12' }, { step: 2.5 });
    expect(suggestion.action).toBe('increase');
    expect(suggestion.weightKg).toBe(62.5);
  });

  it('jumps a 5 kg machine stack instead of adding 2.5 kg', () => {
    const suggestion = getNextLoadSuggestion(benchLog(60, 12), { name: 'Bench Press', reps: '8-12' }, { step: 5 });
    expect(suggestion.action).toBe('increase');
    expect(suggestion.weightKg).toBe(65);
  });

  it('lands dumbbell targets on the 2 kg rack', () => {
    const suggestion = getNextLoadSuggestion(benchLog(18, 12), { name: 'Bench Press', reps: '8-12' }, { step: 2 });
    expect(suggestion.weightKg).toBe(20);
  });

  it('rounds microplate increases to 1.25 kg', () => {
    const suggestion = getNextLoadSuggestion(benchLog(60, 12), { name: 'Bench Press', reps: '8-12' }, { step: 1.25 });
    expect(suggestion.weightKg).toBe(61.25);
  });

  it('exposes roundPlate with a step', () => {
    expect(roundPlate(63.1, 5)).toBe(65);
    expect(roundPlate(63.1)).toBe(62.5);
  });

  it('moves an autoregulated next set by the gym step', () => {
    const plan = suggestNextSet({
      weightKg: 100,
      reps: 9,
      rpe: 8,
      repTarget: { min: 8, max: 10 },
      remainingSets: 2,
      step: 5
    });
    expect(plan.action).toBe('increase');
    expect(plan.weightKg).toBe(105);
  });

  it('keeps the 2.5 kg default when no step is passed', () => {
    const plan = suggestNextSet({
      weightKg: 100,
      reps: 9,
      rpe: 8,
      repTarget: { min: 8, max: 10 },
      remainingSets: 2
    });
    expect(plan.weightKg).toBe(102.5);
  });

  it('floors a deload to the machine stack step', () => {
    expect(getDeloadWeightKg(103, 0.65, 5)).toBe(65);
    expect(getDeloadWeightKg(103, 0.65, 2.5)).toBe(65);
    expect(getDeloadWeightKg(101, 0.65, 2.5)).toBe(65);
    expect(roundToPlate(101 * 0.65, 5)).toBe(65);
  });

  it('prefills a guided session with a buildable next load', () => {
    const session = createSession({
      id: 'day1',
      label: 'Upper',
      exercises: [{ name: 'Bench Press', sets: '3', reps: '8-12', weight: '60kg' }]
    });
    const barDefaults = getSetDefaults(session, benchLog(60, 12), { step: 2.5 });
    expect(barDefaults.weight).toBe('62.5');

    const stackDefaults = getSetDefaults(session, benchLog(60, 12), { step: 5 });
    expect(stackDefaults.weight).toBe('65');
  });

  it('prefills an autoregulated set from the gym step mid-session', () => {
    const session = createSession({
      id: 'day1',
      label: 'Upper',
      exercises: [{ name: 'Bench Press', sets: '4', reps: '8-12', weight: '60kg' }]
    });
    const logged = logSessionSet(session, { weightKg: 60, reps: 10, rpe: 7 });
    expect(getSetDefaults(logged, {}, { step: 5 }).weight).toBe('65');
    expect(getSetDefaults(logged, {}, { step: 2.5 }).weight).toBe('62.5');
  });
});
