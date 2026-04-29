import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ExerciseRow from '../components/Dashboard/ExerciseRow';

const defaultProps = {
  ex: {
    name: 'Squat',
    guide: 'Keep back straight',
    sets: 3,
    reps: 10,
    rest: '60s',
    weight: '100kg'
  },
  exIdx: 0,
  dayIdx: 1,
  dayId: 'day-1',
  isDone: false,
  isSwapping: false,
  toggleExercise: vi.fn(),
  handleSwap: vi.fn()
};

describe('ExerciseRow Component', () => {
  const renderRow = (props = {}) => {
    return render(
      <table>
        <tbody>
          <ExerciseRow {...defaultProps} {...props} />
        </tbody>
      </table>
    );
  };

  it('renders basic props correctly', () => {
    renderRow();
    expect(screen.getByText('Squat')).toBeInTheDocument();
    expect(screen.getByText('Keep back straight')).toBeInTheDocument();
    expect(screen.getByText('3 × 10')).toBeInTheDocument();
    expect(screen.getByText('60s')).toBeInTheDocument();
    expect(screen.getByText('100kg')).toBeInTheDocument();
  });

  it('calls toggleExercise when checkbox is clicked', () => {
    const toggleExercise = vi.fn();
    renderRow({ toggleExercise });

    const checkbox = screen.getByRole('checkbox', { name: /Mark Squat as complete/i });
    fireEvent.click(checkbox);

    expect(toggleExercise).toHaveBeenCalledWith('day-1', 0);
  });

  it('calls handleSwap when swap button is clicked', () => {
    const handleSwap = vi.fn();
    renderRow({ handleSwap });

    const swapButton = screen.getByRole('button', { name: /Swap/i });
    fireEvent.click(swapButton);

    expect(handleSwap).toHaveBeenCalledWith(1, 0, 'Squat');
  });

  it('disables the swap button and shows wait text when isSwapping is true', () => {
    renderRow({ isSwapping: true });

    const swapButton = screen.getByRole('button', { name: /Swapping/i });
    expect(swapButton).toBeDisabled();
    expect(screen.queryByRole('button', { name: /🔄 Swap/i })).not.toBeInTheDocument();
  });

  it('applies exercise-done class and checks checkbox when isDone is true', () => {
    const { container } = renderRow({ isDone: true });

    const tr = container.querySelector('tr');
    expect(tr).toHaveClass('exercise-done');
    expect(tr).toHaveStyle({ opacity: '0.5' });

    const checkbox = screen.getByRole('checkbox', { name: /Mark Squat as complete/i });
    expect(checkbox).toBeChecked();
  });
});
