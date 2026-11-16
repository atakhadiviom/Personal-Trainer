import { describe, it, expect, beforeEach } from 'vitest';
import {
  BAR_OPTIONS,
  BAR_WEIGHT_KEY,
  DEFAULT_BAR_KG,
  PLATE_SET_KG,
  computePlateLoad,
  describePlateLoad,
  formatBarKg,
  formatPlateList,
  formatPlateSet,
  getBarWeight,
  isBarbellLift,
  onBarWeightChange,
  parseBarWeight,
  plateLoadAdvice,
  plateLoadLabel,
  setBarWeight
} from '../utils/plateMath';

const kgOf = (load, kg) => load.perSide.find(plate => plate.kg === kg)?.count ?? 0;

describe('isBarbellLift', () => {
  it('recognises the barbell staples', () => {
    [
      'Barbell Bench Press',
      'Back Squat',
      'Deadlift',
      'Romanian Deadlift',
      'Overhead Press',
      'Barbell Row',
      'Hip Thrust',
      'Good Morning'
    ].forEach(name => expect(isBarbellLift(name)).toBe(true));
  });

  it('never offers plates for cable, machine or dumbbell work', () => {
    [
      'Lat Pulldown',
      'Cable Row',
      'Machine Bench Press',
      'Seated Dumbbell Press',
      'DB Romanian Deadlift',
      'Leg Press',
      'Smith Machine Squat',
      'Chest Fly',
      'Triceps Pushdown',
      'Pull-up'
    ].forEach(name => expect(isBarbellLift(name)).toBe(false));
  });

  it('treats blank or unusable names as not a barbell lift', () => {
    expect(isBarbellLift('')).toBe(false);
    expect(isBarbellLift(null)).toBe(false);
    expect(isBarbellLift(undefined)).toBe(false);
    expect(isBarbellLift('   ')).toBe(false);
  });
});

describe('computePlateLoad', () => {
  it('builds an exact load per side', () => {
    const load = computePlateLoad(87.5, { barKg: 20 });
    // (87.5 - 20) / 2 = 33.75 → 25 + 5 + 2.5 + 1.25
    expect(load.exact).toBe(true);
    expect(load.perSide).toEqual([
      { kg: 25, count: 1 },
      { kg: 5, count: 1 },
      { kg: 2.5, count: 1 },
      { kg: 1.25, count: 1 }
    ]);
    expect(load.buildableKg).toBe(87.5);
    expect(load.plateCount).toBe(8);
    expect(load.remainderKg).toBe(0);
  });

  it('uses a second plate when the side needs it', () => {
    const load = computePlateLoad(100, { barKg: 20 });
    // 40 per side → 25 + 15
    expect(load.exact).toBe(true);
    expect(formatPlateList(load.perSide)).toBe('25 + 15');
  });

  it('counts repeated plates instead of repeating rows', () => {
    const load = computePlateLoad(140, { barKg: 20 });
    // 60 per side → 2 × 25 + 10
    expect(kgOf(load, 25)).toBe(2);
    expect(formatPlateList(load.perSide)).toBe('2 × 25 + 10');
  });

  it('reports the neighbours when the target is not buildable', () => {
    const load = computePlateLoad(88, { barKg: 20 });
    expect(load.exact).toBe(false);
    expect(load.buildableKg).toBe(87.5);
    expect(load.remainderKg).toBe(0.5);
    expect(load.lighterKg).toBe(87.5);
    expect(load.heavierKg).toBe(90);
  });

  it('handles a women\'s bar and a light target', () => {
    const load = computePlateLoad(42.5, { barKg: 15 });
    expect(load.exact).toBe(true);
    // (42.5 - 15) / 2 = 13.75 → 10 + 2.5 + 1.25
    expect(formatPlateList(load.perSide)).toBe('10 + 2.5 + 1.25');
  });

  it('splits plates only, with no bar, on a plate-loaded machine', () => {
    const load = computePlateLoad(80, { barKg: 0 });
    expect(load.barKg).toBe(0);
    expect(load.exact).toBe(true);
    expect(formatPlateList(load.perSide)).toBe('25 + 15');
    expect(load.plateCount).toBe(4);
  });

  it('returns an empty bar rather than a negative side load', () => {
    const load = computePlateLoad(20, { barKg: 20 });
    expect(load.perSide).toEqual([]);
    expect(load.buildableKg).toBe(20);
    expect(load.exact).toBe(true);
  });

  it('shows nothing for bodyweight, below-bar or unusable input', () => {
    expect(computePlateLoad('', { barKg: 20 })).toBeNull();
    expect(computePlateLoad(0, { barKg: 20 })).toBeNull();
    expect(computePlateLoad(-5, { barKg: 20 })).toBeNull();
    expect(computePlateLoad(10, { barKg: 20 })).toBeNull();
    expect(computePlateLoad('bodyweight', { barKg: 20 })).toBeNull();
    expect(computePlateLoad(600, { barKg: 20 })).toBeNull();
  });

  it('reads a weight with a unit suffix', () => {
    const load = computePlateLoad('87,5 kg', { barKg: 20 });
    expect(load.targetKg).toBe(87.5);
    expect(load.exact).toBe(true);
  });

  it('falls back to the default bar for an invalid setting', () => {
    const load = computePlateLoad(60, { barKg: 'nonsense' });
    expect(load.barKg).toBe(DEFAULT_BAR_KG);
    expect(load.exact).toBe(true);
    expect(formatPlateList(load.perSide)).toBe('20');
  });

  it('never overshoots a non-buildable target downwards', () => {
    const load = computePlateLoad(63, { barKg: 20 });
    expect(load.exact).toBe(false);
    expect(load.buildableKg).toBeLessThan(63);
    expect(load.heavierKg).toBeGreaterThan(63);
  });

  it('respects a custom plate set', () => {
    const load = computePlateLoad(100, { barKg: 20, plates: [45, 25, 10, 5, 2.5] });
    // 40 per side with no 15s → 25 + 10 + 5
    expect(formatPlateList(load.perSide)).toBe('25 + 10 + 5');
    expect(load.exact).toBe(true);
  });

  it('uses every plate in the default set at some point', () => {
    const used = new Set();
    [21.25, 60, 70, 80, 87.5, 100, 140].forEach(kg => {
      const load = computePlateLoad(kg, { barKg: 20 });
      load.perSide.forEach(plate => used.add(plate.kg));
    });
    PLATE_SET_KG.forEach(kg => expect(used.has(kg)).toBe(true));
  });
});

