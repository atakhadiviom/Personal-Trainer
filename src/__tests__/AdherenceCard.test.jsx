import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AdherenceCard from '../components/Dashboard/AdherenceCard';
import { loadNutritionWeek } from '../utils/nutritionWeek';
import { toDateKey } from '../utils/streaks';

vi.mock('../firebase', () => ({
  auth: { currentUser: { uid: 'test-user' } },
  db: {}
}));
vi.mock('../utils/nutritionWeek', () => ({
  loadNutritionWeek: vi.fn()
}));

const TODAY = new Date(2026, 10, 15, 10, 0, 0);
const daysAgo = (n) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - n);
  return toDateKey(d);
};

const activity = (offsets) => offsets.reduce((log, offset) => ({
  ...log,
  [daysAgo(offset)]: { exercises: 1, labels: ['Push'] }
}), {});

const fullWeek = (cals = 2000, protein = 160) => Array.from({ length: 7 }, (_, i) => ({
  date: daysAgo(i),
  cals,
  protein,
  meals: 3
}));

const baseProps = {
  today: TODAY,
  daysPerWeek: 4,
  goal: 'fatloss',
  targetCals: 2000,
  proteinTarget: 160,
  bodyLog: [{ date: daysAgo(14), weightKg: 84 }, { date: daysAgo(0), weightKg: 82 }]
};

describe('AdherenceCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a perfect week as an A', () => {
    render(
      <AdherenceCard
        {...baseProps}
        activityLog={activity([0, 2, 4, 5])}
        nutritionDays={fullWeek()}
      />
    );

    expect(screen.getByTestId('adherence-card')).toBeInTheDocument();
    expect(screen.getByTestId('asc-score')).toHaveTextContent('100');
    expect(screen.getByTestId('asc-grade')).toHaveTextContent('A');
    expect(screen.getByTestId('asc-band')).toHaveTextContent('Excellent');
    expect(screen.getByTestId('asc-training')).toHaveTextContent('4/4 sessions');
    expect(screen.getByTestId('asc-nutrition')).toHaveTextContent('7/7 days');
    expect(screen.getByTestId('asc-focus')).toHaveAttribute('data-dimension', 'progress');
    expect(screen.getByTestId('asc-highlights').children).toHaveLength(3);
    expect(screen.getByTestId('asc-body-delta')).toHaveTextContent('-2 kg');
    expect(loadNutritionWeek).not.toHaveBeenCalled();
  });

  it('shows the no-data state for a brand-new account', () => {
    render(<AdherenceCard {...baseProps} activityLog={{}} nutritionDays={[]} bodyLog={[]} />);

    expect(screen.getByTestId('asc-score')).toHaveTextContent('—');
    expect(screen.getByTestId('asc-grade')).toHaveTextContent('—');
    expect(screen.getByTestId('asc-band')).toHaveTextContent('No data');
    expect(screen.getByTestId('asc-focus')).toHaveAttribute('data-dimension', 'start');
    expect(screen.getByTestId('asc-body')).toHaveTextContent('Body trend locked');
  });

  it('explains the scoring model in the footnote', () => {
    render(<AdherenceCard {...baseProps} activityLog={{}} nutritionDays={[]} />);
    expect(screen.getByText(/60% training adherence/i)).toBeInTheDocument();
  });

  it('loads the nutrition week itself when the prop is omitted', async () => {
    loadNutritionWeek.mockResolvedValue(fullWeek(2000, 160));

    render(<AdherenceCard {...baseProps} activityLog={activity([0, 2, 4, 5])} />);

    await waitFor(() => {
      expect(screen.getByTestId('asc-nutrition')).toHaveTextContent('7/7 days');
    });
    expect(loadNutritionWeek).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('asc-score')).toHaveTextContent('100');
  });

  it('falls back to training-only when the nutrition read fails', async () => {
    loadNutritionWeek.mockRejectedValue(new Error('offline'));

    render(<AdherenceCard {...baseProps} activityLog={activity([0, 2, 4, 5])} />);

    await waitFor(() => {
      expect(screen.getByTestId('asc-nutrition')).toHaveTextContent('no data');
    });
    expect(screen.getByTestId('asc-score')).toHaveTextContent('100');
  });

  it('does not crash when auth is unavailable', () => {
    render(<AdherenceCard {...baseProps} activityLog={activity([0])} nutritionDays={undefined} />);
    expect(screen.getByTestId('adherence-card')).toBeInTheDocument();
  });
});
