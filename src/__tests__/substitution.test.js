import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SUGGESTION_LIMIT,
  EQUIPMENT,
  MAX_NAME_LENGTH,
  SUBSTITUTES,
  canSubstitute,
  detectEquipment,
  detectPattern,
  equipmentLabel,
  equipmentNote,
  estimateSubstituteLoad,
  patternLabelFor,
  suggestSubstitutes
} from '../utils/substitution';

describe('movement pattern detection', () => {
  it('reads the pattern out of the names an AI plan actually writes', () => {
    const cases = [
      ['Barbell Bench Press', 'horizontal-push'],
      ['Incline Dumbbell Press', 'horizontal-push'],
      ['Chest Press Machine', 'horizontal-push'],
      ['Push-Up', 'horizontal-push'],
      ['Barbell Floor Press', 'horizontal-push'],
      ['Standing Overhead Press', 'vertical-push'],
      ['Seated Dumbbell Shoulder Press', 'vertical-push'],
      ['Pike Push-Up', 'vertical-push'],
      ['Barbell Bent-Over Row', 'horizontal-pull'],
      ['T-Bar Row', 'horizontal-pull'],
      ['Seated Cable Row', 'horizontal-pull'],
      ['Lat Pulldown', 'vertical-pull'],
      ['Assisted Pull-Up Machine', 'vertical-pull'],
      ['Barbell Back Squat', 'squat'],
      ['Hack Squat', 'squat'],
      ['Goblet Squat', 'squat'],
      ['Bulgarian Split Squat', 'lunge'],
      ['Dumbbell Walking Lunge', 'lunge'],
      ['Barbell Deadlift', 'hinge'],
      ['Dumbbell Romanian Deadlift', 'hinge'],
      ['Barbell Hip Thrust', 'hinge'],
      ['Leg Curl', 'hamstring-curl'],
      ['Nordic Hamstring Curl', 'hamstring-curl'],
      ['Leg Extension', 'quad-extension'],
      ['Single-Leg Calf Raise', 'calf'],
      ['Dumbbell Lateral Raise', 'lateral-raise'],
      ['Cable Face Pull', 'rear-delt'],
      ['Reverse Pec Deck', 'rear-delt'],
      ['Pec Deck', 'chest-fly'],
      ['Cable Crossover', 'chest-fly'],
      ['EZ-Bar Curl', 'biceps'],
      ['Hammer Curl', 'biceps'],
      ['Cable Rope Pushdown', 'triceps'],
      ['Close-Grip Bench Press', 'triceps'],
      ['Skull Crusher', 'triceps'],
      ['Hanging Leg Raise', 'core'],
      ['Pallof Press', 'core'],
      ['Barbell Shrug', 'shrug'],
      ['Farmer Carry', 'grip'],
      ['Hip Abduction Machine', 'hip-abduction']
    ];
    cases.forEach(([name, pattern]) => {
      expect(detectPattern(name), name).toBe(pattern);
    });
  });

  it('keeps the specific pattern ahead of the generic word inside it', () => {
    // "curl" must not swallow a leg curl, "fly" must not swallow a reverse fly,
    // and "row" must not swallow a face pull.
    expect(detectPattern('Seated Leg Curl')).toBe('hamstring-curl');
    expect(detectPattern('Dumbbell Reverse Fly')).toBe('rear-delt');
    expect(detectPattern('Cable Face Pull')).toBe('rear-delt');
    expect(detectPattern('Close-Grip Bench Press')).toBe('triceps');
  });

  it('refuses cardio, mobility and names it cannot place', () => {
    expect(detectPattern('Rowing Machine')).toBeNull();
    expect(detectPattern('Treadmill Intervals')).toBeNull();
    expect(detectPattern('Foam Roll Quads')).toBeNull();
    expect(detectPattern('Turkish Get-Up')).toBeNull();
    expect(detectPattern('')).toBeNull();
    expect(detectPattern(null)).toBeNull();
    expect(detectPattern(42)).toBeNull();
  });

  it('labels a pattern for the sheet heading', () => {
    expect(patternLabelFor('Barbell Bench Press')).toBe('Horizontal push');
    expect(patternLabelFor('Lat Pulldown')).toBe('Vertical pull');
    expect(patternLabelFor('Unknown Thing')).toBe('');
  });

  it('answers whether a lift is matchable at all', () => {
    expect(canSubstitute('Barbell Bench Press')).toBe(true);
    expect(canSubstitute('Rowing Machine')).toBe(false);
    expect(canSubstitute('')).toBe(false);
  });
});

