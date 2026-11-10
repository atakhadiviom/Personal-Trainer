import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DeloadCard from '../components/Dashboard/DeloadCard';
import { logSet } from '../utils/progressiveOverload';
import { toDateKey } from '../utils/streaks';

const TODAY = new Date(2026, 10, 15, 10, 0, 0);
const daysAgo = (n) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - n);
  return toDateKey(d);
};

const flatLog = ['Squat', 'Bench Press', 'Deadlift'].reduce((log, exercise) => (
  [17, 14, 10, 7].reduce((inner, offset) => logSet(inner, {
    exercise, weightKg: 100, reps: 8, date: daysAgo(offset)
  }), log)
), {});

const schedule = [{
  id: 'day1',
  label: 'Day 1',
  warmup: [],
  cooldown: [],
  exercises: [
    { name: 'Squat', sets: 4, reps: '8-10', rest: '90s', weight: '100 kg' },
    { name: 'Bench Press', sets: 3, reps: '8-12', rest: '90s', weight: '60 kg' },
    { name: 'Deadlift', sets: 3, reps: '5', rest: '120s', weight: '120 kg' }
  ]
}];

describe('DeloadCard', () => {
  it('shows the data-collection state on an empty log', () => {
    render(<DeloadCard setLog={{}} schedule={schedule} week={1} today={TODAY} />);
    expect(screen.getByTestId('deload-card')).toBeInTheDocument();
    expect(screen.getByTestId('dl-status')).toHaveTextContent('Collecting data');
    expect(screen.getByTestId('dl-message')).toHaveTextContent('Two more weeks of data');
    expect(screen.queryByTestId('dl-apply')).not.toBeInTheDocument();
  });

  it('flags a deload after two flat weeks and previews reduced loads', () => {
    render(<DeloadCard setLog={flatLog} schedule={schedule} week={3} today={TODAY} />);
    expect(screen.getByTestId('dl-status')).toHaveTextContent('Deload due');
    expect(screen.getByTestId('dl-message')).toHaveTextContent('Deload week recommended');
    expect(screen.getByTestId('dl-evidence')).toHaveTextContent('3 of 3 lifts flat');
    const preview = screen.getByTestId('dl-preview');
    expect(preview).toHaveTextContent('Week 3 preview');
    expect(preview).toHaveTextContent('65 kg');
    expect(preview).toHaveTextContent('4 → 3 sets');
    expect(preview).toHaveTextContent('10 → 7 sets');
  });

  it('sends the rebuilt schedule changes when the coach applies the deload', () => {
    const onApply = vi.fn();
    render(<DeloadCard setLog={flatLog} schedule={schedule} week={2} today={TODAY} onApply={onApply} />);
    fireEvent.click(screen.getByTestId('dl-apply'));
    expect(onApply).toHaveBeenCalledTimes(1);
    const payload = onApply.mock.calls[0][0];
    expect(payload.ratio).toBe(0.65);
    expect(payload.changes).toHaveLength(3);
    expect(payload.changes[0].name).toBe('Squat');
    expect(payload.changes[0].setsTo).toBe(3);
  });

  it('disables apply when the week has no plan yet', () => {
    render(<DeloadCard setLog={flatLog} schedule={null} week={4} today={TODAY} onApply={vi.fn()} />);
    expect(screen.getByTestId('dl-apply')).toBeDisabled();
    expect(screen.getByTestId('deload-card')).toHaveTextContent('Generate this week’s plan first');
  });

  it('shows the active deload and allows an undo', () => {
    const onRevert = vi.fn();
    render(
      <DeloadCard
        setLog={flatLog}
        schedule={schedule}
        week={3}
        today={TODAY}
        applied={{ ratio: 0.65, setsDropped: 3, appliedAt: '2026-11-10' }}
        onRevert={onRevert}
      />
    );
    expect(screen.getByTestId('dl-status')).toHaveTextContent('Deload active');
    expect(screen.getByTestId('dl-applied')).toHaveTextContent('Week 3 is a deload week');
    expect(screen.getByTestId('dl-applied')).toHaveTextContent('65% of your last working weight');
    expect(screen.getByTestId('dl-applied')).toHaveTextContent('3 sets removed');
    expect(screen.queryByTestId('dl-apply')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('dl-revert'));
    expect(onRevert).toHaveBeenCalledTimes(1);
  });

  it('stays quiet when the athlete is progressing', () => {
    const progressing = ['Squat', 'Bench Press', 'Deadlift'].reduce((log, exercise) => (
      [10, 7].reduce((inner, offset) => logSet(inner, {
        exercise, weightKg: 105, reps: 8, date: daysAgo(offset)
      }), [17, 14].reduce((inner, offset) => logSet(inner, {
        exercise, weightKg: 100, reps: 8, date: daysAgo(offset)
      }), log))
    ), {});
    render(<DeloadCard setLog={progressing} schedule={schedule} week={3} today={TODAY} />);
    expect(screen.getByTestId('dl-status')).toHaveTextContent('On track');
    expect(screen.queryByTestId('dl-apply')).not.toBeInTheDocument();
  });
});
