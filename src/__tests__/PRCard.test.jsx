import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import PRCard from '../components/Dashboard/PRCard';
import { logSet } from '../utils/progressiveOverload';
import { toDateKey } from '../utils/streaks';

const TODAY = new Date(2026, 10, 15, 10, 0, 0);
const daysAgo = (n) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - n);
  return toDateKey(d);
};

const bench = { name: 'Bench Press', sets: 3, reps: '8-12', weight: 'Start: 60kg' };
const squat = { name: 'Squat', sets: 3, reps: '5-8', weight: 'Start: 100kg' };

describe('PRCard', () => {
  it('shows an empty state before any set is logged', () => {
    render(<PRCard setLog={{}} exercises={[bench, squat]} today={TODAY} />);
    expect(screen.getByTestId('pr-empty')).toHaveTextContent(/Log set/i);
    expect(screen.getByTestId('weekly-volume')).toHaveTextContent('—');
    expect(screen.getByTestId('weekly-sets')).toHaveTextContent('0');
    expect(screen.getByTestId('pr-count')).toHaveTextContent('0');
  });

  it('summarises weekly volume, sets and tracked exercises', () => {
    const log = logSet(
      logSet({}, { exercise: 'Bench Press', weightKg: 60, reps: 10, date: daysAgo(1) }),
      { exercise: 'Squat', weightKg: 100, reps: 5, date: daysAgo(2) }
    );
    render(<PRCard setLog={log} exercises={[bench]} today={TODAY} />);
    expect(screen.getByTestId('weekly-volume')).toHaveTextContent(/1,?100 kg/);
    expect(screen.getByTestId('weekly-sets')).toHaveTextContent('2');
    expect(screen.getByTestId('pr-count')).toHaveTextContent('2');
  });

  it('lists recent personal records with estimated 1RM', () => {
    const log = logSet({}, { exercise: 'Bench Press', weightKg: 62.5, reps: 10, date: daysAgo(1) });
    render(<PRCard setLog={log} exercises={[]} today={TODAY} />);
    const list = screen.getByTestId('pr-list');
    expect(list).toHaveTextContent('Bench Press');
    expect(list).toHaveTextContent('62.5 kg × 10');
    expect(list).toHaveTextContent('est. 1RM 83.3 kg');
  });

  it('shows next-session load targets for the current plan', () => {
    const log = logSet({}, { exercise: 'Bench Press', weightKg: 60, reps: 12, date: daysAgo(1) });
    render(<PRCard setLog={log} exercises={[bench, squat]} today={TODAY} />);
    const targets = screen.getByTestId('overload-list');
    expect(targets).toHaveTextContent('Bench Press');
    expect(targets).toHaveTextContent('go to 62.5 kg');
    expect(targets).toHaveTextContent('Load up');
    expect(targets).toHaveTextContent('Squat');
    expect(targets).toHaveTextContent('Start');
  });

  it('hides targets that cannot be computed yet', () => {
    render(
      <PRCard
        setLog={logSet({}, { exercise: 'Bench Press', weightKg: 60, reps: 12, date: daysAgo(1) })}
        exercises={[{ name: 'Mystery Move', reps: '10', weight: 'Start: Xkg' }]}
        today={TODAY}
      />
    );
    expect(screen.queryByText('Mystery Move')).not.toBeInTheDocument();
  });

  it('expands and collapses long target lists', () => {
    const exercises = Array.from({ length: 6 }, (_, i) => ({
      name: `Exercise ${i + 1}`,
      reps: '8-12',
      weight: 'Start: 40kg'
    }));
    render(<PRCard setLog={logSet({}, { exercise: 'Bench Press', weightKg: 60, reps: 8, date: daysAgo(1) })} exercises={exercises} today={TODAY} />);
    expect(within(screen.getByTestId('overload-list')).getAllByRole('listitem')).toHaveLength(4);
    const toggle = screen.getByRole('button', { name: /Show all targets/i });
    fireEvent.click(toggle);
    expect(within(screen.getByTestId('overload-list')).getAllByRole('listitem')).toHaveLength(6);
    expect(screen.getByRole('button', { name: /Show fewer targets/i })).toBeInTheDocument();
  });
});
