import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import WorkoutHistoryCard from '../components/Dashboard/WorkoutHistoryCard';
import { logSet } from '../utils/progressiveOverload';
import { toDateKey } from '../utils/streaks';

const TODAY = new Date(2026, 10, 15, 10, 0, 0);
const daysAgo = (n) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - n);
  return toDateKey(d);
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatShort = (key) => {
  const [, m, d] = key.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}`;
};

const buildLog = (entries) => entries.reduce((log, entry) => logSet(log, entry), {});

const sampleLog = buildLog([
  { exercise: 'Bench Press', weightKg: 60, reps: 10, date: daysAgo(1) },
  { exercise: 'Squat', weightKg: 100, reps: 5, date: daysAgo(1) },
  { exercise: 'Bench Press', weightKg: 60, reps: 8, date: daysAgo(4) },
  { exercise: 'Squat', weightKg: 90, reps: 5, date: daysAgo(10) }
]);

describe('WorkoutHistoryCard', () => {
  it('shows an empty state before any set is logged', () => {
    render(<WorkoutHistoryCard setLog={{}} today={TODAY} />);
    expect(screen.getByTestId('wh-empty')).toHaveTextContent(/Log your first set/i);
    expect(screen.getByTestId('wh-total-sessions')).toHaveTextContent('0');
    expect(screen.getByTestId('wh-total-volume')).toHaveTextContent('—');
    expect(screen.getByTestId('wh-avg-session')).toHaveTextContent('—');
    expect(screen.queryByTestId('wh-chart')).not.toBeInTheDocument();
  });

  it('summarises lifetime sessions, tonnage and average session volume', () => {
    render(<WorkoutHistoryCard setLog={sampleLog} today={TODAY} />);
    expect(screen.getByTestId('wh-total-sessions')).toHaveTextContent('3');
    // 600 + 500 + 480 + 450 = 2030
    expect(screen.getByTestId('wh-total-volume')).toHaveTextContent('2,030 kg');
    expect(screen.getByTestId('wh-avg-session')).toHaveTextContent('677 kg');
  });

  it('renders eight weekly bars with the current week highlighted', () => {
    const { container } = render(<WorkoutHistoryCard setLog={sampleLog} today={TODAY} />);
    const chart = screen.getByTestId('wh-chart');
    expect(within(chart).getAllByTitle(/Week of/)).toHaveLength(8);
    expect(container.querySelectorAll('.wh-bar-col.current')).toHaveLength(1);
    expect(container.querySelectorAll('.wh-bar')).toHaveLength(8);
  });

  it('shows the current week volume, session count and trend badge', () => {
    render(<WorkoutHistoryCard setLog={sampleLog} today={TODAY} />);
    expect(screen.getByTestId('wh-this-week')).toHaveTextContent('1,580 kg');
    expect(screen.getByTestId('wh-this-week')).toHaveTextContent('2 sessions');
    // Last week (2–8 Nov) = 450 kg → +251%
    expect(screen.getByTestId('wh-trend')).toHaveTextContent('+251% volume');
  });

  it('renders a 56-cell training calendar with accessible labels', () => {
    const { container } = render(<WorkoutHistoryCard setLog={sampleLog} today={TODAY} />);
    const heatmap = screen.getByTestId('wh-heatmap');
    expect(heatmap.querySelectorAll('.wh-cell')).toHaveLength(56);
    expect(heatmap.querySelectorAll('.wh-cell.level-4').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.wh-cell.today')).toHaveLength(1);
    expect(heatmap.querySelector(`[aria-label="${formatShort(daysAgo(1))}: 2 sets, 1100 kg"]`)).toBeInTheDocument();
    expect(heatmap.querySelector(`[aria-label="${formatShort(daysAgo(4))}: 1 set, 480 kg"]`)).toBeInTheDocument();
    expect(heatmap.querySelector(`[aria-label="${formatShort(daysAgo(2))}: rest day"]`)).toBeInTheDocument();
  });

  it('lists the three most recent sessions newest first', () => {
    render(<WorkoutHistoryCard setLog={sampleLog} today={TODAY} />);
    const items = within(screen.getByTestId('wh-recent')).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Squat');
    expect(items[0]).toHaveTextContent('2 sets · 2 exercises');
    expect(items[0]).toHaveTextContent('1,100 kg');
    expect(items[2]).toHaveTextContent('Squat');
    expect(items[2]).toHaveTextContent('450 kg');
  });

  it('switches to the exercise breakdown tab with per-lift totals', () => {
    render(<WorkoutHistoryCard setLog={sampleLog} today={TODAY} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Exercises' }));
    const breakdown = screen.getByTestId('wh-breakdown');
    const rows = within(breakdown).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    // Bench 600 + 480 = 1080 kg, Squat 500 + 450 = 950 kg
    expect(rows[0]).toHaveTextContent('Bench Press');
    expect(rows[0]).toHaveTextContent('1,080 kg');
    expect(rows[0]).toHaveTextContent('2 sessions');
    expect(rows[0]).toHaveTextContent('1d ago');
    expect(rows[1]).toHaveTextContent('Squat');
    expect(screen.queryByTestId('wh-chart')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Volume' }));
    expect(screen.getByTestId('wh-chart')).toBeInTheDocument();
  });

  it('marks the selected tab for assistive technology', () => {
    render(<WorkoutHistoryCard setLog={sampleLog} today={TODAY} />);
    expect(screen.getByRole('tab', { name: 'Volume' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('tab', { name: 'Exercises' }));
    expect(screen.getByRole('tab', { name: 'Exercises' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Volume' })).toHaveAttribute('aria-selected', 'false');
  });

  it('exports the CSV through the onExport callback', () => {
    const onExport = vi.fn();
    render(<WorkoutHistoryCard setLog={sampleLog} today={TODAY} onExport={onExport} />);
    fireEvent.click(screen.getByTestId('wh-export'));
    expect(onExport).toHaveBeenCalledTimes(1);
    const csv = onExport.mock.calls[0][0];
    expect(csv.split('\n')[0]).toContain('Date,Exercise');
    expect(csv.split('\n')).toHaveLength(5);
  });

  it('downloads a CSV file when no onExport handler is supplied', () => {
    const createObjectURL = vi.fn(() => 'blob:history');
    const revokeObjectURL = vi.fn();
    const original = { createObjectURL: URL.createObjectURL, revokeObjectURL: URL.revokeObjectURL };
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<WorkoutHistoryCard setLog={sampleLog} today={TODAY} />);
    fireEvent.click(screen.getByTestId('wh-export'));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:history');

    click.mockRestore();
    URL.createObjectURL = original.createObjectURL;
    URL.revokeObjectURL = original.revokeObjectURL;
  });

  it('shows a decline badge when tonnage drops week over week', () => {
    const log = buildLog([
      { exercise: 'Squat', weightKg: 100, reps: 2, date: daysAgo(1) },
      { exercise: 'Squat', weightKg: 100, reps: 10, date: daysAgo(8) }
    ]);
    render(<WorkoutHistoryCard setLog={log} today={TODAY} />);
    expect(screen.getByTestId('wh-trend')).toHaveTextContent('-80% volume');
  });

  it('labels the best week once there is recorded tonnage', () => {
    render(<WorkoutHistoryCard setLog={sampleLog} today={TODAY} />);
    expect(screen.getByTestId('wh-best-week')).toHaveTextContent(/Best week:/);
    expect(screen.getByTestId('wh-best-week')).toHaveTextContent('1,580 kg');
  });
});
