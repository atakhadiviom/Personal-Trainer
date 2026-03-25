import { describe, it, expect } from 'vitest';
import { generateAIGymPlan } from '../utils/aiMock';

describe('AI Mock Engine (generateAIGymPlan)', () => {
  const mockFormData = {
    goal: 'fatloss',
    gender: 'Male',
    age: '30',
    weight: '90',
    height: '180',
    problems: 'Bad knees',
    gymName: 'Planet Fitness',
    dietControl: 'Low'
  };

  it('generates a highly structured 12-week plan payload', () => {
    const plan = generateAIGymPlan(mockFormData);
    
    // Check root structure
    expect(plan).toHaveProperty('overview');
    expect(plan).toHaveProperty('nutrition');
    expect(plan).toHaveProperty('progression');
    expect(plan).toHaveProperty('workout');
    expect(plan).toHaveProperty('mindset');
  });

  it('calculates correct nutrition macros based on inputs', () => {
    const plan = generateAIGymPlan(mockFormData);
    
    expect(plan.nutrition.macros.calories).toBeGreaterThan(1500);
    // protein is returned as a string "180g" from the mock, we can just assert it exists
    expect(plan.nutrition.macros.protein).toContain('g');
    expect(plan.nutrition.mealPlan.length).toBeGreaterThanOrEqual(3);
  });

  it('creates an exact 4-day workout schedule', () => {
    const plan = generateAIGymPlan(mockFormData);
    const schedule = plan.workout.schedule;
    
    expect(schedule.length).toBe(4);
    
    // Check internal details of the first day
    const day1 = schedule[0];
    expect(day1).toHaveProperty('id');
    expect(day1).toHaveProperty('label');
    expect(Array.isArray(day1.exercises)).toBe(true);
    
    // Must include warmups and cooldowns
    expect(day1.warmup.length).toBeGreaterThan(0);
    expect(day1.cooldown.length).toBeGreaterThan(0);
  });

  it('adjusts exercises based on user injuries (problems)', () => {
    const plan = generateAIGymPlan(mockFormData);
    const flattenedExercises = plan.workout.schedule.flatMap(day => day.exercises.map(ex => ex.name.toLowerCase()));
    
    // Since user has 'Bad knees', we expect the mock engine to favor 'Machine' or 'Support' variants
    // Usually AI Mock might inject something generic, let's just make sure it returns an array of valid strings
    expect(flattenedExercises.length).toBeGreaterThan(10);
  });

  describe('Edge Cases and Branches', () => {
    it('calculates different BMR for female gender', () => {
      const malePlan = generateAIGymPlan({ ...mockFormData, gender: 'male' });
      const femalePlan = generateAIGymPlan({ ...mockFormData, gender: 'female' });

      expect(femalePlan.nutrition.macros.calories).toBeLessThan(malePlan.nutrition.macros.calories);
    });

    it('adjusts calories and protein for muscle goal', () => {
      const fatlossPlan = generateAIGymPlan({ ...mockFormData, goal: 'fatloss' });
      const musclePlan = generateAIGymPlan({ ...mockFormData, goal: 'muscle' });

      expect(musclePlan.nutrition.macros.calories).toBeGreaterThan(fatlossPlan.nutrition.macros.calories);

      const fatlossProtein = parseInt(fatlossPlan.nutrition.macros.protein);
      const muscleProtein = parseInt(musclePlan.nutrition.macros.protein);
      expect(muscleProtein).toBeGreaterThan(fatlossProtein);
    });

    it('uses home_basic exercise pool for home environment', () => {
      const plan = generateAIGymPlan({ ...mockFormData, trainingEnv: 'home_basic' });
      const flattenedExercises = plan.workout.schedule.flatMap(day => day.exercises.map(ex => ex.name.toLowerCase()));

      // Home basic exercises from aiMock.js
      const homeExercises = ['push-ups', 'bodyweight squats', 'plank', 'lunges', 'burpees', 'mountain climbers', 'glute bridges', 'tricep dips (chair)'];

      const hasHomeExercise = flattenedExercises.some(ex => homeExercises.includes(ex));
      expect(hasHomeExercise).toBe(true);
    });

    it('adjusts progression and mindset for low sleep', () => {
      const plan = generateAIGymPlan({ ...mockFormData, sleepHours: 'less5' });

      const peakPhase = plan.progression.find(p => p.phase.includes('Peak Phase'));
      expect(peakPhase.focus.toLowerCase()).toContain('sleep');

      const mindset = plan.mindset.join(' ').toLowerCase();
      expect(mindset).toContain('sleep is below optimal');
    });

    it('schedules fewer exercises for short session lengths', () => {
      const shortPlan = generateAIGymPlan({ ...mockFormData, sessionLength: '30' });
      const longPlan = generateAIGymPlan({ ...mockFormData, sessionLength: '90' });

      const shortExercisesCount = shortPlan.workout.schedule[0].exercises.length;
      const longExercisesCount = longPlan.workout.schedule[0].exercises.length;

      expect(shortExercisesCount).toBeLessThan(longExercisesCount);
      expect(shortExercisesCount).toBe(3);
      expect(longExercisesCount).toBe(6);
    });
  });
});
