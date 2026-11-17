import { describe, it, expect, beforeEach } from 'vitest';
import {
  MAX_WARMUP_PREFS,
  WARMUP_PREFS_KEY,
  clearWarmupMode,
  getWarmupMode,
  normalizeExerciseName,
  readWarmupModes,
  setWarmupMode
} from '../utils/warmupPrefs';

// A minimal storage that can be told to fail, so the UI never depends on a writable device.
const memoryStorage = () => {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: (key) => { store.delete(key); },
    dump: () => store
  };
};

describe('warm-up preferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults every exercise to the full ramp', () => {
    expect(getWarmupMode('Bench Press')).toBe('full');
    expect(getWarmupMode('Something never seen')).toBe('full');
    expect(getWarmupMode('')).toBe('full');
    expect(getWarmupMode(null)).toBe('full');
  });

  it('remembers a mode per exercise', () => {
    expect(setWarmupMode('Lateral Raise', 'primer')).toBe('primer');
    expect(getWarmupMode('Lateral Raise')).toBe('primer');
    expect(getWarmupMode('Bench Press')).toBe('full');
  });

  it('matches the same exercise regardless of case and spacing', () => {
    setWarmupMode('  Bench   Press ', 'primer');
    expect(getWarmupMode('bench press')).toBe('primer');
    expect(getWarmupMode('BENCH PRESS')).toBe('primer');
    expect(normalizeExerciseName('  Cable   Row  ')).toBe('cable row');
  });

  it('rejects an unknown mode and stores the full ramp', () => {
    expect(setWarmupMode('Curl', 'sometimes')).toBe('full');
    expect(getWarmupMode('Curl')).toBe('full');
  });

  it('stores only valid entries from a hand-edited file', () => {
    localStorage.setItem(WARMUP_PREFS_KEY, JSON.stringify({
      'Bench Press': 'primer',
      'Curl': 'nope',
      '  ': 'off',
      'Row': 'off'
    }));
    expect(readWarmupModes()).toEqual({ 'bench press': 'primer', row: 'off' });
  });

  it('reads broken or non-object JSON as empty', () => {
    localStorage.setItem(WARMUP_PREFS_KEY, 'not json');
    expect(readWarmupModes()).toEqual({});
    localStorage.setItem(WARMUP_PREFS_KEY, '["primer"]');
    expect(readWarmupModes()).toEqual({});
  });

  it('lets the athlete clear one exercise', () => {
    setWarmupMode('Deadlift', 'off');
    expect(clearWarmupMode('deadlift')).toBe(true);
    expect(getWarmupMode('Deadlift')).toBe('full');
    expect(clearWarmupMode('Deadlift')).toBe(false);
  });

  it('keeps the newest preferences when the cap is reached', () => {
    const storage = memoryStorage();
    for (let i = 0; i < MAX_WARMUP_PREFS + 5; i += 1) {
      setWarmupMode(`Lift ${i}`, 'primer', { storage });
    }
    const saved = readWarmupModes(storage);
    expect(Object.keys(saved)).toHaveLength(MAX_WARMUP_PREFS);
    expect(saved['lift 0']).toBeUndefined();
    expect(saved[`lift ${MAX_WARMUP_PREFS + 4}`]).toBe('primer');
  });

  it('bumps a re-set exercise to the newest slot', () => {
    const storage = memoryStorage();
    for (let i = 0; i < MAX_WARMUP_PREFS; i += 1) {
      setWarmupMode(`Lift ${i}`, 'full', { storage });
    }
    setWarmupMode('Lift 0', 'primer', { storage });
    for (let i = 0; i < 3; i += 1) {
      setWarmupMode(`New ${i}`, 'off', { storage });
    }
    const saved = readWarmupModes(storage);
    expect(saved['lift 0']).toBe('primer');
    expect(saved['lift 1']).toBeUndefined();
  });

  it('survives storage that refuses to read or write', () => {
    const hostile = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); }
    };
    expect(getWarmupMode('Bench Press', hostile)).toBe('full');
    expect(setWarmupMode('Bench Press', 'primer', { storage: hostile })).toBe('primer');
    expect(clearWarmupMode('Bench Press', { storage: hostile })).toBe(false);
  });
});
