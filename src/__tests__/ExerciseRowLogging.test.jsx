import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ExerciseRow from '../components/Dashboard/ExerciseRow';

const baseProps = {
  ex: { name: 'Bench Press', sets: 3, reps: 10, rest: '60s', weight: 'Start: 60kg' },
  exIdx: 0,
  dayIdx: 1,
  dayId: 'day_1',
  isDone: false,
  isSwapping: false,
  toggleExercise: vi.fn(),
  handleSwap: vi.fn()
};

const renderRow = (props = {}) => render(
  <table>
    <tbody>
      <ExerciseRow {...baseProps} {...props} />
    </tbody>
  </table>
);

describe('ExerciseRow set logging', () => {
  it('does not show logging controls without a handler', () => {
    renderRow();
    expect(screen.queryByRole('button', { name: /Log set/i })).not.toBeInTheDocument();
  });

  it('opens the inline form and submits weight and reps', () => {
    const onLogSet = vi.fn();
    renderRow({ onLogSet });

    fireEvent.click(screen.getByRole('button', { name: /Log set/i }));
    expect(screen.getByRole('button', { name: /Close/i })).toHaveAttribute('aria-expanded', 'true');

    fireEvent.change(screen.getByLabelText('Weight in kg for Bench Press'), { target: { value: '62.5' } });
    fireEvent.change(screen.getByLabelText('Reps for Bench Press'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onLogSet).toHaveBeenCalledWith('Bench Press', 62.5, 10);
    expect(screen.getByRole('button', { name: /Log set/i })).toHaveAttribute('aria-expanded', 'false');
  });

  it('rejects empty or out-of-range input', () => {
    const onLogSet = vi.fn();
    renderRow({ onLogSet });

    fireEvent.click(screen.getByRole('button', { name: /Log set/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onLogSet).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Weight in kg for Bench Press'), { target: { value: '700' } });
    fireEvent.change(screen.getByLabelText('Reps for Bench Press'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onLogSet).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Weight in kg for Bench Press'), { target: { value: '60' } });
    fireEvent.change(screen.getByLabelText('Reps for Bench Press'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onLogSet).not.toHaveBeenCalled();
  });

  it('prefills the last set and shows it as a hint', () => {
    const onLogSet = vi.fn();
    renderRow({ onLogSet, lastSet: { date: '2026-11-10', weightKg: 60, reps: 8 } });

    fireEvent.click(screen.getByRole('button', { name: /Log set/i }));
    expect(screen.getByLabelText('Weight in kg for Bench Press')).toHaveValue(60);
    expect(screen.getByLabelText('Reps for Bench Press')).toHaveValue(8);
    expect(screen.getByText(/Last: 60 kg × 8/)).toBeInTheDocument();
  });

  it('shows a PR badge with the best estimated 1RM', () => {
    renderRow({ onLogSet: vi.fn(), personalRecord: { weightKg: 62.5, reps: 10, e1rm: 83.3 } });
    expect(screen.getByText('PR 83.3 kg')).toBeInTheDocument();
  });

  it('omits the PR badge when there is no record', () => {
    renderRow({ onLogSet: vi.fn(), personalRecord: null });
    expect(screen.queryByText(/^PR /)).not.toBeInTheDocument();
  });

  it('toggles the form closed again', () => {
    renderRow({ onLogSet: vi.fn() });
    const toggle = screen.getByRole('button', { name: /Log set/i });
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('button', { name: /Close/i }));
    expect(screen.queryByLabelText('Weight in kg for Bench Press')).not.toBeInTheDocument();
  });
});