describe('equipment detection', () => {
  it('maps a lift to the kit it needs', () => {
    expect(detectEquipment('Barbell Bench Press')).toBe('barbell');
    expect(detectEquipment('Dumbbell Bench Press')).toBe('dumbbell');
    expect(detectEquipment('Smith Machine Squat')).toBe('smith');
    expect(detectEquipment('Leg Press')).toBe('machine');
    expect(detectEquipment('Seated Cable Row')).toBe('cable');
    expect(detectEquipment('Lat Pulldown')).toBe('cable');
    expect(detectEquipment('Push-Up')).toBe('bodyweight');
    expect(detectEquipment('Kettlebell Swing')).toBe('kettlebell');
    expect(detectEquipment('Banded Face Pull')).toBe('band');
  });

  it('reads banded kit as band even when the name also says pulldown', () => {
    expect(detectEquipment('Banded Lat Pulldown')).toBe('band');
    expect(detectEquipment('Band Pull-Apart')).toBe('band');
  });

  it('falls back to other kit rather than guessing', () => {
    expect(detectEquipment('Glute Ham Raise')).toBe('other');
    expect(detectEquipment('')).toBe('other');
    expect(detectEquipment(undefined)).toBe('other');
    expect(equipmentLabel('nope')).toBe('Other kit');
    expect(equipmentNote('dumbbell')).toMatch(/75 %/);
  });
});