describe('plate load copy', () => {
  it('formats single and repeated plates', () => {
    expect(formatPlateSet({ kg: 10, count: 1 })).toBe('10');
    expect(formatPlateSet({ kg: 10, count: 2 })).toBe('2 × 10');
    expect(formatBarKg(20)).toBe('20 kg');
  });

  it('describes the load per side and the bar', () => {
    const load = computePlateLoad(87.5, { barKg: 20 });
    expect(describePlateLoad(load)).toBe('25 + 5 + 2.5 + 1.25 per side on a 20 kg bar');
  });

  it('omits the bar when there is none', () => {
    const load = computePlateLoad(80, { barKg: 0 });
    expect(describePlateLoad(load)).toBe('25 + 15 per side');
  });

  it('tells the athlete which weights to build when the target is impossible', () => {
    const load = computePlateLoad(88, { barKg: 20 });
    expect(plateLoadAdvice(load)).toBe(
      '88 kg is not a buildable load. Build 87.5 kg (25 + 5 + 2.5 + 1.25 per side) or 90 kg.'
    );
  });

  it('confirms an exact load', () => {
    const load = computePlateLoad(60, { barKg: 20 });
    expect(plateLoadAdvice(load)).toBe('20 per side on a 20 kg bar → 60 kg.');
  });

  it('keeps the empty bar quiet', () => {
    expect(plateLoadAdvice(computePlateLoad(20, { barKg: 20 }))).toBe('');
    expect(plateLoadAdvice(computePlateLoad(0, { barKg: 20 }))).toBe('');
    expect(describePlateLoad(null)).toBe('');
  });

  it('writes a screen-reader sentence with plate pairs', () => {
    const load = computePlateLoad(87.5, { barKg: 20 });
    expect(plateLoadLabel(load)).toBe(
      '1 25 kg plate, 1 5 kg plate, 1 2.5 kg plate, 1 1.25 kg plate per side on a 20 kg bar — 87.5 kg total.'
    );
  });
});

describe('bar weight preference', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('accepts numbers, units and preset ids', () => {
    expect(parseBarWeight(20)).toBe(20);
    expect(parseBarWeight('15')).toBe(15);
    expect(parseBarWeight('20kg')).toBe(20);
    expect(parseBarWeight('womens')).toBe(15);
    expect(parseBarWeight('none')).toBe(0);
    expect(parseBarWeight('')).toBeNull();
    expect(parseBarWeight('heavy')).toBeNull();
    expect(parseBarWeight(99)).toBeNull();
  });

  it('defaults to the Olympic bar and persists a choice', () => {
    expect(getBarWeight()).toBe(DEFAULT_BAR_KG);
    expect(setBarWeight('15')).toBe(15);
    expect(localStorage.getItem(BAR_WEIGHT_KEY)).toBe('15');
    expect(getBarWeight()).toBe(15);
  });

  it('falls back to the default for a corrupted value', () => {
    localStorage.setItem(BAR_WEIGHT_KEY, 'oops');
    expect(getBarWeight()).toBe(DEFAULT_BAR_KG);
  });

  it('notifies listeners and stops when unsubscribed', () => {
    const seen = [];
    const off = onBarWeightChange(kg => seen.push(kg));
    setBarWeight(10);
    expect(seen).toEqual([10]);
    off();
    setBarWeight(20);
    expect(seen).toEqual([10]);
  });

  it('exposes every bar preset as a usable setting', () => {
    BAR_OPTIONS.forEach(option => expect(parseBarWeight(option.id)).toBe(option.kg));
  });
});
