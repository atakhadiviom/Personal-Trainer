import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CalorieTracker from '../components/Dashboard/CalorieTracker';

describe('CalorieTracker Component', () => {
  it('renders correctly with default values when weight is missing', () => {
    const formData = { goal: 'maintenance' };
    render(<CalorieTracker formData={formData} />);

    // Default weight is 75
    // dailyCals = 75 * 30 = 2250
    expect(screen.getByText('🔥 2250 kcal')).toBeInTheDocument();

    // P: 75 * 2 = 150g
    // C: (2250 * 0.4) / 4 = 225g
    // F: (2250 * 0.25) / 9 = 63g
    expect(screen.getByText('P: 150g')).toBeInTheDocument();
    expect(screen.getByText('C: 225g')).toBeInTheDocument();
    expect(screen.getByText('F: 63g')).toBeInTheDocument();
  });

  it('calculates macros correctly for the fatloss goal', () => {
    const formData = { weight: '80', goal: 'fatloss' };
    render(<CalorieTracker formData={formData} />);

    // dailyCals = 80 * 22 = 1760
    expect(screen.getByText('🔥 1760 kcal')).toBeInTheDocument();

    // P: 80 * 2 = 160g
    // C: (1760 * 0.4) / 4 = 176g
    // F: (1760 * 0.25) / 9 = 49g (48.88 rounded)
    expect(screen.getByText('P: 160g')).toBeInTheDocument();
    expect(screen.getByText('C: 176g')).toBeInTheDocument();
    expect(screen.getByText('F: 49g')).toBeInTheDocument();
  });

  it('calculates macros correctly for other goals', () => {
    const formData = { weight: '80', goal: 'muscle' };
    render(<CalorieTracker formData={formData} />);

    // dailyCals = 80 * 30 = 2400
    expect(screen.getByText('🔥 2400 kcal')).toBeInTheDocument();

    // P: 80 * 2 = 160g
    // C: (2400 * 0.4) / 4 = 240g
    // F: (2400 * 0.25) / 9 = 67g (66.66 rounded)
    expect(screen.getByText('P: 160g')).toBeInTheDocument();
    expect(screen.getByText('C: 240g')).toBeInTheDocument();
    expect(screen.getByText('F: 67g')).toBeInTheDocument();
  });
});
