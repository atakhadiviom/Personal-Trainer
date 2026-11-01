import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import StreakCard from '../components/Dashboard/StreakCard';
import { toDateKey } from '../utils/streaks';

const TODAY = new Date(2026, 10, 15, 10, 0, 0);

const logFor = (offsets, label = 'Upper Body Push') =>
  Object.fromEntries(offsets.map(n => {
    const d = new Date(TODAY);
    d.setDate(d.getDate() - n);
    return [toDateKey(d), { exercises: 3, labels: [label] }];
  }));

describe('StreakCard', () => {
  it('renders an empty state that invites the first workout', () => {
    render(<StreakCard activityLog={{}} today={TODAY} />);
    expect(screen.getByTestId('streak-current')).toHaveTextContent('0 workout streak');
    expect(screen.getByText('Start your streak today')).toBeInTheDocument();
    expect(screen.getByText(/Best 0 · 0\/7 days this week/)).toBeInTheDocument();
  });

  it('shows current streak, best streak and the 7-day strip', () => {
    render(<StreakCard activityLog={logFor([1, 3, 5])} today={TODAY} />);
    expect(screen.getByTestId('streak-current')).toHaveTextContent('3 workout streak');
    expect(screen.getByText(/Best 3 · 3\/7 days this week · 4 to 7/)).toBeInTheDocument();
    const days = screen.getAllByRole('listitem');
    expect(days).toHaveLength(7);
    expect(days.filter(d => d.classList.contains('trained'))).toHaveLength(3);
    expect(days[6]).toHaveClass('today');
    expect(days[6]).toHaveAccessibleName(/rest day \(today\)/);
  });

  it('celebrates a milestone reached today', () => {
    render(<StreakCard activityLog={logFor([0, 1, 2])} today={TODAY} />);
    expect(screen.getByTestId('streak-milestone')).toHaveTextContent('3 streak!');
  });

  it('does not show a milestone when the athlete has not trained today', () => {
    render(<StreakCard activityLog={logFor([1, 3, 5])} today={TODAY} />);
    expect(screen.queryByTestId('streak-milestone')).not.toBeInTheDocument();
  });

  it('shows rest-day advice on low sleep and toggles recovery tips', () => {
    render(<StreakCard activityLog={logFor([1])} today={TODAY} sleepHours="5.0" />);
    const advice = screen.getByTestId('recovery-advice');
    expect(advice).toHaveClass('status-rest');
    expect(screen.getByText('Recovery day recommended')).toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: 'Show recovery tips' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Hide recovery tips' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/easy walk/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hide recovery tips' }));
    expect(screen.queryByText(/easy walk/)).not.toBeInTheDocument();
  });

  it('shows post-workout recovery status after training today', () => {
    render(<StreakCard activityLog={logFor([0])} today={TODAY} />);
    expect(screen.getByTestId('recovery-advice')).toHaveClass('status-recover');
  });
});
