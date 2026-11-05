import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import TrainingLoadCard from '../components/Dashboard/TrainingLoadCard';
import { logSet } from '../utils/progressiveOverload';
import { toDateKey } from '../utils/streaks';

const TODAY = new Date(2026, 10, 15, 10, 0, 0);
const daysAgo = (n) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - n);
  return toDateKey(d);
};

const buildLog = (entries) => entries.reduce((log, entry) => logSet(log, entry), {});

const weeklyBlock = ({ weeksFrom = 0, weeks = 1, weightKg = 100, reps = 10 } = {}) => {
  const entries = [];
  for (let w = weeksFrom; w < weeksFrom + weeks; w += 1) {
    [0, 2, 4, 6].forEach(day => {
      entries.push({ exercise: 'Squat', weightKg, reps, date: daysAgo(w * 7 + day) });
    });
  }
  return entries;
};

const balancedLog = buildLog(weeklyBlock({ weeks: 4 }));
const spikeLog = buildLog([
  ...weeklyBlock({ weeksFrom: 1, weeks: 3 }),
  ...Array.from({ length: 7 }, (_, offset) => ({
    exercise: 'Deadlift', weightKg: 300, reps: 10, date: daysAgo(offset)
  }))
]);

describe('TrainingLoadCard', () => {
  it('shows a baseline state before any set is logged', () => {
    render(<TrainingLoadCard setLog={{}} today={TODAY} />);
    expect(screen.getByTestId('training-load-card')).toBeInTheDocument();
    expect(screen.getByTestId('tl-ratio')).toHaveTextContent('—');
    expect(screen.getByTestId('tl-zone')).toHaveTextContent('Baseline');
    expect(screen.getByTestId('tl-advice')).toHaveAttribute('data-status', 'start');
    expect(screen.getByTestId('tl-advice')).toHaveTextContent('Build your load baseline');
    expect(screen.queryByTestId('tl-marker')).not.toBeInTheDocument();
    expect(screen.getByTestId('tl-gauge')).toHaveAttribute('aria-valuetext', 'Not enough data yet');
  });

  it('renders the acute:chronic ratio, zone and weekly loads', () => {
    render(<TrainingLoadCard setLog={balancedLog} today={TODAY} />);
    expect(screen.getByTestId('tl-ratio')).toHaveTextContent('1.00');
    expect(screen.getByTestId('tl-zone')).toHaveTextContent('Sweet spot');
    expect(screen.getByTestId('tl-acute')).toHaveTextContent('4,000 kg');
    expect(screen.getByTestId('tl-chronic')).toHaveTextContent('4,000 kg');
    expect(screen.getByTestId('tl-ramp')).toHaveTextContent('0%');
  });

  it('greens-lights progression inside the sweet spot', () => {
    render(<TrainingLoadCard setLog={balancedLog} today={TODAY} />);
    const advice = screen.getByTestId('tl-advice');
    expect(advice).toHaveAttribute('data-status', 'build');
    expect(advice).toHaveTextContent('Green light to progress');
    expect(advice).toHaveTextContent('sweet spot');
    expect(screen.getByTestId('tl-tips').querySelectorAll('li').length).toBe(3);
  });

  it('positions the gauge marker from the ratio', () => {
    render(<TrainingLoadCard setLog={balancedLog} today={TODAY} />);
    const marker = screen.getByTestId('tl-marker');
    // ratio 1.0 on a 0.4–1.8 scale → 42.86%
    expect(parseFloat(marker.style.left)).toBeCloseTo(42.86, 1);
    expect(screen.getByTestId('tl-gauge')).toHaveAttribute('aria-valuenow', '1');
    expect(screen.getByTestId('tl-gauge')).toHaveAttribute('aria-valuemin', '0.4');
    expect(screen.getByTestId('tl-gauge')).toHaveAttribute('aria-valuemax', '1.8');
  });

  it('flags overreaching and prescribes a deload', () => {
    render(<TrainingLoadCard setLog={spikeLog} today={TODAY} />);
    expect(screen.getByTestId('tl-zone')).toHaveTextContent('Overreaching');
    const advice = screen.getByTestId('tl-advice');
    expect(advice).toHaveAttribute('data-status', 'deload');
    expect(advice).toHaveTextContent('Deload week recommended');
    expect(advice).toHaveTextContent('60%');
  });

  it('escalates a sweet-spot week to caution on short sleep', () => {
    render(<TrainingLoadCard setLog={balancedLog} today={TODAY} sleepHours={5} />);
    const advice = screen.getByTestId('tl-advice');
    expect(advice).toHaveAttribute('data-status', 'caution');
    expect(advice).toHaveTextContent('5 hrs');
  });

  it('summarises training and rest days in the footer', () => {
    render(<TrainingLoadCard setLog={balancedLog} today={TODAY} />);
    const card = screen.getByTestId('training-load-card');
    expect(card).toHaveTextContent('4/7 training days');
    expect(card).toHaveTextContent('3 rest days');
  });

  it('marks the ramp badge when tonnage jumps', () => {
    const log = buildLog([
      ...weeklyBlock({ weeksFrom: 2, weeks: 2, weightKg: 125 }),
      ...weeklyBlock({ weeksFrom: 1, weeks: 1, weightKg: 100 }),
      ...[0, 1, 2, 4, 5, 6].map(offset => ({
        exercise: 'Squat', weightKg: 100, reps: 10, date: daysAgo(offset)
      }))
    ]);
    render(<TrainingLoadCard setLog={log} today={TODAY} />);
    const ramp = screen.getByTestId('tl-ramp');
    expect(ramp).toHaveTextContent('+50%');
    expect(ramp).toHaveClass('down');
    expect(screen.getByTestId('tl-advice')).toHaveAttribute('data-status', 'caution');
  });
});
