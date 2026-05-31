import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ResultPlan from '../components/Wizard/ResultPlan';

const mockAiPlan = {
  overview: {
    title: 'Test Title',
    subtitle: 'Test Subtitle',
    specialNote: 'Test Special Note',
  },
  progression: [
    { phase: 'Phase 1', focus: 'Focus 1' },
    { phase: 'Phase 2', focus: 'Focus 2' },
  ],
  nutrition: {
    macros: {
      calories: '2000',
      protein: '150g',
      carbs: '200g',
      fat: '50g',
    },
    mealPlan: [
      { meal: 'Breakfast', food: 'Oatmeal' },
      { meal: 'Lunch', food: 'Chicken Salad' },
    ],
  },
  workout: {
    schedule: [
      {
        label: 'Day 1: Legs',
        warmup: [{ name: 'Jumping Jacks', duration: '5 mins' }],
        exercises: [
          {
            name: 'Squats',
            sets: '3',
            reps: '10',
            rest: '60s',
            weight: '100 lbs',
            guide: 'Keep back straight',
          },
        ],
        cooldown: [{ name: 'Stretching', duration: '10 mins' }],
      },
    ],
  },
  mindset: ['Rule 1', 'Rule 2'],
};

describe('ResultPlan', () => {
  it('returns null if aiPlan is not provided', () => {
    const { container } = render(<ResultPlan aiPlan={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders headers, special notes, and progression strategy', () => {
    render(<ResultPlan aiPlan={mockAiPlan} />);

    // Header
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
    expect(screen.getByText('Test Special Note')).toBeInTheDocument();

    // Progression
    expect(screen.getByText('Phase 1')).toBeInTheDocument();
    expect(screen.getByText('Focus 1')).toBeInTheDocument();
    expect(screen.getByText('Phase 2')).toBeInTheDocument();
    expect(screen.getByText('Focus 2')).toBeInTheDocument();
  });

  it('renders nutrition macros and meal plan correctly', () => {
    render(<ResultPlan aiPlan={mockAiPlan} />);

    // Macros
    expect(screen.getByText('2000')).toBeInTheDocument(); // cal
    expect(screen.getByText('150g')).toBeInTheDocument(); // pro
    expect(screen.getByText('200g')).toBeInTheDocument(); // car
    expect(screen.getByText('50g')).toBeInTheDocument(); // fat

    // Meal Plan
    expect(screen.getByText('Breakfast')).toBeInTheDocument();
    expect(screen.getByText('Oatmeal')).toBeInTheDocument();
    expect(screen.getByText('Lunch')).toBeInTheDocument();
    expect(screen.getByText('Chicken Salad')).toBeInTheDocument();
  });

  it('renders workout schedules, warmup, exercises, and cooldown correctly', () => {
    render(<ResultPlan aiPlan={mockAiPlan} />);

    // Schedule Label
    expect(screen.getByText('Day 1: Legs')).toBeInTheDocument();

    // Warmup
    expect(screen.getByText('Jumping Jacks')).toBeInTheDocument();
    expect(screen.getByText('• 5 mins')).toBeInTheDocument();

    // Exercises
    expect(screen.getByText('Squats')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // sets
    expect(screen.getByText('10')).toBeInTheDocument(); // reps
    expect(screen.getByText('60s')).toBeInTheDocument(); // rest
    expect(screen.getByText('100 lbs')).toBeInTheDocument(); // weight
    expect(screen.getByText('Keep back straight')).toBeInTheDocument(); // guide

    // YouTube Action
    const ytLink = screen.getByText('▶ Watch');
    expect(ytLink).toHaveAttribute('href', 'https://www.youtube.com/results?search_query=how+to+properly+do+Squats');

    // Cooldown
    expect(screen.getByText('Stretching')).toBeInTheDocument();
    expect(screen.getByText('• 10 mins')).toBeInTheDocument();
  });

  it('renders mindset rules correctly', () => {
    render(<ResultPlan aiPlan={mockAiPlan} />);

    expect(screen.getByText('✓ Rule 1')).toBeInTheDocument();
    expect(screen.getByText('✓ Rule 2')).toBeInTheDocument();
  });

  it('triggers resetApp when Recalibrate Profile button is clicked', () => {
    const mockResetApp = vi.fn();
    render(<ResultPlan aiPlan={mockAiPlan} resetApp={mockResetApp} />);

    const resetBtn = screen.getByText('↻ Recalibrate Profile');
    fireEvent.click(resetBtn);

    expect(mockResetApp).toHaveBeenCalledTimes(1);
  });
});