describe('substitute catalogue', () => {
  it('is internally consistent', () => {
    SUBSTITUTES.forEach(item => {
      expect(item.name.trim().length, item.name).toBeGreaterThan(0);
      expect(item.name.length).toBeLessThanOrEqual(MAX_NAME_LENGTH);
      expect(detectPattern(item.name), item.name).toBe(item.pattern);
      expect(detectEquipment(item.name), item.name).toBe(item.equipment);
      expect(Object.keys(EQUIPMENT)).toContain(item.equipment);
      expect(item.detail.length, item.name).toBeGreaterThan(10);
      expect(item.guide.length, item.name).toBeGreaterThan(10);
    });
  });

  it('offers at least two kit choices for every pattern it detects', () => {
    const patterns = new Set(SUBSTITUTES.map(item => item.pattern));
    patterns.forEach(pattern => {
      const equipment = new Set(SUBSTITUTES.filter(item => item.pattern === pattern).map(item => item.equipment));
      expect(equipment.size, pattern).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('suggestSubstitutes', () => {
  it('returns same-pattern lifts on different kit, best fallback first', () => {
    const suggestions = suggestSubstitutes('Barbell Bench Press');
    expect(suggestions).toHaveLength(DEFAULT_SUGGESTION_LIMIT);
    expect(suggestions.map(item => item.equipment)).toEqual(['dumbbell', 'cable', 'machine']);
    expect(suggestions[0].name).toBe('Dumbbell Bench Press');
    suggestions.forEach(item => {
      expect(item.pattern).toBe('horizontal-push');
      expect(item.equipment).not.toBe('barbell');
      expect(item.equipmentLabel).toBe(EQUIPMENT[item.equipment].label);
      expect(item.load).toBeTruthy();
    });
  });

  it('never suggests the exercise it was given', () => {
    const suggestions = suggestSubstitutes('Dumbbell Bench Press');
    expect(suggestions.map(item => item.name)).not.toContain('Dumbbell Bench Press');
    expect(suggestions.every(item => item.equipment !== 'dumbbell')).toBe(true);
  });

  it('uses one suggestion per equipment type', () => {
    const suggestions = suggestSubstitutes('Barbell Back Squat');
    const equipment = suggestions.map(item => item.equipment);
    expect(new Set(equipment).size).toBe(equipment.length);
  });

  it('respects the limit and refuses a limit of zero', () => {
    expect(suggestSubstitutes('Barbell Bench Press', { limit: 1 })).toHaveLength(1);
    expect(suggestSubstitutes('Barbell Bench Press', { limit: 0 })).toEqual([]);
    expect(suggestSubstitutes('Barbell Bench Press', { limit: 99 }).length).toBeLessThanOrEqual(6);
  });

  it('gives a busy rack a real answer for a machine or a cable lift', () => {
    const pulldown = suggestSubstitutes('Lat Pulldown');
    expect(pulldown.length).toBeGreaterThanOrEqual(2);
    expect(pulldown.some(item => item.equipment === 'bodyweight')).toBe(true);

    const cableRow = suggestSubstitutes('Seated Cable Row');
    expect(cableRow[0].name).toBe('Single-Arm Dumbbell Row');
  });

  it('returns nothing for cardio or an unplaceable name', () => {
    expect(suggestSubstitutes('Rowing Machine')).toEqual([]);
    expect(suggestSubstitutes('Turkish Get-Up')).toEqual([]);
    expect(suggestSubstitutes('')).toEqual([]);
  });

  it('carries the starting load into every suggestion', () => {
    const suggestions = suggestSubstitutes('Barbell Bench Press', { weightKg: '100kg' });
    expect(suggestions[0].load).toMatchObject({ weightKg: 75, perHandKg: 37.5, text: '2 × 37.5 kg' });
    expect(suggestions[1].load).toMatchObject({ weightKg: 90, text: '90 kg' });
  });
});

describe('estimateSubstituteLoad', () => {
  it('splits a barbell load across both hands for dumbbells', () => {
    const load = estimateSubstituteLoad({ weightKg: 100, fromEquipment: 'barbell', toEquipment: 'dumbbell' });
    expect(load.weightKg).toBe(75);
    expect(load.perHandKg).toBe(37.5);
    expect(load.text).toBe('2 × 37.5 kg');
    expect(load.note).toMatch(/75 %/);
  });

  it('rounds down to the athlete\'s jump so the first set is never a surprise', () => {
    // 100 kg bar → 75 kg total → 37.5 per hand, floored to the 5 kg rack.
    const load = estimateSubstituteLoad({
      weightKg: 100, fromEquipment: 'barbell', toEquipment: 'dumbbell', step: 5
    });
    expect(load.perHandKg).toBe(35);
    expect(load.weightKg).toBe(70);
  });

  it('converts back up when the plan used a lighter kit', () => {
    // 40 kg on a cable is ~44.4 kg on a bar → 42.5 on a 2.5 kg bar.
    const load = estimateSubstituteLoad({ weightKg: 40, fromEquipment: 'cable', toEquipment: 'barbell' });
    expect(load.weightKg).toBe(42.5);
    expect(load.text).toBe('42.5 kg');
  });

  it('gives the smith machine its small fixed-path allowance', () => {
    const load = estimateSubstituteLoad({ weightKg: 100, fromEquipment: 'barbell', toEquipment: 'smith' });
    expect(load.weightKg).toBe(105);
  });

  it('refuses a number for bodyweight and band work', () => {
    const bodyweight = estimateSubstituteLoad({ weightKg: 80, fromEquipment: 'barbell', toEquipment: 'bodyweight' });
    expect(bodyweight.weightKg).toBe(0);
    expect(bodyweight.text).toBe('bodyweight');

    const band = estimateSubstituteLoad({ weightKg: 80, fromEquipment: 'barbell', toEquipment: 'band' });
    expect(band.weightKg).toBe(0);
    expect(band.text).toBe('band tension');
  });

  it('has no estimate when the plan carried no load to convert from', () => {
    const load = estimateSubstituteLoad({ weightKg: 0, fromEquipment: 'bodyweight', toEquipment: 'barbell' });
    expect(load.weightKg).toBe(0);
    expect(load.text).toBe('');
    expect(load.note).toMatch(/pick a starting weight by feel/i);
  });

  it('asks for a load by feel when the plan has no number', () => {
    const load = estimateSubstituteLoad({ weightKg: '', fromEquipment: 'barbell', toEquipment: 'dumbbell' });
    expect(load.weightKg).toBe(0);
    expect(load.text).toBe('');
    expect(load.note).toMatch(/pick a weight by feel/i);
  });

  it('never drops below one jump on the rack', () => {
    const load = estimateSubstituteLoad({ weightKg: 1, fromEquipment: 'barbell', toEquipment: 'dumbbell', step: 2.5 });
    expect(load.perHandKg).toBe(2.5);
    expect(load.weightKg).toBe(5);
  });

  it('falls back to the default jump for a broken step', () => {
    const load = estimateSubstituteLoad({
      weightKg: 100, fromEquipment: 'barbell', toEquipment: 'dumbbell', step: 'huge'
    });
    expect(load.weightKg).toBe(75);
  });

  it('survives empty and hostile input', () => {
    expect(estimateSubstituteLoad().weightKg).toBe(0);
    expect(estimateSubstituteLoad({ weightKg: 'abc', fromEquipment: 'barbell', toEquipment: 'dumbbell' }).weightKg).toBe(0);
    expect(estimateSubstituteLoad({ weightKg: -40, fromEquipment: 'barbell', toEquipment: 'cable' }).weightKg).toBe(0);
    // An unknown equipment id is treated as ordinary kit, never a crash.
    const unknown = estimateSubstituteLoad({ weightKg: 50, fromEquipment: 'spaceship', toEquipment: 'barbell' });
    expect(unknown.weightKg).toBe(50);
  });
});
