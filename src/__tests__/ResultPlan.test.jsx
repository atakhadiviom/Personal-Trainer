import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ResultPlan from '../components/Wizard/ResultPlan';

describe('ResultPlan', () => {
  const mockAiPlan = {
    overview: {
      title: 'Test Title',
      subtitle: 'Test Subtitle',
      specialNote: 'Test Note',
    },
    progression: [
      { phase: 'Phase 1', focus: 'Focus 1' },
    ],
    nutrition: {
      macros: { calories: '2000', protein: '150g', carbs: '200g', fat: '60g' },
      mealPlan: [{ meal: 'Breakfast', food: 'Oats' }],
    },
    workout: {
      schedule: [
        {
          label: 'Day 1',
          warmup: [{ name: 'Jumping Jacks', duration: '5 mins' }],
          exercises: [{ name: 'Squats', sets: 3, reps: 10, rest: '60s', weight: 'Bodyweight', guide: 'Keep back straight' }],
          cooldown: [{ name: 'Stretching', duration: '5 mins' }],
        },
      ],
    },
    mindset: ['Rule 1'],
  };

  it('renders null when aiPlan is not provided', () => {
    const { container } = render(<ResultPlan formData={{}} aiPlan={null} resetApp={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the plan correctly when aiPlan is provided', () => {
    render(<ResultPlan formData={{}} aiPlan={mockAiPlan} resetApp={vi.fn()} />);

    // Overview
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
    expect(screen.getByText(/Test Note/)).toBeInTheDocument();

    // Progression
    expect(screen.getByText('Phase 1')).toBeInTheDocument();
    expect(screen.getByText('Focus 1')).toBeInTheDocument();

    // Nutrition
    expect(screen.getByText('2000')).toBeInTheDocument();
    expect(screen.getByText('150g')).toBeInTheDocument();
    expect(screen.getByText('200g')).toBeInTheDocument();
    expect(screen.getByText('60g')).toBeInTheDocument();
    expect(screen.getByText('Breakfast')).toBeInTheDocument();
    expect(screen.getByText('Oats')).toBeInTheDocument();

    // Workout
    expect(screen.getByText('Day 1')).toBeInTheDocument();
    expect(screen.getByText('Jumping Jacks')).toBeInTheDocument();
    expect(screen.getByText('Squats')).toBeInTheDocument();
    expect(screen.getByText('Stretching')).toBeInTheDocument();

    // Mindset
    expect(screen.getByText(/Rule 1/)).toBeInTheDocument();
  });

  it('calls resetApp when Recalibrate Profile button is clicked', () => {
    const resetAppMock = vi.fn();
    render(<ResultPlan formData={{}} aiPlan={mockAiPlan} resetApp={resetAppMock} />);

    const recalibrateBtn = screen.getByText(/Recalibrate Profile/i);
    fireEvent.click(recalibrateBtn);

    expect(resetAppMock).toHaveBeenCalledTimes(1);
  });
});
